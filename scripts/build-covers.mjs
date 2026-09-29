/* Apple-first chart cover registry.
 *
 * public/data/covers.json is a verified Apple registry. Daily runs keep existing
 * resolved identities stable, while a deep audit may replace a stale lock only
 * with a newly verified canonical Apple track. Editorial corrections always win.
 *
 * New song resolution:
 *   1. known exact Apple collection override (rare catalog-search miss)
 *   2. dedicated Apple single/EP for the exact song/version
 *   3. exact Apple song on the artist's own release closest to first release
 * Generic compilations, soundtracks and alternate packs lose to artist releases.
 */
import fs from "node:fs";
import path from "node:path";
import dns from "node:dns";
import {
  appleCandidateCompatible,
  COVER_RESOLVER_VERSION,
  mergeKey,
  primaryArtist,
  stripParen,
  pickAppleCandidate,
} from "../functions/lib/chart-identity.js";

dns.setDefaultResultOrder("ipv4first");

const OUT = path.resolve("public/data/covers.json");
const OUT_NAMES = path.resolve("public/data/apple-names.json");
const OUT_META = path.resolve("public/data/apple-cover-meta.json");
const BAKED_TOP = path.resolve("public/data/top50.json");
const INDEX_HTML = path.resolve("public/index.html");
const CHART = process.env.CHART_URL || "https://music98.news/api/top50";
const REVALIDATE_EXISTING = /^(?:1|true|yes)$/i.test(String(process.env.REVALIDATE_EXISTING || ""));

const DIRECT_COLLECTION = {
  /* Keep only true catalog-search misses here. Do not use this as an artwork
     preference mechanism: normal songs must go through the canonical matcher. */
  "pinkblush|dollybabe": "6783917228",
};
const CORRECTIONS = path.resolve("public/data/cover-corrections.json");

const idOf = (u) => (String(u || "").match(/[?&]i=(\d+)/) || [])[1] || "";
const art600 = (u) => String(u || "")
  .replace("100x100bb.jpg", "600x600bb.jpg")
  .replace("100x100bb", "600x600bb");

async function json(url) {
  const r = await fetch(url, { headers: { "user-agent": "music98-cover-resolver/1.0" } });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
  return r.json();
}

function appleRecord(hit) {
  const album = String(hit.collectionId || "");
  const track = String(hit.trackId || "");
  const url = album && track
    ? `https://music.apple.com/us/album/${album}?i=${track}`
    : (hit.trackViewUrl || "");
  return {
    title: hit.trackName || "",
    artist: hit.artistName || "",
    url,
    prev: hit.previewUrl || "",
    year: String(hit.releaseDate || "").slice(0, 4),
  };
}

async function songSearch(title, artist) {
  const terms = [
    `${artist} ${stripParen(title)}`,
    `${stripParen(title)} ${artist}`,
    `${artist} ${stripParen(title)} single`,
  ];
  const out = new Map();
  for (const term0 of terms) {
    const term = encodeURIComponent(term0.trim());
    const d = await json(`https://itunes.apple.com/search?term=${term}&entity=song&limit=200&country=US`);
    for (const x of d.results || []) {
      if (appleCandidateCompatible(title, artist, x) && x.trackId) {
        out.set(String(x.trackId), x);
      }
    }
  }
  return [...out.values()];
}

async function lookupCollection(collectionId, title, artist) {
  const d = await json(`https://itunes.apple.com/lookup?id=${collectionId}&entity=song&country=US`);
  return (d.results || []).find((x) =>
    x.wrapperType === "track" && appleCandidateCompatible(title, artist, x)
  ) || null;
}

async function resolveApple(title, artist) {
  const key = mergeKey(title, artist);

  if (DIRECT_COLLECTION[key]) {
    const hit = await lookupCollection(DIRECT_COLLECTION[key], title, artist);
    if (hit && hit.artworkUrl100) return { hit, reason: "direct-catalog-miss" };
  }

  const songs = await songSearch(title, artist);
  if (!songs.length) return null;

  const hit = pickAppleCandidate(title, artist, songs);
  if (!hit?.artworkUrl100) return null;

  const trackCount = Math.max(0, Number(hit.trackCount || 0));
  const sameCollectionArtist =
    primaryArtist(hit.collectionArtistName || hit.artistName) === primaryArtist(artist);
  const reason = sameCollectionArtist && trackCount >= 6
    ? "canonical-album"
    : sameCollectionArtist && trackCount >= 2
      ? "canonical-ep"
      : "canonical-single";

  return { hit, reason };
}

