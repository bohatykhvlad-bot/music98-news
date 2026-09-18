/**
 * Same-origin Apple preview proxy.
 * Safari/iOS applies iTunNORM (Sound Check) after playback starts, so the
 * clip blasts then ducks. Rename the atom (same length) so Sound Check
 * never sees it. Also serve audio/mp4 instead of Apple's audio/x-m4p.
 */
const MAX_BYTES = 3 * 1024 * 1024;
const NEEDLE = new TextEncoder().encode("iTunNORM");
const REPL = new TextEncoder().encode("iTunSKIP");

function allowedHost(host) {
  const h = String(host || "").toLowerCase();
  return (
    h === "audio-ssl.itunes.apple.com" ||
    h === "audio.itunes.apple.com" ||
    h === "mzstatic.com" ||
    h.endsWith(".mzstatic.com")
  );
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

export async function onRequestGet({ request }) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("method", { status: 405 });
  }
  let target;
  try {
    target = new URL(new URL(request.url).searchParams.get("u") || "");
  } catch {
    return new Response("bad url", { status: 400 });
  }
  if (target.protocol !== "https:" || !allowedHost(target.hostname) || !allowedPreview(target)) {
    return new Response("bad url", { status: 400 });
  }

  let upstream;
  try {
    upstream = await fetch(target.href, {
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
