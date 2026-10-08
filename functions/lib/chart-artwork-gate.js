/* Publication invariant: no chart row may reach the site with a missing,
 * placeholder, untrusted or malformed artwork URL. This is intentionally
 * independent from the daily ranking algorithm and its source validation. */
export function isTrustedChartArtwork(value) {
  try {
    const url = new URL(String(value || ""));
    const host = url.hostname.toLowerCase();
    return url.protocol === "https:" &&
      (host === "mzstatic.com" || host.endsWith(".mzstatic.com") ||
       host === "dzcdn.net" || host.endsWith(".dzcdn.net")) &&
      url.pathname.length > 1;
  } catch { return false; }
}

export function missingChartArtwork(tracks, size = 50) {
  if (!Array.isArray(tracks) || tracks.length !== size)
    return [{error:"invalid_chart_size",expected:size,actual:tracks?.length ?? null}];
  return tracks.flatMap((track, i) =>
    isTrustedChartArtwork(track?.art) ? [] :
      [{rank:i+1,title:String(track?.title||""),artist:String(track?.artist||"")}]);
}

export function hasCompleteChartArtwork(tracks, size = 50) {
  return missingChartArtwork(tracks, size).length === 0;
}
