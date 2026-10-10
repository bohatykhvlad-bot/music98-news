import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {completeDailySources,DAILY_SOURCE_IDS} from "../functions/lib/daily-chart-sources.js";

const top50=readFileSync(new URL("../functions/api/top50.js",import.meta.url),"utf8");

test("cached Top 50 refreshes only display metadata/artwork before response",()=>{
  assert.match(top50,/async function decorateCachedTop50\(env, payload, origin\)/);
  assert.match(top50,/await applyNames\(env, payload\.tracks, origin\)/);
  assert.match(top50,/await applyCovers\(env, payload\.tracks, origin, \{retainTrusted:true,preferApple:payload\.methodology===TRI_METHOD\}\)/);
  assert.match(top50,/const decorated=await decorateCachedTop50\(env, cached, origin\)/);
  assert.match(top50,/if\(hasCompleteChartArtwork\(decorated\.tracks\)\)\{/);
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
  assert.match(top50,/async function healMissingArtwork\(env, tracks, origin, \{preferApple=false\}=\{\}\)/);
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

test("the active ranking requires paired Apple candidates and dated Kworb streams",()=>{
  assert.match(top50,/verifiedStreamSeed\(streamSeed/);
  assert.match(top50,/apple_candidates_changed_waiting_for_streams/);
  assert.match(top50,/rankAppleSpotify\(independent.tracks\)/);
  assert.match(top50,/const memory=\{deferPersist:true\}/);
});
test("fresh Apple fallback also requires an intact Top 50",()=>{
 assert.match(top50,/async function freshDailyRanking\(env,origin,source\)/);
 assert.match(top50,/verifiedDailySeed\(await readSeed/);
 assert.doesNotMatch(top50,/rss.applemarketingtools.com/);
});
test("the Worker rejects obsolete three-source cache and refreshes when streams change",()=>{
 assert.match(top50,/const verified=verifiedTriSeed\(streamSeed\)\|\|verifiedUsStreamSeed\(streamSeed\)\|\|verifiedStreamSeed\(streamSeed\)/);
 assert.match(top50,/cached.sourceDates\?\.S===verified.spotifyDate/);
 assert.match(top50,/cached.spotifyFingerprint===verified.fingerprint/);
 assert.match(top50,/const TOP50_KV = "top50v39"/);
 assert.match(top50,/TOP50_RETRY_KV="top50v39:retry"/);
});

test("verified source publisher dispatches downstream chart audit after bot commits",()=>{
 const spotifyWorkflow=readFileSync(new URL("../.github/workflows/apple-chart-source.yml",import.meta.url),"utf8");
 const auditWorkflow=readFileSync(new URL("../.github/workflows/apple-data.yml",import.meta.url),"utf8");
 assert.match(spotifyWorkflow,/actions: write/);
 assert.match(spotifyWorkflow,/GH_TOKEN: \$\{\{ secrets\.GITHUB_TOKEN \}\}/);
 assert.match(spotifyWorkflow,/git push origin HEAD:main; then[\s\S]*gh workflow run apple-data\.yml --ref main/);
 assert.match(auditWorkflow,/group: apple-data/);
});

test("all 50 covers are a hard publication gate, including current-day KV and fallback",()=>{
  assert.match(top50,/if\(!hasCompleteChartArtwork\(payload\.tracks\)\)/);
  assert.match(top50,/throw new Error\("incomplete_chart_artwork:"/);
  assert.match(top50,/if\(fallback && hasCompleteChartArtwork\(fallback\.tracks\)\)/);
  assert.match(top50,/if\s*\(hasCompleteChartArtwork\(v\.tracks\)\) return v/);
  assert.match(top50,/hasCompleteChartArtwork\(saved\.tracks\) \? saved/);
  assert.match(top50,/if\(hasCompleteChartArtwork\(decorated\.tracks\)\)\{/);
});

test("artwork audit can inspect future chart without publishing it to KV",()=>{
  assert.match(top50,/searchParams\.get\("artworkAudit"\)==="1"/);
  assert.match(top50,/artworkAuditOnly:true/);
  const preview=top50.indexOf('searchParams.get("artworkAudit")');
  const caching=top50.indexOf('if(env?.DESK)try{',preview);
  assert.ok(preview>=0 && caching>preview);
  assert.doesNotMatch(top50.slice(preview,caching),/await applyTenure|TOP50_KV,JSON\.stringify/);
});

test("browser accepts only fully imaged chart editions and can retain a prior verified edition",()=>{
  const html=readFileSync(new URL("../public/index.html",import.meta.url),"utf8");
  assert.match(html,/function chartHasCompleteArtwork\(tracks,methodology\)/);
  assert.match(html,/if\(!isDailySourceEdition\(j\) \|\| !chartHasCompleteArtwork\(tracks,j\.methodology\)\) throw new Error\("incomplete_chart_artwork"\)/);
  assert.match(html,/if\(hasVerifiedCache\) applyDaily\(cached\.tracks,"backup",cached\.date\)/);
  assert.match(html,/if\(fresh && chartHasCompleteArtwork\(tracks,j\.methodology\)\)/);
});

test("artwork audit refuses stale prospective chart and live audit rejects any missing cover",()=>{
  const build=readFileSync(new URL("../scripts/build-covers.mjs",import.meta.url),"utf8");
  const live=readFileSync(new URL("../scripts/audit-live-chart.mjs",import.meta.url),"utf8");
  assert.match(build,/candidate\.updated===new Date\(\)\.toISOString\(\)\.slice\(0,10\)/);
  assert.match(build,/candidate\?\.artworkAuditOnly===true/);
  assert.match(live,/if\(missingArtwork\.length\) throw new Error\("BLOCKED: published Top 50 has missing artwork:/);
});
