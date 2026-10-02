import { adminOk, json, readDesk, writeDesk } from "../lib/store.js";

/* Photo blob storage: base64 covers no longer travel inside desk.json.
   Upload:  POST /api/photo  {name, data}  -> KV "photo:<name>"
   Serve:   worker.js route /photos/<name> -> KV get + long cache
   The desk entry keeps only the URL reference ("photos/<name>"). */

const MAX_NAME = 80;
const MAX_BYTES = 3_000_000; // ~3MB binary; admin already compresses to ~700KB
const OK_TYPE = /^image\/(jpeg|png|webp)$/i;

function safeName(raw) {
  const n = String(raw || "").trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  if (!n || n.length > MAX_NAME || n.includes("..")) return null;
  return n;
}

export async function onRequestPost({ request, env }) {
  if (!adminOk(request, env)) return json({ error: "unauthorized" }, 401);
  if (!env || !env.DESK) return json({ error: "kv_missing" }, 500);
  let payload = {};
  try { payload = await request.json(); } catch { payload = {}; }
  const name = safeName(payload.name);
  if (!name) return json({ error: "bad_name" }, 400);
  const data = String(payload.data || "");
  const m = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(data);
  if (!m || !OK_TYPE.test(m[1])) return json({ error: "bad_type" }, 400);
  const bytes = Math.floor(m[2].length * 0.75);
  if (bytes > MAX_BYTES) return json({ error: "too_large", bytes }, 413);
  try {
    await env.DESK.put("photo:" + name, m[2], { metadata: { type: m[1].toLowerCase() } });
  } catch (e) {
    return json({ error: "kv_put_failed", detail: String(e.message || e) }, 500);
  }
  return json({ ok: true, url: "photos/" + name, bytes });
}

export async function onRequestGet({ request, env }) {
  if (!adminOk(request, env)) return json({ error: "unauthorized" }, 401);
  return json({ ok: true });
}
