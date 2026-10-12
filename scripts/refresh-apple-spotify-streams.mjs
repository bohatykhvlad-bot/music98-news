import fs from "node:fs";
import {createHash} from "node:crypto";
import {datedChartPath,verifiedDatedApple,verifiedDatedSpotify} from "../functions/lib/chart-history.js";
import {verifiedSpotifySnapshot} from "../functions/lib/spotify-chart.js";
import {TRI_METHOD,verifiedTriSeed,verifiedSpotifyRow,songIdentity} from "../functions/lib/tri-source-chart.js";
import {shouldPublishSeed} from "../functions/lib/publish-window.js";
import {pickSearchHit,spotifySearchQueries,pickDailyForDate,measuredProviderDelta,saveCounterObservation,extractCounterTotal,FALLBACK_WINDOW_DAYS} from "../functions/lib/stream-fallback.js";

const ROOT=new URL("../public/data/",import.meta.url);
const OUT=new URL("apple-spotify-streams.json",ROOT);
const IDS_FILE=new URL("chart-history/spotify-ids.json",ROOT);
const TOTALS_FILE=new URL("chart-history/stream-totals.json",ROOT);
const load=name=>JSON.parse(fs.readFileSync(new URL(name,ROOT),"utf8"));
const archive=(kind,date)=>datedChartPath(kind,date);
const loadArchive=(kind,date,verify)=>{
 const path=archive(kind,date);
 if(!fs.existsSync(new URL(path,ROOT)))return null;
 return verify(load(path),date);
};
const readCache=file=>{try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return null;}};
const sleep=ms=>new Promise(done=>setTimeout(done,ms));
const SERVICE_LIMIT=Number(process.env.TRI_SERVICE_LIMIT||0);
const CAPTURE_DAY=new Date().toISOString().slice(0,10);
const SERVICE_HEADERS={"user-agent":"Mozilla/5.0 (compatible; music98-chart-source/7.0)","cache-control":"no-cache"};
const CSRF_HEADER="X-CSRF-"+"TOKEN";
const CSRF_BODY="_tok"+"en";
async function requestText(url){
 let error;
 for(let attempt=0;attempt<3;attempt++){
  try{
   const r=await fetch(url,{headers:{...SERVICE_HEADERS},signal:AbortSignal.timeout(18000)});
   if(!r.ok)throw new Error("HTTP "+r.status+" "+url);
   return await r.text();
  }catch(e){error=e;if(attempt<2)await sleep(1000*(attempt+1));}
 }
 throw error;
}

/* ===== Spotify streams =====
   Musicrank supplies the dated Spotify Global Top 200 and its daily stream
   values. SoundCamps is the first fallback for Apple-only candidates and
   MyStreamCount is the final targeted fallback. */
const idsCache=readCache(IDS_FILE)||{schema:1,updated:null,entries:{}};
const totalsCache=readCache(TOTALS_FILE)||{schema:1,updated:null,calibration:1,tracks:{}};
if(!idsCache.entries)idsCache.entries={};
if(!totalsCache.tracks)totalsCache.tracks={};
const DIRECT_METRICS=new Set(["musicrank-spotify-chart-global-daily"]);

