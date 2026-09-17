/* music98.news — consensus Top 50 + official Apple Music badge */
const APPLE_AFFILIATE = {
  at: "", // paste your Apple affiliate token here
  ct: "music98",
  itsct: "music_box_badge",
  itscg: "30200",
};
const APPLE_BADGE =
  "https://toolbox.marketingtools.apple.com/api/v2/badges/listen-on-apple-music/badge/en-us";
const APPLE_BADGE_FALLBACK = "badges/listen-on-apple-music.svg";
const SIZE = 50;

const ICONS = {
  play: '<svg viewBox="0 0 12 12" aria-hidden="true"><path fill="currentColor" d="M2.2 1.1v9.8L11 6z"/></svg>',
  pause: '<svg viewBox="0 0 12 12" aria-hidden="true"><path fill="currentColor" d="M2 1.2h3v9.6H2zm5 0h3v9.6H7z"/></svg>',
};

const audio = new Audio();
audio.preload = "none";
let currentId = null;
let snapshot = null;

function $(sel, root = document) {
  return root.querySelector(sel);
}
function $all(sel, root = document) {
  return [...root.querySelectorAll(sel)];
}

function appleListenUrl(track) {
  const album = track.albumId;
  const song = track.trackId;
  if (!album && !track.appleUrl) return "";
  const url = new URL(
    track.appleUrl || `https://music.apple.com/us/album/${album}`
  );
  if (song) url.searchParams.set("i", song);
  url.searchParams.set("itsct", APPLE_AFFILIATE.itsct);
  url.searchParams.set("itscg", APPLE_AFFILIATE.itscg);
  url.searchParams.set("ls", "1");
  url.searchParams.set("app", "music");
  if (APPLE_AFFILIATE.at) url.searchParams.set("at", APPLE_AFFILIATE.at);
  if (APPLE_AFFILIATE.ct) url.searchParams.set("ct", APPLE_AFFILIATE.ct);
  return url.toString();
}

function points(pos) {
  const n = Number(pos);
  if (!n || n < 1 || n > SIZE) return 0;
  return SIZE + 1 - n;
}

function scoreOf(ranks) {
  return points(ranks.A) + points(ranks.S) + points(ranks.D) + points(ranks.B);
}

function sourceCount(ranks) {
  return ["A", "S", "D", "B"].filter((k) => ranks[k]).length;
}

function bestRank(ranks) {
  const vals = ["A", "S", "D", "B"].map((k) => ranks[k]).filter(Boolean);
  return vals.length ? Math.min(...vals) : 99;
}

function stripParen(s) {
  return String(s || "").replace(/\([^)]*\)|\[[^\]]*\]/g, " ");
}

