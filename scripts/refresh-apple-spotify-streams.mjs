import fs from "node:fs";
import {createHash} from "node:crypto";
import {datedChartPath,verifiedDatedApple,verifiedDatedSpotify} from "../functions/lib/chart-history.js";
import {KWORB_ARTISTS_URL,artistKey,htmlText,parseKworbArtists,
 parseKworbArtistDaily,matchKworbTrack,freshDay,parseKworbGlobalStreams} from "../functions/lib/apple-spotify-chart.js";
import {TRI_METHOD,verifiedTriSeed,verifiedSpotifyRow,songIdentity} from "../functions/lib/tri-source-chart.js";
import {shouldPublishSeed} from "../functions/lib/publish-window.js";
import {pickSearchHit,pickDailyForDate,measuredProviderDelta,saveCounterObservation,extractCounterTotal,medianValue,FALLBACK_WINDOW_DAYS} from "../functions/lib/stream-fallback.js";

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

/* ===== Сайты-источники (главный канал дневных чисел по решению владельца) =====
   MyStreamCount — основной, soundcamps — суммы/страховка и контроль, официальные
   (kworb) — только аварийный резерв для песен без сайтовых данных. */
const idsCache=readCache(IDS_FILE)||{schema:1,updated:null,entries:{}};
const totalsCache=readCache(TOTALS_FILE)||{schema:1,updated:null,calibration:1,tracks:{}};
if(!idsCache.entries)idsCache.entries={};
if(!totalsCache.tracks)totalsCache.tracks={};
const OFFICIAL_METRICS=new Set(["kworb-spotify-chart-global-daily","kworb-spotify-artist-daily","kworb-track-global-daily"]);

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
async function resolveSpotifyId(t){
 const key=songIdentity(t.title,t.artist);
 const cached=idsCache.entries[key];
 if(cached?.id)return cached;
 const lead=String(t.artist||"").trim().split(/\s*(?:,|\s+&\s+)\s*/)[0];
 const queries=[`${t.title} ${t.artist}`,lead?`${t.title} ${lead}`:null].filter(Boolean);
 for(const q of queries){
  try{
   const j=await serviceGetJSON("https://soundcamps.com/api/spotify-search?q="+encodeURIComponent(q));
   const hit=pickSearchHit(t.title,t.artist,j?.results||[]);
   if(hit){
    const entry={id:hit.id,name:hit.name,subtitle:hit.subtitle,resolvedAt:new Date().toISOString()};
    idsCache.entries[key]=entry;
    return entry;
   }
  }catch(e){console.warn("SERVICE_SEARCH_FAILED",JSON.stringify([q,String(e?.message||e)]));}
  await sleep(600);
 }
 console.log("SERVICE_ID_MISS",JSON.stringify([t.title,t.artist]));
 return null;
}
async function applySiteStreams(){
 const stats={processed:0,sitePrimary:0,siteCounterDelta:0,siteCapture:0,soundcampsDelta:0,officialKept:0,unresolved:0,rejected:0,myscBlocked:false,monitor:null};
 const capture=(id,provider,total)=>{
  totalsCache.tracks[id]=saveCounterObservation(totalsCache.tracks[id],CAPTURE_DAY,total,provider);
  stats.siteCapture++;
 };
 const official=new Map();
 for(const [key,t] of candidates){
  if(t.spotify.status==="matched"&&t.spotify.date===chosen&&OFFICIAL_METRICS.has(t.spotify.metric))
   official.set(key,{daily:t.spotify.daily,global:t.spotify.metric==="kworb-spotify-chart-global-daily"});
 }
 const usedIds=new Set();
 for(const t of candidates.values())if(t.spotify.spotifyId)usedIds.add(t.spotify.spotifyId);
 const countFallback=t=>{
  if(OFFICIAL_METRICS.has(t.spotify.metric)&&t.spotify.date===chosen)stats.officialKept++;
  else stats.unresolved++;
 };
 let msFailStreak=0,msBlocked=false;
 for(const [key,t] of candidates){
  if(SERVICE_LIMIT&&stats.processed>=SERVICE_LIMIT){console.log("SITE_STREAM_LIMIT_REACHED",SERVICE_LIMIT);break;}
  stats.processed++;
  try{
   const entry=t.spotify.spotifyId?{id:t.spotify.spotifyId}:await resolveSpotifyId(t);
   const duplicate=!!entry?.id&&!t.spotify.spotifyId&&usedIds.has(entry.id);
   if(!entry?.id||duplicate){countFallback(t);}
   else{
    let found=null;
    if(!msBlocked){
     try{
      const series=await mystreamcountSeries(entry.id,n=>capture(entry.id,"mystreamcount",n));
      const pick=series?pickDailyForDate(series.data,chosen,{windowDays:FALLBACK_WINDOW_DAYS}):null;
      if(pick)found={id:entry.id,daily:pick.daily,date:pick.date,method:pick.method,
       sourceUrl:"https://www.mystreamcount.com/track/"+entry.id,metric:"mystreamcount-daily-delta",
       matchedTitle:entry.name||t.title,matchedArtist:entry.subtitle||t.artist};
      msFailStreak=0;
     }catch(e){
      msFailStreak++;
      console.warn("SERVICE_MYSC_FAILED",entry.id,String(e?.message||e));
      if(msFailStreak>=5&&!msBlocked){
       msBlocked=true;stats.myscBlocked=true;
       console.warn("SERVICE_MYSC_BLOCKED","лимит сайта: сохраняю официальные значения, суммы soundcamps продолжаю собирать");
      }
     }
    }
    /* Суммы soundcamps собираем всегда (если сайт доступен): история для дельт и контроль. */
    try{
     const total=await soundcampsTotal(entry.id);
     if(total!==null){
      capture(entry.id,"soundcamps",total);
     }
    }catch(e){console.warn("SERVICE_SC_FAILED",entry.id,String(e?.message||e));}
    if(!found){
     const delta=measuredProviderDelta(totalsCache.tracks[entry.id],chosen,"mystreamcount");
     if(delta){
      found={id:entry.id,daily:delta.daily,date:delta.date,method:delta.method,
       sourceUrl:"https://www.mystreamcount.com/track/"+entry.id,metric:"mystreamcount-total-delta",
       matchedTitle:entry.name||t.title,matchedArtist:entry.subtitle||t.artist};
      stats.siteCounterDelta++;
     }
    }
    if(!found){
     const delta=measuredProviderDelta(totalsCache.tracks[entry.id],chosen,"soundcamps");
     if(delta)found={id:entry.id,daily:delta.daily,date:delta.date,method:delta.method,
      sourceUrl:"https://soundcamps.com/spotify-stream-checker/",metric:"soundcamps-total-delta",
      trackUrl:"https://open.spotify.com/track/"+entry.id,
      matchedTitle:entry.name||t.title,matchedArtist:entry.subtitle||t.artist};
    }
    if(found){
     t._site=found;
     usedIds.add(found.id);
     if(found.metric.startsWith("mystreamcount-"))stats.sitePrimary++;
     else stats.soundcampsDelta++;
    }else{countFallback(t);}
   }
  }catch(e){
   console.warn("SERVICE_TRACK_FAILED",JSON.stringify([t.title,String(e?.message||e)]));
  }
  await sleep(700);
 }
 /* Калибровка шкалы: медиана отношения официальное/сайтовое по пересечению. */
 const pairs=[];
 for(const [key,t] of candidates){
  const ref=official.get(key);
  /* Калибровка — только по настоящим глобальным официальным числам:
     artist-page значения частичные (сумма стран) и занижали бы шкалу. */
  if(ref?.global&&ref.daily>0&&t._site?.daily>0)pairs.push(ref.daily/t._site.daily);
 }
 const median=medianValue(pairs,10);
 /* 0.96 = замеренный типовой фактор (сайт ≈ ×1.042 от официального).
    Берём его, если пересечения для медианы пока мало. */
 const calibration=median?Math.min(1.3,Math.max(0.65,median)):0.96;
 totalsCache.calibration=Number(calibration.toFixed(4));
 stats.monitor={samples:pairs.length,medianRatio:median?Number(median.toFixed(4)):null,calibration:totalsCache.calibration};
 for(const t of candidates.values()){
  if(!t._site)continue;
  const daily=Math.max(1,Math.round(t._site.daily*calibration));
  const row={status:"matched",daily,spotifyId:t._site.id,total:null,date:t._site.date,
   sourceUrl:t._site.sourceUrl,metric:t._site.metric,estimated:true,estimateMethod:t._site.method,
   trackUrl:t._site.trackUrl||("https://open.spotify.com/track/"+t._site.id),
   matchedTitle:t._site.matchedTitle,matchedArtist:t._site.matchedArtist};
  delete t._site;
  /* Замена официального ряда сайтовым — только если он проходит валидатор.
     Иначе сохраняем прежний (официальный) ряд: одна кривая запись не вправе
     уронить весь выпуск. */
  if(verifiedSpotifyRow(row,chosen))t.spotify=row;
  else{
   stats.rejected++;
   console.log("TRI_ROW_REJECTED",JSON.stringify({title:t.title,artist:t.artist,row}));
  }
 }
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

/* ===== Архивы: Spotify-чарт (дата выпуска и аварийный резерв) ===== */
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

const credited=t=>{
 const raw=String(t.artist||"").trim();
 const parts=raw.split(/\s*(?:,|\s+&\s+|\s+feat\.?\s+|\s+ft\.?|\s+with\s+)\s*/i).map(x=>x.trim()).filter(Boolean);
 const titleFeat=String(t.title||"").match(/\((?:feat\.?|ft\.?|with)\s+([^)]+)\)/i);
 if(titleFeat)for(const name of titleFeat[1].split(/\s*,\s*|\s+&\s+/))parts.push(name.trim());
 return [...new Set([raw,...parts])].filter(Boolean).slice(0,8);
};
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
   const match=matchKworbTrack(t,page,artist.name);
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

