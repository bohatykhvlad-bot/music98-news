import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const checker=fs.readFileSync("scripts/editorial_readthrough.py","utf8");
const post=fs.readFileSync("scripts/post.py","utf8");

test("second editorial barrier exists and targets reader-facing failure modes",()=>{
  assert.match(checker,/EDITORIAL_READTHROUGH: PASS/);
  assert.match(checker,/one-sentence paragraph/);
  assert.match(checker,/schedule-style date list/);
  assert.match(checker,/technical production credit/);
  assert.match(checker,/physical-format\/store metadata/);
  assert.match(checker,/source\/checking language leaked/);
  assert.match(checker,/article ends on a bare number\/ordinal/);
  assert.match(checker,/AI\/PR pattern/);
  assert.match(checker,/venue roll call/);
  assert.match(checker,/administrative\/release-format metadata/);
  assert.match(checker,/HTML entity leaked/);
  assert.match(checker,/canned recap construction/);
  assert.match(checker,/choppy article paragraph/);
  assert.match(checker,/paragraph rhythm/);
  assert.match(checker,/full uninterrupted top-to-bottom read not attested/);
});

test("saving or publishing through post.py requires a current full-read stamp",()=>{
  assert.match(post,/def cmd_set[\s\S]*?require_editorial_stamp\(pid, body_file=body_file/);
  assert.match(post,/def cmd_publish[\s\S]*?require_editorial_stamp\(pid\)/);
  assert.match(post,/sp = sub\.add_parser\("editorial"\)/);
  assert.match(post,/--check-stamp/);
});
