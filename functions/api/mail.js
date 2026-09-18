import { adminOk, json, mailConfig, readDesk, writeDesk } from "../lib/store.js";

export async function onRequest({ request, env }) {
  if (!adminOk(request, env)) return json({ error: "unauthorized" }, 401);
  if (request.method === "GET") {
    const desk = await readDesk(env, request);
    const mail = mailConfig(desk, env);
    return json({ ok: true, configured: mail.configured, from: mail.sender });
  }
  if (request.method === "POST") {
    let payload = {};
    try { payload = await request.json(); } catch { payload = {}; }
    const desk = await readDesk(env, request);
    const nextKey = String(payload.resendKey || payload.RESEND_API_KEY || "").trim();
    const nextFrom = String(payload.fromEmail || payload.FROM_EMAIL || "").trim();
    if (nextKey) desk.mail.resendKey = nextKey;
    if (nextFrom) desk.mail.fromEmail = nextFrom;
    if (!desk.mail.fromEmail) desk.mail.fromEmail = mailConfig(desk, env).sender;
    try {
      await writeDesk(env, desk);
    } catch (e) {
      if (String(e.message) === "kv_missing") {
        return json({ error: "kv_missing" }, 503);
      }
      throw e;
    }
    const mail = mailConfig(desk, env);
    return json({ ok: true, configured: mail.configured, from: mail.sender });
  }
  return json({ error: "method" }, 405);
}