function normTitle(s) {
  return stripParen(s)
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/\b(remastered|remix|single|deluxe|from)\b/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function primaryArtist(s) {
  return String(s || "")
    .split(/\s*(?:,|&|\/|\+| x | × | feat\.? | ft\.? | featuring | with | w\/ )\s*/i)[0]
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function mergeKey(title, artist) {
  const tMap = {
    iknewitiknewyoufromtoystory5: "iknewitiknewyou",
    daidaiwiburnaboy: "daidai",
    daidaififaworldcupofficialsong2026: "daidai",
    bbywowwjudelinerusowsky: "bbywow",
    draculawithjennie: "dracula",
    soeasytofallinlove: "soeasy",
    cinderellawtydollasign: "cinderella",
    beautyandabeatwnickiminaj: "beautyandabeat",
    diewithasmilewbrunomars: "diewithasmile",
    shouldistayorshouldigoremastered: "shouldistayorshouldigo",
  };
  const aMap = {
    karolgjudelinerusowsky: "karolg",
    karolgwithjudeline: "karolg",
    shakiraxburnaboy: "shakira",
    tameimpalaandjennie: "tameimpala",
    ellalangleyandmorganwallen: "ellalangley",
    macmillerfeaturingtydollasign: "macmiller",
    stellaleftyfeaturingvincentmason: "stellalefty",
  };
  const t = tMap[normTitle(title)] || normTitle(title);
  const a = aMap[primaryArtist(artist)] || primaryArtist(artist);
  return `${t}|${a}`;
}

function sortTracks(list) {
  return [...list].sort((a, b) => {
    const ds = scoreOf(b.ranks) - scoreOf(a.ranks);
    if (ds) return ds;
    const dc = sourceCount(b.ranks) - sourceCount(a.ranks);
    if (dc) return dc;
    const db = bestRank(a.ranks) - bestRank(b.ranks);
    if (db) return db;
    return a.title.localeCompare(b.title);
  });
}

function fmtTime(sec) {
  if (!Number.isFinite(sec)) return "0:00";
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function chip(letter, pos) {
  const on = pos ? "on" : "";
  const label = pos ? `${letter}${pos}` : letter;
  return `<span class="chip ${letter} ${on}" title="${letter} ${pos || "—"}">${label}</span>`;
}

function rowHtml(track, i) {
  const ranks = track.ranks || {};
  const href = appleListenUrl(track);
  const art = track.art || "";
  const year = track.year ? ` · ${track.year}` : "";
  const preview = track.preview || "";
  const score = scoreOf(ranks);
  return `<article class="row" data-id="${track.trackId || i}" data-src="${encodeURIComponent(preview)}" role="button" tabindex="0">
    <div class="rank">${i}</div>
    <img class="art" src="${art}" alt="" width="56" height="56" />
    <div class="cmid">
      <div class="cinfo">
        <div class="t">${escapeHtml(track.title)}</div>
        <div class="a">${escapeHtml(track.artist)}${year}</div>
      </div>
      <div class="pextra">
        <button class="play" type="button" aria-label="Play 30-second preview">${ICONS.play}</button>
        <div class="pbar" aria-hidden="true"><i></i></div>
        <span class="ptime">0:00</span>
        ${
          href
            ? `<a class="ambadge" href="${href}" target="_blank" rel="noopener noreferrer sponsored" aria-label="Listen on Apple Music">
                 <img src="${APPLE_BADGE}" alt="Listen on Apple Music" height="28" width="96" />
               </a>`
            : ""
        }
      </div>
    </div>
    <div class="chips">${chip("A", ranks.A)}${chip("S", ranks.S)}${chip("D", ranks.D)}${chip("B", ranks.B)}</div>
    <div class="score">${score}</div>
  </article>`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderChart(tracks, status) {
  const list = $("#chart-list");
  const ranked = sortTracks(tracks).slice(0, SIZE).map((t, i) => {
    t.rank = i + 1;
    t.score = scoreOf(t.ranks);
    t.sources = sourceCount(t.ranks);
    return t;
  });
  if (!ranked.length) {
    list.innerHTML = `<div class="empty">No titles in this week’s snapshot.</div>`;
    return ranked;
  }
  list.innerHTML = ranked.map((t, i) => rowHtml(t, i + 1)).join("");
  $all("img.ambadge, .ambadge img", list).forEach((img) => {
    img.addEventListener("error", () => {
      if (img.dataset.fallback) return;
      img.dataset.fallback = "1";
      img.src = APPLE_BADGE_FALLBACK;
    });
  });
  if (status) $("#chart-status").innerHTML = status;
  renderReleases(ranked);
  restorePlaying();
  return ranked;
}

function restorePlaying() {
  if (!currentId) return;
  const row = document.querySelector(`.row[data-id="${currentId}"]`);
  if (row) {
    row.classList.add("open", "playing");
    const btn = $(".play", row);
    if (btn && !audio.paused) btn.innerHTML = ICONS.pause;
  }
}

function bindRows() {
  const list = $("#chart-list");
  list.addEventListener("click", onRowClick);
  list.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      const row = e.target.closest(".row");
      if (!row) return;
      e.preventDefault();
      toggleRow(row, true);
    }
  });
}

function onRowClick(e) {
  const badge = e.target.closest(".ambadge");
  if (badge) {
    e.stopPropagation();
    return;
  }
  const row = e.target.closest(".row");
  if (!row) return;
  const playBtn = e.target.closest(".play");
  toggleRow(row, Boolean(playBtn) || true);
}

function toggleRow(row, shouldPlay) {
  $all(".row").forEach((r) => {
    if (r !== row) r.classList.remove("open");
  });
  row.classList.add("open");
  if (shouldPlay) playRow(row);
}

function playRow(row) {
  const src = decodeURIComponent(row.dataset.src || "");
  const id = row.dataset.id;
  if (!src) {
    $("#chart-status").textContent = "No 30-second preview for this title.";
    return;
  }
  const same = currentId === id;
  if (same && !audio.paused) {
    audio.pause();
    row.classList.remove("playing");
    $(".play", row).innerHTML = ICONS.play;
    return;
  }
  $all(".row.playing").forEach((r) => {
    r.classList.remove("playing");
    const b = $(".play", r);
    if (b) b.innerHTML = ICONS.play;
  });
  if (!same) {
    audio.src = src;
    currentId = id;
  }
  audio.play().catch(() => {
    $("#chart-status").textContent = "Preview blocked — click Play again.";
  });
  row.classList.add("playing");
  $(".play", row).innerHTML = ICONS.pause;
}

audio.addEventListener("timeupdate", () => {
  const row = document.querySelector(`.row[data-id="${currentId}"]`);
  if (!row) return;
  const dur = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 30;
  const pct = Math.min(100, (audio.currentTime / dur) * 100);
  const bar = $(".pbar i", row);
  const time = $(".ptime", row);
  if (bar) bar.style.width = `${pct}%`;
  if (time) time.textContent = fmtTime(audio.currentTime);
});
audio.addEventListener("ended", () => {
  const row = document.querySelector(`.row[data-id="${currentId}"]`);
  if (!row) return;
  row.classList.remove("playing");
  $(".play", row).innerHTML = ICONS.play;
  const bar = $(".pbar i", row);
  if (bar) bar.style.width = "0%";
});

function renderReleases(tracks) {
  const grid = $("#release-grid");
  const picks = tracks.filter((t) => t.art && t.albumId).slice(0, 8);
  grid.innerHTML = picks
    .map((t) => {
      const href = appleListenUrl(t);
      return `<a class="release" href="${href}" target="_blank" rel="noopener noreferrer sponsored">
        <img src="${t.art}" alt="${escapeHtml(t.title)}" />
        <div class="pad">
          <div class="t">${escapeHtml(t.title)}</div>
          <div class="a">${escapeHtml(t.artist)}${t.year ? " · " + t.year : ""}</div>
        </div>
      </a>`;
    })
    .join("");
}

function showTab(name) {
  $all(".view").forEach((v) => v.classList.toggle("active", v.id === `view-${name}`));
  $all("nav.tabs button").forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
  if (location.hash !== `#${name}`) history.replaceState(null, "", `#${name}`);
}

function openModal(id) {
  $(id).classList.add("open");
}
function closeModals() {
  $all(".modal").forEach((m) => m.classList.remove("open"));
}

function setupChrome() {
  $all("nav.tabs button, [data-tab]").forEach((el) => {
    el.addEventListener("click", (e) => {
      const tab = el.dataset.tab;
      if (!tab) return;
      e.preventDefault();
      showTab(tab);
    });
  });
  $("#btn-subscribe").addEventListener("click", () => openModal("#modal-sub"));
  $("#btn-privacy").addEventListener("click", () => openModal("#modal-privacy"));
  $("#btn-method").addEventListener("click", () => openModal("#modal-method"));
  $("#btn-editor").addEventListener("click", () => {
    const draft = JSON.parse(localStorage.getItem("m98-draft") || "{}");
    $("#ed-title-in").value = draft.title || "";
    $("#ed-body").value = draft.body || "";
    openModal("#modal-editor");
  });
  $all("[data-close]").forEach((b) => b.addEventListener("click", closeModals));
  $all(".modal").forEach((m) =>
    m.addEventListener("click", (e) => {
      if (e.target === m) closeModals();
    })
  );
  $("#sub-save").addEventListener("click", () => {
    const email = $("#sub-email").value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      $("#sub-msg").textContent = "Enter a valid email.";
      return;
    }
    localStorage.setItem("m98-sub", email);
    $("#sub-msg").textContent = "Saved on this device. We’ll wire a real list later.";
  });
  $("#ed-save").addEventListener("click", () => {
    const draft = { title: $("#ed-title-in").value.trim(), body: $("#ed-body").value.trim() };
    localStorage.setItem("m98-draft", JSON.stringify(draft));
    paintDesk();
    closeModals();
  });
  $("#ed-clear").addEventListener("click", () => {
    localStorage.removeItem("m98-draft");
    $("#ed-title-in").value = "";
    $("#ed-body").value = "";
    paintDesk();
  });
  const hash = (location.hash || "#news").slice(1);
  if (["news", "releases", "charts"].includes(hash)) showTab(hash);
  paintDesk();
}