const chart = await (await fetch(
  CHART + (CHART.includes("?") ? "&" : "?") + "cb=" + Date.now()
)).json();
const tracks = chart.tracks || [];
console.log(`в чарте ${tracks.length} треков (rev ${chart.rev || "-"})`);

let covers = {};
try {
  const saved = JSON.parse(fs.readFileSync(OUT, "utf8"));
  if (saved && typeof saved === "object" && !Array.isArray(saved)) covers = { ...saved };
} catch {}
const lockedAtStart = new Set(Object.keys(covers));
let coverMeta = {};
try {
  const saved = JSON.parse(fs.readFileSync(OUT_META, "utf8"));
  if (saved && typeof saved === "object" && !Array.isArray(saved)) coverMeta = { ...saved };
} catch {}
const editorialCorrections = JSON.parse(fs.readFileSync(CORRECTIONS, "utf8"));
const correctionsApplied = [];
for (const [key, rec] of Object.entries(editorialCorrections)) {
  const art = String(rec && rec.art || "");
  if (!art) throw new Error(`cover correction has no artwork URL: ${key}`);
  if (covers[key] !== art) {
    covers[key] = art;
    correctionsApplied.push(key);
  }
  coverMeta[key] = {
    resolverVersion: COVER_RESOLVER_VERSION,
    source: "editorial",
    trackId: String(rec?.appleTrackId || ""),
    collectionId: String(rec?.appleCollectionId || ""),
    collectionName: String(rec?.collectionName || ""),
    art,
    verifiedAt: new Date().toISOString(),
  };
}
const setVerifiedCover = (key, url) => {
  if (!key || !url || covers[key] === url) return false;
  covers[key] = url;
  return true;
};

let previousNames = {};
try {
  const saved = JSON.parse(fs.readFileSync(OUT_NAMES, "utf8"));
  if (saved && typeof saved === "object" && !Array.isArray(saved)) previousNames = saved;
} catch {}
const names = {};

console.log(`закреплённых Apple-обложек до сборки: ${lockedAtStart.size}`);
console.log(`режим глубокой перепроверки: ${REVALIDATE_EXISTING ? "ON" : "off"}`);
if (correctionsApplied.length) console.log(`исправлены явные cover-lock: ${correctionsApplied.join(", ")}`);

/* Keep Apple metadata fresh cheaply for rows that already have a track ID. */
const idWanted = tracks.map((t) => [t, idOf(t.url)]).filter(([, id]) => id);
if (idWanted.length) {
  const ids = [...new Set(idWanted.map(([, id]) => id))];
  const byId = new Map();
  for (let i = 0; i < ids.length; i += 50) {
    try {
      const d = await json(
        `https://itunes.apple.com/lookup?id=${ids.slice(i, i + 50).join(",")}&entity=song&country=US`
      );
      for (const x of d.results || []) if (x.trackId) byId.set(String(x.trackId), x);
    } catch (e) {
      console.log("  Apple batch lookup ошибка:", e.message);
    }
  }
  for (const [t, id] of idWanted) {
    const key = mergeKey(t.title, t.artist);
    const hit = byId.get(id);
    if (!hit || !appleCandidateCompatible(t.title, t.artist, hit)) continue;
    names[key] = appleRecord(hit);
    /* Exact Apple track IDs may refresh artwork in place only when they are
       already the canonical identity produced by this resolver generation.
       An old single ID must not become "canonical" merely because it still exists. */
    if (!editorialCorrections[key]) {
      const meta = coverMeta[key];
      if (meta?.resolverVersion === COVER_RESOLVER_VERSION && String(meta?.trackId || "") === String(hit.trackId || "")) {
        const art = art600(hit.artworkUrl100);
        setVerifiedCover(key, art);
        coverMeta[key] = {...meta, art, verifiedAt:new Date().toISOString()};
      }
    }
  }
}

/* New keys always resolve. Existing current-chart keys are re-resolved only in
   deep-audit mode, which is used after matcher changes/manual runs. This keeps
   normal daily traffic cheap while still giving us a deterministic repair path. */
