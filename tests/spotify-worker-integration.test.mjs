import test from "node:test";
import assert from "node:assert/strict";
import {buildTop50,onRequestGet} from "../functions/api/top50.js";
import {mergeKey,artworkKey} from "../functions/lib/chart-identity.js";
import {DAILY_CHART_METHOD,DAILY_CHART_CONSENSUS,hasConsensusTracks,parseAppleGlobal} from "../functions/lib/daily-chart-sources.js";
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
 const oldTracks=source.rows.map(t=>({...t,rank:t.pos,sourceRanks:{A:t.pos,S:t.pos,D:t.pos},weeks:7,delta:"0"}));
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
   assert.equal(writes.at(-1),"top50v38");
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
   assert.deepEqual(writes.filter(k=>k!=="names_v1"),["top50v38:retry"]);
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

test("a slow third source is awaited before ranking or history writes",async()=>{
 const source=fakeDailySource(),{env,writes}=mediaEnvironment(source),previous=globalThis.fetch;
 let release;
 const thirdSource=new Promise(resolve=>{release=resolve;});
 globalThis.fetch=async input=>{
   if(String(input).includes("api.deezer.com"))await thirdSource;
   return source.fakeFetch(input);
 };
 try{
   let completed=false;
   const pending=onRequestGet({env,request:new Request("https://music98.news/api/top50")})
     .then(r=>{completed=true;return r;});
   await new Promise(resolve=>setTimeout(resolve,15));
   assert.equal(completed,false);
   assert.deepEqual(writes,[]);
   release();
   const result=await (await pending).json();
   assert.deepEqual(result.sources,{A:50,S:50,D:50});
   assert.equal(result.tracks.length,50);
 }finally{release();globalThis.fetch=previous;}
});

test("a provider timeout serves the complete verified chart without rescoring on two inputs",async()=>{
 const source=fakeDailySource({deezerOffline:true}),{env,values,writes,assets}=mediaEnvironment(source);
 const previous=globalThis.fetch,old=assets["chart-tenure-backup.json"].current;
 const saved={...old,methodology:DAILY_CHART_METHOD,consensus:DAILY_CHART_CONSENSUS,sources:{A:50,S:50,D:50},
   spotifyFingerprint:source.snapshot.fingerprint,sourceDates:{S:old.updated},
   tracks:old.tracks.map(t=>({...t,url:"",art:"",prev:""}))};
 values.set("top50v38",saved);
 globalThis.fetch=async input=>{
   if(String(input).includes("api.deezer.com"))throw new DOMException("Source timed out","TimeoutError");
   return source.fakeFetch(input);
 };
 try{
   const response=await onRequestGet({env,request:new Request("https://music98.news/api/top50")});
   const result=await response.json();
   assert.equal(response.status,200);
   assert.equal(result.fallback,"last-verified");
   assert.equal(result.updated,old.updated);
   assert.deepEqual(result.tracks.map(t=>[t.rank,t.title,t.weeks,t.delta]),old.tracks.map(t=>[t.rank,t.title,t.weeks,t.delta]));
   assert.ok(result.tracks.every(t=>t.art && t.prev.startsWith("https://audio-ssl.itunes.apple.com/")));
   assert.deepEqual(writes.filter(k=>k!=="names_v1"),["top50v38:retry"]);
 }finally{globalThis.fetch=previous;}
});

test("new Spotify data waits for the independent mirror before publication",async()=>{
 const source=fakeDailySource(),previous=globalThis.fetch;
 source.snapshot.chartDate=new Date(Date.now()-86400000).toISOString().slice(0,10);
 globalThis.fetch=source.fakeFetch;
 try{
   await assert.rejects(buildTop50("https://music98.news",{},source.snapshot),/spotify_newer_chart_waiting_for_mirror/);
 }finally{globalThis.fetch=previous;}
});

test("exact Apple ID fills missing audio while keeping an audited cover",async()=>{
 const {buildTop50:isolatedBuild}=await import("../functions/api/top50.js?exact-preview");
 const source=fakeDailySource(),{env,assets}=mediaEnvironment(source),previous=globalThis.fetch;
 const first=source.rows[0],key=mergeKey(first.title,first.artist);
 assets["apple-names.json"][key].prev="";
 let exactLookup=false;
 globalThis.fetch=async input=>{
   const url=String(input);
   if(url.startsWith("https://itunes.apple.com/lookup?")){
     exactLookup=true;
     return new Response(JSON.stringify({results:[{trackId:1000,trackName:first.title,
       artistName:first.artist,collectionName:"Source Album",releaseDate:"2026-01-01",
       artworkUrl100:"https://is1-ssl.mzstatic.com/unverified/100x100bb.jpg",
       previewUrl:"https://audio-ssl.itunes.apple.com/exact-id.m4a"}]}));
   }
   return source.fakeFetch(input);
 };
 try{
   const result=await isolatedBuild("https://music98.news",env,source.snapshot);
   assert.equal(exactLookup,true);
   assert.equal(result.tracks[0].prev,"https://audio-ssl.itunes.apple.com/exact-id.m4a");
   assert.equal(result.tracks[0].art,"https://is1-ssl.mzstatic.com/image/thumb/1/600x600bb.jpg");
 }finally{globalThis.fetch=previous;}
});

