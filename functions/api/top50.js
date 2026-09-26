const SIZE = 50;
const LAUNCH = Date.UTC(2026, 8, 17);
const APPLE_AT = "1001l3aZW";
const APPLE_CT = "music98";
/* Bumped to v20 on 26.09: forces the rebuild where NEW always means one day.
   Any future "refresh the chart now" is the same bump. */
const TOP50_KV = "top50v25";
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

/* РћР±Р»РѕР¶РєР° Р±С‹Р»Р° РїСЂРёРІСЏР·Р°РЅР° Рє С‚РѕРјСѓ, РєС‚Рѕ РїРµСЂРІС‹Рј СЃРѕР·РґР°Р» СЃС‚СЂРѕРєСѓ, Рё РїСЂС‹РіР°Р»Р° РјРµР¶РґСѓ Apple
   (mzstatic) Рё Deezer (dzcdn). РџСЂР°РІРёР»Рѕ С‚РµРїРµСЂСЊ С‚Р°РєРѕРµ: РѕР±Р»РѕР¶РєСѓ Р±РµСЂС‘Рј РёР· Apple Рё СЂРѕРІРЅРѕ
   С‚РѕРіРѕ СЂРµР»РёР·Р°, РЅР° РєРѕС‚РѕСЂС‹Р№ РІРµРґС‘С‚ СЃСЃС‹Р»РєР° "Listen on Apple Music". iTunes API РёР·
   Cloudflare РѕС‚РІРµС‡Р°РµС‚ С‡РµСЂРµР· СЂР°Р·, РїРѕСЌС‚РѕРјСѓ РµСЃС‚СЊ Р·Р°СЃРµРІ РёР· public/data/covers.json -
   РµРіРѕ РєР°Р¶РґС‹Р№ РґРµРЅСЊ РѕР±РЅРѕРІР»СЏРµС‚ .github/workflows/covers.yml (С‚Р°Рј Apple РѕС‚РІРµС‡Р°РµС‚).
   Deezer РѕСЃС‚Р°С‘С‚СЃСЏ РїРѕСЃР»РµРґРЅРёРј РІР°СЂРёР°РЅС‚РѕРј, С‡С‚РѕР±С‹ РєР°СЂС‚РѕС‡РєР° РЅРµ РѕСЃС‚Р°Р»Р°СЃСЊ РїСѓСЃС‚РѕР№.
   РќР°Р№РґРµРЅРЅР°СЏ РѕР±Р»РѕР¶РєР° Р·Р°РїРѕРјРёРЅР°РµС‚СЃСЏ РїРѕ РїРµСЃРЅРµ, РїРѕСЌС‚РѕРјСѓ РґРµРЅСЊ РѕС‚Рѕ РґРЅСЏ РЅРµ РјРµРЅСЏРµС‚СЃСЏ. */
