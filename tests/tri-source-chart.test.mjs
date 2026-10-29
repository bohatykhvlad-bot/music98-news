import test from "node:test";
import assert from "node:assert/strict";
import {TRI_METHOD,TRI_RULE,songIdentity,verifiedTriCandidates,
 verifiedTriSeed,rankTriCandidates,isTriChart} from "../functions/lib/tri-source-chart.js";
import {dampOrder,DAMP_ALPHA} from "../functions/lib/chart-smoothing.js";

const day=new Date().toISOString().slice(0,10);
const id=n=>String(n+1).padStart(22,"0");
function fixtures(){
 const out=Array.from({length:110},(_,i)=>{
  const spotify=i<100;
  return {title:"Song "+(i+1),artist:"Artist "+(i+1),
   sourceRanks:{U:i<90?i+1:i<100?null:i-9,A:i<90?i+1:i<100?null:i-9,S:spotify?i+1:null},
   spotify:spotify?{status:"matched",daily:1000000-i*6500,spotifyId:id(i),date:day,
    metric:"musicrank-spotify-chart-global-daily",
    sourceUrl:"https://musicrank.org/spotify"}:
    {status:"unavailable",daily:null,reason:"not-in-spotify-daily-chart"}};
 });
 // Rank 1 is Spotify-only, proven daily streams: eligible for Music98 Top 50.
 out[0].sourceRanks.U=null;out[0].sourceRanks.A=null;
 out[99].sourceRanks.U=1;out[99].sourceRanks.A=1;
 return out;
}
const seed=rows=>({schema:3,methodology:TRI_METHOD,
 appleUsDate:day,appleGlobalDate:day,spotifyDate:day,fingerprint:"a".repeat(64),
 sourceSizes:{U:100,A:100,S:200},coverage:{candidates:rows.length,
  matched:rows.filter(t=>t.spotify.status==="matched").length,
  unmatched:rows.filter(t=>t.spotify.status!=="matched").length},tracks:rows});
