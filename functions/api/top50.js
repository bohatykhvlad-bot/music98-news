import { appleCandidateCompatible, artworkKey, isVersionedMergeKey, mergeKey, normTitle, pickAppleCandidate, primaryArtist, stripParen } from "../lib/chart-identity.js";

const SIZE = 50;
const LAUNCH = Date.UTC(2026, 8, 17);
const APPLE_AT = "1001l3aZW";
const APPLE_CT = "music98";
/* Bumped to v20 on 26.09: forces the rebuild where NEW always means one day.
   Any future "refresh the chart now" is the same bump. */
const TOP50_KV = "top50v33";
const SOURCES = ["A", "S", "D", "B", "Y"];
const YT_CHARTS =
  "https://charts.youtube.com/youtubei/v1/browse?alt=json&key=AIzaSyCzEW7JUJdSql0-2V4tHUb6laYm4iAE_dM";

function isApplePreview(url) {
  const u = String(url || "").toLowerCase();
  return u.includes("apple.com") || u.includes("mzstatic.com");
}
function appleAff(url) {
  if (!url) return "";
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    if (host !== "apple.com" && !host.endsWith(".apple.com")) return url;
    u.searchParams.set("app", "music");
    u.searchParams.set("at", APPLE_AT);
    u.searchParams.set("ct", APPLE_CT);
    return u.href;
  } catch {
    return url;
  }
}

function chartWeek() {
  /* The chart rebuilds daily, so movement is measured in days: the "week"
     counter is really a day index since launch. Field name kept for KV compat. */
  return Math.max(0, Math.floor((Date.now() - LAUNCH) / 86400000));
}

/* Artwork is resolved offline by the audited multi-provider registry.
   Artwork identity is stricter than ranking/tenure, so collaborator or version
   changes can never steal another row's cover. */
const DZ_HOST = "dzcdn.net";
function isAppleArt(url) {
  try {
    const h = new URL(String(url || "")).hostname.toLowerCase();
    return h === "mzstatic.com" || h.endsWith(".mzstatic.com");
  } catch {
    return false;
  }
}
/* Данные Apple для текущего чарта лежат в репозитории: public/data/covers.json
   (обложки) и public/data/apple-names.json (имя + ссылка + превью + год). Их
   пересобирает scripts/build-covers.mjs по расписанию
   (.github/workflows/apple-data.yml). Читаем их через биндинг ASSETS - это
   локальное хранилище ассетов, без выхода в интернет; сетевой фетч оставлен
   только как запас. Раньше засев брался сетевым запросом, и когда он не
   отвечал, воркер запоминал пустой засев на всю жизнь изолята: часть строк
   показывала устаревшие имена, чужие обложки и пустые ссылки. Пустой ответ
   теперь НЕ кэшируется. */
async function readSeed(env, origin, file) {
  const path = "/data/" + file;
  if (env && env.ASSETS && typeof env.ASSETS.fetch === "function") {
    try {
      const r = await env.ASSETS.fetch(new URL(path, String(origin || "https://music98.news")));
      if (r.ok) return await r.json();
    } catch {}
  }
  try { return await getJson(String(origin || "") + path); } catch { return null; }
}
let COVER_SEED = null;
let COVER_SEED_AT = 0;
let NAME_SEED = null;
let LOUDNESS_SEED = null;
const COVER_SEED_TTL_MS = 30 * 1000;
async function coverSeed(env, origin) {
  const now = Date.now();
  if (COVER_SEED && now - COVER_SEED_AT < COVER_SEED_TTL_MS) return COVER_SEED;
  const v = await readSeed(env, origin, "covers.json");
  if (v && typeof v === "object" && Object.keys(v).length) {
    COVER_SEED = v;
    COVER_SEED_AT = now;
    return COVER_SEED;
  }
  /* Keep the last verified registry on a transient asset read failure, but
     never pin it for the lifetime of the Worker isolate. Artwork data is
     deployed independently from the chart KV and must become visible quickly. */
  return COVER_SEED || {};
}
async function nameSeed(env, origin) {
  if (NAME_SEED) return NAME_SEED;
  const v = await readSeed(env, origin, "apple-names.json");
  if (v && typeof v === "object" && Object.keys(v).length) NAME_SEED = v;
  return v && typeof v === "object" ? v : {};
}
async function loudnessSeed(env, origin) {
  if (LOUDNESS_SEED) return LOUDNESS_SEED;
  const v = await readSeed(env, origin, "loudness.json");
  if (v && typeof v === "object" && Object.keys(v).length) LOUDNESS_SEED = v;
  return v && typeof v === "object" ? v : {};
}
async function applyLoudness(env, tracks, origin) {
  const seed = await loudnessSeed(env, origin);
  for (const t of tracks || []) {
    const rec = seed[mergeKey(t.title, t.artist)];
    const db = Number(rec && rec.gainDb);
    if (Number.isFinite(db)) {
      t.gainDb = Math.max(-24, Math.min(0, db));
      t.lufs = Number(rec.integratedLufs);
      t.truePeakDbtp = Number(rec.truePeakDbtp);
    }
  }
  return tracks;
}
async function applyCovers(env, tracks, origin) {
  const seed = await coverSeed(env, origin);
  for (const t of tracks) {
    const strict = artworkKey(t.title, t.artist);
    const legacy = mergeKey(t.title, t.artist); // rollout compatibility alias
    const chosen = seed[strict] || seed[legacy] || "";
    const temporary = !chosen && isAppleArt(t.art) ? t.art : "";
    /* Never persist artwork in KV. A bad runtime match must disappear instead of
       becoming a permanent lock. The checked-in audited registry is the only
       persistent artwork authority. */
    t.art = chosen || temporary || "";
  }
  return tracks;
}
/* Остальные обложки добираем одним batch-запросом Apple по track id из ссылки:
   это ровно тот релиз, который мы показываем и на который ведёт кнопка. */