/* ===== Главный канал: сайтовые дневные числа (только на публикующих прогонах) ===== */
let old=null;try{old=load("apple-spotify-streams.json");}catch{}
const decision=shouldPublishSeed({previousDate:old?.schema===3?old.spotifyDate:null,
 nowMs:Date.now(),forced:process.env.TRI_FORCE_PUBLISH==="1"});
let siteStats={processed:0,sitePrimary:0,soundcampsDelta:0,officialKept:0,unresolved:0,monitor:null};
if(decision.publish){
 siteStats=await applySiteStreams();
 /* Preserve verified site measurements across rate-limited retries for the
    same exact edition and Spotify recording. */
 if(old?.schema===3&&old.spotifyDate===chosen&&Array.isArray(old.tracks)){
  const prior=new Map(old.tracks.map(t=>[songIdentity(t.title,t.artist),t.spotify]));
  for(const [key,t] of candidates){
   const p=prior.get(key);
   if(!p||!String(p.metric||"").startsWith("mystreamcount-")||
      !verifiedSpotifyRow(p,chosen))continue;
   if(t.spotify?.status==="matched"&&t.spotify.spotifyId!==p.spotifyId)continue;
   if(!String(t.spotify?.metric||"").startsWith("mystreamcount-"))t.spotify={...p};
  }
 }
}else{
 console.log("SITE_STREAM_STAGE_SKIPPED",JSON.stringify({reason:decision.reason,age:decision.age}));
}

