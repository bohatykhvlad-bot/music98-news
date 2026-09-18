export const TEST_FROM = "music98.news <onboarding@resend.dev>";

const FAKE_HOST = /\.(invalid|test|localhost)$/i;
const FAKE_EXACT = /^(example\.(com|net|org|invalid)|localhost)$/i;

export function newsletterRecipients(desk) {
  const seen = new Set();
  const out = [];
  for (const raw of desk.subscribers || []) {
    const email = String(raw || "").trim().toLowerCase();
    const at = email.lastIndexOf("@");
    if (at < 1) continue;
    const host = email.slice(at + 1);
    if (!host || FAKE_EXACT.test(host) || FAKE_HOST.test(host)) continue;
    if (seen.has(email)) continue;
    seen.add(email);
    out.push(email);
  }
  return out;
}

function empty() {
  return { posts: [], subscribers: [], mail: {} };
}

function mailOf(v) {
  const m = v && v.mail && typeof v.mail === "object" ? v.mail : {};
  return {
    resendKey: String(m.resendKey || "").trim(),
    fromEmail: String(m.fromEmail || "").trim(),
  };
}

function shapeDesk(v) {
  return {
    posts: Array.isArray(v && v.posts) ? v.posts : [],
    subscribers: Array.isArray(v && v.subscribers) ? v.subscribers : [],
    mail: mailOf(v),
  };
}

async function bakedDesk(request) {
  if (!request) return empty();
  try {
    const r = await fetch(new URL("/data/desk.json", request.url));
    if (!r.ok) return empty();
    const j = await r.json();
    if (j && Array.isArray(j.posts)) {
      return {
        posts: j.posts,
        subscribers: Array.isArray(j.subscribers) ? j.subscribers : [],
        mail: {},
      };
    }
  } catch {}
  return empty();
}

export async function readDesk(env, request) {
  if (env && env.DESK) {
    const v = await env.DESK.get("desk", { type: "json" });
    if (v && Array.isArray(v.posts)) return shapeDesk(v);
    return empty();
  }
  return bakedDesk(request);
}

export function mailConfig(desk, env) {
  const mail = mailOf(desk);
  const key = String((env && env.RESEND_API_KEY) || mail.resendKey || "").trim();
  const sender = String(mail.fromEmail || (env && env.FROM_EMAIL) || TEST_FROM).trim();
  return { key, sender, configured: Boolean(key) };
}

export async function writeDesk(env, data) {
  if (!env || !env.DESK) {
    throw new Error("kv_missing");
  }
  await env.DESK.put("desk", JSON.stringify(shapeDesk(data)));
}

export function adminOk(request, env) {
  const got = (request.headers.get("X-Admin-Key") || "").trim();
  const want = String((env && env.ADMIN_PASSWORD) || "music98").trim();
  return Boolean(got) && got === want;
}

export function postStatus(p) {
  return (p && p.status) || "live";
}

export function postIsPublic(p, now = Date.now()) {
  const s = postStatus(p);
  if (s === "draft") return false;
  if (s === "scheduled") {
    const at = Date.parse(p && p.publishAt);
    return Number.isFinite(at) && at <= now;
  }
  return s === "live";
}

export function promoteScheduled(desk, now = Date.now()) {
  let changed = false;
  for (const p of desk.posts || []) {
    if (postStatus(p) !== "scheduled") continue;
    const at = Date.parse(p.publishAt);
    if (Number.isFinite(at) && at <= now) {
      p.status = "live";
      changed = true;
    }
  }
  return changed;
}

export function publicPosts(desk, now = Date.now()) {
  return (desk.posts || []).filter((p) => postIsPublic(p, now));
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}
