import assert from "node:assert/strict";
import fs from "node:fs";
import {
  appleCandidateCompatible,
  mergeKey,
  pickAppleCandidate,
  versionSignature,
} from "../functions/lib/chart-identity.js";

const original = {
  trackId: 100,
  trackName: "Loser",
  artistName: "Tame Impala",
  collectionName: "Loser - Single",
  releaseDate: "2025-09-01T00:00:00Z",
};
const album = {
  trackId: 101,
  trackName: "Loser",
  artistName: "Tame Impala",
  collectionName: "Deadbeat",
  releaseDate: "2025-10-17T00:00:00Z",
};
const remix = {
  trackId: 102,
  trackName: "Loser (Fcukers Remix)",
  artistName: "Tame Impala & Fcukers",
  collectionName: "Loser (Fcukers Remix) - Single",
  releaseDate: "2026-09-25T00:00:00Z",
};

assert.notEqual(mergeKey("Loser", "Tame Impala"), mergeKey("Loser (Fcukers Remix)", "Tame Impala & Fcukers"));
assert.equal(versionSignature("Dracula (with JENNIE)"), "");
assert.equal(versionSignature("Dracula (Boys Noize Disko Version)"), "version");
assert.equal(versionSignature("Bad Times (Extended Version)"), "extended");
assert.equal(appleCandidateCompatible("Loser", "Tame Impala", remix), false);
assert.equal(appleCandidateCompatible("Loser", "Tame Impala", original), true);
assert.equal(pickAppleCandidate("Loser", "Tame Impala", [remix, album, original]).trackId, 100);

const live = {
  trackId: 200,
  trackName: "Uninvited (Live at Newport Folk)",
  artistName: "Brandi Carlile",
  collectionName: "Uninvited (Live at Newport Folk) - Single",
  releaseDate: "2026-09-01T00:00:00Z",
};
const studio = {
  trackId: 201,
  trackName: "Uninvited",
  artistName: "Brandi Carlile",
  collectionName: "Uninvited - Single",
  releaseDate: "2026-08-01T00:00:00Z",
};
assert.equal(pickAppleCandidate("Uninvited (Live at Newport Folk)", "Brandi Carlile", [studio, live]).trackId, 200);

const instr = {
  trackId: 300,
  trackName: "Dracula (with JENNIE) [Instrumental]",
  artistName: "Tame Impala",
  collectionName: "Dracula (with JENNIE) [Instrumental] - Single",
  releaseDate: "2026-09-01T00:00:00Z",
};
const vocal = {
  trackId: 301,
  trackName: "Dracula (with JENNIE)",
  artistName: "Tame Impala",
  collectionName: "Dracula (with JENNIE) - Single",
  releaseDate: "2026-08-01T00:00:00Z",
};
assert.equal(pickAppleCandidate("Dracula (with JENNIE)", "Tame Impala", [instr, vocal]).trackId, 301);

const corrections = JSON.parse(fs.readFileSync(new URL("../public/data/cover-corrections.json", import.meta.url), "utf8"));
const tameCorrection = corrections["loser|tameimpala"];
assert.equal(tameCorrection.appleCollectionId, "1842957385");
assert.equal(tameCorrection.appleTrackId, "1842957386");
assert.match(tameCorrection.art, /196873662978\.jpg\/600x600bb\.jpg$/);
const daftCorrection = corrections["getlucky~v:edit|daftpunk"];
assert.equal(daftCorrection.appleCollectionId, "617154241");
assert.match(daftCorrection.art, /886443919266\.jpg\/600x600bb\.jpg$/);
assert.match(daftCorrection.reason, /never.*Remix/);

console.log("chart artwork regression: PASS");