const COVERS_KV = "covers_v3";
const DZ_HOST = "dzcdn.net";
function isAppleArt(url) {
  try {
    const h = new URL(String(url || "")).hostname.toLowerCase();
    return h === "mzstatic.com" || h.endsWith(".mzstatic.com");
  } catch {
    return false;
  }
}
function isDeezerArt(url) {
  try {
    const h = new URL(String(url || "")).hostname.toLowerCase();
    return h === DZ_HOST || h.endsWith("." + DZ_HOST);
  } catch {
    return false;
  }
}
/* Р”Р°РЅРЅС‹Рµ Apple РґР»СЏ С‚РµРєСѓС‰РµРіРѕ С‡Р°СЂС‚Р° Р»РµР¶Р°С‚ РІ СЂРµРїРѕР·РёС‚РѕСЂРёРё: public/data/covers.json
   (РѕР±Р»РѕР¶РєРё) Рё public/data/apple-names.json (РёРјСЏ + СЃСЃС‹Р»РєР° + РїСЂРµРІСЊСЋ + РіРѕРґ). РС…
   РїРµСЂРµСЃРѕР±РёСЂР°РµС‚ scripts/build-covers.mjs РїРѕ СЂР°СЃРїРёСЃР°РЅРёСЋ
   (.github/workflows/apple-data.yml). Р§РёС‚Р°РµРј РёС… С‡РµСЂРµР· Р±РёРЅРґРёРЅРі ASSETS - СЌС‚Рѕ
   Р»РѕРєР°Р»СЊРЅРѕРµ С…СЂР°РЅРёР»РёС‰Рµ Р°СЃСЃРµС‚РѕРІ, Р±РµР· РІС‹С…РѕРґР° РІ РёРЅС‚РµСЂРЅРµС‚; СЃРµС‚РµРІРѕР№ С„РµС‚С‡ РѕСЃС‚Р°РІР»РµРЅ
   С‚РѕР»СЊРєРѕ РєР°Рє Р·Р°РїР°СЃ. Р Р°РЅСЊС€Рµ Р·Р°СЃРµРІ Р±СЂР°Р»СЃСЏ СЃРµС‚РµРІС‹Рј Р·Р°РїСЂРѕСЃРѕРј, Рё РєРѕРіРґР° РѕРЅ РЅРµ
   РѕС‚РІРµС‡Р°Р», РІРѕСЂРєРµСЂ Р·Р°РїРѕРјРёРЅР°Р» РїСѓСЃС‚РѕР№ Р·Р°СЃРµРІ РЅР° РІСЃСЋ Р¶РёР·РЅСЊ РёР·РѕР»СЏС‚Р°: С‡Р°СЃС‚СЊ СЃС‚СЂРѕРє
   РїРѕРєР°Р·С‹РІР°Р»Р° СѓСЃС‚Р°СЂРµРІС€РёРµ РёРјРµРЅР°, С‡СѓР¶РёРµ РѕР±Р»РѕР¶РєРё Рё РїСѓСЃС‚С‹Рµ СЃСЃС‹Р»РєРё. РџСѓСЃС‚РѕР№ РѕС‚РІРµС‚
   С‚РµРїРµСЂСЊ РќР• РєСЌС€РёСЂСѓРµС‚СЃСЏ. */
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
let NAME_SEED = null;
async function coverSeed(env, origin) {
  if (COVER_SEED) return COVER_SEED;
  const v = await readSeed(env, origin, "covers.json");
  if (v && typeof v === "object" && Object.keys(v).length) COVER_SEED = v;
  return v && typeof v === "object" ? v : {};
}
async function nameSeed(env, origin) {
  if (NAME_SEED) return NAME_SEED;
  const v = await readSeed(env, origin, "apple-names.json");
  if (v && typeof v === "object" && Object.keys(v).length) NAME_SEED = v;
  return v && typeof v === "object" ? v : {};
}
async function applyCovers(env, tracks, origin) {
  const seed = await coverSeed(env, origin);
  let covers = {};
  if (env && env.DESK) {
    try { covers = (await env.DESK.get(COVERS_KV, { type: "json" })) || {}; } catch {}
  }
  let changed = false;
  for (const t of tracks) {
    const key = mergeKey(t.title, t.artist);
    const cached = covers[key];
    /* РџСЂРёРѕСЂРёС‚РµС‚: Р·Р°СЃРµРІ Apple (РїРµСЂРµСЃРѕР±РёСЂР°РµС‚СЃСЏ РµР¶РµРґРЅРµРІРЅРѕ Рё СЃРѕРІРїР°РґР°РµС‚ СЃ СЂРµР»РёР·РѕРј
       СЃСЃС‹Р»РєРё) -> Р·Р°РїРѕРјРЅРµРЅРЅР°СЏ Apple -> Apple РёР· С‚РµРєСѓС‰РµР№ СЃР±РѕСЂРєРё (СЂР°Р·РѕРІРѕ Р·Р°РјРµРЅСЏРµС‚
       Р·Р°РєСЌС€РёСЂРѕРІР°РЅРЅС‹Р№ Deezer) -> Р·Р°РїРѕРјРЅРµРЅРЅС‹Р№ Deezer -> Deezer РёР· СЃР±РѕСЂРєРё -> РїСѓСЃС‚Рѕ. */
    const chosen = (isAppleArt(seed[key]) && seed[key])
      || (isAppleArt(cached) && cached)
      || (isAppleArt(t.art) && t.art)
      || cached
      || (isDeezerArt(t.art) ? t.art : "");
    if (chosen) {
      if (covers[key] !== chosen) { covers[key] = chosen; changed = true; }
      t.art = chosen;
    } else {
      t.art = "";
    }
  }
  if (env && env.DESK && changed) {
    try { await env.DESK.put(COVERS_KV, JSON.stringify(covers)); } catch {}
  }
  return tracks;
}
/* РћСЃС‚Р°Р»СЊРЅС‹Рµ РѕР±Р»РѕР¶РєРё РґРѕР±РёСЂР°РµРј РѕРґРЅРёРј batch-Р·Р°РїСЂРѕСЃРѕРј Apple РїРѕ track id РёР· СЃСЃС‹Р»РєРё:
   СЌС‚Рѕ СЂРѕРІРЅРѕ С‚РѕС‚ СЂРµР»РёР·, РєРѕС‚РѕСЂС‹Р№ РјС‹ РїРѕРєР°Р·С‹РІР°РµРј Рё РЅР° РєРѕС‚РѕСЂС‹Р№ РІРµРґС‘С‚ РєРЅРѕРїРєР°. */
