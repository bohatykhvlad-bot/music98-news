/* Shared chart identity + Apple candidate matching.
 *
 * Base title identity intentionally keeps the old music98 normalization so ordinary
 * source-name differences continue to merge. Version markers are added separately,
 * which prevents an original song from collapsing into a remix/live/sped-up row.
 */

export const COVER_RESOLVER_VERSION = 4;

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
  add("remix", /\b(?:remix(?:es)?|rmx)\b/);
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
  add("deluxe", /\bdeluxe\b/);
  add("anniversary", /\banniversary\b/);
  add("expanded", /\bexpanded\b/);
  add("rerecorded", /\b(?:re-?recorded|taylor['’]s\s+version)\b/);
  add("mix", /\b(?:dj\s+mix|mixed|mix)\b/);
  add("stripped", /\bstripped\b/);
  add("piano", /\bpiano\s+(?:version|mix)\b/);
  add("orchestral", /\borchestral\b/);
  add("nightcore", /\bnightcore\b/);
  add("cover", /\bcover\s+(?:version|mix)\b/);
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

function collectionPenalty(item) {
  const name = String(item?.collectionName || "").toLowerCase();
  const genre = String(item?.primaryGenreName || "").toLowerCase();
  let penalty = 0;
  // Generic catalog/repackage releases must never outrank the song's own
  // contemporary album/single merely because Apple Search returned them first.
  if (/\b(?:greatest hits?|best of|essentials?|anthology|collection|compilation|retrospective)\b/.test(name)) penalty += 520;
  if (/\b(?:20th century masters|millennium collection|number ones|no\. ?1s|complete singles?|classic hits?|motown classics?)\b/.test(name)) penalty += 560;
  if (/\b(?:various artists|karaoke|tribute)\b/.test(name)) penalty += 800;
  if (/\b(?:soundtrack|original motion picture)\b/.test(name) || genre === "soundtrack") penalty += 180;
  return penalty;
}

/* Strict original/version matching.
 *
 * The track title AND the collection have to agree with the requested version.
 * This is deliberately fail-closed: for an unversioned chart row we would rather
 * show no Apple cover than borrow artwork from a Remix/Live/Acoustic/etc. pack.
 *
 * When Apple exposes both a one-track single and the same studio master on the
 * artist's full release, prefer the full artist release. That matches the normal
 * Apple Music song page and prevents search-order accidents from pinning promo or
 * remix-package sleeves forever.
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
  if (!wantedVersion && collectionVersion) return null;
  if (wantedVersion && collectionVersion && collectionVersion !== wantedVersion) return null;

  const collectionArtist = primaryArtist(item.collectionArtistName || item.artistName);
  const trackCount = Math.max(0, Number(item.trackCount || 0));
  let score = 1000;

  if (wantArtist && gotArtist === wantArtist) score += 200;
  if (simpleText(item.trackName) === simpleText(wantedTitle)) score += 80;
  if (!collectionVersion) score += 60;
  else if (collectionVersion === wantedVersion) score += 30;

  /* Prefer the artist's canonical album/EP master over a one-track promo single.
     Standalone singles still win automatically when no album copy exists. */
  if (wantArtist && collectionArtist === wantArtist) {
    score += 120;
    if (trackCount >= 6) score += 220;
    else if (trackCount >= 2) score += 100;
    else if (trackCount === 1) score += 20;
  } else if (trackCount >= 6) {
    /* Various-artists compilations/soundtracks stay valid, but never outrank
       the same master on the artist's own release. */
    score += 20;
  }
  const penalty = collectionPenalty(item);
  score -= penalty;

  const collBase = String(item.collectionName || "").replace(/\s*-\s*(?:single|ep)\s*$/i, "");
  if (normTitle(collBase) === normTitle(wantedTitle)) score += 20;

  return {
    score,
    release: releaseMs(item),
    id: Number(item.trackId) || Number.MAX_SAFE_INTEGER,
    collectionPenalty: penalty,
  };
}

export function pickAppleCandidate(wantedTitle, wantedArtist, results) {
  const ranked = [];
  for (const item of results || []) {
    const meta = appleCandidateScore(wantedTitle, wantedArtist, item);
    if (meta) ranked.push({ item, ...meta });
  }
  if (!ranked.length) return null;

  /* Canonical-original rule:
   * 1) exact song/version + artist has already been enforced above;
   * 2) find the earliest credible Apple release of that studio master;
   * 3) only compare album/EP/single variants from the original release era
   *    (18 months). This keeps a same-era album master above a promo single,
   *    while blocking years-later compilations/repackages from stealing art.
   *
   * Apple commonly stores the historical release year on legacy albums, so this
   * also fixes catalog songs such as Ain't No Mountain High Enough: United-era
   * artwork can beat a later anthology even when both contain the same master.
   */
  const credible = ranked.filter(x => x.collectionPenalty < 500 && Number.isFinite(x.release));
  const earliest = credible.length ? Math.min(...credible.map(x => x.release)) : Number.MAX_SAFE_INTEGER;
  const ORIGINAL_WINDOW_MS = 548 * 86400000;
  const originalEra = Number.isFinite(earliest) && earliest < Number.MAX_SAFE_INTEGER
    ? ranked.filter(x => x.release <= earliest + ORIGINAL_WINDOW_MS)
    : ranked;

  const pool = originalEra.length ? originalEra : ranked;
  pool.sort((a, b) =>
    b.score - a.score ||
    a.collectionPenalty - b.collectionPenalty ||
    a.release - b.release ||
    a.id - b.id
  );
  return pool[0].item;
}

export function appleCandidateCompatible(wantedTitle, wantedArtist, item) {
  return !!appleCandidateScore(wantedTitle, wantedArtist, item);
}