function applyAppleCanonicalIdentity(track, title, artist) {
  const nextTitle = String(title || track.title || "").trim();
  const nextArtist = String(artist || track.artist || "").trim();
  if (!nextTitle || !nextArtist) return false;
  if (mergeKey(nextTitle, nextArtist) !== mergeKey(track.title, track.artist)) return false;
  track.title = nextTitle;
  track.artist = nextArtist;
  return true;
}

async function enrichArtByIds(tracks, stats) {
  const want = [];
  for (const t of tracks) {
    if (t.art) continue;
    const m = String(t.url || "").match(/[?&]i=(\d+)/);
    if (m) want.push([t, m[1]]);
  }
  if (stats) stats.asked += want.length;
  if (!want.length) return;
  const ids = [...new Set(want.map(([, id]) => id))];
  const found = new Map();
  for (let i = 0; i < ids.length; i += 50) {
    try {
      const data = await getJson(`https://itunes.apple.com/lookup?id=${ids.slice(i, i + 50).join(",")}&entity=song&country=US`);
      for (const item of data.results || []) {
        const id = String(item.trackId || "");
        if (id) found.set(id, item);
      }
    } catch {
      if (stats) stats.failed += 1;
    }
  }
  for (const [t, id] of want) {
    const item = found.get(id);
    if (!item || !appleCandidateCompatible(t.title, t.artist, item)) continue;
    if (!applyAppleCanonicalIdentity(t, item.trackName, item.artistName)) continue;
    const art = String(item.artworkUrl100 || "").replace("100x100bb", "600x600bb");
    if (art && isAppleArt(art)) {
      t.art = art;
      if (stats) stats.filled += 1;
    }
    if (!isApplePreview(t.prev) && isApplePreview(item.previewUrl)) t.prev = item.previewUrl;
    if (!t.year && item.releaseDate) t.year = String(item.releaseDate).slice(0, 4);
  }
}

/* Написание имени тоже зависело от того, кто ответил сегодня: при молчащем Apple
   приезжал спотифай-вариант ("KAROL G" вместо "KAROL G, Judeline & rusowsky").
   Теперь имя запоминается по песне, как обложка: что приняли один раз, то и висит.
   Если Apple ответит и принесёт полное написание, оно один раз заменит урезанное. */
/* Spotify пишет фитов в названии: "Die With A Smile (w/ Bruno Mars)", "WTF GOIN (feat. 21
   Savage)". Apple - в артистах: "Lady Gaga, Bruno Mars". Переносим фит в строку артистов,
   чтобы на сайте не было ни "w/", ни разнобоя от источника. Смысл не меняется, а
   идентичность песни та же (normTitle скобки всё равно отбрасывает). */
function cleanDisplay(title, artist) {
  const t0 = String(title || "").trim();
  const m = t0.match(/\s*[(\[](?:w\/|w\.|with|feat\.?|ft\.?|featuring)\s+([^)\]]+)[)\]]\s*$/i);
  if (!m) return { title: t0, artist: String(artist || "").trim() };
  const title2 = t0.slice(0, m.index).trim() || t0;
  let artist2 = String(artist || "").trim();
  const feats = m[1].split(/\s*(?:,|&|\+|\/| x | × | and )\s*/i).map((s) => s.trim()).filter(Boolean);
  const have = artist2.toLowerCase();
  for (const f of feats) if (f && !have.includes(f.toLowerCase())) artist2 = artist2 ? `${artist2}, ${f}` : f;
  return { title: title2, artist: artist2 };
}

const NAMES_KV = "names_v1";
/* какое написание показываем: засев Apple -> запомненное ранее -> текущее (с апгрейдом от Apple).
   Фит разбираем ДО сравнения (cleanDisplay переносит его в артистов), и "версией" считаем
   только ту скобку, которая после этого осталась: "(Track by Track)", "(Live)" и т.п.
   Раньше фит в скобках тоже считался версией - и у "Cinderella (feat. Ty Dolla $ign)"
   название бралось из чарта, а фит терялся совсем. */
function pickName(seedRec, cachedRec, cur, nameSrc) {
  if (seedRec && seedRec.title && seedRec.artist) {
    const cleaned = cleanDisplay(seedRec.title, seedRec.artist);
    const sameSong = normTitle(cleaned.title) === normTitle(cur.title);
    const seedVariant = stripParen(cleaned.title).trim() !== String(cleaned.title).trim();
    const curPlain = stripParen(cur.title).trim() === String(cur.title).trim();
    const title = sameSong && seedVariant && curPlain ? cur.title : cleaned.title;
    return { title, artist: cleaned.artist, src: "seed" };
  }
  const upgrade = nameSrc === "A" && cachedRec && cachedRec.src !== "A";
  if (cachedRec && cachedRec.title && cachedRec.artist && !upgrade) {
    return { title: cachedRec.title, artist: cachedRec.artist, src: cachedRec.src || "" };
  }
  return { title: cur.title, artist: cur.artist, src: nameSrc || "" };
}
async function applyNames(env, tracks, origin) {
  const seed = await nameSeed(env, origin);
  let names = {};
  if (env && env.DESK) {
    try { names = (await env.DESK.get(NAMES_KV, { type: "json" })) || {}; } catch {}
  }
  let changed = false;
  for (const t of tracks) {
    const clean = cleanDisplay(t.title, t.artist);
    const key = mergeKey(clean.title, clean.artist);
    const sd = seed[key];
    const chosen = pickName(sd, names[key], clean, t.nameSrc);
    const shown = cleanDisplay(chosen.title, chosen.artist);
    t.title = shown.title;
    t.artist = shown.artist;
    /* Ссылка, превью и год тоже берутся из засева: он сверен с конкретным релизом
       Apple, а запечённый файл чарта может вести на версию-вариант или быть пустым
       (живой пример: строка без ссылки, потому что iTunes из воркера не ответил). */
    if (sd) {
      if (sd.url) t.url = sd.url;
      if (sd.prev) t.prev = sd.prev;
      if (sd.year && !t.year) t.year = sd.year;
    }
    const rec = { title: shown.title, artist: shown.artist, src: chosen.src };
    const old = names[key];
    if (!old || old.title !== rec.title || old.artist !== rec.artist || old.src !== rec.src) {
      names[key] = rec;
      changed = true;
    }
  }
  if (env && env.DESK && changed) {
    try { await env.DESK.put(NAMES_KV, JSON.stringify(names)); } catch {}
  }
  return tracks;
}