async function enrichArtByIds(tracks, stats) {
  const want = [];
  for (const t of tracks) {
    if (isAppleArt(t.art)) continue;
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
        const art = String(item.artworkUrl100 || "").replace("100x100bb", "600x600bb");
        if (id && art) found.set(id, art);
      }
    } catch {
      if (stats) stats.failed += 1;
    }
  }
  for (const [t, id] of want) {
    const art = found.get(id);
    if (art) {
      t.art = art;
      if (stats) stats.filled += 1;
    }
  }
}

/* РќР°РїРёСЃР°РЅРёРµ РёРјРµРЅРё С‚РѕР¶Рµ Р·Р°РІРёСЃРµР»Рѕ РѕС‚ С‚РѕРіРѕ, РєС‚Рѕ РѕС‚РІРµС‚РёР» СЃРµРіРѕРґРЅСЏ: РїСЂРё РјРѕР»С‡Р°С‰РµРј Apple
   РїСЂРёРµР·Р¶Р°Р» СЃРїРѕС‚РёС„Р°Р№-РІР°СЂРёР°РЅС‚ ("KAROL G" РІРјРµСЃС‚Рѕ "KAROL G, Judeline & rusowsky").
   РўРµРїРµСЂСЊ РёРјСЏ Р·Р°РїРѕРјРёРЅР°РµС‚СЃСЏ РїРѕ РїРµСЃРЅРµ, РєР°Рє РѕР±Р»РѕР¶РєР°: С‡С‚Рѕ РїСЂРёРЅСЏР»Рё РѕРґРёРЅ СЂР°Р·, С‚Рѕ Рё РІРёСЃРёС‚.
   Р•СЃР»Рё Apple РѕС‚РІРµС‚РёС‚ Рё РїСЂРёРЅРµСЃС‘С‚ РїРѕР»РЅРѕРµ РЅР°РїРёСЃР°РЅРёРµ, РѕРЅРѕ РѕРґРёРЅ СЂР°Р· Р·Р°РјРµРЅРёС‚ СѓСЂРµР·Р°РЅРЅРѕРµ. */
/* Spotify РїРёС€РµС‚ С„РёС‚РѕРІ РІ РЅР°Р·РІР°РЅРёРё: "Die With A Smile (w/ Bruno Mars)", "WTF GOIN (feat. 21
   Savage)". Apple - РІ Р°СЂС‚РёСЃС‚Р°С…: "Lady Gaga, Bruno Mars". РџРµСЂРµРЅРѕСЃРёРј С„РёС‚ РІ СЃС‚СЂРѕРєСѓ Р°СЂС‚РёСЃС‚РѕРІ,
   С‡С‚РѕР±С‹ РЅР° СЃР°Р№С‚Рµ РЅРµ Р±С‹Р»Рѕ РЅРё "w/", РЅРё СЂР°Р·РЅРѕР±РѕСЏ РѕС‚ РёСЃС‚РѕС‡РЅРёРєР°. РЎРјС‹СЃР» РЅРµ РјРµРЅСЏРµС‚СЃСЏ, Р°
   РёРґРµРЅС‚РёС‡РЅРѕСЃС‚СЊ РїРµСЃРЅРё С‚Р° Р¶Рµ (normTitle СЃРєРѕР±РєРё РІСЃС‘ СЂР°РІРЅРѕ РѕС‚Р±СЂР°СЃС‹РІР°РµС‚). */
function cleanDisplay(title, artist) {
  const t0 = String(title || "").trim();
  const m = t0.match(/\s*[(\[](?:w\/|w\.|with|feat\.?|ft\.?|featuring)\s+([^)\]]+)[)\]]\s*$/i);
  if (!m) return { title: t0, artist: String(artist || "").trim() };
  const title2 = t0.slice(0, m.index).trim() || t0;
  let artist2 = String(artist || "").trim();
  const feats = m[1].split(/\s*(?:,|&|\+|\/| x | Г— | and )\s*/i).map((s) => s.trim()).filter(Boolean);
  const have = artist2.toLowerCase();
  for (const f of feats) if (f && !have.includes(f.toLowerCase())) artist2 = artist2 ? `${artist2}, ${f}` : f;
  return { title: title2, artist: artist2 };
}