const tracks=[...candidates.values()];
const missingUs=tracks.filter(t=>t.sourceRanks.U!==null&&t.spotify.status!=="matched");
if(decision.publish&&missingUs.length)throw new Error("Apple USA 40pct missing verified Spotify counts: "+missingUs.length);
const missingTracks=tracks.filter(t=>t.spotify.status!=="matched");
if(missingTracks.length)console.warn("TRI_UNMEASURED",JSON.stringify(missingTracks.map(t=>({
 title:t.title,artist:t.artist,appleRank:t.sourceRanks.A,
 spotifyId:idsCache.entries[songIdentity(t.title,t.artist)]?.id||null
}))));
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
 streamSource:"mystreamcount-daily+soundcamps-totals+kworb-emergency",
 sourceSizes:{U:us.tracks.length,A:global.tracks.length,S:spotify.tracks.length},
 coverage:{candidates:tracks.length,matched,unmatched:tracks.length-matched,
  spotifyChart:200,artistRecovered:recovered,artistPages:pages.size,artistErrors,
  siteRecovered:siteStats.sitePrimary,soundcampsDeltas:siteStats.soundcampsDelta,
  officialKept:siteStats.officialKept,unresolved:siteStats.unresolved,
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
 artistRecovered:recovered,appleSource:us.source,
 siteRecovered:siteStats.sitePrimary,soundcampsDeltas:siteStats.soundcampsDelta,
 officialKept:siteStats.officialKept,unresolved:siteStats.unresolved,
 rejected:siteStats.rejected,myscBlocked:siteStats.myscBlocked,
 calibration:totalsCache.calibration,monitor:siteStats.monitor,
 published:Boolean(changed&&decision.publish),
 allDatesEqual:payload.appleUsDate===payload.appleGlobalDate&&payload.spotifyDate===payload.appleUsDate
}));
