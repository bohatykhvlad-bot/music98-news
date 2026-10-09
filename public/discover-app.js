/* Discover lives in the main music98.news SPA, not a second HTML shell.
   Apple audio is rendered through the exact same appleEmbed()/parkAppleEmbeds()
   pipeline used by article album embeds. */
(() => {
  "use strict";
  const tab = document.getElementById("tab-discover");
  const stage = document.getElementById("discoverPlayerStage");
  const button = document.getElementById("discoverFind");
  const status = document.getElementById("discoverStatus");
  const selection = document.getElementById("discoverSelection");
  if (!tab || !stage || !button || !selection) return;

  const byId = id => document.getElementById(id);
  let artists = [], current = null, recentIds = [], loaded = false;

  const validId = n => Number.isSafeInteger(n) && n > 0 && n < 1e12;
  const usable = d => (Array.isArray(d?.artists) ? d.artists : [])
    .filter(a => typeof a?.name === "string" && a.name.trim()
      && Array.isArray(a.albums) && a.albums.some(v => validId(v.id) && typeof v.title === "string"));

  async function loadCatalog() {
    if (loaded) return;
    loaded = true;
    button.disabled = true;
    status.textContent = "Loading albums…";
    try {
      const response = await fetch("/data/discover-albums.json", { cache: "default" });
      if (!response.ok) throw new Error("Catalog HTTP " + response.status);
      artists = usable(await response.json());
      if (!artists.length) throw new Error("Empty album catalog");
      button.disabled = false;
      status.textContent = "";
    } catch (error) {
      status.textContent = "Albums are unavailable right now. Please try again later.";
      console.warn("[music98 Discover]", error);
    }
  }

  function randomIndex(length) {
    if (length <= 1) return 0;
    const bytes = new Uint32Array(1);
    const ceiling = Math.floor(4294967296 / length) * length;
    do { crypto.getRandomValues(bytes); } while (bytes[0] >= ceiling);
    return bytes[0] % length;
  }

  function choose() {
    const fresh = artists.filter(a => a.albums.some(v => validId(v.id) && !recentIds.includes(v.id)));
    const pool = fresh.length ? fresh : artists;
    if (!pool.length) return null;
    const artist = pool[randomIndex(pool.length)];
    const viable = artist.albums.filter(v => validId(v.id));
    const freshAlbums = viable.filter(v => !recentIds.includes(v.id));
    const albums = freshAlbums.length ? freshAlbums : viable;
    if (!albums.length) return null;
    const album = albums[randomIndex(albums.length)];
    recentIds.push(album.id);
    if (recentIds.length > 18) recentIds.shift();
    return { ...album, artist: artist.name };
  }

  function renderPlayer() {
    if (!current) return;
    const site = window.music98DiscoverPlayer;
    if (!site?.render || !site?.park) {
      status.textContent = "Apple Music player is unavailable.";
      return;
    }
    // Uses music98's /apple-embed/ proxy and injected apple-player-fix.js.
    stage.innerHTML = site.render(current.id);
    site.park(stage);
  }

  function select(album) {
    const site = window.music98DiscoverPlayer;
    if (site?.pause) site.pause();
    current = album;
    byId("discoverArtist").textContent = album.artist;
    byId("discoverAlbum").textContent = album.title;
    byId("discoverYear").textContent = album.year || "";
    byId("discoverGenre").textContent = album.genre || "";
    selection.hidden = false;
    button.textContent = "Find another album";
    status.textContent = album.artist + " — " + album.title;
    renderPlayer();
  }

  function onPageChange() {
    const visible = tab.classList.contains("active") && !document.body.classList.contains("articlepage");
    if (!visible) {
      // pauseAllMedia() is called by the site's existing tab switcher.
      // Remove a hidden iframe so the old album cannot continue playing.
      if (stage.querySelector("iframe")) stage.innerHTML = '<span class="discover-question" aria-hidden="true">?</span>';
      return;
    }
    loadCatalog();
    if (current && !stage.querySelector("iframe")) renderPlayer();
  }

  button.addEventListener("click", () => {
    const album = choose();
    if (album) select(album);
  });
  window.addEventListener("music98:pagechange", onPageChange);
  onPageChange();
})();