const NAMES_KV = "names_v1";
/* РєР°РєРѕРµ РЅР°РїРёСЃР°РЅРёРµ РїРѕРєР°Р·С‹РІР°РµРј: Р·Р°СЃРµРІ Apple -> Р·Р°РїРѕРјРЅРµРЅРЅРѕРµ СЂР°РЅРµРµ -> С‚РµРєСѓС‰РµРµ (СЃ Р°РїРіСЂРµР№РґРѕРј РѕС‚ Apple).
   Р¤РёС‚ СЂР°Р·Р±РёСЂР°РµРј Р”Рћ СЃСЂР°РІРЅРµРЅРёСЏ (cleanDisplay РїРµСЂРµРЅРѕСЃРёС‚ РµРіРѕ РІ Р°СЂС‚РёСЃС‚РѕРІ), Рё "РІРµСЂСЃРёРµР№" СЃС‡РёС‚Р°РµРј
   С‚РѕР»СЊРєРѕ С‚Сѓ СЃРєРѕР±РєСѓ, РєРѕС‚РѕСЂР°СЏ РїРѕСЃР»Рµ СЌС‚РѕРіРѕ РѕСЃС‚Р°Р»Р°СЃСЊ: "(Track by Track)", "(Live)" Рё С‚.Рї.
   Р Р°РЅСЊС€Рµ С„РёС‚ РІ СЃРєРѕР±РєР°С… С‚РѕР¶Рµ СЃС‡РёС‚Р°Р»СЃСЏ РІРµСЂСЃРёРµР№ - Рё Сѓ "Cinderella (feat. Ty Dolla $ign)"
   РЅР°Р·РІР°РЅРёРµ Р±СЂР°Р»РѕСЃСЊ РёР· С‡Р°СЂС‚Р°, Р° С„РёС‚ С‚РµСЂСЏР»СЃСЏ СЃРѕРІСЃРµРј. */
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
    /* РЎСЃС‹Р»РєР°, РїСЂРµРІСЊСЋ Рё РіРѕРґ С‚РѕР¶Рµ Р±РµСЂСѓС‚СЃСЏ РёР· Р·Р°СЃРµРІР°: РѕРЅ СЃРІРµСЂРµРЅ СЃ РєРѕРЅРєСЂРµС‚РЅС‹Рј СЂРµР»РёР·РѕРј
       Apple, Р° Р·Р°РїРµС‡С‘РЅРЅС‹Р№ С„Р°Р№Р» С‡Р°СЂС‚Р° РјРѕР¶РµС‚ РІРµСЃС‚Рё РЅР° РІРµСЂСЃРёСЋ-РІР°СЂРёР°РЅС‚ РёР»Рё Р±С‹С‚СЊ РїСѓСЃС‚С‹Рј
       (Р¶РёРІРѕР№ РїСЂРёРјРµСЂ: СЃС‚СЂРѕРєР° Р±РµР· СЃСЃС‹Р»РєРё, РїРѕС‚РѕРјСѓ С‡С‚Рѕ iTunes РёР· РІРѕСЂРєРµСЂР° РЅРµ РѕС‚РІРµС‚РёР»). */
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
    const nk = tenureKey(k.slice(0, cut), k.slice(cut + 1));
    const prev = out[nk];
    if (!prev || (Number(v && v.weeks) || 0) > (Number(prev.weeks) || 0)) out[nk] = v;
  }
  return out;
}
const TENURE_KV = "tenure_v3";
/* Р”РµРЅСЊ РїРµСЂРІРѕРіРѕ РїРѕСЏРІР»РµРЅРёСЏ РєР°Р¶РґРѕР№ РїРµСЃРЅРё Р¶РёРІС‘С‚ РћРўР”Р•Р›Р¬РќР«Рњ РєР»СЋС‡РѕРј. Р РµРµСЃС‚СЂ РјРѕР¶РЅРѕ
   РїРµСЂРµСЃРѕР±СЂР°С‚СЊ, РїРµСЂРµРёРјРµРЅРѕРІР°С‚СЊ РёР»Рё РїРѕС‚РµСЂСЏС‚СЊ - СЃС‡С‘С‚С‡РёРє "N days on chart" РѕС‚ СЌС‚РѕРіРѕ
   Р±РѕР»СЊС€Рµ РЅРµ РѕР±РЅСѓР»СЏРµС‚СЃСЏ (19.09 СЌС‚Рѕ СѓР¶Рµ СЃР»СѓС‡РёР»РѕСЃСЊ: РІРµСЃСЊ С‡Р°СЂС‚ РїРѕРєР°Р·Р°Р» "1 РґРµРЅСЊ"). */