for (const t of tracks) {
  const key = mergeKey(t.title, t.artist);
  if (editorialCorrections[key]) {
    if (!names[key] && previousNames[key]) names[key] = previousNames[key];
    continue;
  }
  const meta = coverMeta[key];
  const canonicalCurrent =
    meta?.resolverVersion === COVER_RESOLVER_VERSION &&
    meta?.source === "resolver" &&
    meta?.art === covers[key] &&
    !!meta?.trackId;
  if (covers[key] && canonicalCurrent && !REVALIDATE_EXISTING) {
    if (!names[key] && previousNames[key]) names[key] = previousNames[key];
    continue;
  }
  try {
    const resolved = await resolveApple(t.title, t.artist);
    if (!resolved) {
      console.log(`  Apple cover не найден безопасно: ${t.artist} - ${t.title}`);
      if (previousNames[key]) names[key] = previousNames[key];
      continue;
    }
    const url = art600(resolved.hit.artworkUrl100);
    if (setVerifiedCover(key, url)) {
      console.log(`  Apple verified [${resolved.reason}]: ${t.artist} - ${t.title} -> ${resolved.hit.collectionName}`);
    }
    coverMeta[key] = {
      resolverVersion: COVER_RESOLVER_VERSION,
      source: "resolver",
      reason: resolved.reason,
      trackId: String(resolved.hit.trackId || ""),
      collectionId: String(resolved.hit.collectionId || ""),
      collectionName: String(resolved.hit.collectionName || ""),
      art: url,
      verifiedAt: new Date().toISOString(),
    };
    names[key] = appleRecord(resolved.hit);
  } catch (e) {
    console.log(`  Apple resolver ошибка: ${t.artist} - ${t.title}: ${e.message}`);
    if (previousNames[key]) names[key] = previousNames[key];
  }
}

const missing = tracks.filter((t) => !covers[mergeKey(t.title, t.artist)]);
const sorted = Object.fromEntries(Object.entries(covers).sort(([a], [b]) => a.localeCompare(b)));
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(sorted, null, 2) + "\n");
console.log(`\nв registry ${Object.keys(sorted).length} verified Apple covers (+${Object.keys(sorted).length - lockedAtStart.size} новых)`);
console.log(`без Apple cover-lock: ${missing.length}${missing.length ? " -> " + missing.map((t) => `${t.artist} - ${t.title}`).join("; ") : ""}`);

const sortedNames = Object.fromEntries(Object.entries(names).sort(([a], [b]) => a.localeCompare(b)));
fs.writeFileSync(OUT_NAMES, JSON.stringify(sortedNames, null, 2) + "\n");
const sortedMeta = Object.fromEntries(Object.entries(coverMeta).sort(([a], [b]) => a.localeCompare(b)));
fs.writeFileSync(OUT_META, JSON.stringify(sortedMeta, null, 2) + "\n");
console.log(`записано ${Object.keys(sortedNames).length} Apple metadata rows; resolver meta ${Object.keys(sortedMeta).length}`);

/* Keep the emergency baked chart consistent with the verified registry. This does
   not recalculate positions, arrows or tenure; it only repairs Apple metadata for
   rows already present in the baked fallback and its inline first-paint copy. */
try {
  const baked = JSON.parse(fs.readFileSync(BAKED_TOP, "utf8"));
  let bakedChanged = false;
  for (const t of baked?.tracks || []) {
    const key = mergeKey(t.title, t.artist);
    const art = sorted[key];
    const meta = sortedNames[key];
    if (art && t.art !== art) { t.art = art; bakedChanged = true; }
    if (meta?.url && t.url !== meta.url) { t.url = meta.url; bakedChanged = true; }
    if (meta?.prev && t.prev !== meta.prev) { t.prev = meta.prev; bakedChanged = true; }
    if (meta?.year && t.year !== meta.year) { t.year = meta.year; bakedChanged = true; }
  }
  if (bakedChanged) {
    fs.writeFileSync(BAKED_TOP, JSON.stringify(baked, null, 2) + "\n");
    const rows = (baked.tracks || []).map(({ rank, ...t }) => t);
    const block = "const TOP50 = " + JSON.stringify(rows, null, 2) + ";";
    const html = fs.readFileSync(INDEX_HTML, "utf8");
    const next = html.replace(/const TOP50 = \[[\s\S]*?\n\];/, block);
    if (next === html) throw new Error("inline TOP50 block not found");
    fs.writeFileSync(INDEX_HTML, next);
    console.log("обновлены baked top50.json и inline TOP50 только по Apple metadata");
  }
} catch (e) {
  console.log("  baked chart metadata patch ошибка:", e.message);
}