/* A song's identity is mergeKey (normalized title + primary artist): the same key
   ingest() already uses to fold Apple, Spotify, Deezer, Billboard and YouTube rows
   of one track into a single chart entry. Building the tenure key from the raw
   display string instead made Apple's "BbY WOW / KAROL G, Judeline & rusowsky" and
   Spotify's "BbY WOW (w/ Judeline, rusowsky) / KAROL G" two different songs, so any
   day a source answered differently re-flagged a song that was already on the chart
   as NEW and reset its day counter. */
function tenureKey(title, artist) {
  return mergeKey(title, artist);
}
/* Registries written before the fix hold old "title|artist" keys. This re-keys them
   on load; the transform is idempotent, so the chart keeps its history and the next
   write stores the normalized keys. A missing day still counts as NEW - only the
   naming can no longer fake a new entry. */
function rekeySeen(old) {
  const out = {};
  for (const [k, v] of Object.entries((old && old.seen) || {})) {
    const cut = String(k).indexOf("|");
    if (cut < 0) continue;
    const nk = isVersionedMergeKey(k) ? k : tenureKey(k.slice(0, cut), k.slice(cut + 1));
    const prev = out[nk];
    if (!prev || (Number(v && v.weeks) || 0) > (Number(prev.weeks) || 0)) out[nk] = v;
  }
  return out;
}
const TENURE_KV = "tenure_v3";
const FIRST_KV = "tenure_first_v1";
/* Permanent "has ever entered music98 Top 50" registry.
   Unlike the current streak counter, this is never cleared when a song drops out.
   NEW = first appearance in this registry; RE-ENTRY = absent yesterday but seen before. */
const EVER_KV = "tenure_ever_v1";

/* One-time migration on 2026-09-28.
   The persistent seen object had 72 identities before today's first rebuild.
   Later keys were inserted during 28 Sep rebuilds. This boundary was verified
   against the previous-day reference and the insertion order before EVER_KV existed. */
const EVER_MIGRATION_WEEK = 11;
const EVER_MIGRATION_PREVIOUS_COUNT = 72;

function rekeyFirstDays(old) {
  const out = {};
  for (const [k, v] of Object.entries(old || {})) {
    const cut = String(k).indexOf("|");
    const nk = cut < 0 ? k : (isVersionedMergeKey(k) ? k : tenureKey(k.slice(0, cut), k.slice(cut + 1)));
    const day = Number(v);
    if (!Number.isFinite(day)) continue;
    out[nk] = out[nk] == null ? day : Math.min(out[nk], day);
  }
  return out;
}

function normalizeEver(old) {
  const out = {};
  const src = old && old.seen && typeof old.seen === "object" ? old.seen : (old || {});
  for (const [k, v] of Object.entries(src)) {
    if (!v) continue;
    const cut = String(k).indexOf("|");
    const nk = cut < 0 ? k : (isVersionedMergeKey(k) ? k : tenureKey(k.slice(0, cut), k.slice(cut + 1)));
    out[nk] = true;
  }
  return out;
}

/* Durable recovery snapshot.
   The live tenure registry is kept in KV, but KV is not allowed to be the only
   copy of chart age/movement state. On 2026-10-01 the registry disappeared and
   the first rebuild treated the entire Top 50 as day one. A checked-in snapshot
   from the previous healthy day gives us an independent recovery source. */
function tenureBackupState(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.tracks) || snapshot.tracks.length < 10) return null;
  const snapshotWeek = Number(snapshot.week);
  if (!Number.isFinite(snapshotWeek)) return null;
  const keys = [];
  const seen = {};
  const firstDay = {};
  const ever = {};
  snapshot.tracks.forEach((track, i) => {
    const key = tenureKey(track && track.title, track && track.artist);
    if (!key || seen[key]) return;
    const weeks = Math.max(1, Number(track && track.weeks) || 1);
    keys.push(key);
    seen[key] = {
      weeks,
      lastPos: Math.max(0, (Number(track && track.rank) || (i + 1)) - 1),
      lastWeek: snapshotWeek,
      delta: String(track && track.delta != null ? track.delta : "0"),
    };
    firstDay[key] = Math.max(0, snapshotWeek - (weeks - 1));
    ever[key] = true;
  });
  return { week: snapshotWeek, keys, seen, firstDay, ever };
}

async function tenureRecoverySnapshot(env, origin, week) {
  let raw = null;
  try { raw = await readSeed(env, origin, "chart-tenure-backup.json"); } catch {}
  if (!raw || typeof raw !== "object") return { prior: null, same: null };
  const candidates = [raw.current, raw.previous, raw]
    .map(tenureBackupState)
    .filter(Boolean);
  return {
    prior: candidates.find((x) => x.week === week - 1) || null,
    same: candidates.find((x) => x.week === week) || null,
  };
}

