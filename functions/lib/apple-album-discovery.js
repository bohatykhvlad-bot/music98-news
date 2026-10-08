/* Find an original Apple album when song search only returns a new version,
 * a stripped package, or no entry at all. All requests use the public iTunes
 * catalog: no developer token or per-user browser request is needed. */
const regionList = ["US", "GB", "CA"];
const empty = () => ({results:[]});

export async function discoverAppleAlbumTracks(track, {
  json, appleCandidate, candidateCompatible, primaryArtist,
  isDerivativeRelease, isGenericRelease,
}, {countries = regionList, maxAlbums = 24} = {}) {
  const artistName = String(track?.artist || "").split(/\s*(?:,|&|\/|\+| x | × | feat\.? | ft\.? | featuring | with | w\/ )\s*/i)[0].trim();
  const artistKey = primaryArtist(artistName);
  if(!artistKey || !String(track?.title||"").trim()) return [];
  const request = async url => { try{return await json(url,2);}catch{return empty();} };
  for(const country of countries) {
    const suffix = "&country=" + encodeURIComponent(country);
    const term = encodeURIComponent(artistName);
    const [albumsResult, artistsResult] = await Promise.all([
      request("https://itunes.apple.com/search?term="+term+"&media=music&entity=album&limit=200"+suffix),
      request("https://itunes.apple.com/search?term="+term+"&media=music&entity=musicArtist&limit=25"+suffix)
    ]);
    const albums = new Map();
    const keep = raw => {
      const id = String(raw?.collectionId||"");
      if(!id || !/^\d+$/.test(id)) return;
      if(primaryArtist(raw.artistName||raw.collectionArtistName)!==artistKey) return;
      if(isDerivativeRelease(raw.collectionName) ||
         isGenericRelease(raw.collectionName,raw.collectionArtistName||raw.artistName,raw.primaryGenreName)) return;
      if(Number(raw.trackCount||0)<5) return;
      albums.set(id,raw);
    };
    (albumsResult.results||[]).forEach(keep);
    const artistIds = [...new Set([
      ...(artistsResult.results||[]).filter(a=>primaryArtist(a.artistName)===artistKey).map(a=>a.artistId),
      ...(albumsResult.results||[]).filter(a=>primaryArtist(a.artistName||a.collectionArtistName)===artistKey).map(a=>a.artistId),
    ].filter(Boolean).map(String))].slice(0,2);
    for(const id of artistIds) {
      const catalog = await request("https://itunes.apple.com/lookup?id="+encodeURIComponent(id)+"&entity=album&limit=200"+suffix);
      (catalog.results||[]).forEach(keep);
    }
    const eligible = [...albums.values()].sort((a,b)=>
      String(b.releaseDate||"").localeCompare(String(a.releaseDate||"")));
    // Search recent albums first, then an older slice for catalog songs.
    const wanted = eligible.length>maxAlbums
      ? [...eligible.slice(0,Math.ceil(maxAlbums*0.75)),...eligible.slice(-Math.floor(maxAlbums*0.25))]
      : eligible;
    const result=[];
    const batchSize=6;
    for(let i=0;i<wanted.length;i+=batchSize) {
      const batch = await Promise.all(wanted.slice(i,i+batchSize).map(async album => {
        const data=await request("https://itunes.apple.com/lookup?id="+album.collectionId+"&entity=song&limit=200"+suffix);
        return (data.results||[]).flatMap(raw => {
          if(String(raw?.collectionId||"")!==String(album.collectionId) || !raw.trackId) return [];
          const candidate=appleCandidate(raw,"apple",{catalogAlbumDiscovery:true});
          return candidate?.art && candidateCompatible(track,candidate) &&
            !isDerivativeRelease(candidate.releaseTitle) &&
            !isGenericRelease(candidate.releaseTitle,candidate.releaseArtist,candidate.genre)
            ? [candidate] : [];
        });
      }));
      result.push(...batch.flat());
      if(result.length) break;
    }
    if(result.length)return result;
  }
  return [];
}
