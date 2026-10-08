import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import worker from "../worker.js";
import { serveArticle } from "../functions/lib/seo.js";

const shell = `<!doctype html><html lang="en"><head><title>music98.news</title></head><body>home shell</body></html>`;

function envWith(posts = []) {
  return {
    ASSETS: {
      fetch: async () => new Response(shell, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }),
    },
    DESK: {
      get: async () => ({ posts, subscribers: [], mail: {} }),
      put: async () => {},
    },
  };
}

const ctx = { waitUntil() {} };

for (const page of ["about", "contacts", "privacy", "terms"]) {
  test(`${page} serves its clean URL without looping through the asset .html redirect`, async () => {
    const env = envWith();
    const html = readFileSync(new URL(`../public/${page}.html`, import.meta.url), "utf8");
    env.ASSETS.fetch = async (request) => {
      const url = new URL(request.url);
      // Cloudflare's automatic HTML handling redirects .html URLs to clean URLs.
      if (url.pathname.endsWith(".html")) {
        url.pathname = url.pathname.slice(0, -5);
        return Response.redirect(url, 307);
      }
      assert.equal(url.pathname, `/${page}`);
      assert.equal(url.search, "?from=footer");
      return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    };
    const response = await worker.fetch(
      new Request(`https://music98.news/${page}?from=footer`), env, ctx,
    );
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("location"), null);
    assert.equal(await response.text(), html);
  });
}

test("www host redirects to the canonical apex domain", async () => {
  const response = await worker.fetch(
    new Request("https://www.music98.news/releases?from=google"),
    envWith(),
    ctx,
  );
  assert.equal(response.status, 301);
  assert.equal(response.headers.get("location"), "https://music98.news/releases?from=google");
});

test("public JSON APIs stay crawlable for rendering but are marked noindex", async () => {
  const response = await worker.fetch(
    new Request("https://music98.news/api/desk"),
    envWith([{ id: "a", status: "live", title: "Test", type: "news" }]),
    ctx,
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-robots-tag"), "noindex");
  assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8");
});

test("unknown article routes return a real noindex 404 instead of the home shell", async () => {
  const response = await serveArticle(
    new Request("https://music98.news/missing-article"),
    envWith(),
  );
  const body = await response.text();
  assert.equal(response.status, 404);
  assert.equal(response.headers.get("x-robots-tag"), "noindex, follow");
  assert.match(body, /Article not found/);
  assert.match(body, /music98\.news/);
  assert.match(body, /Error 404/);
  assert.match(body, /Back to homepage/);
  assert.match(body, /\/legal-header\.css\?v=20261004-9/);
  assert.match(body, /\/legal-header\.js\?v=20261003-1/);
  assert.doesNotMatch(body, /home shell/);
});
