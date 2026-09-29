import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const top50=readFileSync(new URL("../functions/api/top50.js",import.meta.url),"utf8");

test("cached Top 50 refreshes only display metadata/artwork before response",()=>{
  assert.match(top50,/async function decorateCachedTop50\(env, payload, origin\)/);
  assert.match(top50,/await applyNames\(env, payload\.tracks, origin\)/);
  assert.match(top50,/await applyCovers\(env, payload\.tracks, origin\)/);
  assert.match(top50,/return top50Response\(await decorateCachedTop50\(env, cached, origin\)\)/);
  assert.doesNotMatch(top50,/decorateCachedTop50[\s\S]{0,600}sort\(/);
  assert.doesNotMatch(top50,/decorateCachedTop50[\s\S]{0,600}rank\s*=/);
});