const FIRST_KV = "tenure_first_v1";
/* Р–СѓСЂРЅР°Р» РїРµСЂРІРѕРіРѕ РґРЅСЏ С‚РѕР¶Рµ РїРµСЂРµРёРЅРґРµРєСЃРёСЂСѓРµРј: Р·Р°РїРёСЃРё, СЃРґРµР»Р°РЅРЅС‹Рµ РґРѕ РїРµСЂРµС…РѕРґР° РЅР°
   РЅРѕСЂРјР°Р»РёР·РѕРІР°РЅРЅС‹Рµ РєР»СЋС‡Рё, Р»РµР¶Р°С‚ РїРѕРґ СЃС‚Р°СЂС‹РјРё "РќР°Р·РІР°РЅРёРµ|РђСЂС‚РёСЃС‚" Рё РёРЅР°С‡Рµ РЅРµ РЅР°С…РѕРґСЏС‚СЃСЏ -
   РїРµСЃРЅСЏ, РєРѕС‚РѕСЂР°СЏ РІС‡РµСЂР° Р±С‹Р»Р° РІ С‡Р°СЂС‚Рµ, РїРѕРєР°Р·С‹РІР°Р»Р° "1 day on chart". РўСЂР°РЅСЃС„РѕСЂРјР°С†РёСЏ
   РёРґРµРјРїРѕС‚РµРЅС‚РЅР°; РїСЂРё СЃРєР»РµР№РєРµ РґРІСѓС… РєР»СЋС‡РµР№ Р±РµСЂС‘Рј СЃР°РјС‹Р№ СЂР°РЅРЅРёР№ РґРµРЅСЊ. */