function tenureResetEvidence(tracks, ten, seen, firstDay, prior) {
  if (!prior) return { repair: false, overlap: 0, broken: 0 };
  const currentKeys = (tracks || []).map((t) => tenureKey(t.title, t.artist));
  const overlap = currentKeys.filter((k) => prior.seen[k]);
  const established = overlap.filter((k) => Number(prior.seen[k] && prior.seen[k].weeks) >= 2);
  const broken = established.filter((k) => {
    const fd = Number(firstDay[k]);
    const recWeeks = Number(seen[k] && seen[k].weeks);
    return !Number.isFinite(fd) || fd > prior.firstDay[k] || (Number.isFinite(recWeeks) && recWeeks <= 1);
  });
  const hasReference = !!(
    (Array.isArray(ten && ten.keys) && ten.keys.length) ||
    (Array.isArray(ten && ten.today) && ten.today.length)
  );
  const massReset = established.length >= 10 && broken.length >= Math.ceil(established.length * 0.5);
  return {
    repair: !hasReference || massReset,
    overlap: overlap.length,
    established: established.length,
    broken: broken.length,
    massReset,
    missingReference: !hasReference,
  };
}

async function applyTenure(env, tracks, diag, origin) {
  const week = chartWeek();
  let ten = { launch: "2026-09-17", epoch: "daily", week: -1, keys: [], seen: {} };
  let firstDay = {};
  let everStored = null;

  if (env && env.DESK) {
    const v = await env.DESK.get(TENURE_KV, { type: "json" });
    if (v && v.epoch === "daily") ten = v;
    firstDay = rekeyFirstDays(await env.DESK.get(FIRST_KV, { type: "json" }));
    everStored = await env.DESK.get(EVER_KV, { type: "json" });
  }

  let seen = rekeySeen(ten);
  for (const [k, rec] of Object.entries(seen)) {
    if (firstDay[k] != null) continue;
    const w = Number(rec && rec.weeks) || 1;
    const at = Number(rec && rec.lastWeek);
    firstDay[k] = Math.max(0, (Number.isFinite(at) ? at : week) - (w - 1));
  }

  const recovery = await tenureRecoverySnapshot(env, origin, week);
  const evidence = tenureResetEvidence(tracks, ten, seen, firstDay, recovery.prior);
  if (evidence.repair && recovery.prior) {
    const prior = recovery.prior;
    const mergedSeen = { ...seen };
    for (const [k, rec] of Object.entries(prior.seen)) {
      const old = mergedSeen[k];
      if (!old || (Number(old.weeks) || 0) < (Number(rec.weeks) || 0)) {
        mergedSeen[k] = { ...rec };
      }
    }
    for (const [k, day] of Object.entries(prior.firstDay)) {
      const old = Number(firstDay[k]);
      firstDay[k] = Number.isFinite(old) ? Math.min(old, day) : day;
    }
    ten = {
      launch: "2026-09-17",
      epoch: "daily",
      week: prior.week,
      keys: [...prior.keys],
      today: [...prior.keys],
      seen: mergedSeen,
    };
    seen = mergedSeen;
    if (diag) {
      diag.recoveryApplied = true;
      diag.recoverySource = "repo-snapshot";
      diag.recoveryWeek = prior.week;
      diag.recoveryEvidence = evidence;
    }
  } else if (diag) {
    diag.recoveryApplied = false;
    diag.recoverySource = recovery.prior ? "not-needed" : "unavailable";
    diag.recoveryWeek = recovery.prior ? recovery.prior.week : null;
    diag.recoveryEvidence = evidence;
  }

  const sameDay = ten.week === week;
  const hasToday = Array.isArray(ten.today) && ten.today.length > 0;
  const refRaw = sameDay
    ? (ten.keys || [])
    : (hasToday ? ten.today : (ten.keys || []));
  const prevKeys = refRaw.map((k) => {
    const cut = String(k).indexOf("|");
    return cut < 0 ? k : (isVersionedMergeKey(k) ? k : tenureKey(k.slice(0, cut), k.slice(cut + 1)));
  });

  let ever = normalizeEver(everStored);
  if (recovery.prior) {
    for (const k of Object.keys(recovery.prior.ever)) ever[k] = true;
  }
  let everMigrated = !!everStored && Object.keys(ever).length > 0;

  if (!everMigrated) {
    const order = Object.keys(seen);
    const count = week === EVER_MIGRATION_WEEK
      ? Math.min(EVER_MIGRATION_PREVIOUS_COUNT, order.length)
      : order.length;
    for (const k of order.slice(0, count)) ever[k] = true;
    everMigrated = true;
  }

  const first = !prevKeys.length;
  const rolled = !first && ten.week !== week;

  /* At a day rollover, yesterday's final published chart becomes historical.
     Same-day rebuilds never add today's entrants here, so a first-time song
     remains NEW all day instead of becoming RE-ENTRY on the second rebuild. */
  if (rolled) {
    for (const k of prevKeys) ever[k] = true;
  }

  const newKeys = [];
  tracks.forEach((track, i) => {
    const key = tenureKey(track.title, track.artist);
    newKeys.push(key);
    const prevPos = prevKeys.indexOf(key);

    if (first) {
      if (firstDay[key] == null) firstDay[key] = week;
      track.delta = "0";
    } else if (prevPos < 0) {
      firstDay[key] = week;
      track.delta = ever[key] ? "re-entry" : "new";
    } else {
      if (firstDay[key] == null) firstDay[key] = week;
      track.delta = String(prevPos - i);
    }

    track.weeks = Math.max(1, week - firstDay[key] + 1);
    if (!first && prevPos >= 0) track.weeks = Math.max(2, track.weeks);
    seen[key] = { weeks: track.weeks, lastPos: i, lastWeek: week, delta: track.delta };
  });

  if (diag) {
    const near = [];
    tracks.forEach((t, i) => {
      const d = String(t.delta).toLowerCase();
      if (d !== "new" && d !== "re-entry") return;
      const k = tenureKey(t.title, t.artist);
      const head = k.split("|")[0];
      for (let j = 0; j < prevKeys.length; j += 1) {
        if (prevKeys[j].split("|")[0] !== head) continue;
        near.push({ rank: i + 1, key: k, refPos: j + 1, refKey: prevKeys[j], refRaw: String(refRaw[j]) });
        break;
      }
    });
    diag.week = week;
    diag.sameDay = sameDay;
    diag.refSource = sameDay ? "keys" : (hasToday ? "today" : "keys-fallback");
    diag.refLen = prevKeys.length;
    diag.nearMiss = near;
    diag.ever = Object.keys(ever).length;
    diag.new = tracks.filter((t) => String(t.delta).toLowerCase() === "new").length;
    diag.reentry = tracks.filter((t) => String(t.delta).toLowerCase() === "re-entry").length;
  }

  if (first) {
    ten.keys = newKeys;
    ten.today = newKeys;
  } else if (rolled) {
    ten.keys = Array.isArray(ten.today) && ten.today.length ? ten.today : prevKeys;
    ten.today = newKeys;
  } else {
    ten.today = newKeys;
  }

  ten.week = week;
  ten.seen = seen;
  if (env && env.DESK) {
    await env.DESK.put(TENURE_KV, JSON.stringify(ten));
    await env.DESK.put(FIRST_KV, JSON.stringify(firstDay));
    await env.DESK.put(EVER_KV, JSON.stringify({ schema: 1, seen: ever }));
  }
  return tracks;
}

