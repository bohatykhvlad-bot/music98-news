import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import worker from "../worker.js";

const published = readFileSync(new URL("../public/ads.txt", import.meta.url), "utf8");
const ctx = { waitUntil() {} };

test("GET and HEAD crawlers receive only the published ads.txt without contacting external managers or caching it", async t => {
  const external = t.mock.method(globalThis, "fetch", async () => new Response("# Unrelated managed seller file\n"));
  const env = {
    ASSETS: {
      async fetch(request) {
        assert.equal(new URL(request.url).pathname, "/ads.txt");
        return new Response(request.method === "HEAD" ? null : published, {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      },
    },
  };
  for (const method of ["GET", "HEAD"]) {
    const response = await worker.fetch(new Request("https://music98.news/ads.txt", { method }), env, ctx);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /^text\/plain/);
    assert.match(response.headers.get("cache-control"), /no-store/);
    assert.equal(response.headers.get("cdn-cache-control"), "no-store");
    assert.equal(response.headers.get("cloudflare-cdn-cache-control"), "no-store");
    assert.equal(await response.text(), method === "GET" ? published : "");
  }
  assert.equal(external.mock.calls.length, 0);
});
