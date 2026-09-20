import { adminOk, json, migratePublishAt, promoteScheduled, publicPosts, readDesk, writeDesk } from "../lib/store.js";
import { normalizeCovers } from "../lib/covers.js";

export async function onRequest({ request, env }) {
  if (request.method === "GET") {
    const url = new URL(request.url);
    if (url.searchParams.get("auth") === "1") {
      if (!adminOk(request, env)) return json({ error: "unauthorized" }, 401);
      return json({ ok: true });
    }
    const desk = await readDesk(env, request);
    let dirty = promoteScheduled(desk);
    if (migratePublishAt(desk)) dirty = true;
    if (dirty && env && env.DESK) {
      try { await writeDesk(env, desk); } catch {}
    }
    if (adminOk(request, env)) return json({ posts: desk.posts });
    return json({ posts: publicPosts(desk) });
  }
  if (request.method === "POST") {
    if (!adminOk(request, env)) return json({ error: "unauthorized" }, 401);
    let payload = {};
    try { payload = await request.json(); } catch { payload = {}; }
    if (!Array.isArray(payload.posts)) return json({ error: "posts_required" }, 400);
    /* wipe guard: an empty list is only accepted with an explicit flag.
      A buggy/partial client used to be able to erase the whole desk with
      one POST - the owner lost all posts once because of that. */
    if (payload.posts.length === 0 && payload.confirmEmpty !== true) {
      return json({ error: "empty_posts_refused", hint: "Send confirmEmpty:true to deliberately wipe the desk." }, 409);
    }
    /* sanity guard: refuse mass deletion without an explicit flag too */
    const current = await readDesk(env, request);
    if (current.posts.length >= 3 && payload.posts.length <= Math.floor(current.posts.length / 3) && payload.confirmShrink !== true) {
      return json({ error: "mass_delete_refused", current: current.posts.length, incoming: payload.posts.length, hint: "Send confirmShrink:true if this reduction is intentional." }, 409);
    }
    const desk = current;
    desk.posts = payload.posts;
    /* self-healing: if a client pushes old-style base64 covers, offload them
       to KV right here - desk.json in storage stays lean regardless of who
       writes (owner request after a racing writer overwrote the swap) */
    let coverDirty = false;
    try { coverDirty = await normalizeCovers(desk, env); } catch {}
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
    return json({ ok: true, count: desk.posts.length, coversNormalized: coverDirty });
  }
  return json({ error: "method" }, 405);
}
