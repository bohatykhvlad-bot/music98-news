import {mergeKey} from "./chart-identity.js";
import {parseKworbGlobalStreams} from "./apple-spotify-chart.js";
export const SPOTIFY_TOP_SIZE=50;
export const SPOTIFY_INPUT_SIZE=200;
export const SPOTIFY_MAX_LAG_DAYS=3;

function textOf(html){
 return String(html||"").replace(/<[^>]*>/g," ")
  .replace(/&#x([\da-f]+);/gi,(_,v)=>String.fromCodePoint(parseInt(v,16)))
  .replace(/&#(\d+);/g,(_,v)=>String.fromCodePoint(Number(v)))
  .replace(/&(amp|quot|apos|nbsp|lt|gt);/gi,(_,v)=>({amp:"&",quot:'"',apos:"'",nbsp:" ",lt:"<",gt:">"})[v.toLowerCase()]||"")
  .replace(/\s+/g," ").trim();
}
function dateISO(s){
 const d=String(s||"").replace(/\//g,"-");
 if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||Number.isNaN(Date.parse(d+"T00:00:00Z")))return "";
 if(new Date(d+"T00:00:00Z").toISOString().slice(0,10)!==d)return "";
 return d;
}
function compactStreams(value,suffix){
 const n=Number(value),m={K:1e3,M:1e6,B:1e9}[String(suffix||"").toUpperCase()]||1;
 const out=Math.round(n*m);
 return Number.isSafeInteger(out)&&out>0?out:null;
}
export function spotifyDateCurrent(day,now=Date.now(),maxAge=SPOTIFY_MAX_LAG_DAYS){
 const date=dateISO(day),ms=Date.parse(date+"T00:00:00Z");
 if(!date||!Number.isFinite(ms))return false;
 const today=Math.floor(now/86400000)*86400000;
 return ms<=today&&today-ms<=maxAge*86400000;
}
export function validatedSpotifyRows(rows,limit=SPOTIFY_INPUT_SIZE){
 if(!Array.isArray(rows)||rows.length!==limit)throw new Error("spotify_expected_"+limit+"_rows");
 const sorted=[...rows].sort((a,b)=>Number(a.pos)-Number(b.pos)),identities=new Map(),ids=new Set();
 for(let i=0;i<limit;i++){
  const t=sorted[i],title=String(t?.title||"").trim(),artist=String(t?.artist||"").trim();
  if(Number(t?.pos)!==i+1||!title||!artist)throw new Error("spotify_missing_rank_"+(i+1));
  const key=mergeKey(title,artist);
  if(!key)throw new Error("spotify_invalid_identity_"+(i+1));
  const previous=identities.get(key);
  if(previous&&(!t.spotifyId||!previous.spotifyId))
   throw new Error("spotify_ambiguous_duplicate_without_ids_"+(i+1));
  identities.set(key,{spotifyId:t.spotifyId||null,pos:i+1});
  if(t.spotifyId){
   if(!/^[A-Za-z0-9]{22}$/.test(String(t.spotifyId))||ids.has(String(t.spotifyId)))
    throw new Error("spotify_invalid_or_duplicate_id_"+(i+1));
   ids.add(String(t.spotifyId));
  }
  if(!Number.isSafeInteger(Number(t.daily))||Number(t.daily)<=0)throw new Error("spotify_missing_daily_"+(i+1));
 }
 return sorted.map(t=>({pos:Number(t.pos),title:String(t.title).trim(),artist:String(t.artist).trim(),
  url:String(t.url||""),art:String(t.art||""),year:String(t.year||""),prev:"",
  daily:Number(t.daily),...(t.spotifyId?{spotifyId:String(t.spotifyId)}:{})}));
}
export function parseMusicrankSpotify(html,limit=SPOTIFY_INPUT_SIZE){
 const h=String(html||""),description=h.match(/<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)?.[1]||"";
 const human=description.match(/\bfor\s+([A-Za-z]+\s+\d{1,2},\s+20\d{2})\./i)?.[1];
 const parsed=human?new Date(human+" 00:00:00 UTC"):new Date(NaN);
 const date=Number.isNaN(parsed.getTime())?"":parsed.toISOString().slice(0,10);
 if(!date)throw new Error("musicrank_date_missing");
 const ld=[...h.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
  .map(m=>{try{return JSON.parse(m[1])}catch{return null}})
  .find(x=>x?.["@type"]==="ItemList"&&/Spotify/i.test(String(x.name||"")));
 const expected=ld?.itemListElement;
 if(!Array.isArray(expected)||expected.length<20)throw new Error("musicrank_top20_metadata_missing");

 const rows=new Map();
 for(const script of h.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)){
  const call=script[1].match(/^self\.__next_f\.push\(([\s\S]*)\)\s*;?$/);
  if(!call)continue;
  let chunk;try{chunk=JSON.parse(call[1])?.[1];}catch{continue;}
  if(typeof chunk!=="string")continue;
  const re=/\{"rank":(\d+),"title":("(?:\\.|[^"\\])*"),"artist":("(?:\\.|[^"\\])*"),"credits":\[[\s\S]*?\],"sourceEntityId":"([A-Za-z0-9]{22})","isrc":(?:null|"(?:\\.|[^"\\])*"),"value":"(\d+)"/g;
  for(const m of chunk.matchAll(re)){
   const pos=Number(m[1]);if(pos<1||pos>limit)continue;
   const row={pos,title:JSON.parse(m[2]),artist:JSON.parse(m[3]),spotifyId:m[4],daily:Number(m[5])};
   const prev=rows.get(pos);
   if(prev&&JSON.stringify(prev)!==JSON.stringify(row))throw new Error("musicrank_duplicate_rank_"+pos);
   rows.set(pos,row);
  }
 }
 if(rows.size!==limit)throw new Error("musicrank_serialized_rows_"+rows.size+"_of_"+limit);
 const tracks=validatedSpotifyRows(Array.from({length:limit},(_,i)=>rows.get(i+1)),limit);
 for(let i=0;i<20;i++){
  const record=expected[i];
  if(Number(record?.position)!==i+1||
   mergeKey(record?.item?.name,record?.item?.byArtist?.name)!==
   mergeKey(tracks[i].title,tracks[i].artist))
   throw new Error("musicrank_metadata_mismatch_"+(i+1));
 }
 return {date,source:"musicrank",sourceUrl:"https://musicrank.org/spotify",ldConfirmed:20,tracks};
}
/* The Spotify Global Daily chart is read from a source that can go down or
   start blocking us (Musicrank answers 403 behind a Cloudflare challenge).
   The shape of the data is the same everywhere - a dated Top 200 with the
   daily stream count of every row - so the providers are described once here
   and every check reads that description instead of naming one source. */
export const SPOTIFY_CHART_PROVIDERS={
 musicrank:{
  id:"musicrank",sourceUrl:"https://musicrank.org/spotify",
  archiveSource:"musicrank-spotify-global-daily",metric:"musicrank-spotify-chart-global-daily",
  requiresLd:true,parse:parseMusicrankSpotify},
 kworb:{
  id:"kworb",sourceUrl:"https://kworb.net/spotify/country/global_daily.html",
  archiveSource:"kworb-spotify-global-daily",metric:"kworb-spotify-chart-global-daily",
  requiresLd:false,parse:parseKworbSpotify},
};
export function spotifyProviderById(id){
 return SPOTIFY_CHART_PROVIDERS[String(id||"")]||null;
}
export function spotifyProviderByMetric(metric){
 for(const p of Object.values(SPOTIFY_CHART_PROVIDERS))if(p.metric===metric)return p;
 return null;
}
export function spotifyProviderByArchiveSource(source){
 for(const p of Object.values(SPOTIFY_CHART_PROVIDERS))if(p.archiveSource===source)return p;
 return null;
}
export const SPOTIFY_PROVIDER_ORDER=["musicrank","kworb"];

export function parseKworbSpotify(html,limit=SPOTIFY_INPUT_SIZE){
 const parsed=parseKworbGlobalStreams(html);
 if(!Array.isArray(parsed.tracks)||parsed.tracks.length<limit)
  throw new Error("kworb_expected_"+limit+"_rows");
 const rows=parsed.tracks.slice(0,limit).map(t=>({pos:Number(t.pos),title:String(t.title||"").trim(),
  artist:String(t.artist||"").trim(),url:"",art:"",year:"",prev:"",daily:Number(t.daily),
  ...(t.spotifyId?{spotifyId:String(t.spotifyId)}:{})}));
 const tracks=validatedSpotifyRows(rows,limit);
 return {date:parsed.date,source:"kworb",sourceUrl:SPOTIFY_CHART_PROVIDERS.kworb.sourceUrl,
  ldConfirmed:0,structural:true,tracks};
}

export function verifiedSpotifySnapshot(s,now=Date.now()){
 const provider=spotifyProviderById(s?.provider);
 if(s?.schema!==1||s.verified!==true||!provider||
  s.sourceUrl!==provider.sourceUrl||
  (provider.requiresLd&&Number(s.ldConfirmed)<20)||
  !spotifyDateCurrent(s.chartDate,now)||!/^[a-f0-9]{64}$/.test(String(s.fingerprint||"")))return null;
 try{
  const tracks=validatedSpotifyRows(s.tracks,SPOTIFY_INPUT_SIZE);
  return {date:s.chartDate,source:s.provider,sourceUrl:s.sourceUrl,fingerprint:s.fingerprint,
   provider:provider.id,metric:provider.metric,archiveSource:provider.archiveSource,tracks};
 }catch{return null;}
}
