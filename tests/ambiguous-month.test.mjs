import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {writeFileSync, mkdirSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";

/* Owner 28.10 on the Jay-Z post: "Bad Bunny, who was there in February" sat
   next to "February 14, 2027" twice, so the bare month read as the year the
   article is about - while the fact was 2026. The gate now fails a month that
   appears with a year elsewhere in the same post. */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GATE = path.join(ROOT, "scripts", "gate.py");
const FIXTURE = path.join(tmpdir(), "music98-gate-ambiguous-month.json");

function check(body) {
  mkdirSync(path.dirname(FIXTURE), {recursive: true});
  writeFileSync(FIXTURE, JSON.stringify({
    posts: [{
      id: "g1",
      type: "news",
      tag: "News",
      rtype: "",
      artist: "Test Artist",
      title: "A Test Headline",
      excerpt: "Test Artist did a thing.",
      body,
      date: "2026-10-27",
      status: "live",
      cover: {kind: "preset", i: 0},
    }],
  }));
  const res = spawnSync("python3", [GATE, "--file", FIXTURE], {cwd: ROOT, encoding: "utf-8"});
  const out = (res.stdout || "") + (res.stderr || "");
  return /ambiguous-month/.test(out);
}

test("a bare month that collides with a dated month fails the gate", () => {
  const body = [
    "Test Artist will headline the big show on February 14, 2027.",
    "Until now the names came from his own taste, the first in 2020, and last came Bad Bunny, who was there in February.",
  ].join("\n\n");
  assert.equal(check(body), true, "expected the bare month to fail the gate");
});

test("the same month with its own year passes", () => {
  const body = [
    "Test Artist will headline the big show on February 14, 2027.",
    "Until now the names came from his own taste, the first in 2020, and last came Bad Bunny, who was there in February 2026.",
  ].join("\n\n");
  assert.equal(check(body), false, "expected the dated month to pass the gate");
});

test("a lone month with no dated twin is left alone", () => {
  const body = "Test Artist went on tour. In March she announced the Freedom Tour across North America.";
  assert.equal(check(body), false, "expected a lone month to pass the gate");
});
