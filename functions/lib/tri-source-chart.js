import {mergeKey,versionSignature} from "./chart-identity.js";
import {artistKey,titleKey,freshDay} from "./apple-spotify-chart.js";
import {dampOrder} from "./chart-smoothing.js";
import {spotifyProviderByMetric} from "./spotify-chart.js";

export const TRI_METHOD="apple-us40-spotify30-global30-v3";
export const TRI_RULE="three-source-union-verified-streams-v3";
export const TOP_SIZE=50;
export const SOURCE_SIZE=100;
export const SPOTIFY_SIZE=200;
/* The published edition advances once a day (morning window, see
   publish-window.js); the seed captured that morning must stay valid until
   the next advance, so tri-source captures are accepted up to three days old. */
export const TRI_MAX_LAG_DAYS=3;

// Preserve versions and Unicode identities. Apple's catalog and Spotify's
// credit/title presentation legitimately differ; never join by title alone.
export function songIdentity(title,artist){
 const merged=mergeKey(title,artist);
 const [head,lead]=merged.split("|");
 return (head&&lead)?merged:
   titleKey(title)+"~v:"+versionSignature(title)+"|"+artistKey(String(artist||"").split(/\s*(?:,| & | feat\.? | ft\.? )\s*/i)[0]);
}
export function sourceRankValid(rank,limit) {
 return rank===null||(Number.isInteger(rank)&&rank>=1&&rank<=limit);
}
export function verifiedSpotifyRow(s,date){
 if(!s||s.status!=="matched"||!Number.isSafeInteger(s.daily)||s.daily<=0)return false;
 /* A row taken straight from a Spotify chart provider (ranks + the daily
    stream count that provider publishes). The provider is looked up, so a
    second source can be added without touching this check. */
 const chartProvider=spotifyProviderByMetric(s.metric);
 if(chartProvider)
  return s.date===date&&s.sourceUrl===chartProvider.sourceUrl&&
   (!s.spotifyId||/^[A-Za-z0-9]{22}$/.test(s.spotifyId));
 if(!/^[A-Za-z0-9]{22}$/.test(s.spotifyId||""))return false;
 if(["mystreamcount-daily-delta","mystreamcount-total-delta"].includes(s.metric))
  /* Резервный сайт: MyStreamCount используется только когда основной
     SoundCamps ещё не имеет пары totals для измеренной дневной дельты. */
  return s.estimated===true&&/^https:\/\/www\.mystreamcount\.com\/track\/[A-Za-z0-9]{22}$/.test(s.sourceUrl||"")&&
   s.sourceUrl.endsWith("/"+s.spotifyId)&&freshDay(s.date,Date.parse(date+"T00:00:00Z"),3);
 if(s.metric==="soundcamps-total-delta")
  /* Главный сайтовый канал: SoundCamps total snapshots. Дневное число —
     только измеренная дельта двух реальных дат; trackUrl фиксирует запись. */
  return s.estimated===true&&(s.sourceUrl||"")==="https://soundcamps.com/spotify-stream-checker/"&&
   String(s.trackUrl||"").endsWith("/"+s.spotifyId)&&freshDay(s.date,Date.parse(date+"T00:00:00Z"),3);
 return false;
}
export function verifiedTriCandidates(rows,date) {
 if(!Array.isArray(rows)||rows.length<100||rows.length>400||!freshDay(date,Date.now(),TRI_MAX_LAG_DAYS))return false;
 const keys=new Set(),ids=new Set(),positions={U:new Set(),A:new Set(),S:new Set()};
 return rows.every(t=>{
  const key=songIdentity(t.title,t.artist),r=t.sourceRanks||{};
  if(!key||keys.has(key)||!["U","A","S"].every((src)=>
     sourceRankValid(r[src],src==="S"?SPOTIFY_SIZE:SOURCE_SIZE)))return false;
  if(r.U===null&&r.A===null&&r.S===null)return false;
  keys.add(key);
  for(const src of ["U","A","S"]){
   if(r[src]!==null){if(positions[src].has(r[src]))return false;positions[src].add(r[src]);}
  }
  if(t.spotify?.status==="matched"){
   if(!verifiedSpotifyRow(t.spotify,date))return false;
   if(t.spotify.spotifyId){
    if(ids.has(t.spotify.spotifyId))return false;
    ids.add(t.spotify.spotifyId);
   }
  } else if(t.spotify?.status!=="unavailable"||t.spotify.daily!==null)return false;
  return true;
 });
}
export function verifiedTriSeed(s,now=Date.now()){
 if(s?.schema!==3||s.methodology!==TRI_METHOD||
  !freshDay(s.appleUsDate,now,TRI_MAX_LAG_DAYS)||s.appleUsDate!==s.appleGlobalDate||
  s.appleUsDate!==s.spotifyDate||
  !freshDay(s.spotifyDate,now,TRI_MAX_LAG_DAYS)||!/^[a-f0-9]{64}$/.test(s.fingerprint||"")||
  !verifiedTriCandidates(s.tracks,s.spotifyDate))return null;
 const hits=s.tracks.filter(t=>t.spotify.status==="matched").length;
 if(hits<50||hits!==s.coverage?.matched||s.coverage?.candidates!==s.tracks.length ||
  s.coverage?.unmatched!==s.tracks.length-hits||s.sourceSizes?.U!==100||
  ![50,100].includes(s.sourceSizes?.A)||s.sourceSizes?.S!==200||
  s.tracks.some(t=>t.sourceRanks?.A!==null&&t.sourceRanks.A>s.sourceSizes.A))return null;
 return s;
}
export function rankTriCandidates(rows,date) {
 if(!verifiedTriCandidates(rows,date))throw new Error("invalid_tri_candidates");
 const present=rows.filter(t=>t.spotify.status==="matched");
 if(present.length<50)throw new Error("fewer_than_50_verified_spotify_streams");
 const maxDaily=Math.max(1,...present.map(t=>t.spotify.daily));
 const ranked=present.map(t=>{
  const r=t.sourceRanks;
  // All three sources share a 0..100 scale. Missing platform ranks contribute
  // zero evidence, but we NEVER report zero plays for missing Spotify data.
  const appleUsPoints=r.U===null?0:40*(101-r.U)/100;
  const appleGlobalPoints=r.A===null?0:30*(101-r.A)/100;
  const spotifyPoints=30*Math.sqrt(t.spotify.daily/maxDaily);
  return {...t,score:appleUsPoints+appleGlobalPoints+spotifyPoints,
   appleUsPoints,appleGlobalPoints,spotifyPoints};
 }).sort((a,b)=>b.score-a.score||((a.sourceRanks.U??101)-(b.sourceRanks.U??101))||
   ((a.sourceRanks.A??101)-(b.sourceRanks.A??101))||
   ((a.sourceRanks.S??201)-(b.sourceRanks.S??201))||
   songIdentity(a.title,a.artist).localeCompare(songIdentity(b.title,b.artist)));
 const tracks=ranked.slice(0,TOP_SIZE).map((t,i)=>({...t,rank:i+1,
  applePoints:t.appleUsPoints,spotifyBonus:t.spotifyPoints}));
 return {tracks,maxDaily,eligible:ranked.length};
}
export function isTriChart(j){
 if(j?.methodology!==TRI_METHOD||j.consensus!==TRI_RULE||j.complete!==true||
  j.sources?.U!==100||![50,100].includes(j.sources?.A)||j.sources?.S!==200||
  j.tracks?.length!==50||!/^[a-f0-9]{64}$/.test(j.spotifyFingerprint||"")||
  !/^20\d{2}-\d{2}-\d{2}$/.test(j.sourceDates?.S||"")||
  j.sourceDates?.S!==j.sourceDates?.U||j.sourceDates?.S!==j.sourceDates?.A||
  j.tracks.some(t=>t.sourceRanks?.A!==null&&t.sourceRanks.A>j.sources.A)||
  new Set(j.tracks.map(t=>songIdentity(t.title,t.artist))).size!==50||
  j.tracks.some(t=>!verifiedSpotifyRow(t.spotify,j.sourceDates.S)||
   !sourceRankValid(t.sourceRanks?.U,100)||!sourceRankValid(t.sourceRanks?.A,100)||
   !sourceRankValid(t.sourceRanks?.S,200)))return false;
 const cap=j.scoring?.maxDaily;
 if(!Number.isSafeInteger(cap)||cap<1)return false;
 const scoreOf=t=>{
  const us=t.sourceRanks.U===null?0:40*(101-t.sourceRanks.U)/100;
  const global=t.sourceRanks.A===null?0:30*(101-t.sourceRanks.A)/100;
  const spotify=30*Math.sqrt(t.spotify.daily/cap);
  return us+global+spotify;
 };
 /* A damped edition publishes a position that is only part of the way to the
    score order, so the edition carries the score order and the previous one.
    Both are recomputed here: the published order must be exactly the damped
    order of those two inputs, and the score of every row must still be the
    score the sources give it. Without a damping record the published order
    must be the score order itself. */
 if(j.damping){
  const byScore=j.tracks.map(t=>({t,score:scoreOf(t)}))
   .sort((a,b)=>(Number(a.t.scoreRank)||0)-(Number(b.t.scoreRank)||0));
  if(byScore.some((x,i)=>Number(x.t.scoreRank)!==i+1))return false;
  for(let i=1;i<byScore.length;i++)if(byScore[i-1].score<byScore[i].score-1e-8)return false;
  /* The previous order is stored the way the chart keys its songs, so the
     same key is used here. */
  const expected=dampOrder(byScore.map(x=>mergeKey(x.t.title,x.t.artist)),
   j.damping.previousOrder,j.damping.alpha,j.tracks.length);
  if(!expected)return false;
  const published=j.tracks.map(t=>mergeKey(t.title,t.artist));
  if(expected.some((key,i)=>key!==published[i]))return false;
 }
 return j.tracks.every((t,i)=>{
  if(t.rank!==i+1||t.spotify.daily>cap)return false;
  if(Math.abs(t.score-scoreOf(t))>=1e-8)return false;
  if(j.damping)return true;
  return i===0||j.tracks[i-1].score>=t.score-1e-8;
 });
}
