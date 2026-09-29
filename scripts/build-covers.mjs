/* Deterministic multi-provider artwork resolver.
 * This script never writes chart ranking/order/movement. Artwork identity uses
 * the full artist credit. Apple current-chart data is preferred when it resolves
 * to a clean catalog release; otherwise Apple catalog search is cross-checked
 * with Deezer. Compilations and derivative packages are rejected.
 */
import fs from "node:fs";
import path from "node:path";
import dns from "node:dns";
import { artworkKey, mergeKey, normTitle, primaryArtist, stripParen } from "../functions/lib/chart-identity.js";
import { candidateCompatible, classifyCandidate, normalizedRelease, rankArtworkCandidates, selectArtworkCandidate } from "../functions/lib/artwork-resolver.js";
dns.setDefaultResultOrder("ipv4first");

const OUT=path.resolve("public/data/covers.json");
const OUT_AUDIT=path.resolve("public/data/artwork-audit.json");
const OUT_NAMES=path.resolve("public/data/apple-names.json");
const CHART=process.env.CHART_URL||"https://music98.news/api/top50";
const APPLE_FEED="https://rss.applemarketingtools.com/api/v2/us/music/most-played/100/songs.json";
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const art600=u=>String(u||"").replace("100x100bb.jpg","600x600bb.jpg").replace("100x100bb","600x600bb");

async function json(url,tries=3){
  let last;
  for(let a=0;a<tries;a++){
    try{
      const r=await fetch(url,{headers:{"user-agent":"music98-artwork-resolver/2.0","accept":"application/json"},signal:AbortSignal.timeout(15000)});
      if(!r.ok) throw new Error("HTTP "+r.status+" "+url);
      return await r.json();
    }catch(e){ last=e; if(a+1<tries) await sleep(250*(a+1)); }
  }
  throw last||new Error("request failed");
}
const trackIdFrom=u=>(String(u||"").match(/[?&]i=(\d+)/)||[])[1]||"";
function appleRecord(raw){
  const album=String(raw?.collectionId||""), track=String(raw?.trackId||"");
  return {title:String(raw?.trackName||""),artist:String(raw?.artistName||""),url:album&&track?`https://music.apple.com/us/album/${album}?i=${track}`:String(raw?.trackViewUrl||""),prev:String(raw?.previewUrl||""),year:String(raw?.releaseDate||"").slice(0,4)};
}
function appleCandidate(raw,provider="apple",extra={}){
  if(!raw) return null;
  return {provider,id:String(raw.trackId||""),collectionId:String(raw.collectionId||""),trackTitle:String(raw.trackName||""),artist:String(raw.artistName||""),releaseTitle:String(raw.collectionName||""),releaseArtist:String(raw.collectionArtistName||raw.artistName||""),releaseDate:String(raw.releaseDate||""),trackCount:Number(raw.trackCount||0),genre:String(raw.primaryGenreName||""),art:art600(raw.artworkUrl100||""),url:raw.collectionId&&raw.trackId?`https://music.apple.com/us/album/${raw.collectionId}?i=${raw.trackId}`:String(raw.trackViewUrl||""),preview:String(raw.previewUrl||""),raw,...extra};
}
function deezerArtistCredit(track){
  const names=(track?.contributors||[]).map(x=>x?.name).filter(Boolean);
  return names.length?names.join(", "):String(track?.artist?.name||"");
}
function deezerCandidate(track,album){
  if(!track||!album) return null;
  const genres=(album?.genres?.data||[]).map(x=>x?.name).filter(Boolean).join(", ");
  return {provider:"deezer",id:String(track.id||""),collectionId:String(album.id||track?.album?.id||""),trackTitle:String(track.title||track.title_short||""),artist:deezerArtistCredit(track),releaseTitle:String(album.title||track?.album?.title||""),releaseArtist:String(album?.artist?.name||track?.artist?.name||""),releaseDate:String(album.release_date||""),trackCount:Number(album.nb_tracks||0),genre:genres,art:String(album.cover_xl||album.cover_big||track?.album?.cover_xl||track?.album?.cover_big||""),url:String(track.link||""),preview:String(track.preview||"")};
}
async function appleFeedCandidates(){
  const feed=await json(APPLE_FEED);
  const rows=(feed?.feed?.results||[]).map((x,i)=>({pos:i+1,id:String(x.id||trackIdFrom(x.url)||"")})).filter(x=>x.id);
  const ids=[...new Set(rows.map(x=>x.id))], byId=new Map();
  for(let i=0;i<ids.length;i+=50){
    const d=await json(`https://itunes.apple.com/lookup?id=${ids.slice(i,i+50).join(",")}&entity=song&country=US`);
    for(const x of d.results||[]) if(x.trackId) byId.set(String(x.trackId),x);
  }
  return rows.map(r=>appleCandidate(byId.get(r.id),"apple-feed",{chartPos:r.pos})).filter(Boolean);
}
async function currentAppleCandidate(track){
  const id=trackIdFrom(track?.url);
  if(!id) return null;
  try{
    const d=await json(`https://itunes.apple.com/lookup?id=${encodeURIComponent(id)}&entity=song&country=US`,2);
    const raw=(d?.results||[]).find(x=>String(x?.trackId||"")===String(id));
    const c=appleCandidate(raw,"apple-chart",{chartUrl:String(track?.url||"")});
    return c&&candidateCompatible(track,c)?c:null;
  }catch{
    return null;
  }
}
async function searchApple(track){
  const terms=[`${stripParen(track.title)} ${track.artist}`,`${track.artist} ${stripParen(track.title)}`], out=new Map();
  for(const term0 of [...new Set(terms)]){
    const d=await json(`https://itunes.apple.com/search?term=${encodeURIComponent(term0.trim())}&entity=song&limit=200&country=US`);
    for(const raw of d.results||[]){ const c=appleCandidate(raw,"apple"); if(c?.id&&candidateCompatible(track,c)) out.set(c.id,c); }
    if(out.size>=12) break;
  }
  return [...out.values()];
}
async function searchDeezer(track){
  let search;
  try{ search=await json(`https://api.deezer.com/search/track?q=${encodeURIComponent(stripParen(track.title)+" "+track.artist)}&limit=50`,2); }catch{return [];}
  const lead=primaryArtist(track.artist);
  const raw=(search?.data||[]).filter(x=>normTitle(x.title_short||x.title)===normTitle(track.title)&&(!lead||primaryArtist(x?.artist?.name)===lead)).slice(0,10);
  const candidates=[], albumCache=new Map();
  for(const item of raw){
    let full=item; try{ full=await json(`https://api.deezer.com/track/${item.id}`,2); }catch{}
    if(normTitle(full?.title||full?.title_short||item.title)!==normTitle(track.title)) continue;
    const aid=String(full?.album?.id||item?.album?.id||""); if(!aid) continue;
    let album=albumCache.get(aid);
    if(!album){ try{ album=await json(`https://api.deezer.com/album/${aid}`,2); }catch{ album=full?.album||item?.album||{}; } albumCache.set(aid,album); }
    const c=deezerCandidate(full,album); if(c&&candidateCompatible(track,c)) candidates.push(c);
    if(candidates.length>=6) break;
  }
  return candidates;
}
function readAudit(){ try{const j=JSON.parse(fs.readFileSync(OUT_AUDIT,"utf8"));return j?.entries&&typeof j.entries==="object"?j.entries:{};}catch{return {};}}
function readNames(){ try{const j=JSON.parse(fs.readFileSync(OUT_NAMES,"utf8"));return j&&typeof j==="object"?j:{};}catch{return {};}}
function safePrevious(track,p){
  if(!p||p.verified!==true||!p.art||p.identity!==artworkKey(track.title,track.artist)) return null;
  if(["generic","derivative"].includes(p.releaseClass)||Number(p.confidence||0)<92) return null;
  return p;
}
function publicCandidate(c){ if(!c)return null; return {provider:c.provider,id:c.id,collectionId:c.collectionId,releaseTitle:c.releaseTitle,releaseArtist:c.releaseArtist,releaseDate:c.releaseDate,releaseClass:c.releaseClass,art:c.art,url:c.url,score:c.score,confidence:c.confidence,consensus:c.consensus,earliestReleaseYear:c.earliestReleaseYear}; }