/* Movement self-check:
   NEW and RE-ENTRY both start a fresh current run at 1 day.
   Numeric movement requires presence in yesterday's Top 50. */
function arrowCheck(tracks) {
  const taken = new Set();
  let bad = 0;
  let mixed = 0;
  let fresh = 0;
  let reentry = 0;

  tracks.forEach((t, i) => {
    const d = String(t.delta == null ? "" : t.delta).toLowerCase();
    const w = Number(t.weeks) || 0;
    if (d === "new" || d === "re-entry") {
      if (d === "new") fresh += 1;
      else reentry += 1;
      if (w !== 1) mixed += 1;
      return;
    }
    const n = Number(d);
    if (!Number.isFinite(n)) { bad += 1; return; }
    if (w < 2) mixed += 1;
    const p = i + n;
    if (p < 0 || p >= tracks.length || taken.has(p)) bad += 1;
    else taken.add(p);
  });

  return { ok: bad === 0 && mixed === 0, bad, mixed, new: fresh, reentry };
}
const UA = "Mozilla/5.0 (compatible; music98/1.0)";

function points(pos) {
  const n = Number(pos);
  if (!n || n < 1 || n > SIZE) return 0;
  return SIZE + 1 - n;
}

async function getText(url) {
  const r = await fetch(url, {
    headers: { "User-Agent": UA },
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new Error(String(r.status));
  return r.text();
}
async function getJson(url) {
  return JSON.parse(await getText(url));
}
async function postJson(url, body) {
  const r = await fetch(url, {
    method: "POST",
    headers: {
      "User-Agent": UA,
      "Content-Type": "application/json",
      Origin: "https://charts.youtube.com",
      Referer: "https://charts.youtube.com/charts/TopSongs/global/weekly",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}

function parseApple(data) {
  return ((data.feed && data.feed.results) || []).slice(0, SIZE).map((item, i) => ({
    pos: i + 1,
    title: item.name || "",
    artist: item.artistName || "",
    url: item.url || "",
    art: (item.artworkUrl100 || "").replace("100x100bb", "600x600bb"),
    year: (item.releaseDate || "").slice(0, 4),
    prev: "",
  })).filter((r) => r.title && r.artist);
}

function parseDeezer(data) {
  return (data.data || []).slice(0, SIZE).map((item, i) => ({
    pos: i + 1,
    title: item.title || "",
    artist: (item.artist && item.artist.name) || "",
    url: "",
    art: (item.album && (item.album.cover_xl || item.album.cover_medium)) || "",
    year: "",
    prev: "",
  })).filter((r) => r.title && r.artist);
}

function parseSpotify(html) {
  const rows = [];
  const re = /<tr><td class="np">(\d+)<\/td>\s*<td class="np">[^<]*<\/td>\s*<td class="text mp"><div>(.*?)<\/div><\/td>/gs;
  let m;
  while ((m = re.exec(html))) {
    const pos = Number(m[1]);
    if (pos > SIZE) continue;
    const text = m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    const cut = text.indexOf(" - ");
    if (cut < 0) continue;
    rows.push({
      pos,
      title: text.slice(cut + 3).trim(),
      artist: text.slice(0, cut).trim(),
      url: "",
      art: "",
      year: "",
      prev: "",
    });
  }
  return rows.sort((a, b) => a.pos - b.pos).slice(0, SIZE);
}

function parseYouTube(data) {
  const content =
    data &&
    data.contents &&
    data.contents.sectionListRenderer &&
    data.contents.sectionListRenderer.contents &&
    data.contents.sectionListRenderer.contents[0] &&
    data.contents.sectionListRenderer.contents[0].musicAnalyticsSectionRenderer &&
    data.contents.sectionListRenderer.contents[0].musicAnalyticsSectionRenderer.content;
  const groups = (content && content.trackTypes) || [];
  const weekly = groups.find((g) => g.chartPeriodType === "CHART_PERIOD_TYPE_WEEKLY") || groups[0] || {};
  const views = weekly.trackViews || [];
  const seen = new Set();
  const rows = [];
  for (const item of views) {
    const title = item.name || "";
    const artist = ((item.artists || []).map((a) => a && a.name).filter(Boolean)).join(", ");
    if (!title || !artist) continue;
    const key = mergeKey(title, artist);
    if (seen.has(key)) continue;
    seen.add(key);
    const pos = Number(item.chartEntryMetadata && item.chartEntryMetadata.currentPosition) || rows.length + 1;
    if (pos < 1 || pos > SIZE) continue;
    rows.push({ pos, title, artist, url: "", art: "", year: "", prev: "" });
    if (rows.length >= SIZE) break;
  }
  return rows.sort((a, b) => a.pos - b.pos).slice(0, SIZE);
}

function parseBillboard(html) {
  const parts = html.split("o-chart-results-list-row //");
  const seen = new Set();
  const rows = [];
  for (const chunk of parts.slice(1)) {
    const tm = chunk.match(/id="title-of-a-story"[^>]*>\s*([^<]+)/);
    const am = chunk.match(/href="https:\/\/www\.billboard\.com\/artist\/[^"]+"[^>]*>\s*([^<]+)/);
    if (!tm || !am) continue;
    const title = tm[1].replace(/&#039;/g, "'").trim();
    const artist = am[1].trim();
    if (!title || !artist) continue;
    const key = mergeKey(title, artist);
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({ pos: rows.length + 1, title, artist, url: "", art: "", year: "", prev: "" });
    if (rows.length >= SIZE) break;
  }
  return rows;
}

function ingest(bucket, src, rows) {
  for (const row of rows) {
    const key = mergeKey(row.title, row.artist);
    const rec = bucket.get(key) || {
      title: row.title,
      artist: row.artist,
      ranks: {},
      url: "",
      art: "",
      prev: "",
      year: "",
    };
    rec.ranks[src] = row.pos;
    if (src === "A") {
      rec.title = row.title;
      rec.artist = row.artist;
      rec.nameSrc = "A";
    }
    if (row.url && !rec.url) rec.url = row.url;
    /* обложку предпочитаем Apple, Deezer оставляем только как запасной вариант */
    if (row.art && (!rec.art || (isAppleArt(row.art) && !isAppleArt(rec.art)))) rec.art = row.art;
    if (isApplePreview(row.prev) && !isApplePreview(rec.prev)) rec.prev = row.prev;
    if (row.year && !rec.year) rec.year = row.year;
    bucket.set(key, rec);
  }
}

async function safe(label, fn) {
  try {
    const rows = await fn();
    return rows || [];
  } catch {
    return [];
  }
}

async function seedBaked(origin, tracks) {
  /* The baked chart carries verified Apple urls and 30s previews; reuse them
     so a slow or rate-limited iTunes lookup cannot leave rows silent. */
  try {
    const baked = await getJson(origin + "/data/top50.json");
    const map = new Map();
    (baked.tracks || []).forEach((t) => {
      map.set(mergeKey(t.title, t.artist), t);
    });
    tracks.forEach((t) => {
      const b = map.get(mergeKey(t.title, t.artist));
      if (!b) return;
      if (!isApplePreview(t.prev) && isApplePreview(b.prev)) t.prev = b.prev;
      if (!t.url && b.url) t.url = b.url;
      if (b.art && isAppleArt(b.art) && !isAppleArt(t.art)) t.art = b.art;
      if (!t.year && b.year) t.year = b.year;
    });
  } catch {}
}

export async function buildTop50(origin, env) {
  const [apple, spotify, deezer, billboard, youtube] = await Promise.all([
    safe("A", async () => parseApple(await getJson("https://rss.applemarketingtools.com/api/v2/us/music/most-played/50/songs.json"))),
    safe("S", async () => parseSpotify(await getText("https://kworb.net/spotify/country/global_daily.html"))),
    safe("D", async () => parseDeezer(await getJson("https://api.deezer.com/chart/0/tracks?limit=50"))),
    safe("B", async () => parseBillboard(await getText("https://www.billboard.com/charts/hot-100/"))),
    safe("Y", async () => parseYouTube(await postJson(YT_CHARTS, {
      context: {
        client: {
          clientName: "WEB_MUSIC_ANALYTICS",
          clientVersion: "2.0",
          hl: "en",
          gl: "US",
          theme: "MUSIC",
        },
      },
      browseId: "FEmusic_analytics_charts_home",
      query: JSON.stringify({ region: "global" }),
    }))),
  ]);
  const bucket = new Map();
  ingest(bucket, "A", apple);
  ingest(bucket, "S", spotify);
  ingest(bucket, "D", deezer);
  ingest(bucket, "B", billboard);
  ingest(bucket, "Y", youtube);
  const ranked = [...bucket.values()]
    .sort((a, b) => {
      const sa = SOURCES.reduce((n, k) => n + points(a.ranks[k]), 0);
      const sb = SOURCES.reduce((n, k) => n + points(b.ranks[k]), 0);
      if (sb !== sa) return sb - sa;
      const ca = SOURCES.filter((k) => a.ranks[k]).length;
      const cb = SOURCES.filter((k) => b.ranks[k]).length;
      if (cb !== ca) return cb - ca;
      const ba = Math.min(...SOURCES.map((k) => a.ranks[k]).filter(Boolean), 99);
      const bb = Math.min(...SOURCES.map((k) => b.ranks[k]).filter(Boolean), 99);
      if (ba !== bb) return ba - bb;
      return a.title.localeCompare(b.title);
    })
    .slice(0, SIZE);
  const tracks = ranked.map((rec, i) => ({
    rank: i + 1,
    title: rec.title,
    artist: rec.artist,
    url: rec.url || "",
    art: rec.art || "",
    prev: isApplePreview(rec.prev) ? rec.prev : "",
    year: rec.year || "",
    nameSrc: rec.nameSrc || "",
  }));
  const coverStats = { asked: 0, filled: 0, failed: 0 };
  /* порядок важен: сначала данные Apple из засева (имя, ссылка, превью, год),
     потом добор из запечённого файла, потом обложки и живые запросы к Apple */
  await applyNames(env, tracks, origin);
  tracks.forEach((t) => { delete t.nameSrc; });
  await seedBaked(origin || "", tracks);
  await applyCovers(env, tracks, origin);  /* засев -> память -> сборка -> Deezer -> пусто */
  await enrichArtByIds(tracks, coverStats); /* точный релиз по Apple-ID из ссылки */
  await enrichApple(tracks);               /* добор Apple URL/preview + safe exact artwork */
  await enrichArtByIds(tracks, coverStats);/* URL мог появиться только на предыдущем шаге */
  await applyCovers(env, tracks, origin);  /* registry wins; exact Apple art is a safe bridge */
  await applyLoudness(env, tracks, origin);
  tracks.forEach((t) => {
    t.url = appleAff(t.url);
    if (!isApplePreview(t.prev)) t.prev = "";
  });
  return {
    updated: new Date().toISOString().slice(0, 10),
    launch: "2026-09-17",
    week: chartWeek() + 1,
    rev: "tenure-recovery-v33",
    sources: { A: apple.length, S: spotify.length, D: deezer.length, B: billboard.length, Y: youtube.length },
    seed: {
      covers: Object.keys(COVER_SEED || {}).length,
      names: Object.keys(NAME_SEED || {}).length,
      namesWithUrl: Object.values(NAME_SEED || {}).filter((v) => v && v.url).length,
      loudness: Object.keys(LOUDNESS_SEED || {}).filter((k) => k !== "__meta").length,
    },
    covers: { ...coverStats, missing: tracks.filter((t) => !t.art).length },
    tracks,
  };
}

function leadArtistName(s) {
  return String(s || "")
    .split(/\s*(?:,|&|\/|\+| x | × | feat\.? | ft\.? | featuring | with | w\/ )\s*/i)[0]
    .trim();
}

async function itunesLookup(title, artist) {
  const term = encodeURIComponent(`${artist} ${stripParen(title)}`.trim());
  const data = await getJson(`https://itunes.apple.com/search?term=${term}&entity=song&limit=25&country=US`);
  const hit = pickAppleCandidate(title, artist, data.results || []);
  if (!hit) return {};
  const album = String(hit.collectionId || "");
  const track = String(hit.trackId || "");
  const url = album && track ? `https://music.apple.com/us/album/${album}?i=${track}` : (hit.trackViewUrl || "");
  return {
    title: String(hit.trackName || ""),
    artist: String(hit.artistName || ""),
    url,
    art: String(hit.artworkUrl100 || "").replace("100x100bb", "600x600bb"),
    prev: hit.previewUrl || "",
    year: String(hit.releaseDate || "").slice(0, 4),
  };
}

async function enrichApple(tracks) {
  await Promise.all(tracks.map(async (t) => {
    if (t.url && isApplePreview(t.prev) && t.art) return;
    const grab = (title, artist) => Promise.race([
      itunesLookup(title, artist),
      new Promise((_, reject) => setTimeout(() => reject(new Error("itunes-timeout")), 6000)),
    ]);
    try {
      const exact = await grab(t.title, t.artist);
      if (exact.art && isAppleArt(exact.art) &&
          applyAppleCanonicalIdentity(t, exact.title, exact.artist) &&
          !t.art) {
        t.art = exact.art;
      }
      let extra = exact;
      const incomplete = !(extra.prev && isApplePreview(extra.prev)) || !extra.url;
      if (incomplete) {
        const lead = leadArtistName(t.artist);
        if (lead && lead !== String(t.artist || "").trim()) {
          try { extra = await grab(t.title, lead); } catch {}
        }
      }
      if (extra.prev && isApplePreview(extra.prev)) t.prev = extra.prev;
      if (extra.url && !t.url) t.url = extra.url;
      if (extra.year && !t.year) t.year = extra.year;
    } catch {}
  }));
}

function top50Response(payload) {
  return new Response(JSON.stringify(payload), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      /* The ranking itself lives in KV, but artwork is a separately deployed
         verified registry. Edge-caching the decorated response for an hour
         made repaired covers stay missing after the registry had been fixed. */
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "CDN-Cache-Control": "no-store",
      "Cloudflare-CDN-Cache-Control": "no-store",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
}

async function bakedTop50(request) {
  try {
    const r = await fetch(new URL("/data/top50.json", request.url));
    if (r.ok) return await r.json();
  } catch {}
  return null;
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

/* Reject the 2026-10-01 failure mode before serving a poisoned daily KV
   payload: rows that were already established cannot all return to day one.
   Compare only with a verified backup from the same or preceding chart day. */
function cachedTenureRegressed(payload, backup) {
  const current = backup && backup.current;
  if (!payload || !current || !Array.isArray(current.tracks)) return false;
  if (String(payload.updated || "") < String(current.updated || "")) return true;
  const reference = payload.updated === current.updated ? backup.previous : current;
  if (!reference || !Array.isArray(reference.tracks)) return false;
  const gap = Math.round((Date.parse(payload.updated + "T00:00:00Z") -
    Date.parse(reference.updated + "T00:00:00Z")) / 86400000);
  if (gap !== 0 && gap !== 1) return false;
  const old = new Map(reference.tracks.map(t => [tenureKey(t.title, t.artist), t]));
  const established = (payload.tracks || []).map(t => ({t, prev:old.get(tenureKey(t.title,t.artist))}))
    .filter(x => x.prev && Number(x.prev.weeks) >= 2);
  if (established.length < 10) return false;
  const broken = established.filter(({t,prev}) =>
    Number(t.weeks) < Number(prev.weeks) + gap);
  return broken.length >= Math.ceil(established.length * 0.25);
}

/* This checked-in snapshot is updated only after the live chart passes its
   tenure audit. Unlike the 17 September baked seed, it preserves an actual
   recent ranking, arrow positions and cumulative day counts. */
async function verifiedBackupTop50(env, origin, backup) {
  const snap = backup && backup.current;
  if (!snap || !Array.isArray(snap.tracks) || snap.tracks.length !== SIZE ||
      !/^20\d{2}-\d{2}-\d{2}$/.test(String(snap.updated || ""))) return null;
  const baked = await readSeed(env, origin, "top50.json");
  const known = new Map(((baked && baked.tracks) || [])
    .map(t => [tenureKey(t.title,t.artist), t]));
  const tracks = snap.tracks.map((t,i) => {
    const prev = known.get(tenureKey(t.title,t.artist)) || {};
    return {
      rank: i+1, title: t.title, artist: t.artist,
      weeks: Math.max(1, Number(t.weeks) || 1), delta: String(t.delta ?? "0"),
      url: prev.url || "", prev: prev.prev || "", year: prev.year || "", art: ""
    };
  });
  await applyNames(env, tracks, origin);
  await applyCovers(env, tracks, origin);
  await applyLoudness(env, tracks, origin);
  tracks.forEach(t => { t.url = appleAff(t.url); if (!isApplePreview(t.prev)) t.prev = ""; });
  return {
    updated: snap.updated, launch:"2026-09-17", week:Number(snap.week)+1,
    rev:"verified-backup-v34", fallback:"verified-snapshot", tracks,
    covers:{ missing:tracks.filter(t=>!t.art).length }
  };
}

/* Последний удачный сбор лежит в памяти по ключу дня. Если сегодняшняя сборка не
   удалась, показать вчерашний настоящий чарт честнее, чем запечённый снапшот первого
   дня: в нём и места, и счётчик дней давно не те (он писался 17.09). */
async function lastGood(env, backup) {
  if (!env || !env.DESK) return null;
  try {
    const v = await env.DESK.get(TOP50_KV, { type: "json" });
    if (v && Array.isArray(v.tracks) && v.tracks.length === SIZE &&
        !cachedTenureRegressed(v, backup)) return v;
  } catch {}
  return null;
}

/* The baked fallback file was written when covers still came from any source; run it
   through the same Apple-only cover pass before serving, so a failed rebuild cannot
   put Deezer sleeves (or a different picture) on the page. */
async function healMissingArtwork(env, tracks, origin) {
  const before = (tracks || []).filter((t) => !t.art).length;
  if (!before) return { before: 0, after: 0, filled: 0 };
  await enrichArtByIds(tracks);
  const stillMissing = tracks.filter((t) => !t.art);
  if (stillMissing.length) {
    await enrichApple(stillMissing);
    await enrichArtByIds(stillMissing);
  }
  await applyCovers(env, tracks, origin);
  const after = tracks.filter((t) => !t.art).length;
  return { before, after, filled: Math.max(0, before - after) };
}

async function bakedWithCovers(env, baked, origin) {
  if (baked && Array.isArray(baked.tracks) && baked.tracks.length) {
    try {
      await applyNames(env, baked.tracks, origin);
      await applyCovers(env, baked.tracks, origin);
      await healMissingArtwork(env, baked.tracks, origin);
      await applyLoudness(env, baked.tracks, origin);
    } catch {}
  }
  return baked;
}

async function decorateCachedTop50(env, payload, origin) {
  if (payload && Array.isArray(payload.tracks) && payload.tracks.length) {
    try {
      await applyNames(env, payload.tracks, origin);
      await applyCovers(env, payload.tracks, origin);
      const healed = await healMissingArtwork(env, payload.tracks, origin);
      await applyLoudness(env, payload.tracks, origin);
      payload.covers = {
        ...(payload.covers || {}),
        missing: healed.after,
        runtimeFilled: healed.filled,
      };
    } catch {}
  }
  return payload;
}

/* Prefer the newest proven chart: a healthy KV chart, or the checked-in
   snapshot if KV was reset or its only chart is older. Never fall back to the
   immutable 17 September launch chart and silently label it as current. */
async function bestVerifiedFallback(env, origin, backup) {
  const good = await lastGood(env, backup);
  const savedDay = backup && backup.current && backup.current.updated || "";
  if (good && String(good.updated) >= savedDay)
    return decorateCachedTop50(env, good, origin);
  try {
    const saved = await verifiedBackupTop50(env, origin, backup);
    if (saved) return saved;
  } catch {}
  return good ? decorateCachedTop50(env, good, origin) : null;
}

export async function onRequestGet({ env, request }) {
  const today = new Date().toISOString().slice(0, 10);
  const origin = new URL(request.url).origin;
  const backup = await readSeed(env, origin, "chart-tenure-backup.json");
  if (env && env.DESK) {
    try {
      const cached = await env.DESK.get(TOP50_KV, { type: "json" });
      if (cached && cached.updated === today && Array.isArray(cached.tracks) &&
          cached.tracks.length === SIZE && !cachedTenureRegressed(cached, backup)) {
        return top50Response(await decorateCachedTop50(env, cached, origin));
      }
    } catch {}
  }
  try {
    const payload = await withTimeout(buildTop50(origin, env), 14000);
    const activeSources = Object.values(payload.sources || {})
      .filter(n => Number(n) >= 10).length;
    if (!Array.isArray(payload.tracks) || payload.tracks.length !== SIZE ||
        activeSources < 2) throw new Error("incomplete chart sources");
    const memory = {};
    payload.tracks = await applyTenure(env, payload.tracks, memory, origin);
    payload.memory = memory;
    payload.arrows = arrowCheck(payload.tracks);
    if (payload.arrows && payload.arrows.ok === false ||
        cachedTenureRegressed(payload, backup))
      throw new Error("chart tenure continuity failed");
    if (env && env.DESK) {
      try { await env.DESK.put(TOP50_KV, JSON.stringify(payload)); } catch {}
    }
    return top50Response(payload);
  } catch (err) {
    const fallback = await bestVerifiedFallback(env, origin, backup);
    if (fallback) return top50Response(fallback);
    return new Response(JSON.stringify({error:"chart_temporarily_unavailable"}), {
      status:503, headers:{"Content-Type":"application/json","Cache-Control":"no-store"}
    });
  }
}
