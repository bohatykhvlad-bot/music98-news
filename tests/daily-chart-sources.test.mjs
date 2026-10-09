import test from "node:test";
import assert from "node:assert/strict";
import {DAILY_CHART_METHOD,completeDailySources,currentSourceDate,parseAppleGlobal,
  parseDeezerWorldwide,verifiedDailySeed,verifiedTenureEdition} from "../functions/lib/daily-chart-sources.js";
import {appleHTML,fakeDailySource} from "./fixtures/daily-chart.mjs";

test("only the three daily song sources form a complete ranking",()=>{
  assert.equal(completeDailySources({A:100,S:100,D:100}),true);
  assert.equal(completeDailySources({A:100,S:100,D:99}),false);
  assert.equal(completeDailySources({A:100,S:100,D:100,Y:50}),false);
});
test("official global Apple playlist supplies ordered songs and Apple media identity",()=>{
  const {apple,rows}=fakeDailySource(),result=parseAppleGlobal(apple);
  assert.equal(result.tracks.length,100);
  assert.deepEqual(result.tracks.map(t=>[t.pos,t.title,t.artist]),rows.map(t=>[t.pos,t.title,t.artist]));
  assert.match(result.tracks[0].url,/music\.apple\.com\/us\/album\//);
  assert.match(result.tracks[0].art,/600x600bb\.jpg$/);
  assert.throws(()=>parseAppleGlobal(appleHTML(rows,{id:"country-chart"})),/wrong_or_partial/);
  assert.throws(()=>parseAppleGlobal(appleHTML(rows,{count:49})),/wrong_or_partial/);
  assert.throws(()=>parseAppleGlobal(appleHTML(rows,{date:"2020-01-01"})),/date_stale/);
  assert.throws(()=>parseAppleGlobal(apple.replace('rankingText":"17"','rankingText":"18"')),/rank_missing_17/);
});
test("Deezer uses the named worldwide playlist and rejects partial or local charts",()=>{
  const {deezer}=fakeDailySource();
  assert.equal(parseDeezerWorldwide(deezer).length,100);
  assert.throws(()=>parseDeezerWorldwide({...deezer,id:123}),/wrong_or_partial/);
  assert.throws(()=>parseDeezerWorldwide({data:deezer.tracks.data}),/wrong_or_partial/);
  assert.throws(()=>parseDeezerWorldwide({...deezer,tracks:{data:deezer.tracks.data.slice(0,99)}}),/incomplete_chart_sources/);
});
test("daily recovery seeds reject US RSS, weekly data and stale captures",()=>{
  const {apple}=fakeDailySource(),chart=parseAppleGlobal(apple),today=new Date().toISOString().slice(0,10);
  const seed={schema:2,source:"official-apple-global-playlist",updated:today,sourceDate:chart.date,
    region:"global",cadence:"daily",tracks:chart.tracks};
  assert.ok(verifiedDailySeed(seed,"A"));
  for(const bad of [{schema:1},{source:"official-apple-rss"},{cadence:"weekly"},{region:"us"},{updated:"2020-01-01"}])
    assert.equal(verifiedDailySeed({...seed,...bad},"A"),null);
  assert.equal(currentSourceDate("2026-02-30"),false);
  assert.equal(currentSourceDate("2026-10-06",Date.parse("2026-10-05T12:00:00Z")),false);
});
test("legacy editions recover day-count history without satisfying the new ranking gate",()=>{
  const tracks=fakeDailySource().rows.slice(0,50).map(t=>({...t,rank:t.pos,sourceRanks:{A:t.pos,S:t.pos,D:t.pos}}));
  const old={complete:true,sources:{A:50,S:50,D:50,B:50,Y:50},tracks};
  assert.equal(verifiedTenureEdition(old),true);
  assert.equal(completeDailySources(old.sources),false);
  assert.equal(verifiedTenureEdition({...old,sources:{A:100,S:100,D:100}}),false);
  assert.equal(verifiedTenureEdition({...old,methodology:DAILY_CHART_METHOD,sources:{A:100,S:100,D:100}}),true);
  assert.equal(verifiedTenureEdition({...old,methodology:"daily-global-v1",sources:{A:50,S:50,D:50}}),true);
});
