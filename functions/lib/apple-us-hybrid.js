import {mergeKey} from "./chart-identity.js";
import {freshDay} from "./apple-spotify-chart.js";

export const US_HYBRID_METHOD="apple-us70-spotify20-global10-v2";
export const US_HYBRID_RULE="apple-us50-weighted-v2";
export const MIN_US_SPOTIFY_COVERAGE=25;
const missingStatuses=new Set(["track-not-found","artist-not-tracked","ambiguous","stale","different-edition"]);

export function validUsHybridRows(rows) {
 if(!Array.isArray(rows)||rows.length!==50)return false;
 const usRanks=new Set(),identities=new Set(),spotifyIds=new Set();
 return rows.every(t=>{
  const key=mergeKey(t.title,t.artist),u=t.sourceRanks?.U,g=t.sourceRanks?.A;
  if(!key||!Number.isInteger(u)||u<1||u>50||usRanks.has(u)||identities.has(key)||
    (g!==null&&(!Number.isInteger(g)||g<1||g>100)))return false;
  usRanks.add(u);identities.add(key);
  const sp=t.spotify;
  if(sp?.status==="matched"){
   if(!Number.isSafeInteger(sp.daily)||sp.daily<0||!/^[A-Za-z0-9]{22}$/.test(sp.spotifyId||"")||
    spotifyIds.has(sp.spotifyId)||!freshDay(sp.date,Date.parse(sp.date+"T00:00:00Z"))||
    !/^https:\/\/kworb\.net\/spotify\/(?:artist\/[A-Za-z0-9]{22}_songs|country\/global_daily)\.html$/.test(sp.sourceUrl||""))return false;
   spotifyIds.add(sp.spotifyId);return true;
  }
  return missingStatuses.has(sp?.status)&&sp.daily===null;
 });
}
export function verifiedUsStreamSeed(seed,now=Date.now()) {
 if(seed?.schema!==2||seed.methodology!==US_HYBRID_METHOD||
  !freshDay(seed.appleUsDate,now)||!freshDay(seed.appleGlobalDate,now)||
  seed.appleUsDate!==seed.appleGlobalDate||!freshDay(seed.spotifyDate,now)||
  !/^[a-f0-9]{64}$/.test(seed.fingerprint||"")||!validUsHybridRows(seed.tracks))return null;
 const matched=seed.tracks.filter(t=>t.spotify.status==="matched");
 return matched.length>=MIN_US_SPOTIFY_COVERAGE&&matched.length===seed.coverage?.matched&&
  matched.every(t=>t.spotify.date===seed.spotifyDate)?seed:null;
}
export function rankAppleUsHybrid(rows) {
 if(!validUsHybridRows(rows))throw new Error("invalid_us_hybrid_candidates");
 const observed=rows.filter(t=>t.spotify.status==="matched").map(t=>t.spotify.daily).sort((a,b)=>a-b);
 const median=observed.length?observed[Math.floor((observed.length-1)/2)]:0;
 const max=Math.max(1,...observed);
 const ranking=rows.map(t=>{
  const u=t.sourceRanks.U,g=t.sourceRanks.A;
  const appleUsPoints=70*(51-u)/50;
  const appleGlobalPoints=g===null?0:10*(101-g)/100;
  // Missing is neutral for scoring, NOT represented as zero real streams.
  const scoreDaily=t.spotify.status==="matched"?t.spotify.daily:median;
  const spotifyPoints=20*Math.sqrt(scoreDaily/max);
  return {...t,appleUsPoints,appleGlobalPoints,spotifyPoints,
   spotifyImputed:t.spotify.status!=="matched",score:appleUsPoints+appleGlobalPoints+spotifyPoints};
 }).sort((a,b)=>a.sourceRanks.U-b.sourceRanks.U);
 // Guard against one supplementary source rearranging the US base by >10.
 for(let pass=0;pass<50;pass++){
  let changed=false;
  for(let i=0;i<49;i++){
   const left=ranking[i],right=ranking[i+1];
   if(right.score>left.score && Math.abs((i+1)-right.sourceRanks.U)<=10 &&
      Math.abs((i+2)-left.sourceRanks.U)<=10){
     ranking[i]=right;ranking[i+1]=left;changed=true;
   }
  }
  if(!changed)break;
 }
 return ranking.map((t,i)=>({...t,rank:i+1}));
}
export function isAppleUsHybridChart(snapshot) {
 if(snapshot?.methodology!==US_HYBRID_METHOD||snapshot.consensus!==US_HYBRID_RULE||
  snapshot.complete!==true||snapshot.sources?.U!==50||
  snapshot.sources?.S<MIN_US_SPOTIFY_COVERAGE||snapshot.sources?.A!==100||
  !/^[a-f0-9]{64}$/.test(snapshot.spotifyFingerprint||"")||
  !validUsHybridRows(snapshot.tracks))return false;
 const reference=rankAppleUsHybrid(snapshot.tracks);
 return reference.every((t,i)=>t.rank===snapshot.tracks[i].rank&&
  mergeKey(t.title,t.artist)===mergeKey(snapshot.tracks[i].title,snapshot.tracks[i].artist)&&
  Math.abs(t.score-snapshot.tracks[i].score)<1e-8);
}