test("the three platform pool has no duplicates and preserves version distinctions",()=>{
 const rows=fixtures();
 assert.equal(verifiedTriCandidates(rows,day),true);
 assert.notEqual(songIdentity("Track - Live","A"),songIdentity("Track","A"));
 assert.notEqual(songIdentity("曲一","A"),songIdentity("曲二","A"));
 const duplicate=structuredClone(rows);duplicate[1].spotify.spotifyId=duplicate[0].spotify.spotifyId;
 assert.equal(verifiedTriCandidates(duplicate,day),false);
});
test("all 50 ranked entries have verified Spotify numbers and bounded source points",()=>{
 const rows=fixtures(),found=rankTriCandidates(rows,day);
 assert.equal(found.tracks.length,50);
 assert.ok(found.tracks.every(t=>t.spotify.status==="matched"&&Number.isInteger(t.spotify.daily)));
 assert.ok(rows.some(t=>t.sourceRanks.U===null&&t.sourceRanks.A===null&&t.spotify.status==="matched"));
 assert.ok(found.tracks.every(t=>t.appleUsPoints>=0&&t.appleUsPoints<=40));
 assert.ok(found.tracks.every(t=>t.appleGlobalPoints>=0&&t.appleGlobalPoints<=30));
 assert.ok(found.tracks.every(t=>t.spotifyPoints>=0&&t.spotifyPoints<=30));
 assert.deepEqual(new Set(found.tracks.map(t=>songIdentity(t.title,t.artist))).size,50);
});
test("a damped edition publishes the half-way position and the verifier recomputes it",()=>{
 const rows=fixtures(),rank=rankTriCandidates(rows,day);
 const scoreOrder=rank.tracks.map(t=>songIdentity(t.title,t.artist));
 // Yesterday: a realistic day - five songs swapped places.
 const previousOrder=scoreOrder.slice();
 [3,11,19,27,35].forEach(i=>{const j=i+1;[previousOrder[i],previousOrder[j]]=[previousOrder[j],previousOrder[i]];});
 const damped=dampOrder(scoreOrder,previousOrder,DAMP_ALPHA,50);
 assert.equal(damped.length,50);
 const byKey=new Map(rank.tracks.map(t=>[songIdentity(t.title,t.artist),t]));
 const tracks=damped.map((key,i)=>({...byKey.get(key),rank:i+1,scoreRank:scoreOrder.indexOf(key)+1}));
 const chart={methodology:TRI_METHOD,consensus:TRI_RULE,complete:true,
  sources:{U:100,A:100,S:200},sourceDates:{U:day,A:day,S:day},
  spotifyFingerprint:"a".repeat(64),scoring:{maxDaily:rank.maxDaily},
  damping:{alpha:DAMP_ALPHA,previousOrder},tracks};
 assert.ok(isTriChart(chart));
 // The published order is the damped one, not the score order.
 assert.notDeepEqual(tracks.map(t=>songIdentity(t.title,t.artist)),scoreOrder);
 // A song that moved further than the rule allows is rejected.
 const tampered=structuredClone(chart);
 tampered.tracks[0].rank=1;tampered.tracks[49].rank=1;
 assert.equal(isTriChart(tampered),false);
 // The damping record is part of the edition: removing it must not pass.
 const unrecorded=structuredClone(chart);delete unrecorded.damping;
 assert.equal(isTriChart(unrecorded),false);
});
test("the damped edition moves the chart less than the score order would",()=>{
 const target=Array.from({length:50},(_,i)=>"song "+i);
 // Yesterday: a realistic day - a handful of songs swapped places.
 const previous=target.slice();
 [3,11,19,27,35].forEach(i=>{const j=i+1;[previous[i],previous[j]]=[previous[j],previous[i]];});
 const movement=order=>order.reduce((sum,key,i)=>sum+Math.abs(i-previous.indexOf(key)),0);
 const damped=dampOrder(target,previous,0.5,50);
 assert.equal(damped.length,50);
 assert.equal(new Set(damped).size,50);
 assert.ok(movement(damped)<movement(target),
  "the damped order must jump less than the score order");
 // Every song keeps at most half of its distance, plus the room the songs
 // that asked for the same place needed.
 for(const key of target){
  const was=previous.indexOf(key)+1,now=damped.indexOf(key)+1;
  const half=Math.ceil(Math.abs((target.indexOf(key)+1)-was)/2);
  assert.ok(Math.abs(now-was)<=half+2,key+" moved too far");
 }
});
test("Spotify-only songs can enter even when absent from Apple USA and Global",()=>{
 const isolated=Array.from({length:300},(_,i)=>({
  title:"Unique "+i,artist:"Performer "+i,
  sourceRanks:{U:i<100?i+1:null,A:i>=100&&i<200?i-99:null,S:i>=200?i-199:null},
  spotify:i>=200?{status:"matched",daily:2800000-(i-200)*1000,
   spotifyId:id(i),date:day,metric:"musicrank-spotify-chart-global-daily",
   sourceUrl:"https://musicrank.org/spotify"}:
   {status:"unavailable",daily:null}
 }));
 assert.ok(verifiedTriCandidates(isolated,day));
 const ranked=rankTriCandidates(isolated,day);
 assert.equal(ranked.tracks.length,50);
 assert.ok(ranked.tracks.every(t=>t.sourceRanks.U===null&&t.sourceRanks.A===null&&
   Number.isInteger(t.spotify.daily)));
});
test("incomplete Spotify stream collection cannot produce an edition",()=>{
 const rows=fixtures();
 for(let i=0;i<60;i++)rows[i].spotify={status:"unavailable",daily:null};
 assert.equal(verifiedTriSeed(seed(rows)),null);
 assert.throws(()=>rankTriCandidates(rows,day),/fewer_than_50/);
});
test("partial, stale, duplicate and invented source data are blocked",()=>{
 const rows=fixtures(),s=seed(rows);
 assert.ok(verifiedTriSeed(s));
 assert.equal(verifiedTriSeed({...s,spotifyDate:"2020-01-01"}),null);
 assert.equal(verifiedTriSeed({...s,fingerprint:"bad"}),null);
 const changed=structuredClone(rows);changed[2].sourceRanks.U=changed[1].sourceRanks.U;
 assert.equal(verifiedTriCandidates(changed,day),false);
});
test("live publisher can independently recompute scoring and rejects tampering",()=>{
 const rows=fixtures(),rank=rankTriCandidates(rows,day);
 const chart={methodology:TRI_METHOD,consensus:TRI_RULE,complete:true,
  sources:{U:100,A:100,S:200},sourceDates:{U:day,A:day,S:day},
  spotifyFingerprint:"a".repeat(64),scoring:{maxDaily:rank.maxDaily},tracks:rank.tracks};
 assert.ok(isTriChart(chart));
 const forged=structuredClone(chart);forged.tracks[0].score+=4;
 assert.equal(isTriChart(forged),false);
 const missing=structuredClone(chart);missing.tracks[3].spotify.daily=null;
 assert.equal(isTriChart(missing),false);
});
