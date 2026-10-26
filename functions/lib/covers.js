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

/* move one inline image field (cover.src or cover.cardSrc) into KV.
   card files get their own key so they never overwrite the main photo. */
async function offloadCoverField(p, field, used, env) {
  const src = p && p.cover && typeof p.cover[field] === "string" ? p.cover[field] : "";
  if (!src.startsWith("data:image/")) return false;
  const m = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(src);
  if (!m || !OK_TYPE.test(m[1]) || m[2].length > 4_200_000) return false; // ~3MB binary cap
  /* derive a stable name from the post id so re-runs reuse the same key */
  const ext = m[1].toLowerCase() === "image/png" ? "png" : m[1].toLowerCase() === "image/webp" ? "webp" : "jpg";
  const suffix = field === "cardSrc" ? "-card" : "";
  let name = safeName("u-" + (p.id || "post") + suffix + "." + ext);
  if (!name) return false;
  while (used.has(name)) name = safeName(name.replace(/(\.[a-z]+)$/, "x$1"));
  if (!name) return false;
  used.add(name);
  try {
    await env.DESK.put("photo:" + name, m[2], { metadata: { type: m[1].toLowerCase() } });
    p.cover[field] = "photos/" + name;
    return true;
  } catch {
    return false;
  }
}

/* returns true if anything was rewritten */
export async function normalizeCovers(desk, env) {
  if (!env || !env.DESK || !Array.isArray(desk.posts)) return false;
  let dirty = false;
  const used = new Set();
  for (const p of desk.posts) {
    if (await offloadCoverField(p, "src", used, env)) dirty = true;
    if (await offloadCoverField(p, "cardSrc", used, env)) dirty = true;
  }
  return dirty;
}
