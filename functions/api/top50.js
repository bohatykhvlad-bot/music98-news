const SIZE = 50;
const LAUNCH = Date.UTC(2026, 8, 17);
const APPLE_AT = "1001l3aZW";
const APPLE_CT = "music98";
const TOP50_KV = "top50v6";
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
    const nk = tenureKey(k.slice(0, cut), k.slice(cut + 1));
    const prev = out[nk];
    if (!prev || (Number(v && v.weeks) || 0) > (Number(prev.weeks) || 0)) out[nk] = v;
  }
  return out;
}
const TENURE_KV = "tenure_v3";
/* День первого появления каждой песни живёт ОТДЕЛЬНЫМ ключом. Реестр можно
   пересобрать, переименовать или потерять - счётчик "N days on chart" от этого
   больше не обнуляется (19.09 это уже случилось: весь чарт показал "1 день"). */
const FIRST_KV = "tenure_first_v1";
async function applyTenure(env, tracks) {
  const week = chartWeek();
  /* week starts at -1 so the very first daily run opens the registry fresh. */
  let ten = { launch: "2026-09-17", epoch: "daily", week: -1, keys: [], seen: {} };
  let firstDay = {};
  if (env && env.DESK) {
    const v = await env.DESK.get(TENURE_KV, { type: "json" });
    if (v && v.epoch === "daily") ten = v;
    firstDay = (await env.DESK.get(FIRST_KV, { type: "json" })) || {};
  }
  const prevKeys = (ten.keys || []).map((k) => {
    const cut = String(k).indexOf("|");
    return cut < 0 ? k : tenureKey(k.slice(0, cut), k.slice(cut + 1));
  });
  const seen = rekeySeen(ten);
  /* первое заполнение памятки: день появления берём из того, что помнит реестр
     (считаем от lastWeek записи, а не от сегодня - иначе счёт съезжает на день) */
  for (const [k, rec] of Object.entries(seen)) {
    if (firstDay[k] != null) continue;
    const w = Number(rec && rec.weeks) || 1;
    const at = Number(rec && rec.lastWeek);
    firstDay[k] = Math.max(0, (Number.isFinite(at) ? at : week) - (w - 1));
  }
  const first = !prevKeys.length;
  const rolled = !first && ten.week !== week;
  const newKeys = [];
  tracks.forEach((track, i) => {
    const key = tenureKey(track.title, track.artist);
    newKeys.push(key);
    const prevPos = prevKeys.indexOf(key);
    const rec = seen[key] || { weeks: 0 };
    if (first) {
      if (firstDay[key] == null) firstDay[key] = week;
      track.delta = "0";
    } else if (!rolled) {
      if (firstDay[key] == null) firstDay[key] = week;
      /* та же сборка за день: движение показываем только если оно посчитано сегодня */
      track.delta = rec.lastWeek === week && rec.delta != null && rec.delta !== "" ? String(rec.delta) : "0";
    } else if (prevPos < 0) {
      /* песни вчера не было: серия начинается заново -> NEW (правило владельца) */
      firstDay[key] = week;
      track.delta = "new";
    } else {
      if (firstDay[key] == null) firstDay[key] = week;
      track.delta = String(prevPos - i);
    }
    track.weeks = Math.max(1, week - firstDay[key] + 1);
    seen[key] = { weeks: track.weeks, lastPos: i, lastWeek: week, delta: track.delta };
  });
  if (first || rolled) ten.keys = newKeys;
  ten.week = week;
  ten.seen = seen;
  if (env && env.DESK) {
    await env.DESK.put(TENURE_KV, JSON.stringify(ten));
    await env.DESK.put(FIRST_KV, JSON.stringify(firstDay));
  }
  return tracks;
}
const UA = "Mozilla/5.0 (compatible; music98/1.0)";

