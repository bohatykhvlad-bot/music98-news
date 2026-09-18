import { adminOk, json, mailConfig, newsletterRecipients, readDesk } from "../lib/store.js";

function clipErr(raw) {
  return String(raw || "")
    .replace(/re_[A-Za-z0-9_]+/g, "[key]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .slice(0, 280);
}

export async function onRequestPost({ request, env }) {
  if (!adminOk(request, env)) return json({ error: "unauthorized" }, 401);
  let payload = {};
  try { payload = await request.json(); } catch { payload = {}; }
  const subject = String(payload.subject || "").trim();
  const text = String(payload.text || "").trim();
  if (!subject || !text) return json({ error: "subject_and_text_required" }, 400);
  const desk = await readDesk(env, request);
  const emails = newsletterRecipients(desk);
  if (!emails.length) return json({ error: "no_subscribers" }, 400);
  const mail = mailConfig(desk, env);
  if (!mail.key) {
    return json({
      error: "missing_resend_key",
      saved: emails.length,
    }, 400);
  }
  const html = "<pre style='font-family:Georgia,serif;font-size:16px;white-space:pre-wrap'>" +
    text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") + "</pre>";
  let sent = 0, failed = 0, lastErr = "";
  for (const email of emails) {
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + mail.key,
          "Content-Type": "application/json",
          "User-Agent": "music98.news",
        },
        body: JSON.stringify({ from: mail.sender, to: [email], subject, html, text }),
      });
      if (r.ok) sent += 1;
      else {
        failed += 1;
        if (!lastErr) lastErr = clipErr(await r.text());
      }
    } catch (e) {
      failed += 1;
      if (!lastErr) lastErr = clipErr(e && e.message);
    }
  }
  return json({ ok: true, sent, failed, from: mail.sender, detail: lastErr || undefined });
}
