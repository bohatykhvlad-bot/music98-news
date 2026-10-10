import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {verifiedDailySeed} from '../functions/lib/daily-chart-sources.js';
import {KWORB_ARTISTS_URL,htmlText,artistKey,leadingArtist,parseKworbArtists,parseKworbArtistDaily,
 matchKworbTrack,freshDay,verifiedStreamSeed,HYBRID_METHOD} from '../functions/lib/apple-spotify-chart.js';

const output=new URL('../public/data/apple-spotify-streams.json',import.meta.url);
const apple=verifiedDailySeed(JSON.parse(fs.readFileSync(new URL('../public/data/apple-chart.json',import.meta.url),'utf8')),'A');
if(!apple)throw new Error('Current verified Apple snapshot required');
async function text(url){
 let last;
 for(let attempt=0;attempt<3;attempt++){
  try{
   const r=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 (compatible; music98-chart-source/3.0)','cache-control':'no-cache'},signal:AbortSignal.timeout(20000)});
   if(!r.ok)throw new Error('HTTP '+r.status+' '+url);
   return await r.text();
  }catch(e){last=e;if(attempt<2)await new Promise(done=>setTimeout(done,1000*(attempt+1)));}
 }
 throw last;
}
const artists=parseKworbArtists(await text(KWORB_ARTISTS_URL));
// The all-time artist directory can omit newer artists. Chart artist links
// identify additional pages; their chart Streams column is not mixed into Daily.
const globalPage=await text('https://kworb.net/spotify/country/global_daily.html');
if(!/Spotify Daily Chart\s*-\s*Global/i.test(globalPage.slice(0,5000)))throw new Error('Wrong Kworb artist discovery chart');
for(const m of globalPage.matchAll(/<a\b[^>]*href=["']\.\.\/artist\/([A-Za-z0-9]{22})\.html["'][^>]*>([\s\S]*?)<\/a>/gi)){
 const name=htmlText(m[2]),key=artistKey(name);
 if(!artists.has(key))artists.set(key,{name,id:m[1],url:`https://kworb.net/spotify/artist/${m[1]}_songs.html`});
}
const candidates=apple.tracks.slice(0,50),wanted=new Map();
for(const t of candidates){
 const artist=artists.get(artistKey(leadingArtist(t.artist)));
 if(artist)wanted.set(artist.id,artist);
}
const jobs=[...wanted.values()],pages=new Map();let cursor=0;
await Promise.all(Array.from({length:Math.min(4,jobs.length)},async()=>{
 while(cursor<jobs.length){
  const artist=jobs[cursor++],page=parseKworbArtistDaily(await text(artist.url),artist);
  pages.set(artist.id,page);
 }
}));
// Kworb updates some artists less frequently. Use one common recent edition;
// never score a stale artist counter as if it were today's daily streams.
const dates=new Map();
for(const t of candidates){
 const artist=artists.get(artistKey(leadingArtist(t.artist))),page=artist&&pages.get(artist.id);
 if(page&&freshDay(page.date)&&matchKworbTrack(t,page).status==='matched')dates.set(page.date,(dates.get(page.date)||0)+1);
}
const spotifyDate=[...dates].sort((a,b)=>b[1]-a[1]||b[0].localeCompare(a[0]))[0]?.[0];
if(!spotifyDate)throw new Error('No current Kworb daily edition');
const tracks=candidates.map(t=>{
 const artist=artists.get(artistKey(leadingArtist(t.artist))),page=artist&&pages.get(artist.id);
 const hit=!page?{status:'artist-not-tracked'}:!freshDay(page.date)?{status:'stale'}:
   page.date!==spotifyDate?{status:'different-edition'}:matchKworbTrack(t,page);
 const spotify=hit.status==='matched'?{
  status:'matched',daily:hit.daily,total:hit.total,spotifyId:hit.spotifyId,
  matchedTitle:hit.title,matchedArtist:artist.name,date:page.date,sourceUrl:artist.url,
  metric:'kworb-spotify-artist-daily'
 }:{status:hit.status,daily:null,sourceUrl:artist?.url||null,date:page?.date||null};
 return {...t,sourceRanks:{A:t.pos},spotify};
});
const matched=tracks.filter(t=>t.spotify.status==='matched').length;
const fingerprint=createHash('sha256').update(JSON.stringify([apple.sourceDate,spotifyDate,tracks])).digest('hex');
const payload={schema:1,methodology:HYBRID_METHOD,appleDate:apple.sourceDate,spotifyDate,
 capturedAt:new Date().toISOString(),fingerprint,coverage:{candidates:50,matched,unmatched:50-matched,artistPages:pages.size},tracks};
if(!verifiedStreamSeed(payload))throw new Error('Insufficient or invalid Spotify coverage: '+matched+'/50');
let old;try{old=JSON.parse(fs.readFileSync(output,'utf8'));}catch{}
if(old?.appleDate===payload.appleDate&&old?.spotifyDate>payload.spotifyDate)throw new Error('Refusing older Spotify daily edition');
if(old?.appleDate===payload.appleDate&&old.coverage?.matched>matched+5)throw new Error('Unexpected coverage loss; retaining last verified snapshot');
if(old?.fingerprint!==fingerprint)fs.writeFileSync(output,JSON.stringify(payload,null,2)+'\n');
console.log('APPLE_SPOTIFY_STREAMS',JSON.stringify({appleDate:payload.appleDate,spotifyDate,coverage:payload.coverage,
 missing:tracks.filter(t=>t.spotify.status!=='matched').map(t=>({title:t.title,artist:t.artist,status:t.spotify.status}))}));