function stripParen(s) {
  return String(s || "").replace(/\([^)]*\)|\[[^\]]*\]/g, " ");
}
function normTitle(s) {
  const t = stripParen(s)
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/\b(remastered|remix|single|deluxe|from)\b/g, "")
    .replace(/[^a-z0-9]+/g, "");
  return t;
}
function primaryArtist(s) {
  return String(s || "")
    .split(/\s*(?:,|&|\/|\+| x | × | feat\.? | ft\.? | featuring | with | w\/ )\s*/i)[0]
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}
function mergeKey(title, artist) {
  return `${normTitle(title)}|${primaryArtist(artist)}`;
}
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
    }
    if (row.url && !rec.url) rec.url = row.url;
    if (row.art && !rec.art) rec.art = row.art;
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
      map.set(normTitle(t.title) + "|" + primaryArtist(t.artist), t);
    });
    tracks.forEach((t) => {
      const b = map.get(normTitle(t.title) + "|" + primaryArtist(t.artist));
      if (!b) return;
      if (!isApplePreview(t.prev) && isApplePreview(b.prev)) t.prev = b.prev;
      if (!t.url && b.url) t.url = b.url;
      if (!t.art && b.art) t.art = b.art;
      if (!t.year && b.year) t.year = b.year;
    });
  } catch {}
}

export async function buildTop50(origin) {
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
  }));
  await seedBaked(origin || "", tracks);
  await enrichApple(tracks);
  tracks.forEach((t) => {
    t.url = appleAff(t.url);
    if (!isApplePreview(t.prev)) t.prev = "";
  });
  return {
    updated: new Date().toISOString().slice(0, 10),
    launch: "2026-09-17",
    week: chartWeek() + 1,
    tracks,
  };
}

async function itunesLookup(title, artist) {
  const term = encodeURIComponent(`${artist} ${stripParen(title)}`.trim());
  const data = await getJson(`https://itunes.apple.com/search?term=${term}&entity=song&limit=5&country=US`);
  const wantT = normTitle(title);
  const wantA = primaryArtist(artist);
  let hit = (data.results || []).find((item) => normTitle(item.trackName) === wantT && primaryArtist(item.artistName) === wantA)
    || (data.results || []).find((item) => normTitle(item.trackName) === wantT)
    || (data.results || [])[0];
  if (!hit) return {};
  const album = String(hit.collectionId || "");
  const track = String(hit.trackId || "");
  const url = album && track ? `https://music.apple.com/us/album/${album}?i=${track}` : (hit.trackViewUrl || "");
  return {
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
      let extra = await grab(t.title, t.artist);
      const incomplete = !(extra.prev && isApplePreview(extra.prev)) || !extra.url;
      if (incomplete) {
        /* second chance without featured-artist noise in the term */
        try { extra = await grab(t.title, ""); } catch {}
      }
      if (extra.prev && isApplePreview(extra.prev)) t.prev = extra.prev;
      if (extra.url && !t.url) t.url = extra.url;
      if (extra.art && !t.art) t.art = extra.art;
      if (extra.year && !t.year) t.year = extra.year;
    } catch {}
  }));
}

function top50Response(payload) {
  return new Response(JSON.stringify(payload), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=300",
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

export async function onRequestGet({ env, request }) {
  const today = new Date().toISOString().slice(0, 10);
  if (env && env.DESK) {
    try {
      const cached = await env.DESK.get(TOP50_KV, { type: "json" });
      if (cached && cached.updated === today && Array.isArray(cached.tracks) && cached.tracks.length) {
        return top50Response(cached);
      }
    } catch {}
  }
  try {
    const payload = await withTimeout(buildTop50(new URL(request.url).origin), 14000);
    payload.tracks = await applyTenure(env, payload.tracks);
    if (env && env.DESK && payload.tracks && payload.tracks.length) {
      try { await env.DESK.put(TOP50_KV, JSON.stringify(payload)); } catch {}
    }
    if (payload.tracks && payload.tracks.length) return top50Response(payload);
  } catch (err) {
    const baked = await bakedTop50(request);
    if (baked && Array.isArray(baked.tracks) && baked.tracks.length) return top50Response(baked);
    return new Response(JSON.stringify({ error: "rebuild_failed", detail: String(err) }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
  const baked = await bakedTop50(request);
  if (baked && Array.isArray(baked.tracks) && baked.tracks.length) return top50Response(baked);
  return new Response(JSON.stringify({ error: "rebuild_failed" }), {
    status: 502,
    headers: { "Content-Type": "application/json" },
  });
}
