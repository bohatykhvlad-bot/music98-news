function empty() {
  return { posts: [], subscribers: [] };
}

async function bakedDesk(request) {
  if (!request) return empty();
  try {
    const r = await fetch(new URL("/data/desk.json", request.url));
    if (!r.ok) return empty();
    const j = await r.json();
    if (j && Array.isArray(j.posts)) {
      return { posts: j.posts, subscribers: Array.isArray(j.subscribers) ? j.subscribers : [] };
    }
  } catch {}
  return empty();
}

export async function readDesk(env, request) {
  if (env && env.DESK) {
    const v = await env.DESK.get("desk", { type: "json" });
    if (v && Array.isArray(v.posts)) return { posts: v.posts, subscribers: v.subscribers || [] };
    return empty();
  }
  return bakedDesk(request);
}

export async function writeDesk(env, data) {
  if (!env || !env.DESK) {
    throw new Error("kv_missing");
  }
  await env.DESK.put("desk", JSON.stringify(data));
}

export function adminOk(request, env) {
  const got = (request.headers.get("X-Admin-Key") || "").trim();
  const want = String((env && env.ADMIN_PASSWORD) || "music98").trim();
  return Boolean(got) && got === want;
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}
