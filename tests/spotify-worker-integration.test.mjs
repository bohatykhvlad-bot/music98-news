import test from "node:test";
import assert from "node:assert/strict";
import {buildTop50,onRequestGet} from "../functions/api/top50.js";
import {mergeKey,artworkKey} from "../functions/lib/chart-identity.js";
import {DAILY_CHART_METHOD,parseAppleGlobal} from "../functions/lib/daily-chart-sources.js";
import {fakeDailySource} from "./fixtures/daily-chart.mjs";

async function expectRejected(options,pattern){
 const {fakeFetch,snapshot}=fakeDailySource(options),previous=globalThis.fetch;
 globalThis.fetch=fakeFetch;
 try{await assert.rejects(buildTop50("https://music98.news",{},snapshot),pattern);}
 finally{globalThis.fetch=previous;}
}
test("worker refuses 49 Deezer rows rather than making an incomplete combined chart",async()=>{
 await expectRejected({deezerCount:49},/incomplete_chart_sources/);
});
test("worker rejects a changed Spotify rank even if both mirrors appear complete",async()=>{
 await expectRejected({kworbSwap:true},/spotify_mirror_disagreement:36/);
});
test("worker falls back to verified independent Spotify if the live HTML lost a row",async()=>{
 /* The mirror fallback is allowed, but another incomplete source must still
    block any publication before ranking/tenure mutations. */
 await expectRejected({kworbMissing:[17],deezerCount:49},/incomplete_chart_sources/);
});

function mediaEnvironment(source) {
 const today=new Date().toISOString().slice(0,10);
 const yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10);
 const week=Math.floor((Date.now()-Date.UTC(2026,8,17))/86400000);
 const appleRows=parseAppleGlobal(source.apple).tracks;
 const names=Object.fromEntries(appleRows.map((row,i)=>[mergeKey(row.title,row.artist),{
   title:row.title,artist:row.artist,url:row.url,year:"2026",
   prev:"https://audio-ssl.itunes.apple.com/preview/"+(i+1)+".m4a"
 }]));
 const covers=Object.fromEntries(appleRows.map(row=>[artworkKey(row.title,row.artist),row.art]));
 const oldTracks=source.rows.map(t=>({...t,rank:t.pos,weeks:7,delta:"0"}));
 const old={updated:yesterday,week:week-1,complete:true,
   sources:{A:50,S:50,D:50,B:50,Y:50},tracks:oldTracks};
 const assets={"apple-names.json":names,"covers.json":covers,"loudness.json":{},
   "spotify-chart.json":source.snapshot,"chart-tenure-backup.json":{schema:1,current:old,previous:null}};
 const values=new Map([["top50v36",{...old,updated:today}]]),writes=[];
 return {assets,values,writes,env:{
   ASSETS:{fetch:async input=>{
     const name=new URL(String(input)).pathname.split("/").at(-1);
     return name in assets ? new Response(JSON.stringify(assets[name])) : new Response("missing",{status:404});
   }},
   DESK:{get:async key=>values.get(key)||null,put:async(key,value)=>{writes.push(key);values.set(key,JSON.parse(value));}}
 }};
}

test("daily migration preserves Apple audio/artwork, day counts and repeat-request movement",async()=>{
 const source=fakeDailySource(),{env,values,writes}=mediaEnvironment(source),previous=globalThis.fetch;
 globalThis.fetch=source.fakeFetch;
 try{
   const request=new Request("https://music98.news/api/top50");
   const response=await onRequestGet({env,request}),payload=await response.json();
   assert.equal(response.status,200);
   assert.equal(payload.methodology,DAILY_CHART_METHOD);
   assert.deepEqual(payload.sources,{A:50,S:50,D:50});
   assert.equal(payload.arrows.ok,true);
   assert.ok(payload.tracks.every(t=>t.weeks===8 && t.delta==="0"));
   assert.ok(payload.tracks.every(t=>t.prev.startsWith("https://audio-ssl.itunes.apple.com/")));
   assert.ok(payload.tracks.every(t=>t.art.endsWith("600x600bb.jpg") && t.url.includes("music.apple.com/us/album/")));
   assert.equal(writes.at(-1),"top50v37");
   assert.ok(values.has("top50v36"));
   assert.ok(source.requests.every(url=>!url.includes("youtube") && !url.includes("billboard") && !url.includes("/chart/0")));
   const cached=await (await onRequestGet({env,request})).json();
   assert.deepEqual(cached.tracks,payload.tracks);
 }finally{globalThis.fetch=previous;}
});

test("incomplete daily source does not mutate tenure or publish an old weekly edition",async()=>{
 const source=fakeDailySource({deezerCount:49}),{env,writes}=mediaEnvironment(source),previous=globalThis.fetch;
 globalThis.fetch=source.fakeFetch;
 try{
   const response=await onRequestGet({env,request:new Request("https://music98.news/api/top50")});
   assert.equal(response.status,503);
   assert.deepEqual(writes,["top50v37:retry"]);
 }finally{globalThis.fetch=previous;}
});

test("validated daily global snapshots recover both Apple and Deezer outages",async()=>{
 const source=fakeDailySource({appleOffline:true,deezerOffline:true});
 const {env,assets}=mediaEnvironment(source),previous=globalThis.fetch;
 const today=new Date().toISOString().slice(0,10);
 assets["apple-chart.json"]={schema:2,updated:today,sourceDate:today,region:"global",cadence:"daily",
   source:"official-apple-global-playlist",tracks:parseAppleGlobal(source.apple).tracks};
 assets["deezer-chart.json"]={schema:2,updated:today,sourceDate:today,region:"global",cadence:"daily",
   source:"official-deezer-worldwide-playlist",tracks:source.rows};
 globalThis.fetch=source.fakeFetch;
 try{
   const payload=await buildTop50("https://music98.news",env,source.snapshot);
   assert.deepEqual(payload.sources,{A:50,S:50,D:50});
   assert.equal(payload.sourceOrigin.A,"github-current-day-global");
   assert.equal(payload.sourceOrigin.D,"github-current-day-worldwide");
 }finally{globalThis.fetch=previous;}
});
