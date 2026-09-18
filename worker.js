import { onRequest as desk } from "./functions/api/desk.js";
import { onRequestGet as top50 } from "./functions/api/top50.js";
import { onRequestGet as preview } from "./functions/api/preview.js";
import { onRequestPost as subscribe } from "./functions/api/subscribe.js";
import { onRequestGet as subscribers } from "./functions/api/subscribers.js";
import { onRequestPost as broadcast } from "./functions/api/broadcast.js";
import { onRequest as mail } from "./functions/api/mail.js";

const APPLE_ALBUM = /^\/apple-embed\/([a-z]{2})\/album\/(\d+)$/;
const APPLE_EMBED_CSP = [
  "default-src 'self' https://*.apple.com musics: itmss://*.apple.com",
  "img-src 'self' https://*.apple.com https://*.mzstatic.com artwork: data:",
  "style-src 'self' https://*.apple.com 'unsafe-inline'",
  "script-src 'self' https://*.apple.com blob: 'unsafe-eval'",
  "connect-src 'self' https://*.apple.com https://*.mzstatic.com",
  "media-src 'self' https://*.apple.com https://*.mzstatic.com blob:",
  "block-all-mixed-content",
].join("; ");

function rewriteAppleEmbed(html, scriptUrl) {
  let out = String(html || "");
  out = out.replace(/(["'])\/build\//g, "$1https://embed.music.apple.com/build/");
  out = out.replace(/(["'])\/assets\//g, "$1https://embed.music.apple.com/assets/");
  if (!/<base\s/i.test(out)) {
    out = out.replace(/<head([^>]*)>/i, '<head$1><base href="https://embed.music.apple.com/">');
  }
  const tag = `<script src="${scriptUrl}"></script>`;
  if (/<\/head>/i.test(out)) out = out.replace(/<\/head>/i, tag + "</head>");
  else out = tag + out;
  return out;
}

async function proxyAppleAlbum(request, path) {
  const m = path.match(APPLE_ALBUM);
  if (!m) return new Response("not found", { status: 404 });
  const apple = new URL(`https://embed.music.apple.com/${m[1]}/album/${m[2]}`);
  apple.search = new URL(request.url).search;
  const upstream = await fetch(apple.toString(), {
    headers: {
      Accept: "text/html",
      "User-Agent": request.headers.get("User-Agent") || "Mozilla/5.0",
    },
  });
  if (!upstream.ok) {
    return new Response("apple embed unavailable", { status: 502 });
  }
  const origin = new URL(request.url).origin;
  const html = rewriteAppleEmbed(await upstream.text(), origin + "/apple-player-fix.js?v=editorial-69");
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=60",
      "Content-Security-Policy": APPLE_EMBED_CSP,
      "Referrer-Policy": "strict-origin-when-cross-origin",
    },
  });
}

export default {
  async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname.replace(/\/+$/, "") || "/";
    const c = { request, env, waitUntil: (p) => ctx.waitUntil(p) };
    if (path.startsWith("/apple-embed/") && (request.method === "GET" || request.method === "HEAD")) {
      return proxyAppleAlbum(request, path);
    }
    if (path === "/api/top50" && request.method === "GET") return top50(c);
    if (path === "/api/preview" && (request.method === "GET" || request.method === "HEAD")) return preview(c);
    if (path === "/api/desk") return desk(c);
    if (path === "/api/subscribe" && request.method === "POST") return subscribe(c);
    if (path === "/api/subscribers" && request.method === "GET") return subscribers(c);
    if (path === "/api/broadcast" && request.method === "POST") return broadcast(c);
    if (path === "/api/mail") return mail(c);
    if (path === "/m98desk" || path === "/m98desk.html") {
      const u = new URL("/admin-desk", request.url);
      return Response.redirect(u, 301);
    }
    const res = await env.ASSETS.fetch(request);
    const type = (res.headers.get("content-type") || "").toLowerCase();
    const headers = new Headers(res.headers);
    if (type.includes("text/html") || path.startsWith("/photos/") || path === "/data/desk.json") {
      headers.set("Cache-Control", "no-store, max-age=0");
      return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
    }
    return res;
  },
};
