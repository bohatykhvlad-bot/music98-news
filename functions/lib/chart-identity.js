/* Shared chart identity + Apple candidate matching.
 *
 * Base title identity intentionally keeps the old music98 normalization so ordinary
 * source-name differences continue to merge. Version markers are added separately,
 * which prevents an original song from collapsing into a remix/live/sped-up row.
 */

export const stripParen = (s) => String(s || "").replace(/\([^)]*\)|\[[^\]]*\]/g, " ");

export function normTitle(s) {
  return stripParen(s)
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/\b(remastered|remaster|remix|rmx|single|deluxe|from)\b/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

export function primaryArtist(s) {
  return String(s || "")
    .split(/\s*(?:,|&|\/|\+| x | × | feat\.? | ft\.? | featuring | with | w\/ )\s*/i)[0]
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

export function versionSignature(s) {
  const x = String(s || "").toLowerCase().replace(/[–—]/g, "-");
  const tags = [];
  const add = (name, re) => { if (re.test(x)) tags.push(name); };
  add("remix", /\b(?:remix|rmx)\b/);
  add("live", /\blive\b/);
  add("acoustic", /\bacoustic\b/);
  add("instrumental", /\binstrumental\b/);
  add("karaoke", /\bkaraoke\b/);
  add("demo", /\bdemo\b/);
  add("spedup", /\bsped\s*up\b/);
  add("slowed", /\bslowed\b/);
  add("acapella", /\b(?:acapella|a\s*cappella)\b/);
  add("extended", /\bextended\b/);
  add("edit", /\b(?:radio\s+)?edit\b/);
  add("remaster", /\bremaster(?:ed)?\b/);
  add("rerecorded", /\b(?:re-?recorded|taylor['’]s\s+version)\b/);
  add("mix", /\b(?:dj\s+mix|mixed|mix)\b/);
  add("dub", /\bdub\b/);
  add("rework", /\b(?:rework|reworked|bootleg|mashup)\b/);
  add("session", /\b(?:session|unplugged|rehearsal|performance|concert)\b/);
  if (!tags.length && /\bversion\b/.test(x)) tags.push("version");
  return [...new Set(tags)].sort().join("+");
}

export function mergeKey(title, artist) {
  const sig = versionSignature(title);
  return `${normTitle(title)}${sig ? "~v:" + sig : ""}|${primaryArtist(artist)}`;
}

/* Artwork identity is deliberately stricter than chart/ranking identity.
 * Ranking uses the lead artist so provider naming differences still merge into
 * one chart row. Artwork includes the full credited artist set; otherwise a
 * remix/feature/re-release can silently steal another row's cover. */
export function artworkArtistSignature(s) {
  const words = String(s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘]/g, "'")
    .replace(/\b(?:feat(?:uring)?|ft|with|and|x|w)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return [...new Set(words)].sort().join("");
}

export function featuredCreditFromTitle(title) {
  const out=[];
  const s=String(title||"");
  const re=/(?:\bfeat(?:uring)?\.?|\bft\.?)\s+([^\)\]\[]+)/ig;
  let m;
  while((m=re.exec(s))){
    const value=String(m[1]||"").replace(/\s+-\s+.*$/,"").trim();
    if(value) out.push(value);
  }
  return out.join(" ");
}

export function artworkCreditSignature(title, artist) {
  return artworkArtistSignature([artist, featuredCreditFromTitle(title)].filter(Boolean).join(" "));
}

export function artworkKey(title, artist) {
  const sig = versionSignature(title);
  return `${normTitle(title)}${sig ? "~v:" + sig : ""}|${artworkCreditSignature(title, artist)}`;
}

export function isVersionedMergeKey(key) {
  const head = String(key || "").split("|")[0] || "";
  return head.includes("~v:");
}

function simpleText(s) {
  return String(s || "").toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9]+/g, "");
}

function releaseMs(item) {
  const n = Date.parse(String((item && item.releaseDate) || ""));
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
}

/* Strict track-version match, softer collection penalty.
 * A plain chart title can never choose "Remix", "Live", "Sped Up", etc. as the
 * track itself. A deluxe/remaster/live collection is only a fallback when Apple
 * has no cleaner copy of the exact track/version.
 */
export function appleCandidateScore(wantedTitle, wantedArtist, item) {
  if (!item || normTitle(item.trackName) !== normTitle(wantedTitle)) return null;

  const wantArtist = primaryArtist(wantedArtist);
  const gotArtist = primaryArtist(item.artistName);
  if (wantArtist && gotArtist !== wantArtist) return null;

  const wantedVersion = versionSignature(wantedTitle);
  const trackVersion = versionSignature(item.trackName);
  if (trackVersion !== wantedVersion) return null;

  const collectionVersion = versionSignature(item.collectionName);
  // A plain studio chart row must never borrow artwork from a derivative
  // release package (Live, Remix, Acoustic, Deluxe, etc.). Reject it outright
  // instead of merely giving it a small score penalty.
  if (!wantedVersion && collectionVersion) return null;
  if (wantedVersion && collectionVersion && collectionVersion !== wantedVersion) return null;

  const collectionName = String(item.collectionName || "").toLowerCase();
  let collectionPenalty = 0;
  if (/\b(?:greatest hits?|best of|essentials?|anthology|collection|compilation|retrospective)\b/.test(collectionName)) collectionPenalty += 520;
  if (/\b(?:20th century masters|millennium collection|number ones|complete singles?|classic hits?)\b/.test(collectionName)) collectionPenalty += 560;
  if (/\b(?:various artists|karaoke|tribute)\b/.test(collectionName)) collectionPenalty += 800;
  if (/\b(?:soundtrack|original motion picture)\b/.test(collectionName) || String(item.primaryGenreName || "").toLowerCase() === "soundtrack") collectionPenalty += 180;

  let score = 1000;
  if (wantArtist && gotArtist === wantArtist) score += 200;
  if (simpleText(item.trackName) === simpleText(wantedTitle)) score += 80;
  if (!collectionVersion) score += 50;
  else if (collectionVersion === wantedVersion) score += 20;
  score -= collectionPenalty;

  const trackCount = Math.max(0, Number(item.trackCount || 0));
  const collectionArtist = primaryArtist(item.collectionArtistName || item.artistName);
  if (wantArtist && collectionArtist === wantArtist) {
    score += trackCount >= 6 ? 180 : trackCount >= 2 ? 80 : 0;
  }

  const collBase = String(item.collectionName || "").replace(/\s*-\s*(?:single|ep)\s*$/i, "");
  if (normTitle(collBase) === normTitle(wantedTitle)) score += 30;

  return { score, release: releaseMs(item), id: Number(item.trackId) || Number.MAX_SAFE_INTEGER, collectionPenalty };
}

export function pickAppleCandidate(wantedTitle, wantedArtist, results) {
  const ranked = [];
  for (const item of results || []) {
    const meta = appleCandidateScore(wantedTitle, wantedArtist, item);
    if (meta) ranked.push({ item, ...meta });
  }
  if (!ranked.length) return null;

  // Canonical-original rule: establish the earliest credible Apple release of
  // the exact song/version, then choose only within the original release era.
  // This prevents a decades-later anthology/live package from stealing art.
  const credible = ranked.filter(x => x.collectionPenalty < 500 && Number.isFinite(x.release));
  const earliest = credible.length ? Math.min(...credible.map(x => x.release)) : Number.MAX_SAFE_INTEGER;
  const ORIGINAL_WINDOW_MS = 548 * 86400000; // 18 months
  const pool = Number.isFinite(earliest) && earliest < Number.MAX_SAFE_INTEGER
    ? ranked.filter(x => x.release <= earliest + ORIGINAL_WINDOW_MS)
    : ranked;
  const finalPool = pool.length ? pool : ranked;
  finalPool.sort((a, b) =>
    b.score - a.score ||
    a.collectionPenalty - b.collectionPenalty ||
    a.release - b.release ||
    a.id - b.id
  );
  return finalPool[0].item;
}

export function appleCandidateCompatible(wantedTitle, wantedArtist, item) {
  return !!appleCandidateScore(wantedTitle, wantedArtist, item);
}
