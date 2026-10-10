import fs from "node:fs";
import {createHash} from "node:crypto";
import {datedChartPath,verifiedDatedApple,verifiedDatedSpotify} from "../functions/lib/chart-history.js";
import {KWORB_ARTISTS_URL,artistKey,htmlText,parseKworbArtists,
 parseKworbArtistDaily,matchKworbTrack,freshDay,parseKworbGlobalStreams} from "../functions/lib/apple-spotify-chart.js";
import {TRI_METHOD,verifiedTriSeed,songIdentity} from "../functions/lib/tri-source-chart.js";

const ROOT=new URL("../public/data/",import.meta.url);
const OUT=new URL("apple-spotify-streams.json",ROOT);
const load=name=>JSON.parse(fs.readFileSync(new URL(name,ROOT),"utf8"));
const archive=(kind,date)=>datedChartPath(kind,date);
const loadArchive=(kind,date,verify)=>{
 const path=archive(kind,date);
 if(!fs.existsSync(new URL(path,ROOT)))return null;
 return verify(load(path),date);
};
async function requestText(url){
 let error;
 for(let attempt=0;attempt<3;attempt++){
  try{
   const r=await fetch(url,{headers:{"user-agent":"Mozilla/5.0 (compatible; music98-chart-source/6.0)",
    "cache-control":"no-cache"},signal:AbortSignal.timeout(18000)});
   if(!r.ok)throw new Error("HTTP "+r.status+" "+url);
   return await r.text();
  }catch(e){error=e;if(attempt<2)await new Promise(done=>setTimeout(done,1000*(attempt+1)));}
 }
 throw error;
}

// Archive Spotify under its true publication date. Never blend the two-day-old
// Spotify chart with the present day's Apple playlist positions.
const [globalPage,artistIndex]=await Promise.all([
 requestText("https://kworb.net/spotify/country/global_daily.html"),
 requestText(KWORB_ARTISTS_URL)
]);
const latest=parseKworbGlobalStreams(globalPage);
if(!freshDay(latest.date)||latest.tracks.length!==200)
 throw new Error("Spotify Top 200 incomplete or older than two UTC days");
const latestArchive=archive("spotify-global",latest.date);
if(!fs.existsSync(new URL(latestArchive,ROOT))){
 const snap={schema:1,source:"kworb-spotify-global-daily",
  date:latest.date,region:"global",cadence:"daily",
  sourceUrl:"https://kworb.net/spotify/country/global_daily.html",
  capturedAt:new Date().toISOString(),
  tracks:latest.tracks.map(x=>({
   pos:x.pos,title:x.title,artist:x.artist,spotifyId:x.spotifyId,daily:x.daily
  }))};
 if(!verifiedDatedSpotify(snap,latest.date))
  throw new Error("Spotify chart has incomplete IDs, ranks or daily counters");
 fs.writeFileSync(new URL(latestArchive,ROOT),JSON.stringify(snap,null,2)+"\n");
}

const utcDate=new Date().toISOString().slice(0,10),ms=Date.parse(utcDate+"T00:00:00Z");
let chosen=null,us=null,global=null,spotify=null;
for(let lag=0;lag<=2;lag++){
 const day=new Date(ms-lag*86400000).toISOString().slice(0,10);
 if(day>latest.date)continue;
 const U=loadArchive("apple-us",day,(v,d)=>verifiedDatedApple(v,"U",d));
 const A=loadArchive("apple-global",day,(v,d)=>verifiedDatedApple(v,"A",d));
 const S=loadArchive("spotify-global",day,verifiedDatedSpotify);
 if(U&&A&&S){chosen=day;us=U;global=A;spotify=S;break;}
}
if(!chosen)throw new Error("No COMMON dated Apple US, Apple Global and Spotify edition. Keep previous chart.");
if(us.sourceDate!==spotify.date||global.sourceDate!==spotify.date)
 throw new Error("Mixed-date source ranking refused");

