/**
 * Same-origin Apple preview proxy.
 * Safari/iOS applies iTunNORM (Sound Check) after playback starts, so the
 * clip blasts then ducks. Rename the atom (same length) so Sound Check
 * never sees it. Also serve audio/mp4 instead of Apple's audio/x-m4p.
 *
 * iTunes Search still returns the 30s .p.m4a clip. The Apple Music song
 * page JSON-LD contentUrl is the 90s .ep.m4a when the track is long enough.
 */
const MAX_BYTES = 5 * 1024 * 1024;
const NEEDLE = new TextEncoder().encode("iTunNORM");
const REPL = new TextEncoder().encode("iTunSKIP");
const PAGE_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";

function allowedHost(host) {
  const h = String(host || "").toLowerCase();
  return (
    h === "audio-ssl.itunes.apple.com" ||
    h === "audio.itunes.apple.com" ||
    h === "mzstatic.com" ||
    h.endsWith(".mzstatic.com")
  );
}

function allowedSongHost(host) {
  const h = String(host || "").toLowerCase();
  return h === "music.apple.com" || h === "itunes.apple.com";
}

function allowedPreview(url) {
  const path = url.pathname.toLowerCase();
  const href = url.href.toLowerCase();
  return path.endsWith(".m4a") || href.includes("audiopreview") || href.includes("audio-ssl.itunes.apple.com");
}

function stripSoundCheck(buf) {
  const u8 = new Uint8Array(buf);
  for (let i = 0; i <= u8.length - NEEDLE.length; i++) {
    let hit = true;
    for (let j = 0; j < NEEDLE.length; j++) {
      if (u8[i + j] !== NEEDLE[j]) {
        hit = false;
        break;
      }
    }
    if (hit) {
      u8.set(REPL, i);
      i += NEEDLE.length - 1;
    }
  }
  return u8;
}

function songPageUrl(song) {
  const s = String(song || "").trim();
  if (/^\d+$/.test(s)) return "https://music.apple.com/us/song/" + s;
  let u;
  try {
    u = new URL(s);
  } catch {
    return "";
  }
  if (u.protocol !== "https:" || !allowedSongHost(u.hostname)) return "";
  const id = u.searchParams.get("i") || "";
  if (/^\d+$/.test(id)) return "https://music.apple.com/us/song/" + id;
  const m = u.pathname.match(/\/song\/(?:[^/]+\/)?(\d+)/);
  if (m) return "https://music.apple.com/us/song/" + m[1];
  if (u.hostname.toLowerCase() === "music.apple.com") return u.origin + u.pathname;
  return "";
}

function extractExtended(html) {
  const text = String(html || "");
  const m =
    text.match(/"contentUrl"\s*:\s*"(https:\\\/\\\/audio(?:-ssl)?\.itunes\.apple\.com[^"]+\.m4a)"/i) ||
    text.match(/"contentUrl"\s*:\s*"(https:\/\/audio(?:-ssl)?\.itunes\.apple\.com[^"]+\.m4a)"/i);
  if (!m) return "";
  return m[1].replace(/\\u002F/gi, "/").replace(/\\\//g, "/");
}

async function resolveClip(clip, song) {
  const page = songPageUrl(song);
  if (!page) return clip;
  try {
    const res = await fetch(page, {
      headers: { "User-Agent": PAGE_UA, Accept: "text/html,application/xhtml+xml" },
      cf: { cacheEverything: true, cacheTtl: 86400 },
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) return clip;
    const ext = extractExtended(await res.text());
    if (!ext) return clip;
    const u = new URL(ext);
    if (u.protocol === "https:" && allowedHost(u.hostname) && allowedPreview(u)) return u.href;
  } catch {}
  return clip;
}

export async function onRequestGet({ request }) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("method", { status: 405 });
  }
  const params = new URL(request.url).searchParams;
  let target;
  try {
    target = new URL(params.get("u") || "");
  } catch {
    return new Response("bad url", { status: 400 });
  }
  if (target.protocol !== "https:" || !allowedHost(target.hostname) || !allowedPreview(target)) {
    return new Response("bad url", { status: 400 });
  }

  let href = target.href;
  try {
    href = await resolveClip(href, params.get("song") || "");
  } catch {}

  let upstream;
  try {
    upstream = await fetch(href, {
      headers: { Accept: "audio/*,*/*;q=0.8" },
      cf: { cacheEverything: true, cacheTtl: 86400 },
    });
  } catch {
    return new Response("upstream", { status: 502 });
  }
  if (!upstream.ok) {
    return new Response("upstream", { status: upstream.status === 404 ? 404 : 502 });
  }
  const len = Number(upstream.headers.get("content-length") || 0);
  if (len > MAX_BYTES) return new Response("too large", { status: 413 });

  const raw = await upstream.arrayBuffer();
  if (raw.byteLength > MAX_BYTES) return new Response("too large", { status: 413 });
  const body = stripSoundCheck(raw);

  const headers = {
    "Content-Type": "audio/mp4",
    "Content-Length": String(body.byteLength),
    "Cache-Control": "public, max-age=86400",
    "Accept-Ranges": "none",
  };
  if (request.method === "HEAD") return new Response(null, { status: 200, headers });
  return new Response(body, { status: 200, headers });
}
