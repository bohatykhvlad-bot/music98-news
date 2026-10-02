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

test("ranking refuses any missing input before changing tenure",()=>{
 const body=top50.slice(top50.indexOf("function completeChartSources"),top50.indexOf("function verifiedSourceSnapshot"));
 const gate=new Function("SOURCES","SOURCE_MIN_ROWS",body+";return completeChartSources;")(["A","S","D","B","Y"],40);
 const all={A:50,S:47,D:50,B:50,Y:50};
 assert.equal(gate(all),true);
 for(const k of Object.keys(all))assert.equal(gate({...all,[k]:0}),false,k);
 assert.equal(gate({...all,A:39}),false);
 assert.ok(top50.indexOf('if(!completeChartSources(sources))')<top50.indexOf('ingest(bucket, "A", apple)'));
 assert.match(top50,/const memory=\{deferPersist:true\}/);
 assert.match(top50,/const TOP50_RETRY_KV/);
});

test("only today's official Apple chart may fill a blocked origin",()=>{
 assert.match(top50,/async function freshAppleRanking\(env,origin\)/);
 assert.match(top50,/snap.updated!==today/);
 assert.match(top50,/snap.source!=="official-apple-rss"/);
 assert.match(top50,/rows.length>=SOURCE_MIN_ROWS/);
 assert.match(top50,/if\(apple.length<SOURCE_MIN_ROWS\)/);
 assert.match(top50,/if\(!completeChartSources\(sources\)\)/);
});

test("styled Kworb rows must not disappear from Spotify's Top 50",()=>{
  const start=top50.indexOf("function parseSpotify(html) {");
  const end=top50.indexOf("function parseYouTube(data) {",start);
  assert.ok(start>=0&&end>start);
  const parser=new Function("SIZE",top50.slice(start,end)+"return parseSpotify;")(50);
  const html=Array.from({length:50},(_,i)=>{
    const rank=i+1,open=[17,36,50].includes(rank)?'<tr class="d2">':"<tr>";
    return open+'<td class="np">'+rank+'</td>\n<td class="np">+5</td>\n'+
      '<td class="text mp"><div><a>Artist '+rank+'</a> - <a>Song '+rank+
      '</a></div></td></tr>';
  }).join("");
  const got=parser(html);
  assert.equal(got.length,50);
  assert.deepEqual(got.map(x=>x.pos),Array.from({length:50},(_,i)=>i+1));
  for(const pos of [17,36,50]) {
    assert.equal(got[pos-1].artist,"Artist "+pos);
    assert.equal(got[pos-1].title,"Song "+pos);
  }
  assert.match(top50,/if\(spotify.length!==SIZE \|\| spotify.some/);
});
