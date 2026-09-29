import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
  appleCandidateCompatible,
  pickAppleCandidate,
  versionSignature,
} from "../functions/lib/chart-identity.js";

const top50=readFileSync(new URL("../functions/api/top50.js",import.meta.url),"utf8");
const resolver=readFileSync(new URL("../scripts/build-covers.mjs",import.meta.url),"utf8");
const workflow=readFileSync(new URL("../.github/workflows/apple-data.yml",import.meta.url),"utf8");

const single={
  trackId:100,trackName:"Loser",artistName:"Tame Impala",
  collectionArtistName:"Tame Impala",collectionName:"Loser - Single",
  trackCount:1,releaseDate:"2025-09-01T00:00:00Z"
};
const album={
  trackId:101,trackName:"Loser",artistName:"Tame Impala",
  collectionArtistName:"Tame Impala",collectionName:"Deadbeat",
  trackCount:12,releaseDate:"2025-10-17T00:00:00Z"
};
const remix={
  trackId:102,trackName:"Loser (Fcukers Remix)",artistName:"Tame Impala & Fcukers",
  collectionArtistName:"Tame Impala",collectionName:"Loser (Fcukers Remix) - Single",
  trackCount:1,releaseDate:"2026-09-25T00:00:00Z"
};
const plainInRemixPack={
  trackId:103,trackName:"Loser",artistName:"Tame Impala",
  collectionArtistName:"Tame Impala",collectionName:"Loser Remixes",
  trackCount:5,releaseDate:"2026-09-25T00:00:00Z"
};

test("plain songs reject derivative Apple tracks and derivative collections",()=>{
  assert.equal(versionSignature("Loser Remixes"),"remix");
  assert.equal(appleCandidateCompatible("Loser","Tame Impala",remix),false);
  assert.equal(appleCandidateCompatible("Loser","Tame Impala",plainInRemixPack),false);
});

test("canonical full Apple release beats a promo single for the same studio master",()=>{
  assert.equal(pickAppleCandidate("Loser","Tame Impala",[single,album,remix,plainInRemixPack]).trackId,101);
});

test("versioned chart rows still select their matching Apple version",()=>{
  const wanted={...remix,trackId:104};
  assert.equal(appleCandidateCompatible("Loser (Fcukers Remix)","Tame Impala & Fcukers",wanted),true);
  assert.equal(pickAppleCandidate("Loser (Fcukers Remix)","Tame Impala & Fcukers",[album,wanted]).trackId,104);
});

test("runtime chart art confidence order cannot be overwritten by stale registry",()=>{
  assert.match(top50,/const TOP50_KV = "top50v33"/);
  assert.match(top50,/const exact = isAppleArt\(t\.appleExact\?\.art\)/);
  assert.match(top50,/const verified = isAppleArt\(t\.verifiedAppleArt\)/);
  assert.match(top50,/const chosen = exact \|\| verified \|\| searched \|\| seed\[key\] \|\| cached/);
  assert.match(top50,/t\.verifiedAppleArt = art/);
  assert.match(top50,/delete t\.appleExact/);
});

test("deep resolver audits existing covers and runs automatically after matcher changes",()=>{
  assert.match(resolver,/REVALIDATE_EXISTING/);
  assert.match(resolver,/pickAppleCandidate\(title, artist, songs\)/);
  assert.doesNotMatch(resolver,/"loser\|tameimpala"\s*:/);
  assert.match(workflow,/functions\/lib\/chart-identity\.js/);
  assert.match(workflow,/REVALIDATE_EXISTING=1/);
});
