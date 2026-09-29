import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
  appleCandidateCompatible,
  COVER_RESOLVER_VERSION,
  pickAppleCandidate,
  versionSignature,
} from "../functions/lib/chart-identity.js";

const top50=readFileSync(new URL("../functions/api/top50.js",import.meta.url),"utf8");
const resolver=readFileSync(new URL("../scripts/build-covers.mjs",import.meta.url),"utf8");
const workflow=readFileSync(new URL("../.github/workflows/apple-data.yml",import.meta.url),"utf8");
const meta=JSON.parse(readFileSync(new URL("../public/data/apple-cover-meta.json",import.meta.url),"utf8"));

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
  assert.equal(versionSignature("Album (Deluxe)"),"deluxe");
  assert.equal(appleCandidateCompatible("Loser","Tame Impala",remix),false);
  assert.equal(appleCandidateCompatible("Loser","Tame Impala",plainInRemixPack),false);
  assert.equal(appleCandidateCompatible("Loser","Tame Impala",{
    ...album,trackId:105,collectionName:"Deadbeat (Deluxe)"
  }),false);
});

test("canonical full Apple release beats a promo single for the same studio master",()=>{
  assert.equal(pickAppleCandidate("Loser","Tame Impala",[single,album,remix,plainInRemixPack]).trackId,101);
});

test("versioned chart rows still select their matching Apple version",()=>{
  const wanted={...remix,trackId:104};
  assert.equal(appleCandidateCompatible("Loser (Fcukers Remix)","Tame Impala & Fcukers",wanted),true);
  assert.equal(pickAppleCandidate("Loser (Fcukers Remix)","Tame Impala & Fcukers",[album,wanted]).trackId,104);
});

test("runtime trusts only provenance-verified covers and self-heals unproven rows",()=>{
  assert.equal(COVER_RESOLVER_VERSION,3);
  assert.deepEqual(meta,{});
  assert.match(top50,/const TOP50_KV = "top50v33"/);
  assert.match(top50,/coverMetaSeed/);
  assert.match(top50,/Number\(rec\.resolverVersion\) !== COVER_RESOLVER_VERSION/);
  assert.match(top50,/const chosen = searched \|\| canonical \|\| exact \|\| exactId/);
  assert.match(top50,/const needCanonicalArt = !isAppleArt\(t\.trustedAppleArt\)/);
  assert.match(top50,/t\.verifiedAppleArt = art/);
  assert.doesNotMatch(top50,/grab\(t\.title,\s*""\)/);
  assert.match(top50,/delete t\.trustedAppleArt/);
});

test("deep resolver audits existing covers and records canonical provenance",()=>{
  assert.match(resolver,/REVALIDATE_EXISTING/);
  assert.match(resolver,/COVER_RESOLVER_VERSION/);
  assert.match(resolver,/apple-cover-meta\.json/);
  assert.match(resolver,/pickAppleCandidate\(title, artist, songs\)/);
  assert.doesNotMatch(resolver,/"loser\|tameimpala"\s*:/);
  assert.match(workflow,/functions\/lib\/chart-identity\.js/);
  assert.match(workflow,/REVALIDATE_EXISTING=1/);
  assert.match(workflow,/apple-cover-meta\.json/);
  assert.match(workflow,/current canonical resolver proof/);
});
