/**
 * Prebuild album suggestions; the website NEVER calls Spotify/Kworb/iTunes
 * to randomize. One cached JSON request on page load, then local picks.
 *
 * Run: node scripts/build-discover-albums.mjs --batch=35
 * Full initial build: --batch=500 (~30 minutes due to Apple's 20/min guidance).
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
 return out.slice(0,60);
}
async function getJSON(url){
 const r=await fetch(url,{headers:{'user-agent':'music98-news-discover/1.0 (music editorial recommendations)'},signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw Error(`${r.status} ${r.statusText} ${url}`);
 return r.json();
}
async function albumsFor(name){
 const url=new URL('https://itunes.apple.com/search');
 url.searchParams.set('term',name);
 url.searchParams.set('country','us');
 url.searchParams.set('media','music');
 url.searchParams.set('entity','album');
 url.searchParams.set('limit','200');
 let err;
 for(let attempt=0;attempt<2;attempt++){
  try{const result=await getJSON(url);return albumCandidates(result.results,name)}
  catch(e){err=e;if(attempt===0)await sleep(900)}
 }
 throw err;
}
export async function build({batch=35}={}){
 const r=await fetch(RANKING,{signal:AbortSignal.timeout(20000),headers:{'user-agent':'Mozilla/5.0 (compatible; music98-catalog-maintainer/1.0)'}});
 if(!r.ok)throw Error(`Ranking HTTP ${r.status}`);
 const ranking=parseTop500(await r.text());
 if(ranking.length!==LIMIT)throw Error(`Expected 500 ranked artists, got ${ranking.length}. Preserve prior snapshot.`);
 let previous={artists:[]};try{previous=JSON.parse(await fs.readFile(OUT,'utf8'))}catch(e){if(e.code!=='ENOENT')throw e}
 const previousByName=new Map((previous.artists||[]).map(a=>[normalize(a.name),a]));
 const newData=[];let fetched=0,failed=0;
 for(const item of ranking){
  const old=previousByName.get(normalize(item.name));
  const valid=old&&Array.isArray(old.albums)&&old.albums.length;
  const outdated=!valid||!old.checkedAt||(Date.now()-Date.parse(old.checkedAt))>30*86400_000;
  if(outdated&&fetched<batch){
   // Public iTunes Search API guidance: roughly 20 requests per minute.
   if(fetched)await sleep(3500);
   fetched++;
   try{
    const albums=await albumsFor(item.name);
    if(albums.length)newData.push({...item,albums,checkedAt:new Date().toISOString()});
    else if(valid)newData.push({...old,...item});
   }catch(e){failed++;console.warn('DEFER',item.rank,item.name,e.message);if(valid)newData.push({...old,...item})}
  }else if(valid)newData.push({...old,...item});
 }
 if(newData.length<5)throw Error('Insufficient valid albums: refusing overwrite');
 // Shuffle happens only in the browser; retain ordered artist ranks for audit.
 const output={schema:1,source:'kworb-spotify-monthly-listeners-and-itunes-search',isSample:newData.length<450,updatedAt:new Date().toISOString(),rankingCount:ranking.length,artists:newData};
 await fs.writeFile(OUT,JSON.stringify(output,null,2)+'\n');
 console.log('DISCOVER_CATALOG',JSON.stringify({artists:newData.length,albums:newData.reduce((n,a)=>n+a.albums.length,0),fetched,failed,source:output.source,isSample:output.isSample}));
 return output;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const arg=process.argv.find(x=>x.startsWith('--batch='));
 const batch=arg?Number(arg.slice(8)):35;
 if(!Number.isInteger(batch)||batch<1||batch>500)throw Error('Use --batch=1..500');
 build({batch}).catch(e=>{console.error('DISCOVER_FAILED',e.message);process.exitCode=1});
}
