import {mergeKey} from "./chart-identity.js";
export const SPOTIFY_TOP_SIZE=100;
export const SPOTIFY_MAX_LAG_DAYS=2;
function textOf(html){
 return String(html||"").replace(/<[^>]*>/g,"")
  .replace(/&#x([\da-f]+);/gi,(_,v)=>String.fromCodePoint(parseInt(v,16)))
  .replace(/&#(\d+);/g,(_,v)=>String.fromCodePoint(Number(v)))
  .replace(/&(amp|quot|apos|nbsp|lt|gt);/gi,(_,v)=>({amp:"&",quot:'"',apos:"'",nbsp:" ",lt:"<",gt:">"})[v.toLowerCase()]||"")
  .replace(/\s+/g," ").trim();
}
function classes(attrs){
 const m=String(attrs).match(/\bclass\s*=\s*(["'])(.*?)\1/i);
 return new Set((m?.[2]||"").split(/\s+/).filter(Boolean));
}
function dateISO(s) {
 const d=String(s||"").replace(/\//g,"-");
 if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||Number.isNaN(Date.parse(d+"T00:00:00Z")))return "";
 if(new Date(d+"T00:00:00Z").toISOString().slice(0,10)!==d)return "";
 return d;
}
export function spotifyDateCurrent(day,now=Date.now(),maxAge=SPOTIFY_MAX_LAG_DAYS){
 const date=dateISO(day),ms=Date.parse(date+"T00:00:00Z");
 if(!date||!Number.isFinite(ms))return false;
 const today=Math.floor(now/86400000)*86400000;
 return ms<=today&&today-ms<=maxAge*86400000;
}
export function validatedSpotifyRows(rows,limit=SPOTIFY_TOP_SIZE){
 if(!Array.isArray(rows)||rows.length!==limit)throw new Error("spotify_expected_"+limit+"_rows");
 const sorted=[...rows].sort((a,b)=>Number(a.pos)-Number(b.pos)),identities=new Set();
 for(let i=0;i<limit;i++){
  const t=sorted[i],title=String(t?.title||"").trim(),artist=String(t?.artist||"").trim();
  if(Number(t?.pos)!==i+1||!title||!artist)throw new Error("spotify_missing_rank_"+(i+1));
  const key=mergeKey(title,artist);
  if(!key||identities.has(key))throw new Error("spotify_duplicate_track_"+(i+1));
  identities.add(key);
 }
 return sorted.map(t=>({pos:Number(t.pos),title:String(t.title).trim(),artist:String(t.artist).trim(),
  url:String(t.url||""),art:String(t.art||""),year:String(t.year||""),prev:""}));
}
export function parseKworbSpotify(html){
 const h=String(html||"");
 if(!/Spotify Daily Chart\s*-\s*Global/i.test(h.slice(0,5000)))throw new Error("kworb_wrong_chart");
 const m=h.match(/\b(20\d{2})[/-](\d{2})[/-](\d{2})\b/),date=dateISO(m?m[1]+"-"+m[2]+"-"+m[3]:"");
 if(!date)throw new Error("kworb_date_missing");
 const tracks=[];
 for(const row of h.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
  const cells=[...row[1].matchAll(/<td\b([^>]*)>([\s\S]*?)<\/td>/gi)];
  if(cells.length<3||!classes(cells[0][1]).has("np"))continue;
  const rank=textOf(cells[0][2]);if(!/^\d+$/.test(rank))continue;
  const pos=Number(rank);if(pos<1||pos>SPOTIFY_TOP_SIZE)continue;
  const cell=cells.find(c=>classes(c[1]).has("text")&&classes(c[1]).has("mp"));
  if(!cell)continue;
  const div=cell[2].match(/<div\b[^>]*>([\s\S]*?)<\/div>/i);
  const name=textOf(div?div[1]:cell[2]),cut=name.indexOf(" - ");
  if(cut<1)throw new Error("kworb_identity_missing_"+pos);
  tracks.push({pos,artist:name.slice(0,cut),title:name.slice(cut+3)});
 }
 return {date,source:"kworb",tracks:validatedSpotifyRows(tracks)};
}
export function parseMusicrankSpotify(html){
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
 while((m=re.exec(main))&&tracks.length<SPOTIFY_TOP_SIZE){
  const url=m[1],title=textOf(m[2]);if(!title||seen.has(url))continue;
  const next=main.slice(re.lastIndex,re.lastIndex+2500);
  const boundary=next.search(/<a\b[^>]*href=["']\/track\//i);
  const context=boundary<0?next:next.slice(0,boundary);
  const artist=context.match(/<a\b[^>]*href=["']\/artist\/[^"']+["'][^>]*>([\s\S]*?)<\/a>/i);
  if(!artist)throw new Error("musicrank_artist_missing_"+(tracks.length+1));
  seen.add(url);tracks.push({pos:tracks.length+1,title,artist:textOf(artist[1])});
 }
 const verified=validatedSpotifyRows(tracks);
 for(let i=0;i<20;i++){
  const record=expected[i];
  if(Number(record?.position)!==i+1||
   mergeKey(record?.item?.name,record?.item?.byArtist?.name)!==
   mergeKey(verified[i].title,verified[i].artist))
   throw new Error("musicrank_metadata_mismatch_"+(i+1));
 }
 return {date,source:"musicrank",ldConfirmed:20,tracks:verified};
}
export function compareSpotifyRankings(a,b){
 if(!a||!b||a.date!==b.date)return {ok:false,dateMatch:false,mismatchPositions:[]};
 try{validatedSpotifyRows(a.tracks);validatedSpotifyRows(b.tracks);}
 catch{return {ok:false,dateMatch:true,mismatchPositions:[]};}
 const mismatchPositions=[];
 for(let i=0;i<SPOTIFY_TOP_SIZE;i++)
  if(mergeKey(a.tracks?.[i]?.title,a.tracks?.[i]?.artist)!==
     mergeKey(b.tracks?.[i]?.title,b.tracks?.[i]?.artist))mismatchPositions.push(i+1);
 return {ok:mismatchPositions.length===0,dateMatch:true,mismatchPositions};
}
export function verifiedSpotifySnapshot(s,now=Date.now()){
 if(s?.schema!==1||s.verified!==true||!spotifyDateCurrent(s.chartDate,now))return null;
 if(s.provider!=="kworb+musicrank"||s.mirrorMatched!==SPOTIFY_TOP_SIZE)return null;
 if(!/^[a-f0-9]{64}$/.test(String(s.fingerprint||"")))return null;
 try{return {date:s.chartDate,source:s.provider,fingerprint:s.fingerprint,tracks:validatedSpotifyRows(s.tracks)};}
 catch{return null;}
}
