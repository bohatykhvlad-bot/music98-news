import {mergeKey} from "./chart-identity.js";

export function datedChartPath(kind,date) {
 if(!["apple-us","apple-global","spotify-global"].includes(kind)||
   !/^20\d{2}-\d{2}-\d{2}$/.test(date||"")||
   new Date(date+"T00:00:00Z").toISOString().slice(0,10)!==date)
   throw new Error("invalid_chart_archive_path");
 return "chart-history/"+kind+"-"+date+".json";
}

export function verifiedDatedApple(snapshot,region,date){
 const isUS=region==="U",size=snapshot?.tracks?.length;
 if(!["U","A"].includes(region) ||
   snapshot?.schema!==2||snapshot.sourceDate!==date||
   !/^20\d{2}-\d{2}-\d{2}$/.test(date||"")||
   snapshot.region!==(isUS?"us":"global")||
   snapshot.cadence!=="daily"||
   (isUS ? size!==100 : ![50,100].includes(size)) ||
   !(isUS?
    ["official-apple-us-playlist","historical-apple-us-chartstats"].includes(snapshot.source):
    snapshot.source==="official-apple-global-playlist"))return null;
 if(snapshot.source==="historical-apple-us-chartstats"&&
   snapshot.sourceUrl!=="https://chartstats.com/US/songs/"+date)return null;
 if(!Array.isArray(snapshot.tracks))return null;
 const seen=new Set();
 for(let i=0;i<snapshot.tracks.length;i++){
  const t=snapshot.tracks[i],key=mergeKey(t?.title,t?.artist);
  if(!key||t.pos!==i+1||seen.has(key))return null;
  seen.add(key);
 }
 return snapshot;
}

export function verifiedDatedSpotify(snapshot,date) {
 if(snapshot?.schema!==1||snapshot.source!=="kworb-spotify-global-daily"||
  snapshot.region!=="global"||snapshot.date!==date||
  !Array.isArray(snapshot.tracks)||snapshot.tracks.length!==200)return null;
 const ids=new Set(),identity=new Set();
 for(let i=0;i<200;i++){
  const t=snapshot.tracks[i],key=mergeKey(t?.title,t?.artist);
  if(t?.pos!==i+1||!key||identity.has(key)||
    !/^[A-Za-z0-9]{22}$/.test(t.spotifyId||"")||
    ids.has(t.spotifyId)||!Number.isSafeInteger(t.daily)||t.daily<0)return null;
  ids.add(t.spotifyId);identity.add(key);
 }
 return snapshot;
}
export function parseChartStatsUsHistorical(html,date){
 const text=String(html||"");
 const link='https://chartstats.com/US/songs/'+date;
 if(!/^20\d{2}-\d{2}-\d{2}$/.test(date||"")||
   !text.includes('<link rel="canonical" href="'+link+'"')||
   !text.includes('The Apple Music Top 100 in United States'))throw new Error("chartstats_wrong_date");
 const match=text.match(/<script\b[^>]*\bid=["']page-jsonld["'][^>]*>([\s\S]*?)<\/script>/i);
 if(!match)throw new Error("chartstats_jsonld_missing");
 let schema;
 try { schema=JSON.parse(match[1]); }catch{throw new Error("chartstats_jsonld_invalid");}
 if(schema["@type"]!=="ItemList"||schema.numberOfItems!==100||
   !Array.isArray(schema.itemListElement)||schema.itemListElement.length<10||
   !schema.name?.includes(date.slice(0,4)))throw new Error("chartstats_incomplete_or_wrong_date_jsonld");
 // Structured data contains only the first ten songs. The page's dated HTML
 // table contains the full 100, with rank, title, artist and artwork.
 const table=text.match(/<tbody\b[^>]*>([\s\S]*?)<\/tbody>/i);
 if(!table)throw new Error("chartstats_html_rows_missing");
 const rows=[...table[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
 if(rows.length!==100)throw new Error("chartstats_not_100_rows:"+rows.length);
 const unescapeHtml=s=>String(s||"").replace(/&#(x[0-9a-f]+|\d+);|&(?:amp|quot|apos|lt|gt|nbsp|#39);/gi,m=>{
  const entities={"&amp;":"&","&quot;":'"',"&apos;":"'","&lt;":"<","&gt;":">","&nbsp;":" ","&#39;":"'"};
  const key=m.toLowerCase();
  if(entities[key])return entities[key];
  const n=key.match(/^&#(x[0-9a-f]+|\d+);$/);
  if(n){const v=n[1].startsWith("x")?parseInt(n[1].slice(1),16):parseInt(n[1],10);
   return v>0&&v<=0x10FFFF?String.fromCodePoint(v):"";}
  return m;
 });
 const content=s=>unescapeHtml(String(s||"").replace(/<[^>]+>/g,"")).trim();
 const tracks=rows.map((record,i)=>{
  const row=record[1];
  const cells=[...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)];
  const pos=Number(content(cells[0]?.[1]));
  const titleMatch=row.match(/<a\b[^>]*href=["']\/song\/[^"']+["'][^>]*>([\s\S]*?)<\/a>/i);
  const artistMatch=row.match(/<a\b[^>]*href=["']\/artist\/[^"']+["'][^>]*>([\s\S]*?)<\/a>/i);
  const title=content(titleMatch?.[1]),artist=content(artistMatch?.[1]);
  const image=row.match(/<img\b[^>]*\bsrc=["'](https:\/\/[^"']*mzstatic\.com\/[^"']+)["']/i);
  const art=image?.[1]?.replaceAll("&amp;","&").replace(/300x300bb/,"600x600bb")||"";
  if(pos!==i+1||!title||!artist||!art)throw new Error("chartstats_missing_song_or_art_"+(i+1));
  // Check the top ten against independently rendered JSON-LD positions.
  if(i<schema.itemListElement.length){
   const check=schema.itemListElement[i];
   if(check.position!==i+1||check.item?.["@type"]!=="MusicRecording"||
     mergeKey(check.item?.name,check.item?.byArtist?.name)!==mergeKey(title,artist))
    throw new Error("chartstats_table_jsonld_mismatch_"+(i+1));
  }
  return {pos,title,artist,url:"",art,year:"",prev:""};
 });
 const snapshot={schema:2,updated:new Date().toISOString().slice(0,10),
  capturedAt:new Date().toISOString(),source:"historical-apple-us-chartstats",
  sourceDate:date,region:"us",cadence:"daily",sourceUrl:link,
  archiveNote:"Dated Apple Music US rankings as recorded by ChartStats; not an official Apple archive",tracks};
 if(!verifiedDatedApple(snapshot,"U",date))throw new Error("chartstats_identity_invalid");
 return snapshot;
}
