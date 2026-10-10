import test from "node:test";
import assert from "node:assert/strict";
import {TRI_METHOD,TRI_RULE,songIdentity,verifiedTriCandidates,
 verifiedTriSeed,rankTriCandidates,isTriChart} from "../functions/lib/tri-source-chart.js";

const day=new Date().toISOString().slice(0,10);
const id=n=>String(n+1).padStart(22,"0");
function fixtures(){
 const out=Array.from({length:110},(_,i)=>{
  const spotify=i<100;
  return {title:"Song "+(i+1),artist:"Artist "+(i+1),
   sourceRanks:{U:i<90?i+1:i<100?null:i-9,A:i<90?i+1:i<100?null:i-9,S:spotify?i+1:null},
   spotify:spotify?{status:"matched",daily:1000000-i*6500,spotifyId:id(i),date:day,
    metric:"kworb-spotify-chart-global-daily",
    sourceUrl:"https://kworb.net/spotify/country/global_daily.html"}:
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
test("Spotify-only songs can enter even when absent from Apple USA and Global",()=>{
 const isolated=Array.from({length:300},(_,i)=>({
  title:"Unique "+i,artist:"Performer "+i,
  sourceRanks:{U:i<100?i+1:null,A:i>=100&&i<200?i-99:null,S:i>=200?i-199:null},
  spotify:i>=200?{status:"matched",daily:2800000-(i-200)*1000,
   spotifyId:id(i),date:day,metric:"kworb-spotify-chart-global-daily",
   sourceUrl:"https://kworb.net/spotify/country/global_daily.html"}:
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
