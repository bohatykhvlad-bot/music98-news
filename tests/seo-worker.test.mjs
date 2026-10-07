import test from "node:test";
import assert from "node:assert/strict";
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
  assert.doesNotMatch(body, /home shell/);
});
