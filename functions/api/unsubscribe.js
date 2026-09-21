import { json, readDesk, writeDesk } from "../lib/store.js";

/* One-click unsubscribe (RFC 8058): GET renders a human confirmation,
   POST (from mail clients) unsubscribes silently. Called from the
   List-Unsubscribe header and the footer link of every broadcast. */

function page(msg, ok) {
  const color = ok ? "#111" : "#b91c1c";
  return new Response(
    "<!doctype html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>music98.news</title></head>" +
    "<body style=\"margin:0;font-family:Arial,Helvetica,sans-serif;background:#fafafa;color:" + color + ";display:flex;align-items:center;justify-content:center;min-height:100vh\">" +
    "<div style=\"text-align:center;padding:32px\"><div style=\"font-weight:700;font-size:20px;margin-bottom:12px\">music98.news</div><div style=\"font-size:15px\">" + msg + "</div></div></body></html>",
    { status: ok ? 200 : 400, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } },
  );
}

async function unsubscribe(env, request, email) {
  const addr = String(email || "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(addr)) return null;
  const desk = await readDesk(env, request);
  const before = (desk.subscribers || []).length;
  desk.subscribers = (desk.subscribers || []).filter((e) => String(e).trim().toLowerCase() !== addr);
  if (desk.subscribers.length === before) return false; // not in list
  try {
    await writeDesk(env, desk);
  } catch (e) {
    if (String(e.message) === "kv_missing") return null;
    throw e;
  }
  return true;
}

export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const email = url.searchParams.get("e") || "";
  if (request.method === "POST") {
    const done = await unsubscribe(env, request, email);
    return json({ ok: done !== null && done !== undefined });
  }
  const done = await unsubscribe(env, request, email);
  if (done === null) return page("The unsubscribe link is invalid or expired.", false);
  return page(done === true ? "You have been unsubscribed. No more emails from us." : "This address is not in our list.", true);
}