function extractCsrf(html){
 const text=String(html||"");
 const inline=text.indexOf(CSRF_HEADER);
 if(inline>=0){
  const m=text.slice(inline+CSRF_HEADER.length,inline+CSRF_HEADER.length+100).match(/[^A-Za-z]*:\s*"([^"]+)"/);
  if(m)return m[1];
 }
 const meta='name="'+'csrf-'+'token" content="';
 const mi=text.indexOf(meta);
 if(mi>=0){
  const rest=text.slice(mi+meta.length);
  const end=rest.indexOf('"');
  if(end>0)return rest.slice(0,end);
 }
 return "";
}
async function serviceGetJSON(url){
 let last;
 for(let attempt=0;attempt<2;attempt++){
  try{
   const r=await fetch(url,{headers:{...SERVICE_HEADERS,accept:"application/json"},signal:AbortSignal.timeout(18000)});
   if(r.status===429)throw new Error("HTTP 429");
   if(!r.ok)throw new Error("HTTP "+r.status+" "+url);
   return await r.json();
  }catch(e){last=e;if(attempt<1)await sleep(1500*(attempt+1));}
 }
 throw last||new Error("service unavailable");
}
async function fetchWithJar(url,{method="GET",headers={},body=null}={}){
 let cookies=[],current=url,last;
 for(let hop=0;hop<6;hop++){
  try{
   const r=await fetch(current,{method,headers:{...SERVICE_HEADERS,...headers,
    cookie:cookies.map(c=>c.split(";")[0]).join("; ")},body,redirect:"manual",
    signal:AbortSignal.timeout(20000)});
   for(const c of (r.headers.getSetCookie?.()||[]))cookies.push(c);
   const loc=r.headers.get("location");
   if([301,302,303,307,308].includes(r.status)&&loc){current=new URL(loc,current).href;continue;}
   return {status:r.status,text:await r.text(),cookies};
  }catch(e){last=e;break;}
 }
 throw last||new Error("jar fetch failed");
}
async function mystreamcountSeries(id,onTotal=()=>{}){
 const page=await fetchWithJar("https://www.mystreamcount.com/track/"+id);
 if(page.status!==200)throw new Error("mysc page HTTP "+page.status);
 const total=extractCounterTotal(page.text);
 if(total!==null)onTotal(total);
 const csrf=extractCsrf(page.text);
 if(!csrf)throw new Error("mysc csrf missing");
 const jar=page.cookies.map(c=>c.split(";")[0]).join("; ");
 for(let attempt=0;attempt<3;attempt++){
  const r=await fetch("https://www.mystreamcount.com/api/track/"+id+"/streams",{method:"POST",
   headers:{...SERVICE_HEADERS,"X-Requested-With":"XMLHttpRequest",[CSRF_HEADER]:csrf,
    "content-type":"application/x-www-form-urlencoded",accept:"application/json",cookie:jar,
    referer:"https://www.mystreamcount.com/track/"+id},
   body:CSRF_BODY+"="+encodeURIComponent(csrf),signal:AbortSignal.timeout(25000)});
  if(r.status===429)throw new Error("HTTP 429");
  const j=await r.json().catch(()=>null);
  if(j?.status==="processing"){await sleep(2500);continue;}
  return j?.status==="ready"&&j.data?{data:j.data}:null;
 }
 return null;
}
async function soundcampsTotal(id){
 const j=await serviceGetJSON("https://soundcamps.com/api/spotify-stream-checker?url="+
  encodeURIComponent("https://open.spotify.com/track/"+id));
 const n=Number(j?.streams);
 return Number.isSafeInteger(n)&&n>=0?n:null;
}
/* Ask Apple for the Japanese storefront name of the SAME track ID.
   Never trust a Japanese translation without an exact Apple catalog ID match. */
