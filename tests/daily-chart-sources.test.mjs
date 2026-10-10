import test from "node:test";
import assert from "node:assert/strict";
import {DAILY_CHART_METHOD,DAILY_CHART_CONSENSUS,hasConsensusTracks,isConsensusChart,completeDailySources,currentSourceDate,parseAppleGlobal,
  parseDeezerWorldwide,verifiedDailySeed,verifiedTenureEdition} from "../functions/lib/daily-chart-sources.js";
import {appleHTML,fakeDailySource} from "./fixtures/daily-chart.mjs";

test("only the three daily song sources form a complete ranking",()=>{
  assert.equal(completeDailySources({A:50,S:50,D:50}),true);
  assert.equal(completeDailySources({A:50,S:50,D:49}),false);
  assert.equal(completeDailySources({A:50,S:50,D:50,Y:50}),false);
  assert.equal(completeDailySources({A:100,S:100,D:100}),true);
  assert.equal(completeDailySources({A:100,S:50,D:100}),false);
});
test("consensus proof rejects missing votes, duplicates and ranks beyond the input depth",()=>{
  const row={title:"Verified song",artist:"Artist",sourceRanks:{A:71,S:68,D:82}};
  const chart={methodology:DAILY_CHART_METHOD,consensus:DAILY_CHART_CONSENSUS,
    complete:true,sources:{A:100,S:100,D:100},tracks:[row]};
  assert.equal(isConsensusChart(chart),true);
  assert.equal(hasConsensusTracks([]),false);
  assert.equal(hasConsensusTracks([row,row]),false);
  assert.equal(isConsensusChart({...chart,sources:{A:50,S:50,D:50}}),false);
  assert.equal(isConsensusChart({...chart,consensus:undefined}),false);
  for(const sourceRanks of [{A:1,S:2},{A:1,S:2,D:101},{A:1,S:2,D:1.5}])
    assert.equal(hasConsensusTracks([{...row,sourceRanks}]),false);
});
test("official global Apple playlist supplies ordered songs and Apple media identity",()=>{
  const {apple,rows}=fakeDailySource(),result=parseAppleGlobal(apple);
  assert.equal(result.tracks.length,50);
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
  assert.equal(parseDeezerWorldwide(deezer).length,50);
  assert.throws(()=>parseDeezerWorldwide({...deezer,id:123}),/wrong_or_partial/);
  assert.throws(()=>parseDeezerWorldwide({data:deezer.tracks.data}),/wrong_or_partial/);
  assert.throws(()=>parseDeezerWorldwide({...deezer,tracks:{data:deezer.tracks.data.slice(0,49)}}),/incomplete_chart_sources/);
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
  const tracks=fakeDailySource().rows;
  const old={complete:true,sources:{A:50,S:50,D:50,B:50,Y:50},tracks};
  assert.equal(verifiedTenureEdition(old),true);
  assert.equal(completeDailySources(old.sources),false);
  assert.equal(verifiedTenureEdition({...old,sources:{A:50,S:50,D:50}}),false);
  assert.equal(verifiedTenureEdition({...old,methodology:DAILY_CHART_METHOD,sources:{A:50,S:50,D:50}}),true);
});
