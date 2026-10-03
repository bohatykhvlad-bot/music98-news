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

export function migratePublishAt(desk) {
  const posts = (desk && desk.posts) || [];
  const n = posts.length;
  let changed = false;
  posts.forEach((p, i) => {
    if (p && !p.publishAt) {
      const d = Date.parse(p.date || "") || Date.now();
      const seed = /^[a-z]{1,2}\d+$/.test(String(p.id || ""));
      p.publishAt = new Date(seed ? d - 86400000 + i * 60000 : d + (n - i) * 60000).toISOString();
      changed = true;
    }
  });
  return changed;
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
  const want = String((env && env.ADMIN_PASSWORD) || "").trim();
  return Boolean(got && want) && got === want;
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
  /* Late promotion must stamp the real go-live moment, not leave the queued slot.
     Owner bug 2026-09-26: a batch queued for 24.09 was promoted to live on the first
     request after that instant, publishAt stayed at 24.09, and the site card read
     "2 days ago" for a post that had just gone live. The slot is one unit -
     publishAt (what the card and the article header read) plus date - so both move.
     Already-live posts are skipped, which keeps this idempotent. */
  const due = [];
  for (const p of desk.posts || []) {
    if (postStatus(p) !== "scheduled") continue;
    const at = Date.parse(p.publishAt);
    if (Number.isFinite(at) && at <= now) due.push({ p, at });
  }
  /* a batch promoted in one pass keeps its intended order instead of collapsing
     onto a single identical timestamp */
  due.sort((a, b) => a.at - b.at);
  due.forEach(({ p }, i) => {
    p.status = "live";
    const stamp = new Date(now - (due.length - 1 - i) * 1000).toISOString();
    p.publishAt = stamp;
    p.date = stamp.slice(0, 10);
  });
  return due.length > 0;
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
