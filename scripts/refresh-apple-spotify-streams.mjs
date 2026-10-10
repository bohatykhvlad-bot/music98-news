import fs from "node:fs";
import {createHash} from "node:crypto";
import {mergeKey} from "../functions/lib/chart-identity.js";
import {verifiedDailySeed} from "../functions/lib/daily-chart-sources.js";
import {KWORB_ARTISTS_URL,artistKey,htmlText,leadingArtist,parseKworbArtists,
 parseKworbArtistDaily,matchKworbTrack,freshDay,parseKworbGlobalStreams}
 from "../functions/lib/apple-spotify-chart.js";
import {TRI_METHOD,verifiedTriSeed,songIdentity} from "../functions/lib/tri-source-chart.js";

const OUT=new URL("../public/data/apple-spotify-streams.json",import.meta.url);
const read=name=>JSON.parse(fs.readFileSync(new URL("../public/data/"+name,import.meta.url),"utf8"));
const us=verifiedDailySeed(read("apple-us-chart.json"),"U");
const global=verifiedDailySeed(read("apple-chart.json"),"A");
if(!us||!global||us.sourceDate!==global.sourceDate)
 throw new Error("Two current same-date Apple US and Global Top 100 snapshots required");
async function requestText(url){
 let error;
 for(let attempt=0;attempt<3;attempt++){
  try{
   const r=await fetch(url,{headers:{"user-agent":"Mozilla/5.0 (compatible; music98-chart-collector/5.0)","cache-control":"no-cache"},
    signal:AbortSignal.timeout(18000)});
   if(!r.ok)throw new Error("HTTP "+r.status+" "+url);
   return await r.text();
  }catch(e){error=e;if(attempt<2)await new Promise(resolve=>setTimeout(resolve,1000*(attempt+1)));}
 }
 throw error;
}
const [globalPage,artistIndex]=await Promise.all([
 requestText("https://kworb.net/spotify/country/global_daily.html"),
 requestText(KWORB_ARTISTS_URL)
]);
const chart=parseKworbGlobalStreams(globalPage);
if(!freshDay(chart.date)||chart.tracks.length<100)
 throw new Error("Spotify Global daily chart is incomplete or stale");
