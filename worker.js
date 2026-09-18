import { onRequest as desk } from "./functions/api/desk.js";
import { onRequestGet as top50 } from "./functions/api/top50.js";
import { onRequestGet as preview } from "./functions/api/preview.js";
import { onRequestPost as subscribe } from "./functions/api/subscribe.js";
import { onRequestGet as subscribers } from "./functions/api/subscribers.js";
import { onRequestPost as broadcast } from "./functions/api/broadcast.js";
import { onRequest as mail } from "./functions/api/mail.js";

export default {
  async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname.replace(/\/+$/, "") || "/";
    const c = { request, env, waitUntil: (p) => ctx.waitUntil(p) };
    if (path === "/api/top50" && request.method === "GET") return top50(c);
    if (path === "/api/preview" && (request.method === "GET" || request.method === "HEAD")) return preview(c);
    if (path === "/api/desk") return desk(c);
    if (path === "/api/subscribe" && request.method === "POST") return subscribe(c);
    if (path === "/api/subscribers" && request.method === "GET") return subscribers(c);
    if (path === "/api/broadcast" && request.method === "POST") return broadcast(c);
    if (path === "/api/mail") return mail(c);
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