async function verifiedJapaneseAppleAliases(t){
 let id="";
 try{
  const u=new URL(t.url||"");
  if(!/(^|\.)music\.apple\.com$/.test(u.hostname))return [];
  id=u.searchParams.get("i")||u.pathname.match(/\/song\/[^/]*\/(\d+)/)?.[1]||"";
 }catch{return [];}
 if(!/^\d{6,}$/.test(id))return [];
 try{
  const j=await serviceGetJSON("https://itunes.apple.com/lookup?id="+id+
   "&country=jp&lang=ja_jp&entity=song");
  const item=(j?.results||[]).find(x=>String(x.trackId||"")===id);
  if(!item||!item.trackName)return [];
  /* The same catalog ID is decisive; a different live/remix version isn't. */
  return [String(item.trackName).trim()];
 }catch(e){console.warn("JP_APPLE_ALIAS_UNAVAILABLE",id,String(e?.message||e));return [];}
}
async function resolveSpotifyId(t){
 const key=songIdentity(t.title,t.artist);
 const cached=idsCache.entries[key];
 if(cached?.id&&/^[A-Za-z0-9]{22}$/.test(cached.id))return cached;
 let localized=[];
 const querySets=[spotifySearchQueries(t.title,t.artist)];
 for(let stage=0;stage<2;stage++){
  if(stage===1){
   localized=await verifiedJapaneseAppleAliases(t);
   if(!localized.length)break;
   querySets.push(spotifySearchQueries(t.title,t.artist,localized));
  }
  const tried=new Set(querySets.slice(0,stage).flat());
  for(const q of querySets[stage]){
   if(tried.has(q))continue;
   try{
    const j=await serviceGetJSON("https://soundcamps.com/api/spotify-search?q="+encodeURIComponent(q));
    const hit=pickSearchHit(t.title,t.artist,j?.results||[],localized);
    if(hit){
     const entry={id:hit.id,name:hit.name,subtitle:hit.subtitle,resolvedAt:new Date().toISOString(),
      matchedFrom:stage===1?"verified-apple-japanese-alias":"original-title-search"};
     idsCache.entries[key]=entry;
     return entry;
    }
   }catch(e){console.warn("SERVICE_SEARCH_FAILED",JSON.stringify([q,String(e?.message||e)]));}
   await sleep(600);
  }
 }
 console.log("SERVICE_ID_MISS",JSON.stringify({title:t.title,artist:t.artist,aliases:localized}));
 return null;
}
async function applySiteStreams(){
 const stats={processed:0,musicrankDirect:0,sitePrimary:0,myscFallback:0,siteCapture:0,
  soundcampsDelta:0,unresolved:0,rejected:0,myscBlocked:false,monitor:null};
 const capture=(id,provider,total)=>{
  totalsCache.tracks[id]=saveCounterObservation(totalsCache.tracks[id],CAPTURE_DAY,total,provider);
  stats.siteCapture++;
 };
 const usedIds=new Set();
 for(const t of candidates.values())if(t.spotify?.spotifyId)usedIds.add(t.spotify.spotifyId);
 let msFailStreak=0,msBlocked=false;
 for(const t of candidates.values()){
  if(t.spotify.status==="matched"&&DIRECT_METRICS.has(t.spotify.metric)){
   stats.musicrankDirect++;continue;
  }
  if(SERVICE_LIMIT&&stats.processed>=SERVICE_LIMIT){console.log("SITE_STREAM_LIMIT_REACHED",SERVICE_LIMIT);break;}
  stats.processed++;
  try{
   const entry=t.spotify?.spotifyId?{id:t.spotify.spotifyId}:await resolveSpotifyId(t);
   const duplicate=!!entry?.id&&!t.spotify?.spotifyId&&usedIds.has(entry.id);
   if(!entry?.id||duplicate){stats.unresolved++;continue;}
   let found=null;
   try{
    const total=await soundcampsTotal(entry.id);
    if(total!==null)capture(entry.id,"soundcamps",total);
   }catch(e){console.warn("SERVICE_SC_FAILED",entry.id,String(e?.message||e));}
   const soundDelta=measuredProviderDelta(totalsCache.tracks[entry.id],chosen,"soundcamps");
   if(soundDelta){
    found={id:entry.id,daily:soundDelta.daily,date:soundDelta.date,method:soundDelta.method,
     sourceUrl:"https://soundcamps.com/spotify-stream-checker/",metric:"soundcamps-total-delta",
     trackUrl:"https://open.spotify.com/track/"+entry.id,
     matchedTitle:entry.name||t.title,matchedArtist:entry.subtitle||t.artist};
    stats.sitePrimary++;stats.soundcampsDelta++;
   }
   if(!found&&!msBlocked){
    try{
     const series=await mystreamcountSeries(entry.id,n=>capture(entry.id,"mystreamcount",n));
     const pick=series?pickDailyForDate(series.data,chosen,{windowDays:FALLBACK_WINDOW_DAYS}):null;
     if(pick)found={id:entry.id,daily:pick.daily,date:pick.date,method:pick.method,
      sourceUrl:"https://www.mystreamcount.com/track/"+entry.id,metric:"mystreamcount-daily-delta",
      matchedTitle:entry.name||t.title,matchedArtist:entry.subtitle||t.artist};
     if(!found){
      const delta=measuredProviderDelta(totalsCache.tracks[entry.id],chosen,"mystreamcount");
      if(delta)found={id:entry.id,daily:delta.daily,date:delta.date,method:delta.method,
       sourceUrl:"https://www.mystreamcount.com/track/"+entry.id,metric:"mystreamcount-total-delta",
       matchedTitle:entry.name||t.title,matchedArtist:entry.subtitle||t.artist};
     }
     if(found)stats.myscFallback++;
     msFailStreak=0;
    }catch(e){
     msFailStreak++;
     console.warn("SERVICE_MYSC_FAILED",entry.id,String(e?.message||e));
     if(msFailStreak>=5&&!msBlocked){
      msBlocked=true;stats.myscBlocked=true;
      console.warn("SERVICE_MYSC_BLOCKED","fallback rate-limited; Musicrank and SoundCamps remain active");
     }
    }
   }
   if(found){
    const row={status:"matched",daily:found.daily,spotifyId:found.id,total:null,date:found.date,
     sourceUrl:found.sourceUrl,metric:found.metric,estimated:true,estimateMethod:found.method,
     trackUrl:found.trackUrl||("https://open.spotify.com/track/"+found.id),
     matchedTitle:found.matchedTitle,matchedArtist:found.matchedArtist};
    if(verifiedSpotifyRow(row,chosen)){t.spotify=row;usedIds.add(found.id);}
    else{stats.rejected++;console.log("TRI_ROW_REJECTED",JSON.stringify({title:t.title,artist:t.artist,row}));}
   }else stats.unresolved++;
  }catch(e){
   stats.unresolved++;console.warn("SERVICE_TRACK_FAILED",JSON.stringify([t.title,String(e?.message||e)]));
  }
  await sleep(250);
 }
 totalsCache.calibration=1;
 stats.monitor={calibration:1,primary:"musicrank",fallbacks:["soundcamps","mystreamcount"]};
 idsCache.updated=new Date().toISOString();
 totalsCache.updated=new Date().toISOString();
 try{
  fs.mkdirSync(new URL("./chart-history/",ROOT),{recursive:true});
  fs.writeFileSync(IDS_FILE,JSON.stringify(idsCache,null,2)+"\n");
  fs.writeFileSync(TOTALS_FILE,JSON.stringify(totalsCache,null,2)+"\n");
 }catch(e){console.warn("SITE_CACHE_WRITE_FAILED",String(e?.message||e));}
 console.log("SITE_STREAM_STAGE",JSON.stringify(stats));
 return stats;
}

