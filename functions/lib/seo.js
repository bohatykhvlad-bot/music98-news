/* Server-side SEO for clean article URLs.
   Googlebot gets real <title>/<description>/og:/JSON-LD per article straight
   from the HTML, plus a dynamic sitemap.xml and rss.xml built from the live desk.
   Slug generation must stay byte-identical to the client buildSlugs() in
   public/index.html - both sides must resolve the same /post/<slug>. */

import { publicPosts, readDesk } from "./store.js";

const SITE = "https://music98.news";

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/* cap slug at 80 chars without cutting a word — must mirror client slugCap() */
function slugCap(s) {
  if (s.length <= 80) return s;
  const words = s.split("-");
  let out = "";
  for (const w of words) { if (out && (out.length + 1 + w.length) > 80) break; out = out ? out + "-" + w : w; }
  return out || s.slice(0, 80);
}

/* identical to client buildSlugs(): strip curly quotes, keep [a-z0-9], cap 80 at word boundary, dedupe with id */
export function slugify(post) {
  let t = String((post && post.title) || (post && post.id) || "");
  const a = String((post && post.artist) || "").trim();
  const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (a && norm(t).indexOf(norm(a)) < 0) t = a + " " + t;
  const base = t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2018\u2019\u201C\u201D`\u00B4']/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "post";
  return slugCap(base);
}

export function buildSlugMap(posts) {
  const used = {};
  const slugs = {}; /* id -> slug */
  (posts || []).forEach((p) => {
    let s = slugify(p);
    if (used[s]) s = s + "-" + p.id;
    used[s] = p.id;
    slugs[p.id] = s;
  });
  return slugs;
}

/* markdown/embed markers -> plain text for meta description and RSS */
export function plainText(md) {
  return String(md || "")
    .replace(/\[(?:apple|youtube)[^\]]*\]/gi, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1")
    .replace(/\s+/g, " ").trim();
}

function isoDate(p) {
  const t = Date.parse(p.publishAt || "") || Date.parse(p.date || "") || Date.now();
  return new Date(t).toISOString();
}

function absCover(p, origin) {
  const c = p.cover;
  if (c && c.kind === "img" && c.src && !/^data:|^blob:/i.test(c.src)) {
    return c.src.startsWith("http") ? c.src : origin + (c.src.startsWith("/") ? "" : "/") + c.src;
  }
  return origin + "/logo.png";
}

function firstImage(p) {
  const m = String(p.body || "").match(/!\[[^\]]*\]\(([^)]+)\)/);
  return m ? m[1] : "";
}

/* canonical article path: /news/<slug> or /releases/<slug> */
export function articlePath(p, slug) {
  return "/" + ((p && p.type) === "release" ? "releases" : "news") + "/" + slug;
}

function articleJsonLd(p, slug, origin) {
  const url = SITE + articlePath(p, slug);
  const img = firstImage(p);
  const image = img ? (img.startsWith("http") ? img : origin + (img.startsWith("/") ? "" : "/") + img) : absCover(p, origin);
  const iso = isoDate(p);
  const type = p.type === "release" ? "Article" : "NewsArticle";
  return {
    "@context": "https://schema.org",
    "@type": type,
    headline: String(p.title || "").slice(0, 110),
    description: plainText(p.excerpt || p.body || "").slice(0, 300),
    image: [image],
    datePublished: iso,
    dateModified: iso,
    author: { "@type": "Organization", name: "music98.news", url: SITE },
    publisher: { "@type": "Organization", name: "music98.news", url: SITE, logo: { "@type": "ImageObject", url: SITE + "/logo.png" } },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  };
}

function rep(html, re, to) {
  return re.test(html) ? html.replace(re, to) : html;
}

/* Inject per-article meta into the index.html shell */
export function articleHtml(shell, p, slug, origin) {
  const title = escapeHtml(String(p.title || "music98.news"));
  const desc = escapeHtml(plainText(p.excerpt || p.body || "").slice(0, 160));
  const url = SITE + articlePath(p, slug);
  const image = escapeHtml(absCover(p, origin));
  const iso = isoDate(p);
  /* JSON-LD must stay raw JSON: entities are not decoded inside <script>.
     Only neutralize potential </script> sequences via \u003c escapes. */
  const jsonld = JSON.stringify(articleJsonLd(p, slug, origin)).replace(/</g, "\\u003c");

  let out = shell;
  /* strip shell-level homepage tags first: two canonicals/og:images would
     confuse crawlers (they read the first occurrence) */
  out = out.replace(/<link rel="canonical"[^>]*>\s*/gi, "");
  out = out.replace(/<meta property="og:url"[^>]*>\s*/gi, "");
  out = out.replace(/<meta property="og:image"[^>]*>\s*/gi, "");
  out = out.replace(/<meta property="article:[^"]*"[^>]*>\s*/gi, "");
  out = out.replace(/<meta name="twitter:[^"]*"[^>]*>\s*/gi, "");
  out = out.replace(/<link rel="sitemap"[^>]*>\s*/gi, "");
  out = rep(out, /<title>[\s\S]*?<\/title>/i, `<title>${title} — music98.news</title>`);
  out = rep(out, /<meta name="description" content="[^"]*">/i, `<meta name="description" content="${desc}">`);
  out = rep(out, /<meta property="og:title" content="[^"]*">/i, `<meta property="og:title" content="${title} — music98.news">`);
  out = rep(out, /<meta property="og:description" content="[^"]*">/i, `<meta property="og:description" content="${desc}">`);
  out = rep(out, /<meta property="og:type" content="website">/i, `<meta property="og:type" content="article">`);
  const extra =
    `<link rel="canonical" href="${url}">\n` +
    `<meta property="og:url" content="${url}">\n` +
    `<meta property="og:image" content="${image}">\n` +
    `<meta property="article:published_time" content="${iso}">\n` +
    `<meta name="twitter:card" content="summary_large_image">\n` +
    `<meta name="twitter:title" content="${escapeHtml(String(p.title||""))}">\n` +
    `<meta name="twitter:description" content="${desc}">\n` +
    `<meta name="twitter:image" content="${image}">\n` +
    `<script type="application/ld+json">${jsonld}</script>\n`;
  out = rep(out, /<\/head>/i, extra + "</head>");
  return out;
}

/* GET /post/<slug> handler body: shell + desk lookup, 404 -> plain shell */
export async function serveArticle(request, env) {
  const origin = new URL(request.url).origin;
  const slug = decodeURIComponent(new URL(request.url).pathname.replace(/^\/(?:post|news|releases)\//, "").replace(/\/+$/, ""));
  const shellRes = await env.ASSETS.fetch(new URL("/index.html", request.url));
  const shell = await shellRes.text();
  const posts = publicPosts(await readDesk(env, request));
  const slugs = buildSlugMap(posts);
  const p = posts.find((x) => slugs[x.id] === slug);
  const html = p ? articleHtml(shell, p, slug, origin) : shell;
  return new Response(html, {
    status: p ? 200 : 404,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store, max-age=0" },
  });
}

/* GET /sitemap.xml: static pages + one entry per public post */
export async function serveSitemap(request, env) {
  const posts = env ? publicPosts(await readDesk(env, request)) : [];
  const slugs = buildSlugMap(posts);
  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    { loc: `${SITE}/`, priority: "1.0" },
    { loc: `${SITE}/about`, priority: "0.5" },
    { loc: `${SITE}/contacts`, priority: "0.5" },
    { loc: `${SITE}/privacy`, priority: "0.3" },
    { loc: `${SITE}/terms`, priority: "0.3" },
    ...posts.map((p) => ({ loc: SITE + articlePath(p, slugs[p.id]), lastmod: isoDate(p).slice(0, 10), priority: "0.8" })),
  ];
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) =>
      `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : `<lastmod>${today}</lastmod>`}<priority>${u.priority}</priority></url>`
    ).join("\n") +
    "\n</urlset>";
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=1800" } });
}

/* GET /news-sitemap.xml: Google News sitemap, posts from the last 48 hours only */
export async function serveNewsSitemap(request, env) {
  const posts = env ? publicPosts(await readDesk(env, request)) : [];
  const slugs = buildSlugMap(posts);
  const cutoff = Date.now() - 48 * 3600 * 1000;
  const fresh = posts
    .filter((p) => (Date.parse(p.publishAt || p.date || 0) || 0) >= cutoff)
    .sort((a, b) => (Date.parse(b.publishAt || b.date || 0) || 0) - (Date.parse(a.publishAt || a.date || 0) || 0))
    .slice(0, 50);
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n` +
    fresh.map((p) => {
      const iso = isoDate(p);
      return (
        `  <url>\n` +
        `    <loc>${SITE + articlePath(p, slugs[p.id])}</loc>\n` +
        `    <news:news>\n` +
        `      <news:publication>\n` +
        `        <news:name>music98.news</news:name>\n` +
        `        <news:language>en</news:language>\n` +
        `      </news:publication>\n` +
        `      <news:publication_date>${iso}</news:publication_date>\n` +
        `      <news:title>${escapeHtml(p.title || "")}</news:title>\n` +
        `    </news:news>\n` +
        `  </url>`
      );
    })
      .join("\n") +
    `\n</urlset>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=900" } });
}

/* GET /rss.xml: latest 30 posts, RSS 2.0 */
export async function serveRss(request, env) {
  const posts = env ? publicPosts(await readDesk(env, request)) : [];
  const slugs = buildSlugMap(posts);
  const items = posts
    .slice()
    .sort((a, b) => (Date.parse(b.publishAt || b.date || 0) || 0) - (Date.parse(a.publishAt || a.date || 0) || 0))
    .slice(0, 30)
    .map((p) => {
      const link = SITE + articlePath(p, slugs[p.id]);
      const t = Date.parse(p.publishAt || p.date || "") || Date.now();
      return (
        `    <item>\n` +
        `      <title>${escapeHtml(p.title || "")}</title>\n` +
        `      <link>${link}</link>\n` +
        `      <guid isPermaLink="true">${link}</guid>\n` +
        `      <pubDate>${new Date(t).toUTCString()}</pubDate>\n` +
        `      <description>${escapeHtml(plainText(p.excerpt || p.body || "").slice(0, 300))}</description>\n` +
        `    </item>`
      );
    })
    .join("\n");
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<rss version="2.0"><channel>\n` +
    `  <title>music98.news</title>\n` +
    `  <link>${SITE}</link>\n` +
    `  <description>Music news, releases and charts</description>\n` +
    `  <language>en</language>\n` +
    items +
    `\n</channel></rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=1800" } });
}
