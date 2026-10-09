import assert from "node:assert/strict";
import test from "node:test";
import { articleHtml, serveArticle, serverArticleBody, slugify } from "../functions/lib/seo.js";

const shell = `<!doctype html>
<html lang="en">
<head>
  <title>music98.news — Music News</title>
  <meta name="description" content="home">
  <meta property="og:type" content="website">
  <meta property="og:title" content="home">
  <meta property="og:description" content="home">
  <meta property="og:url" content="https://music98.news/">
  <meta property="og:image" content="https://music98.news/logo.png">
  <meta name="twitter:title" content="home">
  <link rel="canonical" href="https://music98.news/">
  <link rel="sitemap" href="/sitemap.xml">
</head>
<body>
  <section id="articlePage" hidden></section>
  <main class="wrap"><section class="tab active" id="tab-news">Home feed</section></main>
</body></html>`;

const fullBody = `The opening paragraph has **confirmed facts** and the quoted song "North Star".

The second paragraph provides original reporting from the interview, not just a headline.

[apple:album:1844932149]

[photo:/photos/live-photo.jpg|Example Photographer|https://photographer.example/work]

This final paragraph is visible even when JavaScript is disabled.`;
const newsPost = {
  id: "seo-article-test",
  title: "Singer Talks About New Album",
  type: "news",
  date: "2026-10-09",
  publishAt: "2026-10-09T09:00:00.000Z",
  status: "live",
  excerpt: "The singer explains the album.",
  body: fullBody,
  cover: { kind: "img", src: "/photos/news-cover.jpg", credit: "Original Photographer" },
};

test("server renders all news article paragraphs into visible HTML before JavaScript", () => {
  const slug = slugify(newsPost);
  const html = articleHtml(shell, newsPost, slug, "https://music98.news");
  assert.match(html, /<body class="articlepage" data-ssr-article="true">/);
  assert.match(html, /<section id="articlePage" data-ssr-article="true" data-post-type="news">/);
  assert.equal((html.match(/id="articlePage"/g) || []).length, 1);
  assert.doesNotMatch(html, /<section id="articlePage" hidden>/);
  assert.match(html, /<h1>Singer Talks About New Album<\/h1>/);
  assert.match(html, /<strong>confirmed facts<\/strong>/);
  assert.match(html, /The second paragraph provides original reporting/);
  assert.match(html, /This final paragraph is visible even when JavaScript is disabled/);
  assert.ok(html.indexOf("The opening paragraph") < html.indexOf("The second paragraph"));
  assert.ok(html.indexOf("The second paragraph") < html.indexOf("This final paragraph"));
  assert.match(html, /<img src="https:\/\/music98.news\/photos\/news-cover.jpg\?v=v2"/);
  assert.match(html, /<time datetime="2026-10-09T09:00:00.000Z">9 October 2026<\/time>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/music98.news\/singer-talks-about-new-album">/);
  assert.doesNotMatch(html, /\[apple:album:/);
  assert.match(html, /https:\/\/photographer.example\/work/);
});

test("release articles have the full body and canonical release path", () => {
  const post = { ...newsPost, id:"release-ssr", title:"A New Record", artist:"Example Band", type:"release" };
  const slug = slugify(post);
  const html = articleHtml(shell, post, slug, "https://music98.news");
  assert.match(html, /data-post-type="release"/);
  assert.match(html, /<h1>Example Band - <em>A New Record<\/em><\/h1>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/music98.news\/releases\/example-band-a-new-record">/);
  assert.match(html, /This final paragraph is visible even when JavaScript is disabled/);
});

test("server escaping blocks article HTML injection and keeps text readable", () => {
  const body = `A test with <script>alert('x')</script> and **real reporting**.

[photo:javascript:alert(1)|Bad Credit|javascript:alert(2)]

The follow-up includes ampersands & quotes.`;
  const html = serverArticleBody(body);
  assert.doesNotMatch(html, /<script>/i);
  assert.doesNotMatch(html, /src="javascript:/);
  assert.match(html, /&lt;script&gt;alert/);
  assert.match(html, /<strong>real reporting<\/strong>/);
  assert.match(html, /ampersands &amp; quotes/);
  assert.match(html, /The follow-up includes/);
});

test("live edge article response contains the full text on initial GET", async () => {
  const slug = slugify(newsPost);
  const env = {
    ASSETS: { fetch: async () => new Response(shell, { headers: { "content-type": "text/html" } }) },
    DESK: { get: async () => ({ posts: [newsPost] }) },
  };
  const response = await serveArticle(new Request("https://music98.news/" + slug), env);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /The opening paragraph/);
  assert.match(html, /The second paragraph/);
  assert.match(html, /This final paragraph/);
  assert.match(html, /data-ssr-article="true"/);
});

test("draft articles are not rendered or indexable", async () => {
  const draft = { ...newsPost, status: "draft" };
  const slug = slugify(draft);
  const env = {
    ASSETS: { fetch: async () => new Response(shell) },
    DESK: { get: async () => ({ posts: [draft] }) },
  };
  const response = await serveArticle(new Request("https://music98.news/" + slug), env);
  assert.equal(response.status, 404);
  assert.equal(response.headers.get("X-Robots-Tag"), "noindex, follow");
  const html = await response.text();
  assert.doesNotMatch(html, /The opening paragraph/);
});

test("the real production shell keeps a mount point and SSR body-hidden tab rules", async () => {
  const { readFileSync } = await import("node:fs");
  const shell = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
  const html = articleHtml(shell, newsPost, slugify(newsPost), "https://music98.news");
  assert.match(html, /body\.articlepage main \.tab\{display:none!important\}/);
  assert.equal((html.match(/id="articlePage"/g) || []).length, 1);
  assert.match(html, /<div class="atext">[\s\S]*This final paragraph is visible/);
  assert.match(html, /<script src="https:\/\/cdn\.prplads\.com\/agent\.js\?/);
});
