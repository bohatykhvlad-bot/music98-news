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
   !Array.isArray(schema.itemListElement)||schema.itemListElement.length!==100||
   !schema.name?.includes(date.slice(0,4)))throw new Error("chartstats_incomplete_top100");
 const table=text.match(/<tbody\b[^>]*>([\s\S]*?)<\/tbody>/i);
 if(!table)throw new Error("chartstats_html_rows_missing");
 const rows=[...table[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
 if(rows.length!==100)throw new Error("chartstats_not_100_rows");
 const tracks=schema.itemListElement.map((rec,i)=>{
  if(rec.position!==i+1||rec.item?.["@type"]!=="MusicRecording")
   throw new Error("chartstats_rank_"+(i+1));
  const title=String(rec.item.name||"").trim(),artist=String(rec.item.byArtist?.name||"").trim();
  const htmlRow=rows[i][1];
  // Image metadata supplements the independently dated structured song list.
  const img=htmlRow.match(/<img\b[^>]*\bsrc=["'](https:\/\/[^"']*mzstatic\.com\/[^"']+)["']/i);
  const art=img?.[1]?.replaceAll("&amp;","&").replace(/300x300bb/,"600x600bb")||"";
  const first=htmlRow.match(/<td\b[^>]*>([\s\S]*?)<\/td>/i);
  const htmlPos=Number(first?.[1]?.replace(/<[^>]+>/g,"").trim());
  if(htmlPos!==i+1||!title||!artist||!art)throw new Error("chartstats_missing_rank_or_art_"+(i+1));
  return {pos:i+1,title,artist,url:"",art,year:"",prev:""};
 });
 const snapshot={schema:2,updated:new Date().toISOString().slice(0,10),
  capturedAt:new Date().toISOString(),source:"historical-apple-us-chartstats",
  sourceDate:date,region:"us",cadence:"daily",sourceUrl:link,
  archiveNote:"Dated Apple Music US rankings as recorded by ChartStats; not an official Apple archive",tracks};
 if(!verifiedDatedApple(snapshot,"U",date))throw new Error("chartstats_identity_invalid");
 return snapshot;
}
