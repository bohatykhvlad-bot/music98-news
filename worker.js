import { onRequest as desk } from "./functions/api/desk.js";
import { onRequestGet as top50 } from "./functions/api/top50.js";
import { onRequestPost as subscribe } from "./functions/api/subscribe.js";
import { onRequestGet as subscribers } from "./functions/api/subscribers.js";
import { onRequestPost as broadcast } from "./functions/api/broadcast.js";

export default {
  async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname.replace(/\/+$/, "") || "/";
    const c = { request, env, waitUntil: (p) => ctx.waitUntil(p) };
    if (path === "/api/top50" && request.method === "GET") return top50(c);
    if (path === "/api/desk") return desk(c);
    if (path === "/api/subscribe" && request.method === "POST") return subscribe(c);
    if (path === "/api/subscribers" && request.method === "GET") return subscribers(c);
    if (path === "/api/broadcast" && request.method === "POST") return broadcast(c);
    return env.ASSETS.fetch(request);
  },
};
