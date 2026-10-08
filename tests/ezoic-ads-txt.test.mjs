import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import worker from "../worker.js";

const existing = readFileSync(new URL("../public/ads.txt", import.meta.url), "utf8");
const ctx = { waitUntil() {} };

function envWithFallback() {
  return {
    ASSETS: {
      async fetch(request) {
        assert.equal(new URL(request.url).pathname, "/ads.txt");
        return new Response(request.method === "HEAD" ? null : existing, {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      },
    },
  };
}

test("ad crawlers receive the existing seller file while Ezoic setup is pending or unavailable", async t => {
  for (const [name, result] of [
    ["domain not configured", () => new Response("", { status: 404 })],
    ["upstream outage", () => new Response("unavailable", { status: 503 })],
    ["HTML error returned as success", () => new Response("<html>unavailable</html>")],
    ["empty file", () => new Response("")],
    ["network failure", () => { throw new Error("network unavailable"); }],
  ]) {
    await t.test(name, async t => {
      t.mock.method(globalThis, "fetch", result);
      const response = await worker.fetch(new Request("https://music98.news/ads.txt"), envWithFallback(), ctx);
      assert.equal(response.status, 200);
      assert.equal(await response.text(), existing);
    });
  }
});

test("the configured Ezoic seller file is served automatically to GET and HEAD crawlers", async t => {
  const managed = "# Managed by Ezoic\ngoogle.com, pub-1234567890123456, RESELLER, f08c47fec0942fa0\n";
  t.mock.method(globalThis, "fetch", (url, options) => {
    assert.equal(url, "https://srv.adstxtmanager.com/19390/music98.news");
    assert.equal(options.headers.Accept, "text/plain");
    assert.equal(options.cf.cacheTtlByStatus["300-599"], 0);
    return Promise.resolve(new Response(managed));
  });
  for (const method of ["GET", "HEAD"]) {
    const response = await worker.fetch(new Request("https://music98.news/ads.txt", { method }), {
      ASSETS: { fetch() { throw new Error("The managed file should be used"); } },
    }, ctx);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /^text\/plain/);
    assert.equal(await response.text(), method === "GET" ? managed : "");
  }
});
