/* Cover normalization: any desk write whose posts still carry base64
   data-URL covers gets them moved to KV ("photo:<name>") transparently.
   This keeps desk.json small no matter which agent/client pushes old-style
   data - the payload stored in KV never contains image blobs again. */

const OK_TYPE = /^image\/(jpeg|png|webp)$/i;

function safeName(raw) {
  const n = String(raw || "").trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  if (!n || n.length > 80 || n.includes("..")) return null;
  return n;
}

/* returns true if anything was rewritten */
export async function normalizeCovers(desk, env) {
  if (!env || !env.DESK || !Array.isArray(desk.posts)) return false;
  let dirty = false;
  const used = new Set();
  for (const p of desk.posts) {
    const src = p && p.cover && typeof p.cover.src === "string" ? p.cover.src : "";
    if (!src.startsWith("data:image/")) continue;
    const m = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(src);
    if (!m || !OK_TYPE.test(m[1]) || m[2].length > 4_200_000) continue; // ~3MB binary cap
    /* derive a stable name from the post id so re-runs reuse the same key */
    const ext = m[1].toLowerCase() === "image/png" ? "png" : m[1].toLowerCase() === "image/webp" ? "webp" : "jpg";
    let name = safeName("u-" + (p.id || "post") + "." + ext);
    if (!name) continue;
    while (used.has(name)) name = safeName(name.replace(/(\.[a-z]+)$/, "x$1"));
    used.add(name);
    try {
      await env.DESK.put("photo:" + name, m[2], { metadata: { type: m[1].toLowerCase() } });
      p.cover.src = "photos/" + name;
      dirty = true;
    } catch {}
  }
  return dirty;
}
