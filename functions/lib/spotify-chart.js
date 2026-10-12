import {mergeKey} from "./chart-identity.js";
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
 const sorted=[...rows].sort((a,b)=>Number(a.pos)-Number(b.pos)),identities=new Set(),ids=new Set();
 for(let i=0;i<limit;i++){
  const t=sorted[i],title=String(t?.title||"").trim(),artist=String(t?.artist||"").trim();
  if(Number(t?.pos)!==i+1||!title||!artist)throw new Error("spotify_missing_rank_"+(i+1));
  const key=mergeKey(title,artist);
  if(!key||identities.has(key))throw new Error("spotify_duplicate_track_"+(i+1));
  identities.add(key);
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
 const from=h.indexOf("<main"),to=h.indexOf("</main>",from);
 if(from<0||to<from)throw new Error("musicrank_chart_body_missing");
 const main=h.slice(from,to),tracks=[],seen=new Set();
 const re=/<a\b[^>]*href=["'](\/track\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;let m;
 while((m=re.exec(main))&&tracks.length<limit){
  const url=m[1],title=textOf(m[2]);if(!title||seen.has(url))continue;
  const next=main.slice(re.lastIndex,re.lastIndex+3200);
  const boundary=next.search(/<a\b[^>]*href=["']\/track\//i);
  const context=boundary<0?next:next.slice(0,boundary);
  const artist=context.match(/<a\b[^>]*href=["']\/artist\/[^"']+["'][^>]*>([\s\S]*?)<\/a>/i);
  if(!artist)throw new Error("musicrank_artist_missing_"+(tracks.length+1));
  const flat=textOf(context),stream=flat.match(/([\d.]+)\s*([KMB]?)\s*streams\b/i);
  const daily=stream?compactStreams(stream[1],stream[2]):null;
  if(!daily)throw new Error("musicrank_streams_missing_"+(tracks.length+1));
  seen.add(url);tracks.push({pos:tracks.length+1,title,artist:textOf(artist[1]),daily});
 }
 if(tracks.length!==limit){
  const chunks=[...h.matchAll(/<script\\b[^>]*>([\\s\\S]*?)<\\/script>/gi)].map(x=>x[1]).join("\n");
  const at=chunks.indexOf('"rank":131');
  throw new Error("musicrank_visible_rows_"+tracks.length+":"+chunks.slice(Math.max(0,at),at<0?1200:at+1400));
 }
 const verified=validatedSpotifyRows(tracks,limit);
 const ids=new Map();
 for(const script of h.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)){
  const call=script[1].match(/^self\.__next_f\.push\(([\s\S]*)\)\s*;?$/);
  if(!call)continue;
  let chunk;try{chunk=JSON.parse(call[1])?.[1];}catch{continue;}
  if(typeof chunk!=="string")continue;
  for(const row of chunk.matchAll(/\{"rank":(\d+),"title":("(?:\\.|[^"\\])*"),"artist":("(?:\\.|[^"\\])*"),"credits":\[[\s\S]*?\],"sourceEntityId":"([A-Za-z0-9]{22})"/g)){
   const pos=Number(row[1]);if(pos<1||pos>limit)continue;
   const title=JSON.parse(row[2]),artist=JSON.parse(row[3]);
   if(mergeKey(title,artist)!==mergeKey(verified[pos-1]?.title,verified[pos-1]?.artist))
    throw new Error("musicrank_serialized_identity_mismatch_"+pos);
   ids.set(pos,row[4]);
  }
 }
 if(ids.size&&ids.size!==limit)throw new Error("musicrank_partial_spotify_ids");
 verified.forEach(t=>{if(ids.has(t.pos))t.spotifyId=ids.get(t.pos);});
 for(let i=0;i<20;i++){
  const record=expected[i];
  if(Number(record?.position)!==i+1||
   mergeKey(record?.item?.name,record?.item?.byArtist?.name)!==
   mergeKey(verified[i].title,verified[i].artist))
   throw new Error("musicrank_metadata_mismatch_"+(i+1));
 }
 return {date,source:"musicrank",sourceUrl:"https://musicrank.org/spotify",ldConfirmed:20,tracks:verified};
}
export function verifiedSpotifySnapshot(s,now=Date.now()){
 if(s?.schema!==1||s.verified!==true||s.provider!=="musicrank"||
  s.sourceUrl!=="https://musicrank.org/spotify"||s.ldConfirmed<20||
  !spotifyDateCurrent(s.chartDate,now)||!/^[a-f0-9]{64}$/.test(String(s.fingerprint||"")))return null;
 try{
  const tracks=validatedSpotifyRows(s.tracks,SPOTIFY_INPUT_SIZE);
  return {date:s.chartDate,source:s.provider,sourceUrl:s.sourceUrl,fingerprint:s.fingerprint,tracks};
 }catch{return null;}
}