const artists=parseKworbArtists(artistIndex);
// Use chart artist URLs to discover recently charting performers who are
// missing from the all-time artist index.
for(const m of globalPage.matchAll(/<a\b[^>]*href=["']\.\.\/artist\/([A-Za-z0-9]{22})\.html["'][^>]*>([\s\S]*?)<\/a>/gi)){
 const name=htmlText(m[2]),key=artistKey(name);
 if(!artists.has(key))artists.set(key,{name,id:m[1],
  url:`https://kworb.net/spotify/artist/${m[1]}_songs.html`});
}

const candidates=new Map(),rankSets={U:new Set(),A:new Set(),S:new Set()};
function admit(t,source,rank){
 if(!t?.title||!t?.artist||!Number.isInteger(rank))throw new Error("invalid_"+source+"_candidate");
 const key=songIdentity(t.title,t.artist);
 if(!key)throw new Error("unidentifiable_candidate_"+source+"_"+rank);
 let item=candidates.get(key);
 if(!item){
  item={title:t.title,artist:t.artist,url:t.url||"",art:t.art||"",year:t.year||"",prev:"",
   sourceRanks:{U:null,A:null,S:null},spotify:{status:"unavailable",daily:null,reason:"not-in-spotify-daily-chart"}};
  candidates.set(key,item);
 }
 if(item.sourceRanks[source]!==null)throw new Error("duplicate_"+source+"_song:"+key);
 if(rankSets[source].has(rank))throw new Error("duplicate_"+source+"_rank:"+rank);
 rankSets[source].add(rank);item.sourceRanks[source]=rank;
 // Apple song metadata is authoritative; Spotify names can include "w/".
 if(source==="U"||(source==="A"&&!item.url)){
  item.title=t.title;item.artist=t.artist;item.url=t.url||item.url;
  item.art=t.art||item.art;item.year=t.year||item.year;
 }
 if(source==="S"){
  if(!/^[A-Za-z0-9]{22}$/.test(t.spotifyId||"")||
    !Number.isSafeInteger(t.daily)||t.daily<0)
   throw new Error("Spotify global source has no track ID or daily streams at rank "+rank);
  item.spotify={status:"matched",daily:t.daily,spotifyId:t.spotifyId,
   total:null,date:chart.date,sourceUrl:"https://kworb.net/spotify/country/global_daily.html",
   metric:"kworb-spotify-chart-global-daily",matchedTitle:t.title,matchedArtist:t.artist};
 }
 return item;
}
us.tracks.forEach(t=>admit(t,"U",t.pos));
global.tracks.forEach(t=>admit(t,"A",t.pos));
// Spotify Top 200 is a FULL candidate provider, not merely a correction.
chart.tracks.slice(0,200).forEach(t=>admit(t,"S",t.pos));
if(rankSets.U.size!==100||rankSets.A.size!==100||rankSets.S.size<100)
 throw new Error("Incomplete chart source ranks");

const credited=t=>String(t.artist||"").split(/\s*(?:,|\s+&\s+|\s+feat\.?\s+|\s+ft\.?\s+|\s+with\s+)\s*/i)
 .map(x=>x.trim()).filter(Boolean).slice(0,4);
const requested=new Map(), candidateArtists=new Map();
// Recover independently measurable Apple-only tracks without converting
// lifetime totals or regional Spotify USA chart values into Global daily.
for(const [key,t] of candidates){
 if(t.spotify.status==="matched")continue;
 const ids=credited(t).map(name=>artists.get(artistKey(name))).filter(Boolean);
 candidateArtists.set(key,ids);
 for(const artist of ids)requested.set(artist.id,artist);
}
let cursor=0,artistErrors=0;const pages=new Map(),jobs=[...requested.values()];
await Promise.all(Array.from({length:Math.min(6,jobs.length)},async()=>{
 while(cursor<jobs.length){
  const artist=jobs[cursor++];
  try{pages.set(artist.id,parseKworbArtistDaily(await requestText(artist.url),artist));}
  catch(e){artistErrors++;console.warn("SPOTIFY_ARTIST_RECOVERY_FAILED",artist.name,String(e?.message||e));}
 }
}));
let artistRecovered=0;
for(const [key,t] of candidates){
 if(t.spotify.status==="matched")continue;
 const hits=[];
 for(const artist of candidateArtists.get(key)||[]){
  const page=pages.get(artist.id);
  if(page?.date!==chart.date)continue;
  const match=matchKworbTrack(t,page);
  if(match.status==="matched")hits.push({...match,artist});
 }
 const distinct=new Set(hits.map(h=>h.spotifyId));
 if(distinct.size!==1)continue;
 const hit=hits[0];
 // Never use the same Spotify recording twice under different Apple titles.
 if([...candidates.values()].some(other=>other!==t&&
   other.spotify.status==="matched"&&other.spotify.spotifyId===hit.spotifyId))continue;
 t.spotify={status:"matched",daily:hit.daily,spotifyId:hit.spotifyId,total:hit.total,
  date:chart.date,sourceUrl:hit.artist.url,metric:"kworb-spotify-artist-daily",
  matchedTitle:hit.title,matchedArtist:hit.artist.name};
 artistRecovered++;
}
const tracks=[...candidates.values()];
const matched=tracks.filter(t=>t.spotify.status==="matched").length;
const missing=tracks.length-matched;
const fingerprint=createHash("sha256").update(JSON.stringify([
 us.sourceDate,global.sourceDate,chart.date,tracks])).digest("hex");
const payload={schema:3,methodology:TRI_METHOD,
 appleUsDate:us.sourceDate,appleGlobalDate:global.sourceDate,spotifyDate:chart.date,
 capturedAt:new Date().toISOString(),fingerprint,
 sourceSizes:{U:100,A:100,S:rankSets.S.size},
 coverage:{candidates:tracks.length,matched,unmatched:missing,
  spotifyChart:rankSets.S.size,artistRecovered,artistPages:pages.size,artistErrors},
 tracks};
if(!verifiedTriSeed(payload))throw new Error("Invalid union or fewer than 50 verified streams: "+matched+"/"+tracks.length);
let old=null;try{old=read("apple-spotify-streams.json");}catch{}
if(old?.schema===3&&old?.spotifyDate>chart.date)throw new Error("Refusing earlier Spotify edition");
if(old?.schema===3&&old?.appleUsDate===us.sourceDate&&old.coverage.matched>matched+8)
 throw new Error("Unexpected coverage regression, retaining previous verified snapshot");
if(old?.fingerprint!==fingerprint){
 const tmp=new URL("../public/data/.apple-spotify-streams.tmp",import.meta.url);
 fs.writeFileSync(tmp,JSON.stringify(payload,null,2)+"\n");
 fs.renameSync(tmp,OUT);
}
console.log("TRI_SOURCE_COLLECTOR",JSON.stringify({
 appleDate:us.sourceDate,spotifyDate:chart.date,candidates:tracks.length,matched,
 missing,spotifyChart:rankSets.S.size,artistRecovered,artistErrors,
 candidateIntersection:tracks.filter(t=>t.sourceRanks.U!==null&&t.sourceRanks.A!==null&&t.sourceRanks.S!==null).length
}));
