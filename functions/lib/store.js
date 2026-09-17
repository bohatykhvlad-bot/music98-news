function empty() {
  return { posts: [], subscribers: [] };
}

export async function readDesk(env) {
  if (env && env.DESK) {
    const v = await env.DESK.get("desk", { type: "json" });
    if (v && Array.isArray(v.posts)) return { posts: v.posts, subscribers: v.subscribers || [] };
  }
  return empty();
}

export async function writeDesk(env, data) {
  if (!env || !env.DESK) {
    const err = new Error("kv_missing");
    throw err;
  }
  await env.DESK.put("desk", JSON.stringify(data));
}

export function adminOk(request, env) {
  const got = (request.headers.get("X-Admin-Key") || "").trim();
  const want = (env && env.ADMIN_PASSWORD) || "";
  return Boolean(want) && got === want;
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}
