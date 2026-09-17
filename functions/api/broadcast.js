import { adminOk, json, readDesk } from "../lib/store.js";

export async function onRequestPost({ request, env }) {
  if (!adminOk(request, env)) return json({ error: "unauthorized" }, 401);
  let payload = {};
  try { payload = await request.json(); } catch { payload = {}; }
  const subject = String(payload.subject || "").trim();
  const text = String(payload.text || "").trim();
  if (!subject || !text) return json({ error: "subject_and_text_required" }, 400);
  const desk = await readDesk(env);
  const emails = desk.subscribers || [];
  if (!emails.length) return json({ error: "no_subscribers" }, 400);
  const key = (env.RESEND_API_KEY || "").trim();
  const sender = (env.FROM_EMAIL || "music98.news <news@music98.news>").trim();
  if (!key) {
    return json({
      error: "missing_resend_key",
      saved: emails.length,
      hint: "Add RESEND_API_KEY in Cloudflare environment variables.",
    }, 400);
  }
  const html = "<pre style='font-family:Georgia,serif;font-size:16px;white-space:pre-wrap'>" +
    text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") + "</pre>";
  let sent = 0, failed = 0;
  for (const email of emails) {
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
        body: JSON.stringify({ from: sender, to: [email], subject, html, text }),
      });
      if (r.ok) sent += 1; else failed += 1;
    } catch {
      failed += 1;
    }
  }
  return json({ ok: true, sent, failed });
}
