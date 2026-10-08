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

/* A 50/50 nonempty count is not proof that the CDN deploy contains the
 * newly audited releases. Check each exact current song identity against the
 * independently committed artwork registry before reporting success. */
export function artworkRegistryMismatches(tracks, registry, keyForTrack, legacyKeyForTrack){
  if (!Array.isArray(tracks)) return [{reason:"invalid_tracks"}];
  return tracks.flatMap((track,i)=>{
    const primary=keyForTrack(track.title,track.artist);
    const legacy=legacyKeyForTrack(track.title,track.artist);
    const expected=registry?.[primary] || registry?.[legacy] || "";
    return !isTrustedChartArtwork(expected) || track.art!==expected ?
      [{rank:i+1,title:track.title,artist:track.artist,
        reason:!expected?"not_in_registry":"artwork_not_deployed",
        expected,actual:String(track.art||"")}] : [];
  });
}