function paintDesk() {
  const box = $("#desk-news");
  const draft = JSON.parse(localStorage.getItem("m98-draft") || "{}");
  if (!draft.title) {
    box.innerHTML = "";
    return;
  }
  box.innerHTML = `<article class="card pad">
    <div class="meta">Desk draft · this browser</div>
    <h3>${escapeHtml(draft.title)}</h3>
    <p>${escapeHtml(draft.body || "")}</p>
  </article>`;
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function fetchJsonFallback(url) {
  try {
    return await fetchJson(url);
  } catch {
    const proxied = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    return fetchJson(proxied);
  }
}

function ingestList(map, src, items) {
  for (const it of items) {
    const key = mergeKey(it.title, it.artist);
    const rec = map.get(key) || {
      title: it.title,
      artist: it.artist,
      ranks: { A: null, S: null, D: null, B: null },
      albumId: "",
      trackId: "",
      preview: "",
      art: "",
      year: "",
      appleUrl: "",
    };
    rec.ranks[src] = it.pos;
    if (it.title) rec.title = rec.title || it.title;
    if (src === "A") {
      rec.title = it.title;
      rec.artist = it.artist;
      Object.assign(rec, {
        albumId: it.albumId || rec.albumId,
        trackId: it.trackId || rec.trackId,
        art: it.art || rec.art,
        year: it.year || rec.year,
        appleUrl: it.appleUrl || rec.appleUrl,
        preview: it.preview || rec.preview,
      });
    }
    if (it.preview && !rec.preview) rec.preview = it.preview;
    if (it.art && !rec.art) rec.art = it.art;
    map.set(key, rec);
  }
}

function parseAppleFeed(data) {
  const results = data?.feed?.results || [];
  return results.map((x, i) => {
    const url = x.url || "";
    const m = url.match(/\/album\/[^/]+\/(\d+)\?i=(\d+)/);
    return {
      pos: i + 1,
      title: x.name,
      artist: x.artistName,
      albumId: m ? m[1] : "",
      trackId: m ? m[2] : String(x.id || ""),
      art: (x.artworkUrl100 || "").replace("100x100bb", "600x600bb"),
      year: (x.releaseDate || "").slice(0, 4),
      appleUrl: url,
      preview: "",
    };
  });
}

function parseDeezer(data) {
  const tracks = data?.data || [];
  return tracks.map((x, i) => ({
    pos: i + 1,
    title: x.title,
    artist: x.artist?.name || "",
    preview: x.preview || "",
    art: x.album?.cover_xl || x.album?.cover_medium || "",
  }));
}

async function itunesFill(track) {
  if (track.trackId && track.preview && track.appleUrl) return track;
  const term = encodeURIComponent(`${track.artist} ${stripParen(track.title)}`.trim());
  try {
    const data = await fetchJson(`https://itunes.apple.com/search?term=${term}&entity=song&limit=5&country=US`);
    const hit = (data.results || [])[0];
    if (!hit) return track;
    track.trackId = track.trackId || String(hit.trackId || "");
    track.albumId = track.albumId || String(hit.collectionId || "");
    track.preview = hit.previewUrl || track.preview;
    track.art = track.art || (hit.artworkUrl100 || "").replace("100x100bb", "600x600bb");
    track.year = track.year || (hit.releaseDate || "").slice(0, 4);
    if (!track.appleUrl && track.albumId && track.trackId) {
      track.appleUrl = `https://music.apple.com/us/album/${track.albumId}?i=${track.trackId}`;
    }
  } catch {
    /* keep snapshot metadata */
  }
  return track;
}

async function refreshLive(baseTracks, baked) {
  const map = new Map();
  ingestList(
    map,
    "S",
    (baked.S || []).map((x) => ({ pos: x.pos, title: x.title, artist: x.artist }))
  );
  ingestList(
    map,
    "B",
    (baked.B || []).map((x) => ({ pos: x.pos, title: x.title, artist: x.artist }))
  );
  for (const t of baseTracks) {
    const key = mergeKey(t.title, t.artist);
    const rec = map.get(key) || { ...t, ranks: { ...t.ranks } };
    rec.ranks = { A: t.ranks?.A || rec.ranks.A, S: t.ranks?.S || rec.ranks.S, D: t.ranks?.D || rec.ranks.D, B: t.ranks?.B || rec.ranks.B };
    rec.title = t.title;
    rec.artist = t.artist;
    rec.albumId = t.albumId || rec.albumId;
    rec.trackId = t.trackId || rec.trackId;
    rec.preview = t.preview || rec.preview;
    rec.art = t.art || rec.art;
    rec.year = t.year || rec.year;
    rec.appleUrl = t.appleUrl || rec.appleUrl;
    map.set(key, rec);
  }

  let appleOk = false;
  let deezerOk = false;
  try {
    const apple = await fetchJsonFallback(
      "https://rss.applemarketingtools.com/api/v2/us/music/most-played/50/songs.json"
    );
    ingestList(map, "A", parseAppleFeed(apple));
    appleOk = true;
  } catch {
    appleOk = false;
  }
  try {
    const deezer = await fetchJson("https://api.deezer.com/chart/0/tracks?limit=50");
    ingestList(map, "D", parseDeezer(deezer));
    deezerOk = true;
  } catch {
    deezerOk = false;
  }

  let next = sortTracks([...map.values()]).slice(0, SIZE);
  next = await Promise.all(next.map((t) => itunesFill(t)));
  const liveBits = [
    appleOk ? "Apple Music live" : "Apple Music from snapshot",
    deezerOk ? "Deezer live" : "Deezer from snapshot",
    "Spotify + Billboard snapshot",
  ];
  return {
    tracks: next,
    status: `<b>${next.length} titles</b> · ${liveBits.join(" · ")}`,
  };
}

async function boot() {
  setupChrome();
  bindRows();
  try {
    snapshot = await fetchJson("data/chart-snapshot.json");
  } catch (err) {
    $("#chart-list").innerHTML = `<div class="error">Could not load the chart snapshot.</div>`;
    $("#chart-status").textContent = String(err);
    return;
  }
  renderChart(
    snapshot.tracks,
    `<b>Snapshot ${snapshot.label}</b> · refreshing Apple Music & Deezer…`
  );
  try {
    const live = await refreshLive(snapshot.tracks, snapshot.baked || {});
    renderChart(live.tracks, live.status);
  } catch {
    $("#chart-status").innerHTML = `<b>Snapshot ${snapshot.label}</b> · live refresh skipped, baked Top 50 shown`;
  }
}

boot();
