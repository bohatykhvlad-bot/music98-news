import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {SPOTIFY_CHART_PROVIDERS,SPOTIFY_PROVIDER_ORDER,buildSpotifySnapshot,
 verifiedSpotifySnapshot,validatedSpotifyRows,SPOTIFY_INPUT_SIZE} from "../functions/lib/spotify-chart.js";
import {refreshSpotifySource,readSpotifySource,
 snapshotFromWorker,SPOTIFY_SOURCE_KV} from "../functions/lib/spotify-source.js";

const day=new Date().toISOString().slice(0,10);
const id=n=>String(n+1).padStart(22,"0");
const rows=Array.from({length:SPOTIFY_INPUT_SIZE},(_,i)=>({
 pos:i+1,title:"Track "+(i+1),artist:"Artist "+(i+1),
 url:"",art:"",year:"",prev:"",daily:2000000-i*4000,spotifyId:id(i)}));
const chosen={date:day,source:"musicrank",sourceUrl:SPOTIFY_CHART_PROVIDERS.musicrank.sourceUrl,
 ldConfirmed:20,tracks:rows};

function kvMock(){
 const values=new Map();
 return {values,DESK:{
  get:async key=>values.has(key)?values.get(key):null,
  put:async(key,value)=>{values.set(key,typeof value==="string"?JSON.parse(value):value);}}};
}

test("the chart source list names one site and no other",()=>{
 assert.deepEqual(Object.keys(SPOTIFY_CHART_PROVIDERS),["musicrank"]);
 assert.deepEqual(SPOTIFY_PROVIDER_ORDER,["musicrank"]);
 const sources=Object.values(SPOTIFY_CHART_PROVIDERS).map(p=>p.sourceUrl).join(" ");
 assert.ok(!/kworb/i.test(sources),"no other site may stand in the source list");
 assert.ok(sources.includes("musicrank.org"));
});

test("the snapshot the job reads is the one the Worker wrote",async()=>{
 const snapshot=buildSpotifySnapshot(chosen,"musicrank");
 assert.ok(verifiedSpotifySnapshot(snapshot));
 assert.equal(snapshot.chartDate,day);
 assert.equal(snapshot.provider,"musicrank");
 assert.equal(snapshot.tracks.length,SPOTIFY_INPUT_SIZE);
 assert.equal(snapshot.sourceUrl,"https://musicrank.org/spotify");
 assert.ok(!/kworb/i.test(JSON.stringify(snapshot.sourceUrl)));
});

test("the Worker keeps the newest verified snapshot and never an older edition",async()=>{
 const kv=kvMock();
 const first=await refreshSpotifySource({...kv,DESK:kv.DESK,__fetch:null});
 // The real source cannot be reached from a test, so the refresh reports it.
 assert.equal(first.ok,false);
 assert.ok(String(first.reason).length>0);
 // A stored snapshot that is newer than the one being written is kept.
 const yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10);
 const newer=buildSpotifySnapshot({...chosen,date:yesterday},"musicrank");
 await kv.DESK.put(SPOTIFY_SOURCE_KV,JSON.stringify(newer));
 const stored=await readSpotifySource({DESK:kv.DESK});
 assert.equal(stored.chartDate,yesterday);
});

test("the job can take the snapshot from the Worker when the source is blocked",async()=>{
 const snapshot=buildSpotifySnapshot(chosen,"musicrank");
 const fetcher=async()=>new Response(JSON.stringify(snapshot),{status:200,
  headers:{"content-type":"application/json"}});
 const got=await snapshotFromWorker("https://music98.news/api/spotify-source",fetcher);
 assert.equal(got.chartDate,day);
 assert.equal(got.provider,"musicrank");
 assert.equal(got.fingerprint,snapshot.fingerprint);
 // A snapshot that does not pass verification is refused.
 const broken={...snapshot,fingerprint:"nope"};
 await assert.rejects(()=>snapshotFromWorker("https://music98.news/api/spotify-source",
  async()=>new Response(JSON.stringify(broken),{status:200})),/failed verification/);
 // An unreachable Worker is an error, not a silent empty chart.
 await assert.rejects(()=>snapshotFromWorker("https://music98.news/api/spotify-source",
  async()=>{throw new Error("offline");}),/unreachable/);
});

test("the stored editions of the chart carry the rows of that source",()=>{
 const archive=JSON.parse(fs.readFileSync(new URL(
  "../public/data/chart-history/spotify-global-2026-10-15.json",import.meta.url),"utf8"));
 assert.equal(archive.source,"musicrank-spotify-global-daily");
 assert.equal(archive.sourceUrl,"https://musicrank.org/spotify");
 assert.equal(archive.tracks.length,SPOTIFY_INPUT_SIZE);
 const rows=validatedSpotifyRows(archive.tracks,SPOTIFY_INPUT_SIZE);
 assert.equal(rows.length,SPOTIFY_INPUT_SIZE);
 assert.ok(rows.every(t=>Number.isSafeInteger(t.daily)&&t.daily>0));
 assert.ok(!/kworb/i.test(JSON.stringify(archive)));
});

test("the source list of the chart names the site that publishes the streams",()=>{
 const top50=fs.readFileSync(new URL("../functions/api/top50.js",import.meta.url),"utf8");
 const daily=fs.readFileSync(new URL("../functions/lib/daily-chart-sources.js",import.meta.url),"utf8");
 const doc=fs.readFileSync(new URL("../docs/chart-methodology.md",import.meta.url),"utf8");
 const start=top50.indexOf("sourceDetails:triple?");
const live=top50.slice(start,top50.indexOf("}:regional?{",start)+1);
 assert.ok(live.includes("musicrank.org/spotify"));
 assert.ok(!/kworb/i.test(live),"the published chart must not name another site");
 assert.ok(!/kworb/i.test(daily.split("mirrors:")[1].split("]")[0]));
 assert.ok(!/kworb/i.test(doc));
});
