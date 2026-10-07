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

const RESERVED_ROOT_SLUGS = new Set([
  "news","releases","chart","charts","concerts","about","contacts","privacy","terms",
  "admin-desk","m98desk","sitemap","rss","robots","favicon"
]);

export function buildSlugMap(posts) {
  const used = {};
  const slugs = {}; /* id -> slug */
  (posts || []).forEach((p) => {
    let s = slugify(p);
    if ((p && p.type) !== "release" && RESERVED_ROOT_SLUGS.has(s)) s = s + "-" + p.id;
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

/* keep in sync with PHOTO_VER in public/index.html */
const PHOTO_VER = "v2";

function absCover(p, origin) {
  const c = p.cover;
  if (c && c.kind === "img" && c.src && !/^data:|^blob:/i.test(c.src)) {
    if (c.src.startsWith("http")) return c.src;
    return origin + (c.src.startsWith("/") ? "" : "/") + c.src + "?v=" + PHOTO_VER;
  }
  return origin + "/logo.png";
}

function firstImage(p) {
  const m = String(p.body || "").match(/!\[[^\]]*\]\(([^)]+)\)/);
  return m ? m[1] : "";
}

/* canonical article path: /<slug> for news, /releases/<slug> for releases */
export function articlePath(p, slug) {
  return (p && p.type) === "release" ? "/releases/" + slug : "/" + slug;
}

function breadcrumbJsonLd(p, slug) {
  const url = SITE + articlePath(p, slug);
  const items = [
    { "@type": "ListItem", position: 1, name: "music98.news", item: SITE + "/" },
  ];
  if (p && p.type === "release") {
    items.push({ "@type": "ListItem", position: 2, name: "Releases", item: SITE + "/releases" });
  }
  items.push({
    "@type": "ListItem",
    position: items.length + 1,
    name: String(p?.title || "Article").slice(0, 110),
    item: url,
  });
  return { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items };
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

function notFoundHtml() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,follow">
<title>Article not found — music98.news</title>
<link rel="canonical" href="${SITE}/">
<link rel="icon" href="/logo.png" type="image/png">
<link rel="apple-touch-icon" href="/logo.png">
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<style>
:root{
  --bg:#ffffff;--bg2:#f4f6f7;--card:#ffffff;--line:#e2e8ea;
  --text:#15181a;--muted:#5c6a70;--muted2:#8a969b;--accent:#00fdfb;
  --shadow:0 0 22px rgba(15,45,55,.14);
  --font:"Pretendard",Pretendard,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
}
*{box-sizing:border-box}
html{min-height:100%;background:var(--bg);-webkit-text-size-adjust:100%}
body{min-height:100svh;margin:0;background:linear-gradient(180deg,#fff 0%,#f7f9fa 100%);color:var(--text);font-family:var(--font);line-height:1.5;-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}
.topbar{height:55px;border-bottom:1px solid rgba(226,232,234,.85);background:rgba(255,255,255,.82);backdrop-filter:blur(14px) saturate(170%);-webkit-backdrop-filter:blur(14px) saturate(170%)}
.topbar-in{max-width:1132px;height:55px;margin:0 auto;padding:0 20px;display:flex;align-items:center;justify-content:space-between;gap:18px}
.brand{display:flex;align-items:center;gap:10px;font-weight:700;font-size:20px;letter-spacing:-.015em}
.brand img{width:40px;height:40px;border-radius:50%;display:block}
.eyebrow{color:var(--muted);font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase}
main{min-height:calc(100svh - 55px);display:grid;place-items:center;padding:44px 20px 64px}
.card{width:min(100%,650px);border:1px solid var(--line);border-radius:16px;background:var(--card);box-shadow:var(--shadow);padding:clamp(26px,6vw,46px)}
.code{width:max-content;max-width:100%;margin:0 0 18px;padding:7px 12px;border:1px solid rgba(15,60,64,.14);border-radius:999px;background:var(--bg2);color:var(--muted);font-size:13px;font-weight:700;line-height:1}
h1{margin:0;font-size:clamp(34px,8vw,58px);line-height:.98;letter-spacing:-.055em}
.lead{margin:18px 0 0;color:var(--muted);font-size:clamp(16px,2.7vw,19px);max-width:530px}
.actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:28px}
.btn{height:42px;display:inline-flex;align-items:center;justify-content:center;padding:0 18px;border-radius:999px;border:1px solid var(--line);font-size:14px;font-weight:700;white-space:nowrap}
.btn.primary{border-color:var(--accent);background:var(--accent);color:#03282b}
.btn.secondary{background:#fff;color:var(--text)}
.links{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:30px;padding-top:22px;border-top:1px solid var(--line)}
.links a{min-height:38px;display:grid;place-items:center;border:1px solid var(--line);border-radius:999px;background:var(--bg2);color:var(--muted);font-size:13px;font-weight:700}
.links a:hover,.btn.secondary:hover{border-color:var(--accent);color:var(--text)}
.btn.primary:hover{filter:saturate(1.08)}
@media(max-width:640px){
  .topbar-in{padding:0 14px}
  .eyebrow{display:none}
  main{align-items:start;padding:34px 14px 42px}
  .card{border-radius:15px;padding:26px 22px}
  .actions{display:grid;grid-template-columns:1fr}
  .links{grid-template-columns:repeat(2,minmax(0,1fr))}
}
</style>
</head>
<body>
<header class="topbar">
  <div class="topbar-in">
    <a class="brand" href="/" aria-label="music98.news home"><img src="/logo.png" alt=""><span>music98.news</span></a>
    <div class="eyebrow">404</div>
  </div>
</header>
<main>
  <section class="card" aria-labelledby="not-found-title">
    <div class="code">404 · Article not found</div>
    <h1 id="not-found-title">This page slipped off the setlist.</h1>
    <p class="lead">The article may have moved, been removed, or the address may be incorrect. Head back to music98.news and keep reading.</p>
    <div class="actions">
      <a class="btn primary" href="/">Go to homepage</a>
      <a class="btn secondary" href="/releases">Browse releases</a>
    </div>
    <nav class="links" aria-label="Main sections">
      <a href="/">News</a>
      <a href="/releases">Releases</a>
      <a href="/chart">Chart</a>
      <a href="/concerts">Concerts</a>
    </nav>
  </section>
</main>
</body>
</html>`;
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
  const breadcrumbs = JSON.stringify(breadcrumbJsonLd(p, slug)).replace(/</g, "\\u003c");

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
    `<script type="application/ld+json">${jsonld}</script>\n` +
    `<script type="application/ld+json">${breadcrumbs}</script>\n`;
  out = rep(out, /<\/head>/i, extra + "</head>");
  return out;
}

/* GET /post/<slug> handler body: shell + desk lookup, 404 -> plain shell */
export async function serveArticle(request, env) {
  const reqUrl = new URL(request.url);
  const origin = reqUrl.origin;
  const path = reqUrl.pathname.replace(/\/+$/, "") || "/";
  const legacy = path.match(/^\/(post|news|releases)\/([^\/]+)$/);
  const root = path.match(/^\/([^\/]+)$/);
  let slug = "";
  try { slug = decodeURIComponent(legacy ? legacy[2] : (root ? root[1] : "")); } catch {}
  const shellRes = await env.ASSETS.fetch(new URL("/index.html", request.url));
  const shell = await shellRes.text();
  const posts = publicPosts(await readDesk(env, request));
  const slugs = buildSlugMap(posts);
  const p = posts.find((x) => slugs[x.id] === slug);

  if (!p || (!legacy && p.type === "release")) {
    return new Response(notFoundHtml(), {
      status: 404,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, max-age=0",
        "X-Robots-Tag": "noindex, follow",
      },
    });
  }

  const canonical = articlePath(p, slug);
  if (path !== canonical) {
    return Response.redirect(origin + canonical, 301);
  }

  const html = articleHtml(shell, p, slug, origin);
  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store, max-age=0" },
  });
}

/* GET /sitemap.xml: static pages + one entry per public post */
export async function serveSitemap(request, env) {
  const posts = env ? publicPosts(await readDesk(env, request)) : [];
  const slugs = buildSlugMap(posts);
  const today = new Date().toISOString().slice(0, 10);
  /* A live post may carry a date ahead of today (desk quirk, not a sitemap one), and a
     lastmod in the future is simply dropped by crawlers. Cap it at today. */
  const day = (p) => { const d = isoDate(p).slice(0, 10); return d > today ? today : d; };
  const dates = posts.map(day).sort();
  const newest = dates[dates.length - 1];
  /* Static pages carry real dates instead of "today" on every request. A lastmod that
     moves daily is a lie, and a crawler that catches it stops trusting the whole file.
     Bump the entry by hand when the page itself changes; the homepage tracks the newest
     post, because that is literally what changes on it. */
  const urls = [
    { loc: `${SITE}/`, priority: "1.0", lastmod: newest },
    { loc: `${SITE}/releases`, priority: "0.8", lastmod: newest },
    { loc: `${SITE}/chart`, priority: "0.8", lastmod: newest },
    { loc: `${SITE}/about`, priority: "0.5", lastmod: "2026-09-28" },
    { loc: `${SITE}/contacts`, priority: "0.5", lastmod: "2026-09-28" },
    { loc: `${SITE}/privacy`, priority: "0.3", lastmod: "2026-09-28" },
    { loc: `${SITE}/terms`, priority: "0.3", lastmod: "2026-09-28" },
    { loc: `${SITE}/concerts`, priority: "0.7", lastmod: "2026-09-28" },
    ...posts.map((p) => ({ loc: SITE + articlePath(p, slugs[p.id]), lastmod: day(p), priority: "0.8" })),
  ];
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) =>
      `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}<priority>${u.priority}</priority></url>`
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
