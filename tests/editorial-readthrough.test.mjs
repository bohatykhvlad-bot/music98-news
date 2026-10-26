import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const checker=fs.readFileSync("scripts/editorial_readthrough.py","utf8");
const post=fs.readFileSync("scripts/post.py","utf8");
const canon=fs.readFileSync("scripts/canon_checks.py","utf8");
const gate=fs.readFileSync("scripts/gate.py","utf8");
const preflight=fs.readFileSync("scripts/preflight.py","utf8");

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
  assert.match(post,/def cmd_set[\s\S]*?_local_gate\(candidate\)/);
  assert.match(post,/def cmd_publish[\s\S]*?require_editorial_stamp\(pid\)/);
  assert.match(post,/sp = sub\.add_parser\("editorial"\)/);
  assert.match(post,/--check-stamp/);
});

test("canon checks are wired and manual items are never passed",()=>{
  assert.match(canon,/def manual_not_run/);
  assert.match(canon,/1200/);
  assert.match(canon,/NOT RUN/);
  assert.doesNotMatch(canon,/return \[[\s\S]*?"PASS"/);
  assert.match(gate,/canon_checks/);
  assert.doesNotMatch(gate,/fails\.append\(\("date-unregistered"/);
  assert.match(preflight,/canon_checks/);
  assert.match(preflight,/mechanical_issues/);
  assert.doesNotMatch(preflight,/1300/);
});

test("Music98 gate flags curly quotes in title, teaser and body", async()=>{
  const {spawnSync}=await import("node:child_process");
  const py=`
import sys
sys.path.insert(0,"scripts")
from gate import check_post
post={"id":"quote-regression","type":"news","status":"draft","title":"Singer releases “Housewife”","excerpt":"A single features “Housewife” in the title.","body":"The singer released “Housewife” as a single."}
fails,_,_=check_post(post,strict=True)
quoted=[msg for code,msg in fails if code=="quote-glyph"]
assert len(quoted)==3,quoted
post["title"]='Singer releases "Housewife"'
post["excerpt"]='A single features "Housewife" in the title.'
post["body"]='The singer released "Housewife" as a single.'
fails,_,_=check_post(post,strict=True)
assert not any(code=="quote-glyph" for code,_ in fails),fails
`;
  const run=spawnSync("python3",["-c",py],{encoding:"utf8"});
  assert.equal(run.status,0,run.stdout+"\\n"+run.stderr);
});
