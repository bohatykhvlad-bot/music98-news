/**
 * Prebuild album suggestions; the website NEVER calls Spotify/Kworb/iTunes
 * to randomize. One cached JSON request on page load, then local picks.
 *
 * Run: node scripts/build-discover-albums.mjs --batch=500
 * Initial catalog: --batch=500 (about 30 minutes with Apple request pacing).
 * The chart is a third-party Kworb estimate, not official Spotify API data.
 */
import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

const OUT=new URL('../public/data/discover-albums.json',import.meta.url);
const RANKING='https://kworb.net/spotify/listeners.html';
const LIMIT=500;
const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/&/g,'and').replace(/[^\p{L}\p{N}]+/gu,' ').trim().toLowerCase();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

export function decodeHtml(str){
 return String(str).replace(/&#(x[\da-f]+|\d+);|&([a-z]+);/gi,(all,num,named)=>{
  if(num){let cp=num.toLowerCase().startsWith('x')?parseInt(num.slice(1),16):parseInt(num,10);return cp>0&&cp<=0x10ffff?String.fromCodePoint(cp):all}
  return ({amp:'&',quot:'"',apos:"'",nbsp:' ',lt:'<',gt:'>',rsquo:'’',lsquo:'‘',hellip:'…',eacute:'é'})[named.toLowerCase()]||all;
 });
}
const cleanHtml=s=>decodeHtml(String(s).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim());
export function parseTop500(html){
 const rows=[];
 for(const m of String(html).matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
  const cols=[...m[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(x=>cleanHtml(x[1]));
  if(cols.length<2)continue;
  const rank=Number(cols[0].replace(/[^\d]/g,''));
  const name=cols[1];
  if(rank===rows.length+1&&rank<=LIMIT&&name&&name.length<150)rows.push({name,rank});
  if(rows.length>=LIMIT)break;
 }
 return rows;
}
const OMIT=/(\b(deluxe|remix(?:es|ed)?|karaoke|instrumental|commentary|greatest hits|singles collection|compilation|live at|live in|anniversary edition|expanded edition|tour edition|video album)\b|\[live\]|\(live\)|\b(ep|single)\s*$)/i;
export function albumCandidates(items,artist){
 const exact=normalize(artist);
 const seen=new Set();
 const out=[];
 for(const v of Array.isArray(items)?items:[]){
  if(!v||!Number.isSafeInteger(Number(v.collectionId))||!(Number(v.collectionId)>0))continue;
  const artistLabel=v.artistName||'';
  if(normalize(artistLabel)!==exact)continue;
  const title=String(v.collectionName||'').trim();
  if(!title||OMIT.test(title))continue;
  if(v.collectionType&&String(v.collectionType).toLowerCase()!=='album')continue;
  if(v.trackCount&&Number(v.trackCount)<6)continue;
  const key=normalize(title);
  if(seen.has(key))continue;
  const year=Number(String(v.releaseDate||'').slice(0,4));
  if(year&&year>new Date().getUTCFullYear()+1)continue;
  seen.add(key);
  const artwork=String(v.artworkUrl100||'');
  out.push({id:Number(v.collectionId),title,year:year||null,genre:String(v.primaryGenreName||'Music'),...(/^https:\/\/[^/]*mzstatic\.com\//i.test(artwork)?{artwork:artwork.replace(/\d+x\d+bb(?:-\d+)?\./,'600x600bb.')}:{} )});
 }
 return out;
}
// iTunes Search API guidance is about 20 requests/minute, including lookups.
// Pacing is global rather than per-artist: search + lookup both count.
let lastAppleRequest=0;
async function getJSON(url){
 const wait=Math.max(0,3500-(Date.now()-lastAppleRequest));
 if(wait)await sleep(wait);
 lastAppleRequest=Date.now();
 const r=await fetch(url,{headers:{'user-agent':'music98-news-discover/1.0 (music editorial recommendations)'},signal:AbortSignal.timeout(25000)});
 if(!r.ok)throw Error(`${r.status} ${r.statusText} ${url}`);
 return r.json();
}
async function albumsFor(name){
 const search=new URL('https://itunes.apple.com/search');
 search.searchParams.set('term',name);
 search.searchParams.set('country','us');
 search.searchParams.set('media','music');
 search.searchParams.set('entity','album');
 search.searchParams.set('limit','200');
 let entries=[],err;
 for(let attempt=0;attempt<2;attempt++){
  try{const result=await getJSON(search);entries=Array.isArray(result.results)?result.results:[];err=null;break}
  catch(e){err=e;if(attempt===0)await sleep(1100)}
 }
 if(err)throw err;
 // Search returns a relevance-limited window. For each matched artist,
 // an ID-based lookup often adds older releases the search did not return.
 const exact=normalize(name);
 const idCounts=new Map();
 for(const item of entries){
  if(normalize(item?.artistName)!==exact)continue;
  const id=Number(item.artistId);
  if(Number.isSafeInteger(id)&&id>0)idCounts.set(id,(idCounts.get(id)||0)+1);
 }
 const artistId=[...idCounts].sort((a,b)=>b[1]-a[1])[0]?.[0];
 if(artistId){
  const lookup=new URL('https://itunes.apple.com/lookup');
  lookup.searchParams.set('id',String(artistId));
  lookup.searchParams.set('country','us');
  lookup.searchParams.set('entity','album');
  lookup.searchParams.set('limit','200');
  try{const result=await getJSON(lookup);entries.push(...(Array.isArray(result.results)?result.results:[]))}
  catch(e){console.warn('ARTIST_LOOKUP_FALLBACK',name,e.message)}
 }
 return albumCandidates(entries,name);
}
export async function build({batch=500}={}){
 const r=await fetch(RANKING,{signal:AbortSignal.timeout(20000),headers:{'user-agent':'Mozilla/5.0 (compatible; music98-catalog-maintainer/1.0)'}});
 if(!r.ok)throw Error(`Ranking HTTP ${r.status}`);
 const ranking=parseTop500(await r.text());
 if(ranking.length!==LIMIT)throw Error(`Expected 500 ranked artists, got ${ranking.length}. Preserve prior snapshot.`);
 let previous={artists:[]};try{previous=JSON.parse(await fs.readFile(OUT,'utf8'))}catch(e){if(e.code!=='ENOENT')throw e}
 const previousByName=new Map((previous.artists||[]).map(a=>[normalize(a.name),a]));
 const newData=[];let fetched=0,failed=0;
 for(const item of ranking){
  const old=previousByName.get(normalize(item.name));
  const valid=Boolean(old&&Array.isArray(old.albums)&&old.albums.length);
  const outdated=!valid||!old.checkedAt||(Date.now()-Date.parse(old.checkedAt))>6*86400_000;
  if(outdated&&fetched<batch){
   fetched++;
   try{
    const albums=await albumsFor(item.name);
    if(albums.length)newData.push({...item,albums,checkedAt:new Date().toISOString()});
    else if(valid)newData.push({...old,...item});
    else newData.push({...item,albums:[],checkedAt:new Date().toISOString()});
   }catch(e){
    failed++;console.warn('DEFER',item.rank,item.name,e.message);
    newData.push(valid?{...old,...item}:{...item,albums:[],checkedAt:null});
   }
  }else if(old)newData.push({...old,...item,albums:Array.isArray(old.albums)?old.albums:[]});
  else newData.push({...item,albums:[],checkedAt:null});
 }
 // Keep all 500 ranking entries for audit, even where an artist has no
 // discoverable qualifying album. The browser chooses only playable entries.
 const playable=newData.filter(a=>a.albums?.length).length;
 const priorPlayable=(previous.artists||[]).filter(a=>a.albums?.length).length;
 const minHealthy=priorPlayable>=300?Math.floor(priorPlayable*.8):(batch===500?300:5);
 if(newData.length!==LIMIT||playable<minHealthy)
  throw Error(`Catalog incomplete: ${newData.length} ranked, ${playable} with albums (minimum ${minHealthy}); preserve prior snapshot`);
 if(newData.some(a=>!Array.isArray(a.albums)||a.albums.some(x=>!Number.isSafeInteger(x.id))))
  throw Error('Catalog validation failed: preserve previous catalog');
 // The catalog includes 500 ranked artists; only those with validated albums
 // are selectable. Counts make this distinction transparent.
 const output={schema:1,source:'kworb-spotify-monthly-listeners-and-itunes-search',isSample:playable<450,updatedAt:new Date().toISOString(),rankingCount:ranking.length,playableArtistCount:playable,missingArtistCount:LIMIT-playable,artists:newData};
 const tmp=new URL('../public/data/discover-albums.json.pending',import.meta.url);
 try{await fs.writeFile(tmp,JSON.stringify(output,null,2)+'\n');await fs.rename(tmp,OUT)}
 finally{await fs.rm(tmp,{force:true}).catch(()=>{})}
 console.log('DISCOVER_CATALOG',JSON.stringify({artists:newData.length,playable,albums:newData.reduce((n,a)=>n+a.albums.length,0),fetched,failed,source:output.source,isSample:output.isSample}));
 return output;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const arg=process.argv.find(x=>x.startsWith('--batch='));
 const batch=arg?Number(arg.slice(8)):500;
 if(!Number.isInteger(batch)||batch<1||batch>500)throw Error('Use --batch=1..500');
 build({batch}).catch(e=>{console.error('DISCOVER_FAILED',e.message);process.exitCode=1});
}
