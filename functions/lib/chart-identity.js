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
  if (!tags.length && /\bversion\b/.test(x)) tags.push("version");
  return [...new Set(tags)].sort().join("+");
}

export function mergeKey(title, artist) {
  const sig = versionSignature(title);
  return `${normTitle(title)}${sig ? "~v:" + sig : ""}|${primaryArtist(artist)}`;
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
  let score = 1000;
  if (wantArtist && gotArtist === wantArtist) score += 200;
  if (simpleText(item.trackName) === simpleText(wantedTitle)) score += 80;
  if (!collectionVersion) score += 50;
  else if (collectionVersion === wantedVersion) score += 20;
  else score -= 120;

  const collBase = String(item.collectionName || "").replace(/\s*-\s*(?:single|ep)\s*$/i, "");
  if (normTitle(collBase) === normTitle(wantedTitle)) score += 30;

  return { score, release: releaseMs(item), id: Number(item.trackId) || Number.MAX_SAFE_INTEGER };
}

export function pickAppleCandidate(wantedTitle, wantedArtist, results) {
  const ranked = [];
  for (const item of results || []) {
    const meta = appleCandidateScore(wantedTitle, wantedArtist, item);
    if (meta) ranked.push({ item, ...meta });
  }
  ranked.sort((a, b) =>
    b.score - a.score ||
    a.release - b.release ||
    a.id - b.id
  );
  return ranked.length ? ranked[0].item : null;
}

export function appleCandidateCompatible(wantedTitle, wantedArtist, item) {
  return !!appleCandidateScore(wantedTitle, wantedArtist, item);
}