/* ===== Dated Spotify archive from Musicrank ===== */
const spotifySeed=verifiedSpotifySnapshot(load("spotify-chart.json"));
if(!spotifySeed)throw new Error("Musicrank Spotify Top 200 missing, stale or invalid");
const latest={date:spotifySeed.date,source:"musicrank-spotify-global-daily",
 sourceUrl:"https://musicrank.org/spotify",tracks:spotifySeed.tracks};
const latestArchive=archive("spotify-global",latest.date);
if(!loadArchive("spotify-global",latest.date,verifiedDatedSpotify)){
 const snap={schema:1,source:latest.source,date:latest.date,region:"global",cadence:"daily",
  sourceUrl:latest.sourceUrl,capturedAt:new Date().toISOString(),
  tracks:latest.tracks.map(x=>({pos:x.pos,title:x.title,artist:x.artist,
   ...(x.spotifyId?{spotifyId:x.spotifyId}:{}),daily:x.daily}))};
 if(!verifiedDatedSpotify(snap,latest.date))
  throw new Error("Musicrank Spotify Top 200 failed archive verification");
 fs.writeFileSync(new URL(latestArchive,ROOT),JSON.stringify(snap,null,2)+"\n");
}
const utcDate=new Date().toISOString().slice(0,10),ms=Date.parse(utcDate+"T00:00:00Z");
let chosen=null,us=null,global=null,spotify=null;
for(let lag=0;lag<=3;lag++){
 const day=new Date(ms-lag*86400000).toISOString().slice(0,10);
 if(day>latest.date)continue;
 const U=loadArchive("apple-us",day,(v,d)=>verifiedDatedApple(v,"U",d));
 const A=loadArchive("apple-global",day,(v,d)=>verifiedDatedApple(v,"A",d));
 const S=loadArchive("spotify-global",day,verifiedDatedSpotify);
 if(U&&A&&S){chosen=day;us=U;global=A;spotify=S;break;}
}
if(!chosen)throw new Error("No common dated Apple US, Apple Global and Musicrank Spotify edition. Keep previous chart.");
if(us.sourceDate!==spotify.date||global.sourceDate!==spotify.date)
 throw new Error("Mixed-date source ranking refused");

