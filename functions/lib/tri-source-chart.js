import {mergeKey,versionSignature} from "./chart-identity.js";
import {artistKey,titleKey,freshDay} from "./apple-spotify-chart.js";

export const TRI_METHOD="apple-us40-spotify30-global30-v3";
export const TRI_RULE="three-source-union-verified-streams-v3";
export const TOP_SIZE=50;
export const SOURCE_SIZE=100;
export const SPOTIFY_SIZE=200;

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
const sourcePattern=/^https:\/\/kworb\.net\/spotify\/(?:artist\/[A-Za-z0-9]{22}_songs|country\/global_daily)\.html$/;
export function verifiedSpotifyRow(s,date){
 return s?.status==="matched"&&Number.isSafeInteger(s.daily)&&s.daily>=0&&
  /^[A-Za-z0-9]{22}$/.test(s.spotifyId||"")&&s.date===date&&
  sourcePattern.test(s.sourceUrl||"")&&
  ["kworb-spotify-artist-daily","kworb-spotify-chart-global-daily"].includes(s.metric);
}
export function verifiedTriCandidates(rows,date) {
 if(!Array.isArray(rows)||rows.length<100||rows.length>400||!freshDay(date))return false;
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
   if(!verifiedSpotifyRow(t.spotify,date)||ids.has(t.spotify.spotifyId))return false;
   ids.add(t.spotify.spotifyId);
  } else if(t.spotify?.status!=="unavailable"||t.spotify.daily!==null)return false;
  return true;
 });
}
export function verifiedTriSeed(s,now=Date.now()){
 if(s?.schema!==3||s.methodology!==TRI_METHOD||
  !freshDay(s.appleUsDate,now)||s.appleUsDate!==s.appleGlobalDate||
  !freshDay(s.spotifyDate,now)||!/^[a-f0-9]{64}$/.test(s.fingerprint||"")||
  !verifiedTriCandidates(s.tracks,s.spotifyDate))return null;
 const hits=s.tracks.filter(t=>t.spotify.status==="matched").length;
 if(hits<50||hits!==s.coverage?.matched||s.coverage?.candidates!==s.tracks.length ||
  s.coverage?.unmatched!==s.tracks.length-hits||s.sourceSizes?.U!==100||
  s.sourceSizes?.A!==100||s.sourceSizes?.S<100)return null;
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
  j.sources?.U!==100||j.sources?.A!==100||j.sources?.S<100||
  j.tracks?.length!==50||!/^[a-f0-9]{64}$/.test(j.spotifyFingerprint||"")||
  !freshDay(j.sourceDates?.S)||new Set(j.tracks.map(t=>songIdentity(t.title,t.artist))).size!==50||
  j.tracks.some(t=>!verifiedSpotifyRow(t.spotify,j.sourceDates.S)||
   !sourceRankValid(t.sourceRanks?.U,100)||!sourceRankValid(t.sourceRanks?.A,100)||
   !sourceRankValid(t.sourceRanks?.S,200)))return false;
 const cap=j.scoring?.maxDaily;
 if(!Number.isSafeInteger(cap)||cap<1)return false;
 return j.tracks.every((t,i)=>{
  if(t.rank!==i+1||t.spotify.daily>cap)return false;
  const us=t.sourceRanks.U===null?0:40*(101-t.sourceRanks.U)/100;
  const global=t.sourceRanks.A===null?0:30*(101-t.sourceRanks.A)/100;
  const spotify=30*Math.sqrt(t.spotify.daily/cap);
  return Math.abs(t.score-(us+global+spotify))<1e-8 &&
   (i===0||j.tracks[i-1].score>=t.score-1e-8);
 });
}