const chart=await json(CHART+(CHART.includes("?")?"&":"?")+"artworkAudit="+Date.now());
const tracks=Array.isArray(chart?.tracks)?chart.tracks:[];
if(!tracks.length) throw new Error("chart is empty");
console.log("ARTWORK_AUDIT chart",chart.updated||"-",chart.rev||"-","rows",tracks.length);
let feed=[]; try{feed=await appleFeedCandidates();console.log("ARTWORK_AUDIT apple-feed candidates",feed.length);}catch(e){console.log("ARTWORK_AUDIT apple-feed unavailable",String(e.message||e));}
const oldAudit=readAudit(), oldNames=readNames(), covers={}, auditEntries={}, names={}, unresolved=[], sourceCounts={};
const mergeCounts=new Map(); for(const t of tracks){const k=mergeKey(t.title,t.artist);mergeCounts.set(k,(mergeCounts.get(k)||0)+1);}

for(let i=0;i<tracks.length;i++){
  const t=tracks[i], identity=artworkKey(t.title,t.artist);
  const feedMatches=feed.filter(c=>candidateCompatible(t,c));
  let candidates=[...feedMatches];
  const cleanFeed=feedMatches.map(c=>({c,cls:classifyCandidate(t,c)})).filter(x=>x.cls==="album"||x.cls==="dedicated");
  if(!cleanFeed.length){
    const currentApple=await currentAppleCandidate(t);
    if(currentApple) candidates.push(currentApple);
    try{candidates.push(...await searchApple(t));}catch(e){console.log("ARTWORK_AUDIT apple-search fail",i+1,t.artist,"-",t.title,String(e.message||e));}
    try{candidates.push(...await searchDeezer(t));}catch(e){console.log("ARTWORK_AUDIT deezer fail",i+1,t.artist,"-",t.title,String(e.message||e));}
  }
  const dedup=new Map(); for(const c of candidates){const k=[c.provider,c.id,c.collectionId,c.art].join("|");if(!dedup.has(k))dedup.set(k,c);} candidates=[...dedup.values()];
  const {selected,ranked}=selectArtworkCandidate(t,candidates);
  let chosen=selected; const prev=safePrevious(t,oldAudit[identity]);
  if(!chosen&&prev) chosen={...prev,provider:"previous-audit",score:Number(prev.score||0),confidence:Number(prev.confidence||92),releaseClass:prev.releaseClass||"album"};
  else if(chosen&&prev&&chosen.art!==prev.art){
    const strong=chosen.provider==="apple-feed"||chosen.consensus>=2||chosen.confidence>=98;
    const sameRelease=normalizedRelease(chosen.releaseTitle)===normalizedRelease(prev.releaseTitle);
    if(!strong&&!sameRelease&&Number(prev.confidence||0)>chosen.confidence) chosen={...prev,provider:"previous-audit",score:Number(prev.score||0),confidence:Number(prev.confidence||92),releaseClass:prev.releaseClass||"album"};
  }
  if(!chosen?.art){unresolved.push({rank:i+1,title:t.title,artist:t.artist,candidates:ranked.slice(0,4).map(publicCandidate)});console.log("ARTWORK_UNRESOLVED",i+1,t.artist,"-",t.title);continue;}
  covers[identity]=chosen.art; const legacy=mergeKey(t.title,t.artist); if((mergeCounts.get(legacy)||0)===1)covers[legacy]=chosen.art;
  sourceCounts[chosen.provider]=(sourceCounts[chosen.provider]||0)+1;
  const entry={identity,title:t.title,artist:t.artist,art:chosen.art,provider:chosen.provider,releaseTitle:String(chosen.releaseTitle||""),releaseArtist:String(chosen.releaseArtist||""),releaseDate:String(chosen.releaseDate||""),releaseClass:String(chosen.releaseClass||""),url:String(chosen.url||""),collectionId:String(chosen.collectionId||""),trackId:String(chosen.id||""),confidence:Number(chosen.confidence||0),score:Number(chosen.score||0),consensus:Number(chosen.consensus||0),verified:true,checkedAt:new Date().toISOString(),alternatives:ranked.slice(0,5).map(publicCandidate)};
  auditEntries[identity]=entry;
  const appleRanked=rankArtworkCandidates(t,candidates).filter(c=>String(c.provider).startsWith("apple")&&c.raw);
  let meta=appleRanked.find(c=>normalizedRelease(c.releaseTitle)===normalizedRelease(chosen.releaseTitle)); if(!meta)meta=appleRanked[0];
  const mk=mergeKey(t.title,t.artist); if(meta?.raw)names[mk]=appleRecord(meta.raw); else if(oldNames[mk])names[mk]=oldNames[mk];
  console.log("ARTWORK",JSON.stringify({rank:i+1,title:t.title,artist:t.artist,provider:entry.provider,release:entry.releaseTitle,class:entry.releaseClass,confidence:entry.confidence,consensus:entry.consensus,art:entry.art}));
}
if(unresolved.length){console.error("ARTWORK_UNRESOLVED_SUMMARY",JSON.stringify(unresolved));throw new Error(`artwork audit unresolved ${unresolved.length}/${tracks.length}; refusing to publish guesses`);}
for(const [k,e] of Object.entries(auditEntries)){
  if(["generic","derivative"].includes(e.releaseClass))throw new Error("unsafe artwork published: "+k);
  if(!/^https:\/\/(?:[^/]*mzstatic\.com|[^/]*dzcdn\.net)\//i.test(e.art))throw new Error("untrusted artwork host: "+k+" "+e.art);
}
const sortedCovers=Object.fromEntries(Object.entries(covers).sort(([a],[b])=>a.localeCompare(b)));
const sortedAudit=Object.fromEntries(Object.entries(auditEntries).sort(([a],[b])=>a.localeCompare(b)));
const sortedNames=Object.fromEntries(Object.entries(names).sort(([a],[b])=>a.localeCompare(b)));
fs.mkdirSync(path.dirname(OUT),{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(sortedCovers,null,2)+"\n");
fs.writeFileSync(OUT_AUDIT,JSON.stringify({schema:2,updatedAt:new Date().toISOString(),chartUpdated:String(chart.updated||""),chartRev:String(chart.rev||""),rows:tracks.length,sourceCounts,entries:sortedAudit},null,2)+"\n");
fs.writeFileSync(OUT_NAMES,JSON.stringify(sortedNames,null,2)+"\n");
console.log("ARTWORK_AUDIT_SUMMARY",JSON.stringify({rows:tracks.length,verified:Object.keys(sortedAudit).length,sourceCounts,covers:Object.keys(sortedCovers).length}));
