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
      if (!mk.isPlaying && mk.play) await mk.play();
      return true;
    }
    if (typeof mk.skipToNextItem !== "function" || typeof mk.skipToPreviousItem !== "function") {
      if (mk.queue) mk.queue.position = target;
      if (!mk.isPlaying && mk.play) await mk.play();
      return true;
    }
    var steps = target - pos;
    if (steps > 0) {
      for (var i = 0; i < steps; i++) await mk.skipToNextItem();
    } else {
      for (var j = 0; j < -steps; j++) await mk.skipToPreviousItem();
    }
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

  document.addEventListener("click", onTrackGesture, true);
  document.addEventListener("keydown", onTrackGesture, true);

  function watch() {
    var mk = music();
    if (mk) patch(mk);
  }
  document.addEventListener("musickitloaded", watch);
  watch();
  var n = 0;
  var t = setInterval(function () {
    watch();
    if (++n > 240) clearInterval(t);
  }, 50);
})();
