import { json, readDesk, writeDesk } from "../lib/store.js";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function onRequestPost({ request, env }) {
  let payload = {};
  try { payload = await request.json(); } catch { payload = {}; }
  const email = String(payload.email || "").trim().toLowerCase();
  if (!EMAIL.test(email)) return json({ error: "invalid_email" }, 400);
  const desk = await readDesk(env, request);
  if (!desk.subscribers.includes(email)) desk.subscribers.push(email);
  try {
    await writeDesk(env, desk);
  } catch (e) {
    if (String(e.message) === "kv_missing") {
      return json({
        error: "kv_missing",
          hint: "Create a KV namespace, then bind it to this Worker as DESK.",
      }, 503);
    }
    throw e;
  }
  return json({ ok: true });
}
