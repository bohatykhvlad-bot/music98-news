import fs from "node:fs";
import {createHash} from "node:crypto";
import {mergeKey} from "../functions/lib/chart-identity.js";
import {verifiedDailySeed} from "../functions/lib/daily-chart-sources.js";
import {KWORB_ARTISTS_URL,htmlText,artistKey,leadingArtist,parseKworbArtists,
 parseKworbArtistDaily,matchKworbTrack,freshDay,parseKworbGlobalStreams,matchKworbGlobal}
 from "../functions/lib/apple-spotify-chart.js";
import {verifiedUsStreamSeed,US_HYBRID_METHOD} from "../functions/lib/apple-us-hybrid.js";

const output=new URL("../public/data/apple-spotify-streams.json",import.meta.url);
const read=path=>JSON.parse(fs.readFileSync(new URL("../public/data/"+path,import.meta.url),"utf8"));
const us=verifiedDailySeed(read("apple-us-chart.json"),"U");
const global=verifiedDailySeed(read("apple-chart.json"),"A");
if(!us||!global||us.sourceDate!==global.sourceDate)throw new Error("Two current same-date Apple US and Global snapshots required");
async function text(url){
 let last;
 for(let attempt=0;attempt<3;attempt++){
  try{
   const r=await fetch(url,{headers:{"user-agent":"Mozilla/5.0 (compatible; music98-chart-source/4.0)","cache-control":"no-cache"},
    signal:AbortSignal.timeout(20000)});
   if(!r.ok)throw new Error("HTTP "+r.status+" "+url);
   return await r.text();
  }catch(e){last=e;if(attempt<2)await new Promise(done=>setTimeout(done,1000*(attempt+1)));}
 }
 throw last;
}
const artists=parseKworbArtists(await text(KWORB_ARTISTS_URL));
const globalPage=await text("https://kworb.net/spotify/country/global_daily.html");
if(!/Spotify Daily Chart\s*-\s*Global/i.test(globalPage.slice(0,5000)))throw new Error("Wrong Kworb artist discovery chart");
for(const m of globalPage.matchAll(/<a\b[^>]*href=["']\.\.\/artist\/([A-Za-z0-9]{22})\.html["'][^>]*>([\s\S]*?)<\/a>/gi)){
 const name=htmlText(m[2]),key=artistKey(name);
 if(!artists.has(key))artists.set(key,{name,id:m[1],url:`https://kworb.net/spotify/artist/${m[1]}_songs.html`});
}
// A Global Top-200 chart row can recover a new release absent from an
// artist's all-time listing. Never confuse the chart's Streams metric with
// an artist-page Daily total: preserve the origin on every recovered entry.
let globalStreams=null;
try{globalStreams=parseKworbGlobalStreams(globalPage);}
catch(e){console.warn("Spotify Global chart secondary parser unavailable:",e.message);}
const candidates=us.tracks.slice(0,50);
const globalRanks=new Map(global.tracks.map(t=>[mergeKey(t.title,t.artist),t.pos]));
const credited=t=>String(t.artist||"").split(/\s*(?:,|\s+&\s+|\s+feat\.?\s+|\s+ft\.?\s+|\s+with\s+)\s*/i)
 .map(x=>x.trim()).filter(Boolean).slice(0,4);
const wished=new Map(),candidateArtists=new Map();
for(const t of candidates){
 const matches=credited(t).map(name=>artists.get(artistKey(name))).filter(Boolean);
 candidateArtists.set(t.pos,matches);
 for(const artist of matches)wished.set(artist.id,artist);
}
const jobs=[...wished.values()],pages=new Map();let cursor=0;
await Promise.all(Array.from({length:Math.min(5,jobs.length)},async()=>{
 while(cursor<jobs.length){
  const artist=jobs[cursor++];
  try{pages.set(artist.id,parseKworbArtistDaily(await text(artist.url),artist));}
  catch(e){console.warn("Artist stream page unavailable:",artist.name,String(e?.message||e));}
 }
}));
function evidence(t,date){
 const matches=[];
 for(const artist of candidateArtists.get(t.pos)||[]){
  const page=pages.get(artist.id);
  if(!page||page.date!==date)continue;
  const hit=matchKworbTrack(t,page);
  if(hit.status==="matched")matches.push({daily:hit.daily,total:hit.total,spotifyId:hit.spotifyId,
   matchedTitle:hit.title,matchedArtist:artist.name,sourceUrl:artist.url,metric:"kworb-spotify-artist-daily"});
 }
 const unique=new Set(matches.map(x=>x.spotifyId));
 if(unique.size===1&&matches.length){
  // The first credited performer is preferred on a shared-track artist page.
  return {status:"matched",...matches[0]};
 }
 if(unique.size>1)return {status:"ambiguous"};
 if(globalStreams?.date===date){
  const track=matchKworbGlobal(t,globalStreams);
  if(track)return {status:"matched",daily:track.daily,total:null,spotifyId:track.spotifyId,
   matchedTitle:track.title,matchedArtist:track.artist,sourceUrl:"https://kworb.net/spotify/country/global_daily.html",
   metric:"kworb-spotify-chart-global-daily"};
 }
 return null;
}
// Pick the single current Spotify edition with the most matched US candidates;
// mixed dates are never silently merged into a single day's rankings.
const dateCounts=new Map();
const days=new Set([...pages.values()].map(p=>p.date));
if(globalStreams)days.add(globalStreams.date);
for(const day of days){
 if(!freshDay(day))continue;
 const count=candidates.filter(t=>evidence(t,day)?.status==="matched").length;
 dateCounts.set(day,count);
}
const spotifyDate=[...dateCounts].sort((a,b)=>b[1]-a[1]||b[0].localeCompare(a[0]))[0]?.[0];
if(!spotifyDate)throw new Error("No current Spotify edition");
const tracks=candidates.map(t=>{
 const hit=evidence(t,spotifyDate);
 const available=(candidateArtists.get(t.pos)||[]).map(a=>pages.get(a.id)).filter(Boolean);
 const status=hit?.status||(available.some(p=>p.date!==spotifyDate)?"different-edition":
  available.length?"track-not-found":"artist-not-tracked");
 const spotify=hit?.status==="matched"?
  {...hit,date:spotifyDate,status:"matched"}:
  {status,daily:null,date:null,sourceUrl:null};
 return {...t,sourceRanks:{U:t.pos,A:globalRanks.get(mergeKey(t.title,t.artist))??null},spotify};
});
const matched=tracks.filter(t=>t.spotify.status==="matched").length;
const fingerprint=createHash("sha256").update(JSON.stringify([us.sourceDate,global.sourceDate,spotifyDate,tracks])).digest("hex");
const payload={schema:2,methodology:US_HYBRID_METHOD,
 appleUsDate:us.sourceDate,appleGlobalDate:global.sourceDate,spotifyDate,
 capturedAt:new Date().toISOString(),fingerprint,
 coverage:{candidates:50,matched,unmatched:50-matched,artistPages:pages.size,
  chartFallback:tracks.filter(t=>t.spotify.status==="matched"&&t.spotify.metric==="kworb-spotify-chart-global-daily").length},
 tracks};
if(!verifiedUsStreamSeed(payload))throw new Error("Insufficient or invalid Spotify coverage: "+matched+"/50");
let old;try{old=read("apple-spotify-streams.json");}catch{}
if(old?.appleUsDate===payload.appleUsDate&&old?.spotifyDate>payload.spotifyDate)
 throw new Error("Refusing older Spotify edition");
if(old?.appleUsDate===payload.appleUsDate&&old.coverage?.matched>matched+5)
 throw new Error("Unexpected US coverage loss; retaining last verified snapshot");
if(old?.fingerprint!==fingerprint)fs.writeFileSync(output,JSON.stringify(payload,null,2)+"\n");
console.log("APPLE_US_GLOBAL_SPOTIFY",JSON.stringify({appleUsDate:us.sourceDate,spotifyDate,
 coverage:payload.coverage,missing:tracks.filter(t=>t.spotify.status!=="matched")
 .map(t=>({title:t.title,artist:t.artist,status:t.spotify.status}))}));
