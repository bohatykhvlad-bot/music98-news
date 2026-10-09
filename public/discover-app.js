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
  const setWavesPlaying = active => window.music98DiscoverAmbient?.setPlaying(!!active);
  /* /apple-embed/ is same-origin, so the injected MusicKit hook can report
     native playback state. Only the currently mounted iframe is trusted. */
  window.addEventListener("message", event => {
    if (event.origin !== location.origin) return;
    const frame = stage.querySelector("iframe");
    if (!frame || event.source !== frame.contentWindow) return;
    if (!tab.classList.contains("active") || document.body.classList.contains("articlepage")) return;
    if(event.data?.type === "music98:apple-playback"){
      setWavesPlaying(event.data.playing === true);
    }else if(event.data?.type === "music98:apple-pointer"){
      const x=Number(event.data.x),y=Number(event.data.y);
      if(!Number.isFinite(x)||!Number.isFinite(y))return;
      const r=frame.getBoundingClientRect();
      if(x<0||y<0||x>r.width||y>r.height)return;
      window.music98DiscoverAmbient?.setPointer(r.left+x,r.top+y);
    }
  });

  const byId = id => document.getElementById(id);
  let artists = [], current = null, recentIds = [], loaded = false, loadTask = null;
  const policy = window.music98DiscoverCatalogPolicy;

  const validId = n => Number.isSafeInteger(n) && n > 0 && n < 1e12;
  const usable = d => (Array.isArray(d?.artists) ? d.artists : [])
    .map(a => ({ ...a, albums: policy.eligibleAlbums(a) }))
    .filter(a => typeof a?.name === "string" && a.name.trim()
      && Array.isArray(a.albums) && a.albums.some(v => validId(v.id) && typeof v.title === "string"));

  async function loadCatalog() {
    if (loaded) return true;
    if (loadTask) return loadTask;
    loadTask = (async () => {
      button.disabled = true;
      status.textContent = "Loading albums…";
      try {
        const response = await fetch("/data/discover-albums.json", {
          cache: "default", signal: AbortSignal.timeout(15000)
        });
        if (!response.ok) throw new Error("Catalog HTTP " + response.status);
        const catalog = usable(await response.json());
        if (!catalog.length) throw new Error("Empty album catalog");
        artists = catalog;
        loaded = true;
        button.textContent = current ? "Try another" : "Pick for me";
        status.textContent = "";
        return true;
      } catch (error) {
        // A failed first request must not permanently lock Discover. The next
        // button click or tab visit retries; concurrent requests share a task.
        button.textContent = "Try again";
        status.textContent = "Albums could not load. Select Try again to retry.";
        console.warn("[music98 Discover]", error);
        return false;
      } finally {
        button.disabled = false;
      }
    })();
    try { return await loadTask; }
    finally { loadTask = null; }
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
    setWavesPlaying(false);
    const site = window.music98DiscoverPlayer;
    if (site?.pause) site.pause();
    current = album;
    byId("discoverArtist").textContent = album.artist;
    byId("discoverAlbum").textContent = album.title;
    byId("discoverYear").textContent = album.year || "";
    byId("discoverGenre").textContent = album.genre || "";
    selection.hidden = false;
    button.textContent = "Try another";
    status.textContent = ""; // The artist and album are already displayed above.
    renderPlayer();
  }

  function onPageChange() {
    const visible = tab.classList.contains("active") && !document.body.classList.contains("articlepage");
    window.music98DiscoverAmbient?.setVisible(visible);
    if (!visible) {
      setWavesPlaying(false);
      // pauseAllMedia() is called by the site's existing tab switcher.
      // Remove a hidden iframe so the old album cannot continue playing.
      if (stage.querySelector("iframe")) stage.innerHTML = '<span class="discover-question" aria-hidden="true">?</span>';
      return;
    }
    loadCatalog();
    if (current && !stage.querySelector("iframe")) renderPlayer();
  }

  button.addEventListener("click", async () => {
    if (!await loadCatalog()) return;
    const album = choose();
    if (album) select(album);
  });
  window.addEventListener("music98:pagechange", onPageChange);
  onPageChange();
})();
