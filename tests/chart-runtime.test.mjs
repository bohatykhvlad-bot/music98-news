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


test("server Apple fallback keeps lead artist and never retries title-only",()=>{
  assert.match(top50,/function leadArtistName\(s\)/);
  assert.match(top50,/const lead = leadArtistName\(t\.artist\)/);
  assert.match(top50,/extra = await grab\(t\.title, lead\)/);
  assert.doesNotMatch(top50,/grab\(t\.title, ""\)/);
});


test("current-day cached chart self-heals missing artwork without changing ranking",()=>{
  assert.match(top50,/async function healMissingArtwork\(env, tracks, origin\)/);
  assert.match(top50,/await enrichArtByIds\(tracks\)/);
  assert.match(top50,/const stillMissing = tracks\.filter\(\(t\) => !t\.art\)/);
  assert.match(top50,/await enrichApple\(stillMissing\)/);
  assert.match(top50,/runtimeFilled: healed\.filled/);
  assert.doesNotMatch(top50,/healMissingArtwork[\s\S]{0,900}sort\(/);
});

test("exact Apple IDs may restore complete feature credits only when merge identity is unchanged",()=>{
  assert.match(top50,/function applyAppleCanonicalIdentity\(track, title, artist\)/);
  assert.match(top50,/mergeKey\(nextTitle, nextArtist\) !== mergeKey\(track\.title, track\.artist\)/);
  assert.match(top50,/appleCandidateCompatible\(t\.title, t\.artist, item\)/);
  assert.match(top50,/await enrichArtByIds\(tracks, coverStats\);\/\* URL мог появиться/);
});


test("artwork registry refreshes inside long-lived Worker isolates",()=>{
  assert.match(top50,/const COVER_SEED_TTL_MS = 30 \* 1000/);
  assert.match(top50,/now - COVER_SEED_AT < COVER_SEED_TTL_MS/);
  assert.match(top50,/COVER_SEED_AT = now/);
  assert.doesNotMatch(top50,/async function coverSeed\(env, origin\) \{\n  if \(COVER_SEED\) return COVER_SEED;/);
});

test("Top 50 decorated responses are never edge-cached across artwork deployments",()=>{
  assert.match(top50,/"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"/);
  assert.match(top50,/"Cloudflare-CDN-Cache-Control": "no-store"/);
  assert.doesNotMatch(top50,/s-maxage=3600/);
});

test("verified chart recovery rejects mass day-one resets and old launch snapshots",()=>{
  const begin=top50.indexOf("function cachedTenureRegressed(payload, backup)");
  const end=top50.indexOf("/* This checked-in snapshot", begin);
  assert.ok(begin>=0 && end>begin);
  const source=top50.slice(begin,end);
  const guard=new Function("tenureKey",source+";return cachedTenureRegressed;")(
    (title,artist)=>String(title).toLowerCase()+"|"+String(artist).toLowerCase());
  const yesterday=Array.from({length:30},(_,i)=>({
    title:"Song "+i,artist:"Artist",rank:i+1,weeks:7
  }));
  const backup={current:{updated:"2026-10-01",tracks:yesterday}};
  const broken={updated:"2026-10-02",tracks:yesterday.map(t=>({...t,weeks:1}))};
  const healthy={updated:"2026-10-02",tracks:yesterday.map(t=>({...t,weeks:8}))};
  assert.equal(guard(broken,backup),true);
  assert.equal(guard(healthy,backup),false);
  assert.equal(guard({...healthy,updated:"2026-09-17"},backup),true);
  assert.match(top50,/async function verifiedBackupTop50\(env, origin, backup\)/);
  assert.doesNotMatch(top50.slice(top50.indexOf("export async function onRequestGet")),
    /bakedTop50\(/);
});

test("every source must supply all 50 positions",()=>{
  const start=top50.indexOf("function completeChartSources(s) {");
  const end=top50.indexOf("function verifiedSourceSnapshot(s)",start);
  const gate=new Function("SOURCES","SIZE",top50.slice(start,end)+"return completeChartSources;")(["A","S","D","B","Y"],50);
  const complete={A:50,S:50,D:50,B:50,Y:50};
  assert.equal(gate(complete),true);
  for(const key of Object.keys(complete)){
    assert.equal(gate({...complete,[key]:49}),false,key);
    assert.equal(gate({...complete,[key]:0}),false,key);
  }
  assert.match(top50,/invalid_rank_or_duplicate_source_/);
  assert.match(top50,/spotify_mirror_disagreement/);
  assert.match(top50,/spotify_newer_chart_waiting_for_mirror/);
  assert.match(top50,/const memory=\{deferPersist:true\}/);
});
test("fresh Apple fallback also requires an intact Top 50",()=>{
 assert.match(top50,/async function freshAppleRanking\(env,origin\)/);
 assert.match(top50,/snap.updated!==today/);
 assert.match(top50,/snap.source!=="official-apple-rss"/);
 assert.match(top50,/rows.length===SIZE && rows.every/);
});
test("the Worker uses tested shared parsing and rejects unverified KV cache",()=>{
 assert.match(top50,/function parseSpotify\(html\) \{ return parseKworbSpotify\(html\); \}/);
 assert.match(top50,/const verified=verifiedSpotifySnapshot\(spotifySeed\)/);
 assert.match(top50,/cached.sourceDates\?\.S===verified.date/);
 assert.match(top50,/cached.spotifyFingerprint===verified.fingerprint/);
 assert.match(top50,/const TOP50_KV = "top50v36"/);
 assert.match(top50,/TOP50_RETRY_KV="top50v36:retry"/);
});