test("a recovered third-source snapshot bypasses retry backoff without a Spotify change",async()=>{
 const source=fakeDailySource({deezerOffline:true}),{env,assets,values}=mediaEnvironment(source),previous=globalThis.fetch;
 globalThis.fetch=source.fakeFetch;
 try{
   const request=new Request("https://music98.news/api/top50");
   assert.equal((await onRequestGet({env,request})).status,503);
   assert.ok(values.has("top50v38:retry"));
   const today=new Date().toISOString().slice(0,10);
   assets["deezer-chart.json"]={schema:2,updated:today,sourceDate:today,capturedAt:today+"T12:00:00Z",
     source:"official-deezer-worldwide-playlist",region:"global",cadence:"daily",tracks:source.rows};
   const response=await onRequestGet({env,request}),payload=await response.json();
   assert.equal(response.status,200);
   assert.equal(payload.fallback,undefined);
   assert.deepEqual(payload.sources,{A:50,S:50,D:50});
   assert.equal(payload.spotifyFingerprint,source.snapshot.fingerprint);
 }finally{globalThis.fetch=previous;}
});

test("a verified daily backup survives empty KV without rebuilding from two sources",async()=>{
 const source=fakeDailySource({deezerCount:49}),{env,assets,writes}=mediaEnvironment(source),previous=globalThis.fetch;
 const old=assets["chart-tenure-backup.json"].current;
 assets["daily-top50-backup.json"]={...old,updated:new Date().toISOString().slice(0,10),
   complete:true,methodology:DAILY_CHART_METHOD,consensus:DAILY_CHART_CONSENSUS,sources:{A:50,S:50,D:50},arrows:{ok:true},
   tracks:old.tracks.map(t=>({...t,weeks:8}))};
 globalThis.fetch=source.fakeFetch;
 try{
   const response=await onRequestGet({env,request:new Request("https://music98.news/api/top50")});
   const chart=await response.json();
   assert.equal(response.status,200);
   assert.equal(chart.fallback,"verified-daily-snapshot");
   assert.ok(chart.tracks.every(t=>t.weeks===8 && t.art && t.prev));
   assert.deepEqual(chart.sources,{A:50,S:50,D:50});
   assert.deepEqual(writes.filter(k=>k!=="names_v1"),["top50v38:retry"]);
 }finally{globalThis.fetch=previous;}
});

test("daily backup recovery refuses partial sources and regressed day counters",async()=>{
 for(const broken of ["partial","regressed","weekly"]){
   const source=fakeDailySource({deezerCount:49}),{env,assets}=mediaEnvironment(source),previous=globalThis.fetch;
   const old=assets["chart-tenure-backup.json"].current;
   const saved={...old,updated:new Date().toISOString().slice(0,10),methodology:DAILY_CHART_METHOD,consensus:DAILY_CHART_CONSENSUS,
     sources:{A:50,S:50,D:50},arrows:{ok:true},tracks:old.tracks.map(t=>({...t,weeks:8}))};
   if(broken==="partial")saved.sources.D=49;
   if(broken==="regressed")saved.tracks.forEach(t=>{t.weeks=1;});
   if(broken==="weekly"){delete saved.methodology;saved.sources={A:50,S:50,D:50,B:50,Y:50};}
   assets["daily-top50-backup.json"]=saved;
   globalThis.fetch=source.fakeFetch;
   try{
     assert.equal((await onRequestGet({env,request:new Request("https://music98.news/api/top50")})).status,503,broken);
   }finally{globalThis.fetch=previous;}
 }
});

test("even first-place songs in one or two charts cannot fill a consensus edition",async()=>{
 const source=fakeDailySource(),{env}=mediaEnvironment(source),previous=globalThis.fetch;
 const deezer=structuredClone(source.deezer);
 // The two strongest Apple songs lack one or two platforms. Only ranks 3–9
 // match all three; all other rows remain valid, uniquely ranked inputs.
 source.snapshot.tracks=source.snapshot.tracks.map(t=>t.pos===1||t.pos>9?{...t,title:'Spotify exclusive '+t.pos}:t);
 deezer.tracks.data=deezer.tracks.data.map((t,i)=>i<2||i>=9?{...t,title:'Deezer exclusive '+(i+1)}:t);
 const kw='<h2>'+source.snapshot.chartDate.replaceAll('-','/')+'</h2><table>'+source.snapshot.tracks.map(t=>
  '<tr class="d2"><td class="np">'+t.pos+'</td><td class="text mp"><div>'+t.artist+' - '+t.title+'</div></td></tr>').join('')+'</table>';
 globalThis.fetch=async input=>{
   const url=String(input);
   if(url.includes('kworb.net'))return new Response(kw);
   if(url.includes('api.deezer.com'))return new Response(JSON.stringify(deezer));
   return source.fakeFetch(input);
 };
 try{
   const chart=await buildTop50('https://music98.news',env,source.snapshot);
   assert.equal(chart.consensus,DAILY_CHART_CONSENSUS);
   assert.equal(chart.tracks.length,7);
   assert.deepEqual(chart.tracks.map(t=>t.title),source.rows.slice(2,9).map(t=>t.title));
   assert.ok(hasConsensusTracks(chart.tracks));
   assert.deepEqual(chart.tracks[0].sourceRanks,{A:3,S:3,D:3});
 }finally{globalThis.fetch=previous;}
});

test("old aggregate caches and snapshots cannot reintroduce one-platform tracks",async()=>{
 const source=fakeDailySource({deezerCount:49}),{env,assets,values}=mediaEnvironment(source),previous=globalThis.fetch;
 const old=assets['chart-tenure-backup.json'].current;
 const aggregate={...old,updated:new Date().toISOString().slice(0,10),methodology:DAILY_CHART_METHOD,
  sources:{A:50,S:50,D:50},arrows:{ok:true},tracks:old.tracks.map(t=>({...t,weeks:8}))};
 values.set('top50v37',aggregate);values.set('top50v38',aggregate);assets['daily-top50-backup.json']=aggregate;
 globalThis.fetch=source.fakeFetch;
 try{assert.equal((await onRequestGet({env,request:new Request('https://music98.news/api/top50')})).status,503);}
 finally{globalThis.fetch=previous;}
});
