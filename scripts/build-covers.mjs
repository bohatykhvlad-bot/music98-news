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
  mergeKey,
  normTitle,
  primaryArtist,
  stripParen,
  versionSignature,
  pickAppleCandidate,
} from "../functions/lib/chart-identity.js";

dns.setDefaultResultOrder("ipv4first");

const OUT = path.resolve("public/data/covers.json");
const OUT_NAMES = path.resolve("public/data/apple-names.json");
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

const releaseMs = (x) => {
  const n = Date.parse(String((x && x.releaseDate) || ""));
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
};

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

function collectionBase(name) {
  return String(name || "")
    .replace(/\s*-\s*(?:single|ep)\s*$/i, "")
    .trim();
}

function derivativeCollection(name) {
  const s = String(name || "").toLowerCase();
  return /\b(?:remix(?:es)?|rmx|live|acoustic|instrumental|karaoke|demo|sped\s*up|slowed|reverb(?:ed)?|isolated\s+vocals?|singalong|track\s+by\s+track|commentary|limited\s+cover|alternate\s+(?:cover|version)|radio\s+edit|extended\s+(?:mix|version))\b/.test(s);
}

function genericCompilation(name, genre) {
  const s = String(name || "").toLowerCase();
  const g = String(genre || "").toLowerCase();
  if (g === "soundtrack") return 5;
  if (/original motion picture soundtrack|soundtrack/.test(s)) return 5;
  if (/\b(?:70s|80s|90s)\b.*\b(?:hits|gems|anthems)\b/.test(s)) return 5;
  if (/\b(?:party|disco|flashback|various artists|anthology)\b/.test(s)) return 4;
  if (/\b(?:greatest hits|essential)\b/.test(s)) return 3;
  if (/\b(?:best of|collection)\b/.test(s)) return 1;
  return 0;
}

async function albumSearch(title, artist) {
  const term = encodeURIComponent(`${artist} ${stripParen(title)}`.trim());
  const d = await json(`https://itunes.apple.com/search?term=${term}&entity=album&limit=200&country=US`);
  const wantA = primaryArtist(artist);
  return (d.results || []).filter((x) =>
    !wantA || primaryArtist(x.artistName || x.collectionArtistName) === wantA
  );
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
const editorialCorrections = JSON.parse(fs.readFileSync(CORRECTIONS, "utf8"));
const correctionsApplied = [];
for (const [key, rec] of Object.entries(editorialCorrections)) {
  const art = String(rec && rec.art || "");
  if (!art) throw new Error(`cover correction has no artwork URL: ${key}`);
  if (covers[key] !== art) {
    covers[key] = art;
    correctionsApplied.push(key);
  }
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
    /* Exact Apple track IDs may refresh artwork in place. This is safe because
       appleCandidateCompatible now rejects derivative collection mismatches. */
    if (!editorialCorrections[key]) setVerifiedCover(key, art600(hit.artworkUrl100));
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
  if (covers[key] && !REVALIDATE_EXISTING) {
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
console.log(`записано ${Object.keys(sortedNames).length} Apple metadata rows`);
