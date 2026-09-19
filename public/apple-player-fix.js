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

  /* Apple sizes the embed itself and writes the result on the host:
     <embed-root class="root ltr xsmall music"> with xsmall <340, small <425,
     medium <480, large >=480 (embed px). Trust that when present; keep the
     viewport probe as a fallback so nothing changes before the class lands. */
  function appleBreak() {
    var root = document.querySelector("embed-root");
    var cn = (root && typeof root.className === "string") ? root.className : "";
    var m = cn.match(/(?:^|\s)(xsmall|small|medium|large)(?:\s|$)/);
    return m ? m[1] : "";
  }
  function appleWide() {
    return appleBreak() === "large" || window.matchMedia("(min-width: 560px)").matches;
  }

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
      holdControls(2600);
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
    holdControls(2600);
    armJumpFix(appleWide() ? 1200 : 900, true);
    var mk = music();
    if (!mk) return;
    patch(mk);
    mkArm(mk);   /* zero before the switch's buffers can start */
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
    var until = Date.now() + (ms || 250);
    var fixed = false;
    var b = prog ? prog.getBoundingClientRect() : null;
    var base = b ? { x: b.x, y: b.y, w: b.width, h: b.height } : null;
    function frame() {
      if (Date.now() > until) {
        if (prog && fixed) {
          ["position", "left", "top", "width", "height", "margin", "zIndex", "transform"].forEach(function (k) {
            prog.style.removeProperty(k);
          });
        }
        settleRaf = 0;
        return;
      }
      fixOverlaps();
      var wide = appleWide();
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
      /* The metadata lockup is left entirely to Apple: holdControls keeps the
         loading variant (the only one that ever popped a stray lockup) out of
         the DOM, and the native cross-fade must run in BOTH directions — the
         old display:none guard killed the outgoing fade in a single frame
         whenever the new title changed the lockup's height. */
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

  /* While audio plays, nothing may sit on top of the transport: Apple's red
     "listen on Apple Music" affordances can overlap the play button during
     variant transitions. Hide exactly the intersecting ones.
     The intersection target is the play/pause button (padded), NOT the whole
     .audio-controls container: on the large breakpoint Apple renders its own
     active-state "listen on Apple Music" link INSIDE .audio-controls (class
     audio-controls__more), so a container test hid that link on every desktop
     playback — the pristine embed keeps it. Candidates are only the red launch
     upsells: the static legal footer link must never blink. */
  var ovCands = null, ovCandsT = 0;
  function playButtonRect() {
    var els = [deepQuery(".playback-play__play"), deepQuery(".playback-play__pause")];
    for (var i = 0; i < els.length; i++) {
      var b = els[i] ? els[i].getBoundingClientRect() : null;
      if (b && b.width > 0 && b.height > 0) {
        return { x: b.x - 6, y: b.y - 6, w: b.width + 12, h: b.height + 12 };
      }
    }
    return null;
  }
  function fixOverlaps() {
    if (!appleWide()) return;
    if (!ovCands || Date.now() - ovCandsT > 500) {
      ovCands = deepQueryAll("embed-launch-client, .launch-client");
      ovCandsT = Date.now();
    }
    var cb = playButtonRect();
    var cands = ovCands;
    if (!cb) {
      cands.forEach(function (el) {
        if (el.__m98ov) { el.style.removeProperty("visibility"); el.__m98ov = 0; }
      });
      return;
    }
    cands.forEach(function (el) {
      var b = el.getBoundingClientRect();
      if (!b.width || !b.height) return;
      var ix = Math.min(b.x + b.width, cb.x + cb.w) - Math.max(b.x, cb.x);
      var iy = Math.min(b.y + b.height, cb.y + cb.h) - Math.max(b.y, cb.y);
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
  var MK_ANDROID = /Android/i.test(navigator.userAgent);
  /* The onset guard is the PC sound fix signed for mobile: Apple devices get
     the same dB-shaped slew-limited ramp instead of a full-volume first
     buffer. iOS honours MusicKit volume from the first sample, so its ramp
     schedules sooner than Android's mixer-delayed one. */
  var MK_IOS = /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var MK_MOBILE = MK_ANDROID || MK_IOS;
  var playedOnce = false;
  var mkVol = { pending: false, timer: 0, raf: 0, wasPlaying: false, ramping: false };
  /* dB-shaped, slew-limited fade: equal loudness steps instead of a linear
     amplitude climb, and one janky frame can never advance the fade by more
     than MK_MAX_DT ms. A stalled frame leaping the ramp was still audible as
     a small volume jump at the start of a track. */
  var MK_FADE_MS = 460, MK_FADE_DB = 42, MK_MAX_DT = 40;
  function mkRamp(mk) {
    if (mkVol.raf) cancelAnimationFrame(mkVol.raf);
    mkVol.ramping = true;
    var acc = 0, prev = performance.now(), last = 0;
    (function step(rafNow) {
      var now = (typeof rafNow === "number" && rafNow > 0) ? rafNow : performance.now();
      var dt = now - prev; prev = now;
      if (!(dt > 0)) dt = 0;
      if (dt > MK_MAX_DT) dt = MK_MAX_DT;
      acc += dt;
      var t = acc / MK_FADE_MS;
      var v = (t >= 1) ? 1 : Math.pow(10, -MK_FADE_DB * (1 - t) / 20);
      if (v < last) v = last;            /* monotonic */
      last = v;
      try { mk.volume = v; } catch (err) {}
      if (t < 1) mkVol.raf = requestAnimationFrame(step);
      else { mkVol.raf = 0; mkVol.ramping = false; try { mk.volume = 1; } catch (err) {} }
    })(performance.now());
  }
  /* Android blast guard: zero the volume BEFORE any buffer can start — at
     hook time, on a play intent, and on a track change — then ramp back in
     300ms after playback has actually begun. Setting the volume inside the
     'playing' event is too late: the first buffers are already audible. */
  function mkArm(mk) {
    if (!MK_MOBILE || !mk) return;
    try { mk.volume = 0; } catch (err) {}
    mkVol.pending = true;
    mkVol.ramping = false;
    if (mkVol.timer) { clearTimeout(mkVol.timer); mkVol.timer = 0; }
    if (mkVol.raf) { cancelAnimationFrame(mkVol.raf); mkVol.raf = 0; }
  }
  function mkSchedule(mk) {
    if (!MK_MOBILE || !mkVol.pending || mkVol.timer) return;
    mkVol.timer = setTimeout(function () {
      mkVol.timer = 0;
      mkVol.pending = false;
      mkRamp(mk);
    }, MK_ANDROID ? 300 : 120);
  }
  setInterval(function () {
    var mk = music();
    if (mk && !mk.__m98ovHook) {
      mk.__m98ovHook = 1;
      mkArm(mk);   /* the very first buffer must never see volume 1 */
      try {
        mk.addEventListener("playbackStateDidChange", function (ev) {
          fixOverlaps(); armJumpFix(800);
          if (!MK_MOBILE) return;
          var playing = mk.isPlaying;
          if (playing) {
            playedOnce = true;
            if (!mkVol.wasPlaying) { mkArm(mk); mkSchedule(mk); }
            mkVol.wasPlaying = true;
          } else {
            mkVol.wasPlaying = false;
            if (mkVol.timer) { clearTimeout(mkVol.timer); mkVol.timer = 0; }
          }
        });
        mk.addEventListener("mediaItemDidChange", function () {
          fixOverlaps(); armJumpFix(800);
          holdControls(1500);   /* a natural track advance re-renders the bar too */
          scrub.active = false; setScrubbing(scrub.el, false);
          if (!MK_MOBILE) return;
          mkArm(mk);   /* next track's buffers start at zero too */
          if (mk.isPlaying) mkSchedule(mk);
        });
      } catch (err) {}
    } else if (mk && MK_MOBILE && mkVol.pending && mk.isPlaying && !mkVol.timer) {
      mkSchedule(mk);   /* failsafe: a missed state event must not mute forever */
    }
  }, 200);

  /* ---- hold Apple's "loading" control variant out of the DOM --------------
     embed-audio-controls renders three different subtrees from one state:
       initial -> big play button + "listen on Apple Music"
       loading -> spinner + "listen on Apple Music", and <embed-audio-progress>
                  is NOT rendered at all
       active  -> progress bar + prev/play/next
     It flips to "loading" 500ms after playback leaves playing/paused/seeking/
     waiting. skipToNextItem stays inside those states (arrows = smooth), but
     changeToMediaAtIndex — what a track-name click goes through — parks the
     player in loading, so the whole bottom bar is unmounted and remounted:
     the transport hops up-left and the red Apple button flashes in. Pinning
     the grid cannot help, because the element that owns the space is gone.
     Swallow the state change instead: no re-render, no reflow, nothing to
     compensate. The deferred state is applied when the hold expires if the
     player genuinely is not back in a live state. */
  var ctrl = { until: 0, el: null, timer: 0, tick: 0 };
  function descFor(el, prop) {
    var o = el;
    while (o && o !== Object.prototype) {
      var d = Object.getOwnPropertyDescriptor(o, prop);
      if (d && (d.get || d.set)) return d;
      o = Object.getPrototypeOf(o);
    }
    return null;
  }
  function inLiveStates(mk) {          /* mirrors Apple's own q() helper */
    try {
      var PS = window.MusicKit && window.MusicKit.PlaybackStates;
      if (mk && PS) {
        var st = mk.playbackState;
        return st === PS.playing || st === PS.paused || st === PS.seeking || st === PS.waiting;
      }
    } catch (err) {}
    return !!(mk && mk.isPlaying);
  }
  function guardControls(el) {
    if (!el || el.__m98CtrlGuard) return;
    var d = descFor(el, "controlState");
    if (!d || !d.set) return;
    var hadActive = false;
    try { hadActive = (el.controlState === "active"); } catch (err) {}
    el.__m98CtrlHadActive = hadActive;
    el.__m98CtrlDeferred = null;
    try {
      Object.defineProperty(el, "controlState", {
        configurable: true,
        get: function () { return d.get ? d.get.call(this) : undefined; },
        set: function (v) {
          if (v === "active") {
            this.__m98CtrlHadActive = true;
            this.__m98CtrlDeferred = null;
            d.set.call(this, v);
            return;
          }
          if (Date.now() < ctrl.until && this.__m98CtrlHadActive) {
            this.__m98CtrlDeferred = v;      /* keep the transport on screen */
            return;
          }
          this.__m98CtrlDeferred = null;
          d.set.call(this, v);
        }
      });
      el.__m98CtrlGuard = 1;
    } catch (err) {}
  }
  function holdControls(ms) {
    ctrl.until = Math.max(ctrl.until, Date.now() + (ms || 2000));
    var el = deepQuery("embed-audio-controls");
    if (!el) return;
    ctrl.el = el;
    guardControls(el);
    if (!el.__m98CtrlGuard) return;
    try { if (el.controlState === "active") el.__m98CtrlHadActive = true; } catch (err) {}
    if (ctrl.timer) clearTimeout(ctrl.timer);
    ctrl.timer = setTimeout(releaseControls, Math.max(30, ctrl.until - Date.now()) + 60);
    /* Apple could swap the element mid-hold; keep the guard on the live one. */
    if (!ctrl.tick) {
      ctrl.tick = setInterval(function () {
        if (Date.now() >= ctrl.until) { clearInterval(ctrl.tick); ctrl.tick = 0; return; }
        var live = deepQuery("embed-audio-controls");
        if (live && live !== ctrl.el) { ctrl.el = live; guardControls(live); }
      }, 150);
    }
  }
  function releaseControls() {
    ctrl.timer = 0;
    var el = ctrl.el || deepQuery("embed-audio-controls");
    if (!el) return;
    var pending = el.__m98CtrlDeferred;
    el.__m98CtrlDeferred = null;
    if (pending && !inLiveStates(music())) {
      try { el.controlState = pending; } catch (err) {}
    }
  }

  /* ---- scrubber thumb: tell Apple the user is scrubbing -------------------
     amp-playback-controls-progress-range binds only mouse events. On touch the
     synthetic mousedown arrives after touchend, so while the seek is in flight
     isScrubbing is still false and playbackTimeDidChange writes the OLD time
     back into the thumb: press point -> old position -> press point. Raise the
     flag on pointerdown/touchstart and drop it once the seek has landed. */
  var scrub = { el: null, active: false, released: true, target: -1, until: 0, timer: 0 };
  function rangeFromPath(path) {
    for (var i = 0; i < path.length; i++) {
      var n = path[i];
      if (!n || !n.tagName) continue;
      if (n.tagName === "AMP-PLAYBACK-CONTROLS-PROGRESS-RANGE") return n;
      if (n.classList && n.classList.contains("progress-range")) {
        var rn = n.getRootNode && n.getRootNode();
        if (rn && rn.host && rn.host.tagName === "AMP-PLAYBACK-CONTROLS-PROGRESS-RANGE") return rn.host;
      }
    }
    return null;
  }
  function setScrubbing(el, on) {
    if (!el) return;
    try { if (el.isScrubbing !== on) el.isScrubbing = on; } catch (err) {}
  }
  function scrubRange() {
    var el = scrub.el;
    if (el && el.isConnected) return el;
    el = deepQuery("amp-playback-controls-progress-range");
    scrub.el = el;
    return el;
  }
  function scrubStart(ev) {
    /* Only a hit on the scrubber itself: a fallback deepQuery would freeze the
       thumb on every unrelated tap inside the embed. */
    var path = ev.composedPath ? ev.composedPath() : [];
    var el = rangeFromPath(path);
    if (!el) return;
    scrub.el = el;
    scrub.active = true;
    scrub.released = false;
    setScrubbing(el, true);
    try {
      var r = el.shadowRoot || el;
      var inp = r.querySelector ? r.querySelector("input") : null;
      scrub.target = inp ? parseFloat(inp.value) : -1;
    } catch (err) { scrub.target = -1; }
    if (!(scrub.target >= 0)) scrub.target = -1;
    scrub.until = Date.now() + 8000;      /* hard ceiling: never freeze the thumb */
    scrubLoop();
  }
  function scrubEnd() {
    if (!scrub.active) return;
    scrub.released = true;
    /* the pointer is up; read the thumb so a stale time cannot beat our target */
    try {
      var el = scrub.el;
      var r = el && (el.shadowRoot || el);
      var inp = r && r.querySelector ? r.querySelector("input") : null;
      if (inp) {
        var v = parseFloat(inp.value);
        if (v >= 0) scrub.target = v;
      }
    } catch (err) {}
    scrub.until = Math.min(scrub.until, Date.now() + 2000);
    scrubLoop();
  }
  function scrubLoop() {
    if (scrub.timer) return;
    scrub.timer = setTimeout(function tick() {
      scrub.timer = 0;
      if (!scrub.active) return;
      var el = scrubRange();
      if (!el) { scrub.active = false; return; }
      setScrubbing(el, true);            /* re-assert across a re-render */
      var done = Date.now() > scrub.until;
      if (!done && scrub.released) {
        var t = -1;
        try { t = music() ? music().currentPlaybackTime : -1; } catch (err) {}
        done = (typeof t === "number" && t >= 0 && scrub.target >= 0 &&
                Math.abs(t - scrub.target) < 0.8);
      }
      if (done) { setScrubbing(el, false); scrub.active = false; return; }
      scrub.timer = setTimeout(tick, 100);
    }, 100);
  }
  ["pointerdown", "touchstart", "mousedown"].forEach(function (t) {
    document.addEventListener(t, scrubStart, true);
  });
  ["pointerup", "pointercancel", "touchend", "touchcancel", "mouseup"].forEach(function (t) {
    window.addEventListener(t, scrubEnd, true);
  });

  /* Narrow-layout transition stabiliser: position-only compensation with
     cached refs, active only inside a short window after a gesture or a
     MusicKit state change. No grid pins and no size forcing on mobile. */
  var JUMP_SELS = [".audio-controls", "embed-audio-progress", "embed-auth-control",
    ".auth-control__sign-in", "amp-artwork", ".container-player__logo-header"];
  var jumpUntil = 0, jumpRefs = null, loopOn = false;
  function clearRef(it) {
    if (it.el && it.el.isConnected) it.el.style.removeProperty("transform");
  }
  function pinEngaged() {
    var el = deepQuery(".container-player");
    return !!(el && el.__m98LockKey);
  }
  function armJumpFix(ms, fromGesture) {
    /* On narrow only a gesture-time baseline is trustworthy: an event-driven
       arm would capture the layout after it already moved and pin the damage. */
    if (!appleWide() && !fromGesture) return;
    if (pinEngaged() && !fromGesture) return;   /* pin already holds the layout */
    if (jumpRefs) jumpRefs.forEach(function (it) { it.dx = 0; it.dy = 0; clearRef(it); });
    jumpRefs = JUMP_SELS.map(function (sel) {
      var el = deepQuery(sel);
      if (!el) return null;
      var b = el.getBoundingClientRect();
      return (b.width || b.height) ? { sel: sel, el: el, x: b.x, y: b.y, dx: 0, dy: 0 } : null;
    }).filter(Boolean);
    jumpUntil = fromGesture ? Date.now() + (ms || 900) : Math.max(jumpUntil, Date.now() + (ms || 1200));
    if (!loopOn) { loopOn = true; requestAnimationFrame(jumpFrame); }
  }
  function jumpFrame() {
    if (Date.now() >= jumpUntil) {
      loopOn = false;
      if (jumpRefs) jumpRefs.forEach(function (it) { it.dx = 0; it.dy = 0; clearRef(it); });
      jumpRefs = null;
      return;
    }
    if (jumpRefs) {
      jumpRefs.forEach(function (it) {
        if (!it.el || !it.el.isConnected) {
          it.el = deepQuery(it.sel);
          it.dx = 0; it.dy = 0;
          if (!it.el) return;
        }
        var b = it.el.getBoundingClientRect();
        if (!b.width && !b.height) return;
        /* The rect already includes our own translate: subtract it, otherwise
           the loop chases itself (on -> off -> on) and shimmers at 60Hz. */
        var dx = it.x - (b.x - it.dx), dy = it.y - (b.y - it.dy);
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
          it.el.style.setProperty("transform", "translate(" + dx + "px," + dy + "px)", "important");
          it.dx = dx; it.dy = dy;
        } else if (it.dx || it.dy) {
          it.el.style.removeProperty("transform");
          it.dx = 0; it.dy = 0;
        }
      });
    }
    requestAnimationFrame(jumpFrame);
  }

  var PIN_PARTS = [".audio-controls", "embed-audio-progress", "embed-auth-control",
    ".auth-control__sign-in", "amp-artwork", ".container-player__logo-header"];
  function lockAlbumGrid() {
    var el = deepQuery(".container-player");
    if (!el) return;
    var cs = window.getComputedStyle(el);
    if (cs.display.indexOf("grid") < 0) return;
    var parts = cs.gridTemplateColumns.trim().split(/\s+/);
    /* "Wide" = the roomy album layout: viewport is desktop-width and some
       column matches the artwork track (~231px). Track-count checks break
       when implicit columns appear, so probe track sizes instead. */
    var wide = appleWide() &&
      parts.some(function (x) { var v = parseFloat(x); return v >= 200 && v <= 260; });
    /* Gates: boot done; on narrow layouts wait for the first real playback so
       the pin can never capture a boot or pre-play state. */
    if (!deepQuery("embed-audio-tracklist-item") || !deepQuery(".audio-controls")) return;
    if (!wide && !playedOnce) return;
    var rows = cs.gridTemplateRows;
    var place = PIN_PARTS.map(function (sel) {
      var el2 = deepQuery(sel);
      if (!el2) return sel + ":none";
      var c2 = window.getComputedStyle(el2);
      var extra = (sel === ".audio-controls" || sel === "embed-audio-progress") ? "," + c2.height : "";
      return sel + ":" + c2.gridColumnStart + "," + c2.gridRowStart + extra;
    }).join(";");
    var key = cs.gridTemplateColumns + " | " + rows + " | " + place;
    if (el.__m98LockKey === key) return;
    if (el.__m98SeenKey !== key) { el.__m98SeenKey = key; el.__m98KeyT = Date.now(); return; }
    if (Date.now() - (el.__m98KeyT || 0) < (wide ? 300 : 500)) return;   /* outlive any loading variant */
    var root = el.getRootNode ? el.getRootNode() : document;
    var oldStyle = root.getElementById ? root.getElementById("m98-grid-lock") : null;
    if (oldStyle && (oldStyle.getAttribute("data-m98") || "") !== key) {
      if (oldStyle.parentNode) oldStyle.parentNode.removeChild(oldStyle);
      oldStyle = null;
    }
    if (!oldStyle) {
      var rule = ".container-player{grid-template-columns:" + cs.gridTemplateColumns + " !important;" +
        "grid-template-rows:" + rows + " !important;}";
      PIN_PARTS.forEach(function (sel) {
        var el2 = deepQuery(sel);
        if (!el2) return;
        var c2 = window.getComputedStyle(el2);
        rule += sel + "{grid-column:" + c2.gridColumnStart + " !important;" +
          "grid-row:" + c2.gridRowStart + " !important;";
        if (wide && (sel === ".audio-controls" || sel === "embed-audio-progress")) {
          if (parseFloat(c2.height) > 0) rule += "height:" + c2.height + " !important;";
          if (sel === "embed-audio-progress" && parseFloat(c2.width) > 0) rule += "width:" + c2.width + " !important;";
        }
        rule += "}";
      });
      var st = document.createElement("style");
      st.id = "m98-grid-lock";
      st.setAttribute("data-m98", key);
      st.textContent = rule;
      var host = root.head || root.documentElement || root;   /* document can't take raw children */
      try { host.appendChild(st); } catch (err) { try { root.appendChild(st); } catch (e2) {} }
    }
    el.__m98LockKey = key;
    el.style.setProperty("grid-template-columns", cs.gridTemplateColumns, "important");
    el.style.setProperty("grid-template-rows", rows, "important");
    PIN_PARTS.forEach(function (sel) {
      var el2 = deepQuery(sel);
      if (!el2) return;
      var c2 = window.getComputedStyle(el2);
      el2.style.setProperty("grid-column", c2.gridColumnStart, "important");
      el2.style.setProperty("grid-row", c2.gridRowStart, "important");
      if (wide && (sel === ".audio-controls" || sel === "embed-audio-progress")) {
        if (parseFloat(c2.height) > 0) el2.style.setProperty("height", c2.height, "important");
        if (sel === "embed-audio-progress" && parseFloat(c2.width) > 0) el2.style.setProperty("width", c2.width, "important");
      }
    });
  }

  var rsT = null;
  window.addEventListener("resize", function () {
    var el = deepQuery(".container-player");
    if (el) {
      el.__m98LockKey = "";
      el.__m98SeenKey = "";
      el.style.removeProperty("grid-template-columns");
      el.style.removeProperty("grid-template-rows");
      var root = el.getRootNode ? el.getRootNode() : document;
      var st = root.getElementById ? root.getElementById("m98-grid-lock") : null;
      if (st && st.parentNode) st.parentNode.removeChild(st);
      PIN_PARTS.forEach(function (sel) {
        var el2 = deepQuery(sel);
        if (!el2) return;
        el2.style.removeProperty("grid-column");
        el2.style.removeProperty("grid-row");
        el2.style.removeProperty("height");
        el2.style.removeProperty("width");
      });
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
    holdControls(1400);
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

  /* Next on the last track: pristine Apple stops the queue and drops the embed
     into the initial variant — a full controls swap that reads as a jump and
     blanks the transport for a moment. Wrap to the first track through the
     sealed jump path instead, mirroring the prev-on-track-1 restart. */
  function onNextGesture(ev) {
    if (ev.type === "keydown" && ev.key !== "Enter" && ev.key !== " ") return;
    var path = ev.composedPath ? ev.composedPath() : [];
    var hit = null;
    for (var i = 0; i < path.length; i++) {
      var n = path[i];
      if (n && n.classList && n.classList.contains("button--next")) { hit = n; break; }
    }
    if (!hit) return;
    var mk = music();
    if (!mk || !mk.queue) return;
    var last = queueItems(mk).length - 1;
    if (last < 0 || (mk.queue.position || 0) !== last) return;
    ev.preventDefault();
    ev.stopPropagation();
    if (typeof ev.stopImmediatePropagation === "function") ev.stopImmediatePropagation();
    lockAlbumGrid();
    Promise.resolve(goToIndex(mk, 0)).catch(function () {});
  }

  document.addEventListener("click", onTrackGesture, true);
  document.addEventListener("click", onPrevGesture, true);
  document.addEventListener("click", onNextGesture, true);
  document.addEventListener("keydown", onPrevGesture, true);
  document.addEventListener("keydown", onNextGesture, true);
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
