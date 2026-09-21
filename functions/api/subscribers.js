import { adminOk, json, readDesk, writeDesk } from "../lib/store.js";

export async function onRequestGet({ request, env }) {
  if (!adminOk(request, env)) return json({ error: "unauthorized" }, 401);
  const desk = await readDesk(env, request);
  return json({ subscribers: desk.subscribers || [] });
}

/* admin remove: one email per call, fresh read before write (never from a snapshot) */
export async function onRequestDelete({ request, env }) {
  if (!adminOk(request, env)) return json({ error: "unauthorized" }, 401);
  let payload = {};
  try { payload = await request.json(); } catch { payload = {}; }
  const email = String(payload.email || "").trim().toLowerCase();
  if (!email) return json({ error: "email_required" }, 400);
  const desk = await readDesk(env, request);
  const before = (desk.subscribers || []).length;
  desk.subscribers = (desk.subscribers || []).filter((e) => String(e).trim().toLowerCase() !== email);
  if (desk.subscribers.length === before) return json({ ok: true, removed: 0, subscribers: desk.subscribers });
  try {
    await writeDesk(env, desk);
  } catch (e) {
    if (String(e.message) === "kv_missing") return json({ error: "kv_missing" }, 503);
    throw e;
  }
  return json({ ok: true, removed: 1, subscribers: desk.subscribers });
}
