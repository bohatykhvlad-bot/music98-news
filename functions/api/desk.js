import { adminOk, json, readDesk, writeDesk } from "../lib/store.js";

export async function onRequest({ request, env }) {
  if (request.method === "GET") {
    const desk = await readDesk(env, request);
    return json({ posts: desk.posts });
  }
  if (request.method === "POST") {
    if (!adminOk(request, env)) return json({ error: "unauthorized" }, 401);
    let payload = {};
    try { payload = await request.json(); } catch { payload = {}; }
    if (!Array.isArray(payload.posts)) return json({ error: "posts_required" }, 400);
    const desk = await readDesk(env, request);
    desk.posts = payload.posts;
    try {
      await writeDesk(env, desk);
    } catch (e) {
      if (String(e.message) === "kv_missing") {
        return json({
          error: "kv_missing",
          hint: "In Cloudflare: Workers & Pages → KV → Create. Then this project → Settings → Bindings → Add → KV namespace. Variable name must be DESK.",
        }, 503);
      }
      throw e;
    }
    return json({ ok: true, count: desk.posts.length });
  }
  return json({ error: "method" }, 405);
}
