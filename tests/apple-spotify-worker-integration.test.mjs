import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequestGet,buildTop50} from '../functions/api/top50.js';
import {mergeKey,artworkKey} from '../functions/lib/chart-identity.js';
import {parseAppleGlobal} from '../functions/lib/daily-chart-sources.js';
import {HYBRID_METHOD,HYBRID_RULE,isAppleSpotifyChart} from '../functions/lib/apple-spotify-chart.js';
import {fakeDailySource} from './fixtures/daily-chart.mjs';

function fixture(){
 const src=fakeDailySource(),today=new Date().toISOString().slice(0,10),yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10);
 const rows=parseAppleGlobal(src.apple).tracks;
 const candidates=rows.map((t,i)=>({...t,sourceRanks:{A:i+1},spotify:i<35?{
  status:'matched',daily:(i+1)*10000,spotifyId:String(i).padStart(22,'0'),date:today,
  sourceUrl:'https://kworb.net/spotify/artist/'+'a'.repeat(22)+'_songs.html'
 }:{status:'track-not-found',daily:null}}));
 const seed={schema:1,methodology:HYBRID_METHOD,appleDate:today,spotifyDate:today,fingerprint:'b'.repeat(64),coverage:{matched:35},tracks:candidates};
 const old={updated:yesterday,week:Math.floor((Date.now()-Date.UTC(2026,8,17))/86400000)-1,complete:true,
  sources:{A:50,S:50,D:50,B:50,Y:50},tracks:rows.map(t=>({...t,rank:t.pos,weeks:7,delta:'0'}))};
 const assets={'apple-chart.json':{schema:2,updated:today,sourceDate:today,region:'global',cadence:'daily',source:'official-apple-global-playlist',tracks:rows},
  'apple-spotify-streams.json':seed,'chart-tenure-backup.json':{schema:1,current:old,previous:null},
  'apple-names.json':Object.fromEntries(rows.map(t=>[mergeKey(t.title,t.artist),{title:t.title,artist:t.artist,url:t.url,year:'2026',prev:'https://audio-ssl.itunes.apple.com/preview/'+t.pos+'.m4a'}])),
  'covers.json':Object.fromEntries(rows.map(t=>[artworkKey(t.title,t.artist),t.art])),'loudness.json':{}};
 const values=new Map(),writes=[],requests=[];
 const env={ASSETS:{fetch:async input=>{const file=new URL(String(input)).pathname.split('/').at(-1);return file in assets?new Response(JSON.stringify(assets[file])):new Response('',{status:404});}},
  DESK:{get:async k=>values.get(k)||null,put:async(k,v)=>{writes.push(k);values.set(k,JSON.parse(v));}}};
 const fakeFetch=async input=>{requests.push(String(input));return new Response('',{status:503});};
 return {src,today,assets,seed,env,values,writes,requests,fakeFetch};
}
const request=()=>new Request('https://music98.news/api/top50');
async function use(f,fn){const old=globalThis.fetch;globalThis.fetch=f.fakeFetch;try{return await fn();}finally{globalThis.fetch=old;}}

test('paired snapshots publish all Apple 50 with audio, artwork, tenure and stable repeat requests',async()=>{
 const f=fixture();await use(f,async()=>{
  const r=await onRequestGet({env:f.env,request:request()}),j=await r.json();
  assert.equal(r.status,200);assert.ok(isAppleSpotifyChart(j));assert.equal(j.methodology,HYBRID_METHOD);assert.equal(j.consensus,HYBRID_RULE);
  assert.deepEqual(j.sources,{A:50,S:35});assert.equal(j.arrows.ok,true);assert.equal(j.tracks.length,50);
  assert.ok(j.tracks.every(t=>t.weeks===8&&t.art&&t.prev.includes('itunes.apple.com')&&t.url.includes('music.apple.com')));
  assert.equal(f.writes.at(-1),'top50v39');
  const again=await (await onRequestGet({env:f.env,request:request()})).json();assert.deepEqual(again.tracks,j.tracks);
  assert.ok(f.requests.every(u=>!u.includes('kworb.net')&&!u.includes('deezer.com')));
 });
});
test('stream boost can promote only Apple candidates and unknown rows retain their base score',async()=>{
 const f=fixture();f.seed.tracks[8].spotify.daily=5000000;
 await use(f,async()=>{
  const j=await buildTop50('https://music98.news',f.env,f.seed);
  assert.ok(j.tracks.find(t=>t.pos===9).rank<9);
  assert.equal(j.tracks.find(t=>t.pos===50).score,1);assert.ok(isAppleSpotifyChart(j));
 });
});
test('new Apple edition without paired stream collection cannot mutate history or publish a mixed chart',async()=>{
 const f=fixture();f.assets['apple-chart.json'].tracks[0].title='New Apple song';
 await use(f,async()=>{
  const r=await onRequestGet({env:f.env,request:request()});assert.equal(r.status,503);
  assert.deepEqual(f.writes,['top50v39:retry']);
 });
});
test('malformed or stale streams cannot publish and cannot fall back to old three-source charts',async()=>{
 for(const change of [s=>s.spotifyDate='2020-01-01',s=>s.tracks.pop(),s=>s.coverage.matched=1]){
  const f=fixture();change(f.seed);f.values.set('top50v38',{methodology:'daily-global-v1',tracks:f.src.rows});
  await use(f,async()=>{const r=await onRequestGet({env:f.env,request:request()});assert.equal(r.status,503);assert.deepEqual(f.writes,[]);});
 }
});
test('Kworb collection outage serves the previous complete hybrid snapshot without rescoring',async()=>{
 const f=fixture();await use(f,async()=>{
  const good=await (await onRequestGet({env:f.env,request:request()})).json();
  f.assets['daily-top50-backup.json']=good;delete f.assets['apple-spotify-streams.json'];f.values.clear();f.writes.length=0;
  const r=await onRequestGet({env:f.env,request:request()}),j=await r.json();
  assert.equal(r.status,200);assert.ok(j.fallback);assert.deepEqual(j.tracks,good.tracks);assert.ok(f.writes.every(k=>k==='names_v1'));
 });
});
test('same-day stream fingerprint changes invalidate KV ranking cache',async()=>{
 const f=fixture();await use(f,async()=>{
  const first=await (await onRequestGet({env:f.env,request:request()})).json();
  f.seed.tracks[8].spotify.daily=5000000;f.seed.fingerprint='c'.repeat(64);
  const next=await (await onRequestGet({env:f.env,request:request()})).json();
  assert.notEqual(next.spotifyFingerprint,first.spotifyFingerprint);assert.ok(next.tracks.find(t=>t.pos===9).rank<9);
  assert.ok(next.tracks.every(t=>t.weeks===8));
 });
});
test('artwork audit previews the same ranking without tenure or ranking KV writes',async()=>{
 const f=fixture();await use(f,async()=>{
  const r=await onRequestGet({env:f.env,request:new Request('https://music98.news/api/top50?artworkAudit=1')}),j=await r.json();
  assert.equal(r.status,200);assert.equal(j.artworkAuditOnly,true);assert.ok(isAppleSpotifyChart(j));
  assert.ok(f.writes.every(k=>k==='names_v1'));
 });
});
