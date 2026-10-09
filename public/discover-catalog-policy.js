/* One genre policy for the offline builder and the browser's cached catalog.
   Match catalog genres, never an artist's name, nationality or appearance. */
(() => {
  const version=2;
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
  const excluded=/\b(?:indian|bollywood|tamil|telugu|punjabi|malayalam|kannada|bengali|gujarati|marathi|bhojpuri|haryanvi|rajasthani|assamese|odia|oriya|carnatic|hindustani)\b/i;
  const regionalMexican=/\b(?:musica mexicana|regional mexican|regional mexicano|mexican traditions|rancheras?|corridos?|mariachi|norteno|grupero|tejano|sierreno)\b|^banda$/i;
  const ambiguous=/^(?:music|worldwide|world|asia|soundtrack|tv soundtrack|original score|devotional & spiritual|new age|instrumental|sufi|ghazals|qawwali)$/i;
  const excludedGenre=genre=>excluded.test(normalize(genre))||regionalMexican.test(normalize(genre));
  function excludedArtist(artist) {
    if(excludedGenre(artist?.genre))return true;
    const albums=Array.isArray(artist?.albums)?artist.albums:[];
    const blocked=albums.filter(a=>excludedGenre(a?.genre)).length;
    // Generic soundtrack/world labels do not outweigh explicit blocked genres.
    // A crossover artist with a mostly other-genre catalog stays eligible.
    const other=albums.filter(a=>!excludedGenre(a?.genre)&&!ambiguous.test(normalize(a?.genre))).length;
    return blocked>0 && blocked>=other;
  }
  function eligibleAlbums(artist) {
    if(excludedArtist(artist))return [];
    return (Array.isArray(artist?.albums)?artist.albums:[]).filter(album=>album&&typeof album==='object'&&!excludedGenre(album.genre));
  }
  globalThis.music98DiscoverCatalogPolicy=Object.freeze({version,excludedGenre,excludedArtist,eligibleAlbums});
})();
