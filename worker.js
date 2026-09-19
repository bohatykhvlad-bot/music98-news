import { onRequest as desk } from "./functions/api/desk.js";
import { onRequestGet as top50 } from "./functions/api/top50.js";
import { onRequestGet as preview } from "./functions/api/preview.js";
import { onRequestPost as subscribe } from "./functions/api/subscribe.js";
import { onRequestGet as subscribers } from "./functions/api/subscribers.js";
import { onRequestPost as broadcast } from "./functions/api/broadcast.js";
import { onRequest as mail } from "./functions/api/mail.js";

const APPLE_ALBUM = /^\/apple-embed\/([a-z]{2})\/album\/(\d+)$/;
const APPLE_STATIC = /^\/apple-static\/(build|assets)\/([A-Za-z0-9._/-]+)$/;
const APPLE_GW = /^\/apple-gw\/(amp-api\.music\.apple\.com|amp-api-edge\.music\.apple\.com|api\.music\.apple\.com|play\.itunes\.apple\.com|sf-api-token-service\.itunes\.apple\.com)(\/.*)?$/;
const APPLE_EMBED_CSP = [
  "default-src 'self' https://*.apple.com musics: itmss://*.apple.com",
  "img-src 'self' https://*.apple.com https://*.mzstatic.com artwork: data:",
  "style-src 'self' https://*.apple.com 'unsafe-inline'",
  "script-src 'self' https://*.apple.com blob: 'unsafe-eval'",
  "connect-src 'self' https://*.apple.com https://*.mzstatic.com",
  "media-src 'self' https://*.apple.com https://*.mzstatic.com blob:",
  "block-all-mixed-content",
].join("; ");

function rewriteAppleEmbed(html) {
  let out = String(html || "");
  out = out.replace(/(["'])\/build\//g, "$1/apple-static/build/");
  out = out.replace(/(["'])\/assets\//g, "$1/apple-static/assets/");
  out = out.replace(/<script[^>]*static\.cloudflareinsights\.com[^>]*>\s*<\/script>/g, "");  /* Apple analytics: blocked by our CSP, no need inside the embed */
  const tag = '<script src="/apple-player-fix.js?v=editorial-104"></script>';
  if (/<head([^>]*)>/i.test(out)) out = out.replace(/<head([^>]*)>/i, "<head$1>" + tag);
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
  const html = rewriteAppleEmbed(await upstream.text());
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

async function proxyAppleStatic(path) {
  const m = path.match(APPLE_STATIC);
  if (!m || path.includes("..")) return new Response("not found", { status: 404 });
  const apple = `https://embed.music.apple.com/${m[1]}/${m[2]}`;
  const upstream = await fetch(apple, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!upstream.ok) return new Response("not found", { status: 404 });
  const headers = new Headers();
  const type = upstream.headers.get("content-type") || "application/octet-stream";
  headers.set("Content-Type", type);
  headers.set("Cache-Control", "public, max-age=3600");
  return new Response(upstream.body, { status: 200, headers });
}

const GW_FORWARD = {
  authorization: 1,
  accept: 1,
  "accept-language": 1,
  "content-type": 1,
  range: 1,
  "music-user-token": 1,
};

async function proxyAppleGw(request, rawPath) {
  const m = rawPath.match(APPLE_GW);
  if (!m || rawPath.includes("..")) return new Response("not found", { status: 404 });
  const dest = new URL("https://" + m[1] + (m[2] || "/"));
  dest.search = new URL(request.url).search;
  const headers = new Headers();
  for (const [k, v] of request.headers) {
    const key = k.toLowerCase();
    if (GW_FORWARD[key] || key.startsWith("x-apple-")) headers.set(k, v);
  }
  headers.set("Origin", "https://embed.music.apple.com");
  headers.set("Referer", "https://embed.music.apple.com/");
  const init = { method: request.method, headers };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
    init.duplex = "half";
  }
  const upstream = await fetch(dest.toString(), init);
  const out = new Headers();
  const type = upstream.headers.get("content-type");
  if (type) out.set("Content-Type", type);
  out.set("Cache-Control", "no-store");
  return new Response(upstream.body, { status: upstream.status, headers: out });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const rawPath = url.pathname;
    const path = rawPath.replace(/\/+$/, "") || "/";
    const c = { request, env, waitUntil: (p) => ctx.waitUntil(p) };
    if ((request.method === "GET" || request.method === "HEAD") && path.startsWith("/apple-embed/")) {
      return proxyAppleAlbum(request, path);
    }
    if ((request.method === "GET" || request.method === "HEAD") && path.startsWith("/apple-static/")) {
      return proxyAppleStatic(path);
    }
    if (rawPath.startsWith("/apple-gw/")) {
      return proxyAppleGw(request, rawPath);
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
