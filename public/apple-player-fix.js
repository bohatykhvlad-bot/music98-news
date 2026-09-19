/* Track-name clicks call MusicKit.changeToMediaItem and remount the
   left chrome. Skip arrows call skipToNextItem / skipToPreviousItem and
   stay put. Route name clicks through the skip path.
   Apple's catalog API only accepts embed.music.apple.com, so fetch is
   rewritten through /apple-gw on this origin. */
(function () {
  if (window.__m98AppleFix) return;
  window.__m98AppleFix = true;

  var API_HOSTS = {
    "amp-api.music.apple.com": 1,
    "amp-api-edge.music.apple.com": 1,
    "api.music.apple.com": 1,
    "play.itunes.apple.com": 1,
    "sf-api-token-service.itunes.apple.com": 1
  };

  function gateUrl(raw) {
    try {
      var u = new URL(raw, location.href);
      if (!API_HOSTS[u.hostname]) return raw;
      return "/apple-gw/" + u.hostname + u.pathname + u.search;
    } catch (err) {
      return raw;
    }
  }

  var origFetch = window.fetch;
  window.fetch = function (input, init) {
    try {
      if (typeof input === "string") input = gateUrl(input);
      else if (input && typeof input.url === "string") input = new Request(gateUrl(input.url), input);
    } catch (err) {}
    return origFetch.call(this, input, init);
  };

  var origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    var args = arguments;
    if (typeof url === "string") args[1] = gateUrl(url);
    return origOpen.apply(this, args);
  };

  var busy = false;

  function music() {
    try {
      return window.MusicKit && window.MusicKit.getInstance && window.MusicKit.getInstance();
    } catch (err) {
      return null;
    }
  }

  function idsOf(item) {
    var out = [];
    function push(v) {
      if (v == null || v === "") return;
      var s = String(v);
      if (out.indexOf(s) < 0) out.push(s);
    }
    if (!item) return out;
    push(item.id);
    push(item.songId);
    push(item._songId);
    var attrs = item.attributes;
    if (attrs) {
      push(attrs.catalogId);
      if (attrs.playParams) push(attrs.playParams.id);
    }
    return out;
  }

  function sameId(item, id) {
    var sid = String(id || "");
    if (!sid) return false;
    return idsOf(item).some(function (x) {
      return x === sid || x.indexOf(sid) !== -1 || sid.indexOf(x) !== -1;
    });
  }

  function mediaId(raw) {
    if (raw == null) return "";
    if (typeof raw === "object") return String(raw.id || raw.songId || "");
    return String(raw);
  }

  function queueItems(mk) {
    var q = mk && mk.queue;
    if (!q) return [];
    if (Array.isArray(q.items)) return q.items;
    if (typeof q.items === "function") {
      try { return q.items() || []; } catch (err) { return []; }
    }
    return [];
  }

  function indexOfId(mk, id) {
    var items = queueItems(mk);
    for (var i = 0; i < items.length; i++) {
      if (sameId(items[i], id)) return i;
    }
    return -1;
  }

  function hostFromPath(path) {
    for (var i = 0; i < path.length; i++) {
      var n = path[i];
      if (!n || !n.tagName) continue;
      if (n.tagName === "EMBED-AUDIO-TRACKLIST-ITEM") return n;
      if (n.classList && n.classList.contains("audio-tracklist-item")) {
        return n.getRootNode && n.getRootNode().host ? n.getRootNode().host : n;
      }
    }
    return null;
  }

  function hostIndex(host) {
    if (!host || host.tagName !== "EMBED-AUDIO-TRACKLIST-ITEM") return -1;
    var list = document.querySelectorAll("embed-audio-tracklist-item");
    for (var i = 0; i < list.length; i++) {
      if (list[i] === host) return i;
    }
    return -1;
  }

  function hostId(host) {
    try {
      if (host && host.item && host.item.id) return String(host.item.id);
    } catch (err) {}
    return "";
  }

  async function goToIndex(mk, target) {
    if (!mk || target < 0) return false;
    var pos = mk.queue && typeof mk.queue.position === "number" ? mk.queue.position : 0;
    if (target === pos) {
      /* The pristine embed restarts the track when its own row is clicked
         while playing; do the same instead of swallowing the gesture. */
      try {
        if (typeof mk.seekToTime === "function") mk.seekToTime(0);
        else mk.currentPlaybackTime = 0;
      } catch (err) {}
      if (!mk.isPlaying && mk.play) await mk.play();
      return true;
    }
    /* Skipping step by step is what the transport arrows do, and it swaps the
       track without touching the chrome layout. changeToMediaAtIndex puts the
       controls into a loading variant for a couple of frames (progress bar
       collapses, transport row shifts), so it stays a fallback. Setting
       queue.position alone moves the marker without starting the track. */
    /* Direct jump: the skip loop walks the equalizer bars and the explicit
       badge through every intermediate row, which reads as flipping through
       the album. The brief loading variant this call triggers is neutralised
       by the pinned grid below. */
    if (typeof mk.changeToMediaAtIndex === "function") {
      settleWindow(300);
      await mk.changeToMediaAtIndex(target);
      settleWindow(300);
      if (!mk.isPlaying && mk.play) await mk.play();
      if ((mk.queue.position || 0) === target) return true;
    }
    if (typeof mk.skipToNextItem === "function" && typeof mk.skipToPreviousItem === "function") {
      var steps = target - pos;
      if (steps > 0) {
        for (var i = 0; i < steps; i++) await mk.skipToNextItem();
      } else {
        for (var j = 0; j < -steps; j++) await mk.skipToPreviousItem();
      }
      if ((mk.queue.position || 0) === target) return true;
    }
    if (mk.queue) {
      mk.queue.position = target;
      if (!mk.isPlaying && mk.play) await mk.play();
      return true;
    }
    return false;
    return true;
  }

  async function playTrack(mk, id, fallbackIndex) {
    var idx = id ? indexOfId(mk, id) : -1;
    if (idx < 0) idx = fallbackIndex;
    if (idx < 0) return false;
    return goToIndex(mk, idx);
  }

  function patch(mk) {
    if (!mk || mk.__m98Patched) return;
    if (typeof mk.changeToMediaItem !== "function") return;
    mk.__m98Patched = true;
    var orig = mk.changeToMediaItem.bind(mk);
    mk.changeToMediaItem = async function (raw) {
      var id = mediaId(raw);
      if (id && (await playTrack(this, id, -1))) return;
      return orig(raw);
    };
  }

  function onTrackGesture(ev) {
    if (ev.type === "keydown" && ev.key !== "Enter" && ev.key !== " ") return;
    var path = ev.composedPath ? ev.composedPath() : [];
    var host = hostFromPath(path);
    if (!host) return;
    lockAlbumGrid();
    armJumpFix(1200);
    var mk = music();
    if (!mk) return;
    patch(mk);
    var id = hostId(host);
    var idx = hostIndex(host);
    if (!id && idx < 0) return;
    ev.preventDefault();
    ev.stopPropagation();
    if (typeof ev.stopImmediatePropagation === "function") ev.stopImmediatePropagation();
    if (busy) return;
    busy = true;
    Promise.resolve(playTrack(mk, id, idx)).catch(function () {}).then(function () {
      busy = false;
    });
  }

  /* After a direct jump Apple swaps the left chrome into a loading variant
     for ~30ms: the progress bar hops to another row and a metadata lockup
     pops in. Cancel both visually for a short settle window. */
  var settleRaf = 0;
  function settleWindow(ms) {
    if (settleRaf) cancelAnimationFrame(settleRaf);
    var prog = deepQuery("embed-audio-progress");
    var lockup = deepQuery("embed-metadata-lockup");
    var until = Date.now() + (ms || 250);
    var fixed = false, hidLock = false;
    var b = prog ? prog.getBoundingClientRect() : null;
    var base = b ? { x: b.x, y: b.y, w: b.width, h: b.height } : null;
    function frame() {
      if (Date.now() > until) {
        if (prog && fixed) {
          ["position", "left", "top", "width", "height", "margin", "zIndex", "transform"].forEach(function (k) {
            prog.style.removeProperty(k);
          });
        }
        if (lockup && hidLock) lockup.style.removeProperty("display");
        settleRaf = 0;
        return;
      }
      fixOverlaps();
      var wide = window.matchMedia("(min-width: 560px)").matches;
      if (prog && base && !fixed && wide) {
        prog.style.setProperty("position", "fixed", "important");
        prog.style.setProperty("left", base.x + "px", "important");
        prog.style.setProperty("top", base.y + "px", "important");
        prog.style.setProperty("width", base.w + "px", "important");
        prog.style.setProperty("height", base.h + "px", "important");
        prog.style.setProperty("margin", "0", "important");
        prog.style.setProperty("z-index", "3", "important");
        fixed = true;
      }
      if (lockup && lockup.getBoundingClientRect().height > 0) {
        lockup.style.setProperty("display", "none", "important");
        hidLock = true;
      }
      settleRaf = requestAnimationFrame(frame);
    }
    settleRaf = requestAnimationFrame(frame);
  }

  /* The embed recomputes its two-column grid for a frame or two while a
     track row is pressed, which reads as a sideways jump. Pin the columns
     to whatever the large layout computed, and re-pin on real resizes. */
  function deepQuery(sel) {
    var stack = [document];
    while (stack.length) {
      var root = stack.pop();
      var hit = root.querySelector ? root.querySelector(sel) : null;
      if (hit) return hit;
      var els = root.querySelectorAll ? root.querySelectorAll("*") : [];
      for (var i = 0; i < els.length; i++) if (els[i].shadowRoot) stack.push(els[i].shadowRoot);
    }
    return null;
  }

  function deepQueryAll(sel) {
    var out = [];
    var stack = [document];
    while (stack.length) {
      var root = stack.pop();
      var hits = root.querySelectorAll ? root.querySelectorAll(sel) : [];
      for (var i = 0; i < hits.length; i++) out.push(hits[i]);
      var els = root.querySelectorAll ? root.querySelectorAll("*") : [];
      for (var j = 0; j < els.length; j++) if (els[j].shadowRoot) stack.push(els[j].shadowRoot);
    }
    return out;
  }

  /* While audio plays, nothing may sit on top of the transport: on narrow
     layouts Apple's red "listen on Apple Music" affordances can overlap the
     play button during transitions. Hide exactly the intersecting ones. */
  var ovCands = null, ovCandsT = 0;
  function fixOverlaps() {
    var ctr = deepQuery(".audio-controls");
    if (!ctr) return;
    var cb = ctr.getBoundingClientRect();
    if (!cb.width || !cb.height) return;
    if (!ovCands || Date.now() - ovCandsT > 500) {
      ovCands = deepQueryAll("a, .launch-client");
      ovCandsT = Date.now();
    }
    var pb = deepQuery(".playback-play__play");
    var pba = deepQuery(".playback-play__pause");
    var transportOn = (pb && pb.getBoundingClientRect().width > 0) || (pba && pba.getBoundingClientRect().width > 0);
    var cands = ovCands;
    if (!transportOn) {
      cands.forEach(function (el) {
        if (el.__m98ov) { el.style.removeProperty("visibility"); el.__m98ov = 0; }
      });
      return;
    }
    cands.forEach(function (el) {
      var b = el.getBoundingClientRect();
      if (!b.width || !b.height) return;
      var ix = Math.min(b.x + b.width, cb.x + cb.width) - Math.max(b.x, cb.x);
      var iy = Math.min(b.y + b.height, cb.y + cb.height) - Math.max(b.y, cb.y);
      if (ix > 0 && iy > 0) {
        el.style.setProperty("visibility", "hidden", "important");
        el.__m98ov = 1;
      } else if (el.__m98ov) {
        el.style.removeProperty("visibility");
        el.__m98ov = 0;
      }
    });
  }
  (function loop(){ fixOverlaps(); requestAnimationFrame(loop); })();
  setInterval(function () {
    var mk = music();
    if (mk && !mk.__m98ovHook) {
      mk.__m98ovHook = 1;
      try {
        mk.addEventListener("playbackStateDidChange", function () { fixOverlaps(); armJumpFix(800); });
        mk.addEventListener("mediaItemDidChange", function () { fixOverlaps(); armJumpFix(800); });
      } catch (err) {}
    }
  }, 200);

  /* Narrow-layout transition stabiliser: position-only compensation with
     cached refs, active only inside a short window after a gesture or a
     MusicKit state change. No grid pins and no size forcing on mobile. */
  var JUMP_SELS = [".audio-controls", "embed-audio-progress", "embed-auth-control",
    ".auth-control__sign-in", "amp-artwork", ".container-player__logo-header"];
  var jumpUntil = 0, jumpRefs = null, loopOn = false;
  function clearRef(it) {
    if (it.el && it.el.isConnected) it.el.style.removeProperty("transform");
  }
  function armJumpFix(ms) {
    jumpRefs = JUMP_SELS.map(function (sel) {
      var el = deepQuery(sel);
      if (!el) return null;
      var b = el.getBoundingClientRect();
      return (b.width || b.height) ? { sel: sel, el: el, x: b.x, y: b.y } : null;
    }).filter(Boolean);
    jumpUntil = Math.max(jumpUntil, Date.now() + (ms || 1200));
    if (!loopOn) { loopOn = true; requestAnimationFrame(jumpFrame); }
  }
  function jumpFrame() {
    if (Date.now() >= jumpUntil) {
      loopOn = false;
      if (jumpRefs) jumpRefs.forEach(clearRef);
      jumpRefs = null;
      return;
    }
    if (jumpRefs) {
      jumpRefs.forEach(function (it) {
        if (!it.el || !it.el.isConnected) {
          it.el = deepQuery(it.sel);
          if (!it.el) return;
        }
        var b = it.el.getBoundingClientRect();
        if (!b.width && !b.height) return;
        var dx = it.x - b.x, dy = it.y - b.y;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
          it.el.style.setProperty("transform", "translate(" + dx + "px," + dy + "px)", "important");
        } else {
          it.el.style.removeProperty("transform");
        }
      });
    }
    requestAnimationFrame(jumpFrame);
  }

  function lockAlbumGrid() {
    var el = deepQuery(".container-player");
    if (!el) return;
    var root = el.getRootNode ? el.getRootNode() : document;
    var cs = window.getComputedStyle(el);
    if (cs.display.indexOf("grid") < 0) return;
    var parts = cs.gridTemplateColumns.trim().split(/\s+/);
    var mid = Math.round(parseFloat(parts[1] || "0"));
    var large = parts.length === 3 && mid >= 200 && mid <= 260;
    var old = null;
    try { old = root.getElementById ? root.getElementById("m98-grid-lock") : null; } catch (err) {}
    if (!large) {
      if (old && old.parentNode) old.parentNode.removeChild(old);
      if (el.__m98Lock) {
        el.style.removeProperty("grid-template-columns");
        el.style.removeProperty("grid-template-rows");
        el.__m98Lock = "";
      }
      return;
    }
    var val = cs.gridTemplateColumns;
    var rows = cs.gridTemplateRows;
    var prog = deepQuery("embed-audio-progress");
    var pcs = prog ? window.getComputedStyle(prog) : null;
    var progNow = pcs ? pcs.height : "";
    /* Only trust a full-size reading: sampling during the loading stub
       would pin the collapsed geometry forever. */
    if (parseFloat(progNow) >= 20 && parseFloat(pcs.width) >= 100) {
      el.__m98ProgBox = {
        h: progNow,
        w: pcs.width,
        gc: pcs.gridColumnStart,
        gr: pcs.gridRowStart
      };
    }
    var box = el.__m98ProgBox || null;
    var progH = box ? box.h : "";
    var rule = val + " | " + rows + " | " + (box ? box.h + box.w + box.gc + box.gr : "");
    /* A stylesheet rule survives the embed remounting its own nodes, an
       inline style does not - prev-at-track-1 rebuilds the container.
       Rows are pinned too: the loading variant of the controls reshapes
       them, which is what made the progress bar and transport row hop. */
    if (!old || (old.getAttribute("data-m98") || "") !== rule) {
      if (old && old.parentNode) old.parentNode.removeChild(old);
      var st = document.createElement("style");
      st.id = "m98-grid-lock";
      st.setAttribute("data-m98", rule);
      st.textContent = "@media (min-width: 560px) { .container-player { grid-template-columns: " +
        val + " !important; grid-template-rows: " + rows + " !important; }" +
        (box ? " .container-player embed-audio-progress { height: " + box.h + " !important;" +
          " width: " + box.w + " !important;" +
          (box.gc && box.gc !== "auto" ? " grid-column: " + box.gc + " !important;" : "") +
          (box.gr && box.gr !== "auto" ? " grid-row: " + box.gr + " !important;" : "") +
          " }" : "") + " }";
      try { root.appendChild(st); } catch (err) {}
    }
    if (el.__m98Lock !== rule) {
      el.style.setProperty("grid-template-columns", val, "important");
      el.style.setProperty("grid-template-rows", rows, "important");
      if (prog && box) {
        prog.style.setProperty("height", box.h, "important");
        prog.style.setProperty("width", box.w, "important");
        if (box.gc && box.gc !== "auto") prog.style.setProperty("grid-column", box.gc, "important");
        if (box.gr && box.gr !== "auto") prog.style.setProperty("grid-row", box.gr, "important");
      }
      el.__m98Lock = rule;
    }
  }

  var rsT = null;
  window.addEventListener("resize", function () {
    var el = deepQuery(".container-player");
    if (el && el.__m98Lock) {
      el.style.removeProperty("grid-template-columns");
      el.style.removeProperty("grid-template-rows");
      el.__m98Lock = "";
    }
    clearTimeout(rsT);
    rsT = setTimeout(lockAlbumGrid, 180);
  });

  /* Prev on track 1 makes Apple re-queue the album, which remounts the left
     chrome and flashes the layout. Restart the track ourselves instead. */
  function onPrevGesture(ev) {
    if (ev.type === "keydown" && ev.key !== "Enter" && ev.key !== " ") return;
    var path = ev.composedPath ? ev.composedPath() : [];
    var hit = null;
    for (var i = 0; i < path.length; i++) {
      var n = path[i];
      if (n && n.classList && n.classList.contains("button--previous")) { hit = n; break; }
    }
    if (!hit) return;
    var mk = music();
    if (!mk || !mk.queue) return;
    if ((mk.queue.position || 0) !== 0) return;
    ev.preventDefault();
    ev.stopPropagation();
    if (typeof ev.stopImmediatePropagation === "function") ev.stopImmediatePropagation();
    /* Match the pristine embed: prev on track 1 restarts it from zero and
       plays, without Apple's re-queue remount. */
    Promise.resolve()
      .then(function () {
        try {
          if (typeof mk.seekToTime === "function") mk.seekToTime(0);
          else mk.currentPlaybackTime = 0;
        } catch (err) {}
        if (!mk.isPlaying && mk.play) return mk.play();
      })
      .catch(function () {});
  }

  document.addEventListener("click", onTrackGesture, true);
  document.addEventListener("click", onPrevGesture, true);
  document.addEventListener("keydown", onPrevGesture, true);
  document.addEventListener("keydown", onTrackGesture, true);

  function watch() {
    var mk = music();
    if (mk) patch(mk);
  }
  document.addEventListener("musickitloaded", watch);
  watch();
  lockAlbumGrid();
  var n = 0;
  var t = setInterval(function () {
    watch();
    lockAlbumGrid();
    if (++n > 240) clearInterval(t);
  }, 50);
  setInterval(lockAlbumGrid, 400);
})();