function rekeyFirstDays(old) {
  const out = {};
  for (const [k, v] of Object.entries(old || {})) {
    const cut = String(k).indexOf("|");
    const nk = cut < 0 ? k : tenureKey(k.slice(0, cut), k.slice(cut + 1));
    const day = Number(v);
    if (!Number.isFinite(day)) continue;
    out[nk] = out[nk] == null ? day : Math.min(out[nk], day);
  }
  return out;
}
async function applyTenure(env, tracks, diag) {
  const week = chartWeek();
  /* week starts at -1 so the very first daily run opens the registry fresh. */
  let ten = { launch: "2026-09-17", epoch: "daily", week: -1, keys: [], seen: {} };
  let firstDay = {};
  if (env && env.DESK) {
    const v = await env.DESK.get(TENURE_KV, { type: "json" });
    if (v && v.epoch === "daily") ten = v;
    firstDay = rekeyFirstDays(await env.DESK.get(FIRST_KV, { type: "json" }));
  }
  /* Р­С‚Р°Р»РѕРЅ СЃС‚СЂРµР»РѕРє - РїРѕСЂСЏРґРѕРє РџР РћРЁР›РћР“Рћ РґРЅСЏ. Р’ С‚РѕС‚ Р¶Рµ РґРµРЅСЊ СЌС‚Рѕ СѓР¶Рµ Р·Р°С„РёРєСЃРёСЂРѕРІР°РЅРЅС‹Р№
     ten.keys, Р° РЅР° РЅРѕРІРѕРј РґРЅРµ - РїРѕСЃР»РµРґРЅРёР№ РїРѕСЂСЏРґРѕРє РїСЂРѕС€Р»РѕРіРѕ РґРЅСЏ (ten.today). */
  const sameDay = ten.week === week;
  const hasToday = Array.isArray(ten.today) && ten.today.length > 0;
  const refRaw = sameDay
    ? (ten.keys || [])
    : (hasToday ? ten.today : (ten.keys || []));
  const prevKeys = refRaw.map((k) => {
    const cut = String(k).indexOf("|");
    return cut < 0 ? k : tenureKey(k.slice(0, cut), k.slice(cut + 1));
  });
  const seen = rekeySeen(ten);
  /* РїРµСЂРІРѕРµ Р·Р°РїРѕР»РЅРµРЅРёРµ РїР°РјСЏС‚РєРё: РґРµРЅСЊ РїРѕСЏРІР»РµРЅРёСЏ Р±РµСЂС‘Рј РёР· С‚РѕРіРѕ, С‡С‚Рѕ РїРѕРјРЅРёС‚ СЂРµРµСЃС‚СЂ
     (СЃС‡РёС‚Р°РµРј РѕС‚ lastWeek Р·Р°РїРёСЃРё, Р° РЅРµ РѕС‚ СЃРµРіРѕРґРЅСЏ - РёРЅР°С‡Рµ СЃС‡С‘С‚ СЃСЉРµР·Р¶Р°РµС‚ РЅР° РґРµРЅСЊ) */
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
    if (first) {
      if (firstDay[key] == null) firstDay[key] = week;
      track.delta = "0";
    } else if (prevPos < 0) {
      /* Р’Рѕ РІС‡РµСЂР°С€РЅРµРј РїРѕСЂСЏРґРєРµ РїРµСЃРЅРё РЅРµС‚: СЌС‚Рѕ РЅРѕРІР°СЏ РёР»Рё РІРµСЂРЅСѓРІС€Р°СЏСЃСЏ РїРµСЃРЅСЏ.
         Р’Р»Р°РґРµР»РµС†: РїСЂРѕРїСѓСЃС‚РёР»Р° РґРµРЅСЊ -> NEW, СЃРµСЂРёСЏ РЅР°С‡РёРЅР°РµС‚СЃСЏ Р·Р°РЅРѕРІРѕ. РџРѕСЌС‚РѕРјСѓ
         firstDay СЃР±СЂР°СЃС‹РІР°РµРј Р’РЎР•Р“Р”Рђ, Р° РЅРµ С‚РѕР»СЊРєРѕ РЅР° РЅРѕРІРѕРј РґРЅРµ: РёРЅР°С‡Рµ РїСЂРё
         РІРЅСѓС‚СЂРёРґРЅРµРІРЅРѕРј РїРѕСЏРІР»РµРЅРёРё РїРѕР»СѓС‡Р°Р»РѕСЃСЊ "NEW" СЂСЏРґРѕРј СЃ РїСЂРµР¶РЅРёРј СЃС‡С‘С‚С‡РёРєРѕРј
         ("5 days on chart", РІР»Р°РґРµР»РµС† 26.09). */
      firstDay[key] = week;
      track.delta = "new";
    } else {
      if (firstDay[key] == null) firstDay[key] = week;
      /* СЃС‚СЂРµР»РєСѓ Р’РЎР•Р“Р”Рђ СЃС‡РёС‚Р°РµРј РѕС‚ РІС‡РµСЂР°С€РЅРµРіРѕ РїРѕСЂСЏРґРєР°. Р Р°РЅСЊС€Рµ РїСЂРё РІРЅСѓС‚СЂРёРґРЅРµРІРЅРѕР№
         РїРµСЂРµСЃР±РѕСЂРєРµ РѕРЅР° РїСЂРѕСЃС‚Рѕ РєРѕРїРёСЂРѕРІР°Р»Р°СЃСЊ РёР· СЂРµРµСЃС‚СЂР°, Р° РїРѕСЂСЏРґРѕРє Р·Р° РґРµРЅСЊ РјРѕРі
         РїРѕРјРµРЅСЏС‚СЊСЃСЏ (РёСЃС‚РѕС‡РЅРёРє С‚Рѕ РѕС‚РІРµС‡Р°РµС‚, С‚Рѕ РЅРµС‚) - Рё СЃС‚СЂРµР»РєР° РїРµСЂРµСЃС‚Р°РІР°Р»Р°
         СЃС…РѕРґРёС‚СЊСЃСЏ СЃ РїРѕРєР°Р·Р°РЅРЅС‹Рј РјРµСЃС‚РѕРј (РІР»Р°РґРµР»РµС†: "Р”СЂРµР№Рє в–ј3, Р° #1 РЅРµ РјРµРЅСЏР»СЃСЏ"). */
      track.delta = String(prevPos - i);
    }
    track.weeks = Math.max(1, week - firstDay[key] + 1);
    /* СЃС‚СЂР°С…РѕРІРєР°: РµСЃР»Рё РїРµСЃРЅСЏ Р±С‹Р»Р° РІРѕ РІС‡РµСЂР°С€РЅРµРј РїРѕСЂСЏРґРєРµ, РѕРЅР° Р±С‹Р»Р° РІ С‡Р°СЂС‚Рµ РІС‡РµСЂР° -
       Р·РЅР°С‡РёС‚ СЃРµРіРѕРґРЅСЏ РјРёРЅРёРјСѓРј РІС‚РѕСЂРѕР№ РґРµРЅСЊ */
    if (!first && prevPos >= 0) track.weeks = Math.max(2, track.weeks);
    seen[key] = { weeks: track.weeks, lastPos: i, lastWeek: week, delta: track.delta };
  });
  /* Р”РёР°РіРЅРѕСЃС‚РёРєР° РїР°РјСЏС‚Рё С‡Р°СЂС‚Р°: Сѓ РєР°Р¶РґРѕР№ РЅРѕРІРѕР№ СЃС‚СЂРѕРєРё РёС‰РµРј РІ СЌС‚Р°Р»РѕРЅРЅРѕРј РїРѕСЂСЏРґРєРµ СЃС‚СЂРѕРєСѓ СЃ
     С‚РµРј Р¶Рµ РЅРѕСЂРјР°Р»РёР·РѕРІР°РЅРЅС‹Рј РЅР°Р·РІР°РЅРёРµРј. РќР°С€Р»Р°СЃСЊ - Р·РЅР°С‡РёС‚ РїРµСЃРЅСЏ РІС‡РµСЂР° Р±С‹Р»Р°, Р° Р»РёС‡РЅРѕСЃС‚СЊ
     СЂР°Р·РѕС€Р»Р°СЃСЊ РїРѕ РЅР°РїРёСЃР°РЅРёСЋ Р°СЂС‚РёСЃС‚РѕРІ; РЅРµ РЅР°С€Р»Р°СЃСЊ - РїРµСЃРЅРё РІС‡РµСЂР° РІ С‡Р°СЂС‚Рµ РґРµР№СЃС‚РІРёС‚РµР»СЊРЅРѕ
     РЅРµ Р±С‹Р»Рѕ, Рё NEW С‡РµСЃС‚РЅС‹Р№. */
  if (diag) {
    const near = [];
    tracks.forEach((t, i) => {
      if (String(t.delta).toLowerCase() !== "new") return;
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
  }
  /* Р­С‚Р°Р»РѕРЅ СЃС‚СЂРµР»РѕРє - РїРѕСЂСЏРґРѕРє РџР РћРЁР›РћР“Рћ РґРЅСЏ (ten.keys). РџРѕСЂСЏРґРѕРє СЃРµРіРѕРґРЅСЏС€РЅРµР№ СЃР±РѕСЂРєРё
     Р¶РёРІС‘С‚ РѕС‚РґРµР»СЊРЅРѕ (ten.today), РїРѕСЌС‚РѕРјСѓ РІРЅСѓС‚СЂРёРґРЅРµРІРЅР°СЏ РїРµСЂРµСЃР±РѕСЂРєР° СЌС‚Р°Р»РѕРЅ РЅРµ СЃРґРІРёРіР°РµС‚. */
  if (first) {
    /* РїРµСЂРІС‹Р№ РїСЂРѕРіРѕРЅ: СЌС‚Р°Р»РѕРЅРѕРј РґР»СЏ СЃР»РµРґСѓСЋС‰РµРіРѕ РґРЅСЏ СЃС‚Р°РЅРѕРІРёС‚СЃСЏ СЃРµРіРѕРґРЅСЏС€РЅРёР№ РїРѕСЂСЏРґРѕРє */
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
  }
  return tracks;
}
/* РЎР°РјРѕРїСЂРѕРІРµСЂРєР° СЃС‚СЂРµР»РѕРє Рё СЃС‡С‘С‚С‡РёРєР° РґРЅРµР№:
   - РјРµСЃС‚Рѕ + СЃС‚СЂРµР»РєР° РѕР±СЏР·Р°РЅС‹ СЃРєР»Р°РґС‹РІР°С‚СЊСЃСЏ РІ РЅРµРїСЂРѕС‚РёРІРѕСЂРµС‡РёРІС‹Р№ РІС‡РµСЂР°С€РЅРёР№ РїРѕСЂСЏРґРѕРє;
   - NEW РѕР±СЏР·Р°РЅ РёРґС‚Рё СЃ "1 day on chart", Р° С‡РёСЃР»РѕРІР°СЏ СЃС‚СЂРµР»РєР° - РјРёРЅРёРјСѓРј СЃ РґРІСѓРјСЏ РґРЅСЏРјРё
     (РїРµСЃРЅСЏ Р±С‹Р»Р° РІ С‡Р°СЂС‚Рµ РІС‡РµСЂР°). Р Р°СЃСЃРёРЅС…СЂРѕРЅРёР·Р°С†РёСЏ РІРёРґРЅР° РІ РїРѕР»Рµ arrows СЃСЂР°Р·Сѓ. */
function arrowCheck(tracks) {
  const taken = new Set();
  let bad = 0;
  let mixed = 0;
  let fresh = 0;
  tracks.forEach((t, i) => {
    const d = String(t.delta == null ? "" : t.delta).toLowerCase();
    const w = Number(t.weeks) || 0;
    if (d === "new") {
      fresh += 1;
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
  return { ok: bad === 0 && mixed === 0, bad, mixed, new: fresh };
}
const UA = "Mozilla/5.0 (compatible; music98/1.0)";

function stripParen(s) {
  return String(s || "").replace(/\([^)]*\)|\[[^\]]*\]/g, " ");
}
function normTitle(s) {
  const t = stripParen(s)
    .toLowerCase()
    .replace(/[вЂ™вЂ]/g, "'")
    .replace(/\b(remastered|remix|single|deluxe|from)\b/g, "")
    .replace(/[^a-z0-9]+/g, "");
  return t;
}
function primaryArtist(s) {
  return String(s || "")
    .split(/\s*(?:,|&|\/|\+| x | Г— | feat\.? | ft\.? | featuring | with | w\/ )\s*/i)[0]
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
      rec.nameSrc = "A";
    }
    if (row.url && !rec.url) rec.url = row.url;
    /* РѕР±Р»РѕР¶РєСѓ РїСЂРµРґРїРѕС‡РёС‚Р°РµРј Apple, Deezer РѕСЃС‚Р°РІР»СЏРµРј С‚РѕР»СЊРєРѕ РєР°Рє Р·Р°РїР°СЃРЅРѕР№ РІР°СЂРёР°РЅС‚ */
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
      map.set(normTitle(t.title) + "|" + primaryArtist(t.artist), t);
    });
    tracks.forEach((t) => {
      const b = map.get(normTitle(t.title) + "|" + primaryArtist(t.artist));
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
  /* РїРѕСЂСЏРґРѕРє РІР°Р¶РµРЅ: СЃРЅР°С‡Р°Р»Р° РґР°РЅРЅС‹Рµ Apple РёР· Р·Р°СЃРµРІР° (РёРјСЏ, СЃСЃС‹Р»РєР°, РїСЂРµРІСЊСЋ, РіРѕРґ),
     РїРѕС‚РѕРј РґРѕР±РѕСЂ РёР· Р·Р°РїРµС‡С‘РЅРЅРѕРіРѕ С„Р°Р№Р»Р°, РїРѕС‚РѕРј РѕР±Р»РѕР¶РєРё Рё Р¶РёРІС‹Рµ Р·Р°РїСЂРѕСЃС‹ Рє Apple */
  await applyNames(env, tracks, origin);
  tracks.forEach((t) => { delete t.nameSrc; });
  await seedBaked(origin || "", tracks);
  await applyCovers(env, tracks, origin);  /* Р·Р°СЃРµРІ -> РїР°РјСЏС‚СЊ -> СЃР±РѕСЂРєР° -> Deezer -> РїСѓСЃС‚Рѕ */
  await enrichArtByIds(tracks, coverStats); /* С‚РѕС‡РЅС‹Р№ СЂРµР»РёР· РїРѕ Apple-ID РёР· СЃСЃС‹Р»РєРё */
  await enrichApple(tracks);               /* РґРѕР±РѕСЂ СЃСЃС‹Р»РєРё/РїСЂРµРІСЊСЋ/РіРѕРґР°, РµСЃР»Рё Apple РѕС‚РІРµС‚РёР» */
  await applyCovers(env, tracks, origin);  /* Р·Р°РїРѕРјРЅРёС‚СЊ РЅР°Р№РґРµРЅРЅРѕРµ */
  tracks.forEach((t) => {
    t.url = appleAff(t.url);
    if (!isApplePreview(t.prev)) t.prev = "";
  });
  return {
    updated: new Date().toISOString().slice(0, 10),
    launch: "2026-09-17",
    week: chartWeek() + 1,
    rev: "feat-v25",
    sources: { A: apple.length, S: spotify.length, D: deezer.length, B: billboard.length, Y: youtube.length },
    seed: {
      covers: Object.keys(COVER_SEED || {}).length,
      names: Object.keys(NAME_SEED || {}).length,
      namesWithUrl: Object.values(NAME_SEED || {}).filter((v) => v && v.url).length,
    },
    covers: { ...coverStats, missing: tracks.filter((t) => !isAppleArt(t.art)).length },
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
    /* СЃСЃС‹Р»РєР° Рё 30-СЃРµРєСѓРЅРґРЅРѕРµ РїСЂРµРІСЊСЋ РЅСѓР¶РЅС‹ РІСЃРµРіРґР°; РѕР±Р»РѕР¶РєСѓ Apple Р±РѕР»СЊС€Рµ РЅРµ РґР°С‘С‚ */
    if (t.url && isApplePreview(t.prev)) return;
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

/* The baked fallback file was written when covers still came from any source; run it
   through the same Apple-only cover pass before serving, so a failed rebuild cannot
   put Deezer sleeves (or a different picture) on the page. */
async function bakedWithCovers(env, baked, origin) {
  if (baked && Array.isArray(baked.tracks) && baked.tracks.length) {
    try {
      await applyNames(env, baked.tracks, origin);
      await applyCovers(env, baked.tracks, origin);
    } catch {}
  }
  return baked;
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
    const payload = await withTimeout(buildTop50(new URL(request.url).origin, env), 14000);
    const memory = {};
    payload.tracks = await applyTenure(env, payload.tracks, memory);
    payload.memory = memory;
    payload.arrows = arrowCheck(payload.tracks);
    if (env && env.DESK && payload.tracks && payload.tracks.length) {
      try { await env.DESK.put(TOP50_KV, JSON.stringify(payload)); } catch {}
    }
    if (payload.tracks && payload.tracks.length) return top50Response(payload);
  } catch (err) {
    const baked = await bakedWithCovers(env, await bakedTop50(request), new URL(request.url).origin);
    if (baked && Array.isArray(baked.tracks) && baked.tracks.length) return top50Response(baked);
    return new Response(JSON.stringify({ error: "rebuild_failed", detail: String(err) }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
  const baked = await bakedWithCovers(env, await bakedTop50(request), new URL(request.url).origin);
  if (baked && Array.isArray(baked.tracks) && baked.tracks.length) return top50Response(baked);
  return new Response(JSON.stringify({ error: "rebuild_failed" }), {
    status: 502,
    headers: { "Content-Type": "application/json" },
  });
}