const artists=parseKworbArtists(artistIndex);
for(const m of globalPage.matchAll(/<a\b[^>]*href=["']\.\.\/artist\/([A-Za-z0-9]{22})\.html["'][^>]*>([\s\S]*?)<\/a>/gi)){
 const name=htmlText(m[2]),key=artistKey(name);
 if(!artists.has(key))artists.set(key,{name,id:m[1],
  url:"https://kworb.net/spotify/artist/"+m[1]+"_songs.html"});
}
const candidates=new Map(),sets={U:new Set(),A:new Set(),S:new Set()};
function admit(t,source,rank){
 if(!t?.title||!t?.artist||!Number.isInteger(rank))throw new Error("invalid_chart_row_"+source+":"+rank);
 const key=songIdentity(t.title,t.artist);
 if(!key)throw new Error("unidentifiable_"+source+":"+rank);
 let item=candidates.get(key);
 if(!item){
  item={title:t.title,artist:t.artist,url:t.url||"",art:t.art||"",
   year:t.year||"",prev:"",sourceRanks:{U:null,A:null,S:null},
   spotify:{status:"unavailable",daily:null,reason:"not-in-matched-spotify-global-edition"}};
  candidates.set(key,item);
 }
 if(item.sourceRanks[source]!==null||sets[source].has(rank))
  throw new Error("duplicate_source_song_or_rank_"+source+":"+rank);
 sets[source].add(rank);item.sourceRanks[source]=rank;
 if(source==="U"||(source==="A"&&(!item.art||!item.url))){
  item.title=t.title;item.artist=t.artist;item.url=t.url||item.url;
  item.art=t.art||item.art;item.year=t.year||item.year;
 }
 if(source==="S"){
  item.spotify={status:"matched",daily:t.daily,spotifyId:t.spotifyId,
   total:null,date:chosen,sourceUrl:"https://kworb.net/spotify/country/global_daily.html",
   metric:"kworb-spotify-chart-global-daily",matchedTitle:t.title,matchedArtist:t.artist};
 }
 return item;
}
us.tracks.forEach(t=>admit(t,"U",t.pos));
global.tracks.forEach(t=>admit(t,"A",t.pos));
spotify.tracks.forEach(t=>admit(t,"S",t.pos));
if(sets.U.size!==100||sets.A.size!==global.tracks.length||sets.S.size!==200)
 throw new Error("Daily source set incomplete for "+chosen);

const credited=t=>String(t.artist||"").split(/\s*(?:,|\s+&\s+|\s+feat\.?\s+|\s+ft\.?\s+|\s+with\s+)\s*/i)
 .map(x=>x.trim()).filter(Boolean).slice(0,4);
const wanted=new Map(),candidateArtists=new Map(),pages=new Map();
let recovered=0,artistErrors=0;
// Artist pages expose their latest edition only; never use a later day's
// artist counter for an earlier dated Spotify chart.
if(chosen===latest.date){
 for(const [key,t] of candidates){
  if(t.spotify.status==="matched")continue;
  const possible=credited(t).map(name=>artists.get(artistKey(name))).filter(Boolean);
  candidateArtists.set(key,possible);
  for(const artist of possible)wanted.set(artist.id,artist);
 }
 const jobs=[...wanted.values()];let cursor=0;
 await Promise.all(Array.from({length:Math.min(6,jobs.length)},async()=>{
  while(cursor<jobs.length){
   const artist=jobs[cursor++];
   try{pages.set(artist.id,parseKworbArtistDaily(await requestText(artist.url),artist));}
   catch(e){artistErrors++;console.warn("ARTIST_DAILY_UNAVAILABLE",artist.name,String(e?.message||e));}
  }
 }));
 for(const [key,t] of candidates){
  if(t.spotify.status==="matched")continue;
  const hits=[];
  for(const artist of candidateArtists.get(key)||[]){
   const page=pages.get(artist.id);
   if(page?.date!==chosen)continue;
   const match=matchKworbTrack(t,page);
   if(match.status==="matched")hits.push({...match,artist});
  }
  const ids=new Set(hits.map(h=>h.spotifyId));
  if(ids.size!==1)continue;
  const hit=hits[0];
  if([...candidates.values()].some(other=>other!==t&&
    other.spotify.status==="matched"&&other.spotify.spotifyId===hit.spotifyId))continue;
  t.spotify={status:"matched",daily:hit.daily,spotifyId:hit.spotifyId,total:hit.total,
   date:chosen,sourceUrl:hit.artist.url,metric:"kworb-spotify-artist-daily",
   matchedTitle:hit.title,matchedArtist:hit.artist.name};
  recovered++;
 }
}
const tracks=[...candidates.values()];
const matched=tracks.filter(t=>t.spotify.status==="matched").length;
const fingerprint=createHash("sha256").update(JSON.stringify([chosen,chosen,chosen,tracks])).digest("hex");
const payload={schema:3,methodology:TRI_METHOD,
 appleUsDate:chosen,appleGlobalDate:chosen,spotifyDate:chosen,
 capturedAt:new Date().toISOString(),fingerprint,
 archiveProvenance:{
  U:{source:us.source,url:us.sourceUrl,rows:us.tracks.length},
  A:{source:global.source,url:global.sourceUrl,rows:global.tracks.length},
  S:{source:spotify.source,url:spotify.sourceUrl,rows:spotify.tracks.length}
 },
 sourceSizes:{U:us.tracks.length,A:global.tracks.length,S:spotify.tracks.length},
 coverage:{candidates:tracks.length,matched,unmatched:tracks.length-matched,
  spotifyChart:200,artistRecovered:recovered,artistPages:pages.size,artistErrors},
 tracks};
if(!verifiedTriSeed(payload))throw new Error("No complete verified SAME-DAY chart: "+chosen+" "+matched+"/"+tracks.length);
let old=null;try{old=load("apple-spotify-streams.json");}catch{}
if(old?.schema===3 && old.spotifyDate>chosen)
 throw new Error("Refusing to roll back a later published edition");
if(old?.schema===3&&old.spotifyDate===chosen&&old.coverage?.matched>matched+8)
 throw new Error("Unexpected lost Spotify coverage on same chart date");
if(old?.fingerprint!==fingerprint){
 const tmp=new URL(".apple-spotify-streams.tmp",ROOT);
 fs.writeFileSync(tmp,JSON.stringify(payload,null,2)+"\n");
 fs.renameSync(tmp,OUT);
}
console.log("TRI_SOURCE_DATE_ALIGNED",JSON.stringify({
 editionDate:chosen,latestSpotifyDate:latest.date,appleUsRows:us.tracks.length,
 appleGlobalRows:global.tracks.length,spotifyRows:spotify.tracks.length,
 candidates:tracks.length,matched,missing:tracks.length-matched,
 artistRecovered:recovered,appleSource:us.source,
 allDatesEqual:payload.appleUsDate===payload.appleGlobalDate&&payload.spotifyDate===payload.appleUsDate
}));
