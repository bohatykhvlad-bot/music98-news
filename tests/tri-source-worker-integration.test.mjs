import test from "node:test";
import assert from "node:assert/strict";
import {onRequestGet,buildTop50} from "../functions/api/top50.js";
import {mergeKey,artworkKey} from "../functions/lib/chart-identity.js";
import {parseAppleGlobal} from "../functions/lib/daily-chart-sources.js";
import {TRI_METHOD,TRI_RULE,isTriChart,rankTriCandidates} from "../functions/lib/tri-source-chart.js";
import {fakeDailySource} from "./fixtures/daily-chart.mjs";

function setup(){
 const fixture=fakeDailySource({size:100});
 const today=new Date().toISOString().slice(0,10);
 const yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10);
 const apple=parseAppleGlobal(fixture.apple,100).tracks;
 const spotify=apple.map((row,i)=>({
  ...row,sourceRanks:{U:i+1,A:i+1,S:i+1},
  spotify:{status:"matched",daily:3000000-i*20000,spotifyId:String(i+1).padStart(22,"0"),
   date:today,sourceUrl:"https://kworb.net/spotify/country/global_daily.html",
   metric:"kworb-spotify-chart-global-daily"}
 }));
 const seed={schema:3,methodology:TRI_METHOD,appleUsDate:today,appleGlobalDate:today,spotifyDate:today,
  fingerprint:"a".repeat(64),sourceSizes:{U:100,A:100,S:100},
  coverage:{candidates:100,matched:100,unmatched:0},tracks:spotify};
 const backup={schema:1,current:{updated:yesterday,week:Math.floor((Date.now()-Date.UTC(2026,8,17))/86400000)-1,
  complete:true,sources:{A:50,S:50,D:50,B:50,Y:50},
  tracks:apple.slice(0,50).map((t,i)=>({...t,rank:i+1,weeks:7,delta:"0"}))},previous:null};
 const assets={
  "apple-chart.json":{schema:2,updated:today,sourceDate:today,region:"global",
   cadence:"daily",source:"official-apple-global-playlist",tracks:apple},
  "apple-us-chart.json":{schema:2,updated:today,sourceDate:today,region:"us",
   cadence:"daily",source:"official-apple-us-playlist",tracks:apple},
  "apple-spotify-streams.json":seed,"chart-tenure-backup.json":backup,
  "apple-names.json":Object.fromEntries(apple.map(t=>[mergeKey(t.title,t.artist),
   {title:t.title,artist:t.artist,url:t.url,year:"2026",prev:"https://audio-ssl.itunes.apple.com/preview/"+t.pos+".m4a"}])),
  "covers.json":Object.fromEntries(apple.map(t=>[artworkKey(t.title,t.artist),t.art])),
  "loudness.json":{}
 };
 const values=new Map(),writes=[];
 const env={ASSETS:{fetch:async input=>{
   const file=new URL(String(input)).pathname.split("/").at(-1);
   return file in assets?new Response(JSON.stringify(assets[file])):new Response("",{status:404});
  }},DESK:{get:async key=>values.get(key)||null,
   put:async(key,value)=>{writes.push(key);values.set(key,JSON.parse(value));}}};
 return {seed,assets,env,writes,values,apple};
}
async function runWithNetworkDown(work){
 const original=globalThis.fetch;
 globalThis.fetch=async()=>new Response("",{status:503});
 try{return await work();}
 finally{globalThis.fetch=original;}
}
const req=url=>new Request(url||"https://music98.news/api/top50");
test("Worker publishes complete 40/30/30 chart with 50 real daily Spotify stream counts",async()=>{
 const f=setup();
 await runWithNetworkDown(async()=>{
  const response=await onRequestGet({env:f.env,request:req()});
  const json=await response.json();
  assert.equal(response.status,200);
  assert.ok(isTriChart(json));
  assert.equal(json.methodology,TRI_METHOD);assert.equal(json.consensus,TRI_RULE);
  assert.equal(json.tracks.length,50);
  assert.deepEqual(json.sources,{U:100,A:100,S:100});
  assert.ok(json.tracks.every(t=>t.spotify.status==="matched"&&Number.isSafeInteger(t.spotify.daily)
    &&t.art.includes("mzstatic.com")&&t.url.includes("music.apple.com")));
  assert.equal(f.writes.at(-1),"top50v39");
  const again=await (await onRequestGet({env:f.env,request:req()})).json();
  assert.deepEqual(again.tracks,json.tracks);
 });
});
test("Apple source mismatch blocks publishing a mixed-date or mixed-candidate ranking",async()=>{
 const f=setup();f.assets["apple-us-chart.json"].tracks[0].title="Wrong US candidate";
 await runWithNetworkDown(async()=>{
  const response=await onRequestGet({env:f.env,request:req()});
  assert.equal(response.status,503);
  assert.deepEqual(f.writes,["top50v39:retry"]);
 });
});
test("complete last verified three-source chart survives a later source outage",async()=>{
 const f=setup();
 await runWithNetworkDown(async()=>{
  const good=await (await onRequestGet({env:f.env,request:req()})).json();
  f.assets["daily-top50-backup.json"]=good;
  delete f.assets["apple-spotify-streams.json"];
  f.values.clear();f.writes.length=0;
  const response=await onRequestGet({env:f.env,request:req()});
  const fallback=await response.json();
  assert.equal(response.status,200);
  assert.equal(fallback.fallback,"verified-daily-snapshot");
  assert.deepEqual(fallback.tracks,good.tracks);
 });
});
test("read-only artwork preview recomputes verified weights without writing ranks",async()=>{
 const f=setup();
 await runWithNetworkDown(async()=>{
  const response=await onRequestGet({env:f.env,request:req("https://music98.news/api/top50?artworkAudit=1")});
  const json=await response.json();
  assert.equal(response.status,200);assert.ok(json.artworkAuditOnly);assert.ok(isTriChart(json));
  assert.ok(!f.writes.includes("top50v39"));
 });
});
