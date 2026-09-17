import { adminOk, json, readDesk, writeDesk } from "../lib/store.js";

export async function onRequest({ request, env }) {
  if (request.method === "GET") {
    const desk = await readDesk(env);
    return json({ posts: desk.posts });
  }
  if (request.method === "POST") {
    if (!adminOk(request, env)) return json({ error: "unauthorized" }, 401);
    let payload = {};
    try { payload = await request.json(); } catch { payload = {}; }
    if (!Array.isArray(payload.posts)) return json({ error: "posts_required" }, 400);
    const desk = await readDesk(env);
    desk.posts = payload.posts;
    try {
      await writeDesk(env, desk);
    } catch (e) {
      if (String(e.message) === "kv_missing") {
        return json({ error: "kv_missing", hint: "Bind a KV namespace named DESK in Cloudflare Pages." }, 503);
      }
      throw e;
    }
    return json({ ok: true, count: desk.posts.length });
  }
  return json({ error: "method" }, 405);
}