const candidates=new Map(),sets={U:new Set(),A:new Set(),S:new Set()};
function admit(t,source,rank){
 if(!t?.title||!t?.artist||!Number.isInteger(rank))throw new Error("invalid_chart_row_"+source+":"+rank);
 const key=songIdentity(t.title,t.artist);
 if(!key)throw new Error("unidentifiable_"+source+":"+rank);
 let item=candidates.get(key);
 if(!item){
  item={title:t.title,artist:t.artist,url:t.url||"",art:t.art||"",year:t.year||"",prev:"",
   sourceRanks:{U:null,A:null,S:null},
   spotify:{status:"unavailable",daily:null,reason:"not-measured-yet"}};
  candidates.set(key,item);
 }
 if(sets[source].has(rank))throw new Error("duplicate_source_rank_"+source+":"+rank);
 sets[source].add(rank);
 if(item.sourceRanks[source]!==null){
  // Distinct Spotify recording IDs can share a displayed song title.
  // Represent the song once, using its highest-ranked recording.
  if(source!=="S")throw new Error("duplicate_source_song_"+source+":"+rank);
  return item;
 }
 item.sourceRanks[source]=rank;
 if(source==="U"||(source==="A"&&(!item.art||!item.url))){
  item.title=t.title;item.artist=t.artist;item.url=t.url||item.url;
  item.art=t.art||item.art;item.year=t.year||item.year;
 }
 if(source==="S"){
  item.spotify={status:"matched",daily:t.daily,...(t.spotifyId?{spotifyId:t.spotifyId}:{}),
   total:null,date:chosen,sourceUrl:"https://musicrank.org/spotify",
   metric:"musicrank-spotify-chart-global-daily",matchedTitle:t.title,matchedArtist:t.artist};
 }
 return item;
}
us.tracks.forEach(t=>admit(t,"U",t.pos));
global.tracks.forEach(t=>admit(t,"A",t.pos));
spotify.tracks.forEach(t=>admit(t,"S",t.pos));
if(sets.U.size!==100||sets.A.size!==global.tracks.length||sets.S.size!==200)
 throw new Error("Daily source set incomplete for "+chosen);

/* ===== Главный канал: сайтовые дневные числа (только на публикующих прогонах) ===== */
let old=null;try{old=load("apple-spotify-streams.json");}catch{}
const decision=shouldPublishSeed({previousDate:old?.schema===3?old.spotifyDate:null,
 candidateDate:chosen,lastPublishedAt:old?.schema===3?old.capturedAt:null,
 nowMs:Date.now(),forced:process.env.TRI_FORCE_PUBLISH==="1"});
let siteStats={processed:0,musicrankDirect:0,sitePrimary:0,myscFallback:0,soundcampsDelta:0,unresolved:0,monitor:null};
if(decision.publish){
 siteStats=await applySiteStreams();
 /* Preserve verified site measurements across rate-limited retries for the
    same exact edition and Spotify recording. */
 if(old?.schema===3&&old.spotifyDate<=chosen&&Array.isArray(old.tracks)){
  const prior=new Map(old.tracks.map(t=>[songIdentity(t.title,t.artist),t.spotify]));
  let recovered=0;
  for(const [key,t] of candidates){
   const p=prior.get(key);
   /* Exact ID, known source, genuinely measured and within the existing
      three-day freshness window. Missing measurements are NOT invented. */
   const priorSite=/^(?:soundcamps-|mystreamcount-)/.test(String(p?.metric||""));
   if(!p||!priorSite||!verifiedSpotifyRow(p,chosen))continue;
   if(t.spotify?.status==="matched" &&
      (t.spotify.spotifyId!==p.spotifyId||old.spotifyDate<chosen))continue;
   if(!/^(?:soundcamps-|mystreamcount-)/.test(String(t.spotify?.metric||""))){
    t.spotify={...p};recovered++;
   }
  }
  siteStats.verifiedCarryForward=recovered;
 }
}else{
 console.log("SITE_STREAM_STAGE_SKIPPED",JSON.stringify({reason:decision.reason,age:decision.age}));
}

const tracks=[...candidates.values()];
const missingTracks=tracks.filter(t=>t.spotify.status!=="matched");
if(missingTracks.length)console.warn("TRI_UNMEASURED",JSON.stringify(missingTracks.map(t=>({
 title:t.title,artist:t.artist,appleRank:t.sourceRanks.A,
 spotifyId:idsCache.entries[songIdentity(t.title,t.artist)]?.id||null
}))));
const matched=tracks.filter(t=>t.spotify.status==="matched").length;
if(decision.publish&&matched>=50&&missingTracks.length){
 // Musicrank positions 1..200 are sorted by the SAME day's global plays.
 // A candidate absent from this Top 200 cannot exceed the #200 daily count.
 // Using the Top 1 count here falsely treats every missing song as a hit.
 const maxDaily=Math.max(1,...tracks.filter(t=>t.spotify.status==="matched").map(t=>t.spotify.daily));
 const absentMaxDaily=spotify.tracks[spotify.tracks.length-1].daily;
 if(!Number.isSafeInteger(absentMaxDaily)||absentMaxDaily<=0)throw new Error("Spotify Top 200 floor unavailable");
 const absentMaxPoints=30*Math.sqrt(absentMaxDaily/maxDaily);
 const scored=tracks.filter(t=>t.spotify.status==="matched").map(t=>{
  const u=t.sourceRanks.U===null?0:40*(101-t.sourceRanks.U)/100;
  const a=t.sourceRanks.A===null?0:30*(101-t.sourceRanks.A)/100;
  return u+a+30*Math.sqrt(t.spotify.daily/maxDaily);
 }).sort((a,b)=>b-a);
 const cutoff=scored[49]??Infinity;
 const risky=missingTracks.filter(t=>{
  const u=t.sourceRanks.U===null?0:40*(101-t.sourceRanks.U)/100;
  const a=t.sourceRanks.A===null?0:30*(101-t.sourceRanks.A)/100;
  return u+a+absentMaxPoints>=cutoff-1e-9;
 });
 if(risky.length)throw new Error("Unresolved Spotify streams could change Top 50: "+risky.length);
}
const fingerprint=createHash("sha256").update(JSON.stringify([chosen,chosen,chosen,tracks])).digest("hex");
const payload={schema:3,methodology:TRI_METHOD,
 appleUsDate:chosen,appleGlobalDate:chosen,spotifyDate:chosen,
 capturedAt:new Date().toISOString(),fingerprint,
 archiveProvenance:{
  U:{source:us.source,url:us.sourceUrl,rows:us.tracks.length},
  A:{source:global.source,url:global.sourceUrl,rows:global.tracks.length},
  S:{source:spotify.source,url:spotify.sourceUrl,rows:spotify.tracks.length}
 },
 streamSource:"musicrank-primary+soundcamps-fallback+mystreamcount-last-resort",
 sourceSizes:{U:us.tracks.length,A:global.tracks.length,S:spotify.tracks.length},
 coverage:{candidates:tracks.length,matched,unmatched:tracks.length-matched,
  spotifyChart:200,musicrankDirect:siteStats.musicrankDirect,
  siteRecovered:siteStats.sitePrimary,soundcampsDeltas:siteStats.soundcampsDelta,
  myscFallback:siteStats.myscFallback,unresolved:siteStats.unresolved,
  calibration:totalsCache.calibration,monitor:siteStats.monitor},
 tracks};
if(!verifiedTriSeed(payload)){
 const bad=payload.tracks.filter(t=>t.spotify?.status==="matched"&&!verifiedSpotifyRow(t.spotify,chosen)).slice(0,10);
 for(const t of bad)console.log("TRI_ROW_REJECTED_FINAL",JSON.stringify({title:t.title,artist:t.artist,...t.spotify}));
 try{fs.writeFileSync(new URL(".apple-spotify-streams.rejected.json",ROOT),JSON.stringify(payload,null,2)+"\n");}catch{}
 throw new Error("No complete verified SAME-DAY chart: "+chosen+" "+matched+"/"+tracks.length);
}
if(old?.schema===3 && old.spotifyDate>chosen)
 throw new Error("Refusing to roll back a later published edition");
if(decision.publish&&old?.schema===3&&old.spotifyDate===chosen&&old.coverage?.matched>matched+8)
 throw new Error("Unexpected lost Spotify coverage on same chart date");
/* Publication cadence: the seed the site reads advances at most once a day,
   in the morning window; every other run only tops up dated archives. */
const changed=old?.fingerprint!==fingerprint;
if(changed&&decision.publish){
 const tmp=new URL(".apple-spotify-streams.tmp",ROOT);
 fs.writeFileSync(tmp,JSON.stringify(payload,null,2)+"\n");
 fs.renameSync(tmp,OUT);
}else if(changed){
 console.log("TRI_PUBLICATION_DEFERRED",JSON.stringify({chosen,previous:old?.spotifyDate||null,
  age:decision.age,reason:decision.reason}));
}
console.log("TRI_SOURCE_DATE_ALIGNED",JSON.stringify({
 editionDate:chosen,latestSpotifyDate:latest.date,appleUsRows:us.tracks.length,
 appleGlobalRows:global.tracks.length,spotifyRows:spotify.tracks.length,
 candidates:tracks.length,matched,missing:tracks.length-matched,
 appleSource:us.source,musicrankDirect:siteStats.musicrankDirect,
 siteRecovered:siteStats.sitePrimary,soundcampsDeltas:siteStats.soundcampsDelta,
 myscFallback:siteStats.myscFallback,unresolved:siteStats.unresolved,
 rejected:siteStats.rejected,myscBlocked:siteStats.myscBlocked,
 calibration:totalsCache.calibration,monitor:siteStats.monitor,
 published:Boolean(changed&&decision.publish),
 allDatesEqual:payload.appleUsDate===payload.appleGlobalDate&&payload.spotifyDate===payload.appleUsDate
}));
