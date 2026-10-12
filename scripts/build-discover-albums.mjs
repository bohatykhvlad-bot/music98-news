/**
 * Prebuild album suggestions; the website NEVER calls Spotify/Kworb/iTunes
 * to randomize. One cached JSON request on page load, then local picks.
 *
 * Run: node scripts/build-discover-albums.mjs --batch=750
 * Initial catalog: --batch=750 (typically around 60-80 minutes with Apple pacing).
 * The chart is a third-party Kworb estimate, not official Spotify API data.
 */
import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import '../public/discover-catalog-policy.js';
import {resolveArtistProfile,artistIdentityKey,identityVersion} from './lib/discover-artist-identity.mjs';
export const {excludedGenre,excludedArtist,eligibleAlbums}=globalThis.music98DiscoverCatalogPolicy;
const POLICY_VERSION=globalThis.music98DiscoverCatalogPolicy.version;

const OUT=new URL('../public/data/discover-albums.json',import.meta.url);
const RANKING='https://kworb.net/spotify/listeners.html';
const LIMIT=500;
const SOURCE_LIMIT=2500;
const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/&/g,'and').replace(/[^\p{L}\p{N}]+/gu,' ').trim().toLowerCase();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

export function decodeHtml(str){
 return String(str).replace(/&#(x[\da-f]+|\d+);|&([a-z]+);/gi,(all,num,named)=>{
  if(num){let cp=num.toLowerCase().startsWith('x')?parseInt(num.slice(1),16):parseInt(num,10);return cp>0&&cp<=0x10ffff?String.fromCodePoint(cp):all}
  return ({amp:'&',quot:'"',apos:"'",nbsp:' ',lt:'<',gt:'>',rsquo:'’',lsquo:'‘',hellip:'…',eacute:'é'})[named.toLowerCase()]||all;
 });
}
const cleanHtml=s=>decodeHtml(String(s).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim());
export function parseRankedArtists(html,limit=SOURCE_LIMIT){
 const rows=[];
 for(const m of String(html).matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
  const raw=[...m[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)];
  const cols=raw.map(x=>cleanHtml(x[1]));
  if(cols.length<2)continue;
  const rank=Number(cols[0].replace(/[^\d]/g,''));
  const name=cols[1];
  const spotifyArtistId=raw[1]?.[1].match(/artist\/([A-Za-z0-9]{22})_songs\.html/)?.[1];
  if(rank===rows.length+1&&rank<=limit&&name&&name.length<150)rows.push({name,rank,...(spotifyArtistId?{spotifyArtistId}:{})});
  if(rows.length>=limit)break;
 }
 return rows;
}
export const parseTop500=html=>parseRankedArtists(html,LIMIT);
const OMIT=/(\b(deluxe|remix(?:es|ed)?|karaoke|instrumental|commentary|greatest hits|singles collection|compilation|live at|live in|anniversary edition|expanded edition|tour edition|video album)\b|\[live\]|\(live\)|\b(ep|single)\s*$)/i;
export function albumCandidates(items,artist,artistId){
 const exact=artistIdentityKey(artist);
 const seen=new Set();
 const out=[];
 for(const v of Array.isArray(items)?items:[]){
  if(!v||!Number.isSafeInteger(Number(v.collectionId))||!(Number(v.collectionId)>0))continue;
  const artistLabel=v.artistName||'';
  if(artistIdentityKey(artistLabel)!==exact||Number(v.artistId)!==artistId)continue;
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
  out.push({id:Number(v.collectionId),artistId,artistName:artistLabel,title,year:year||null,genre:String(v.primaryGenreName||'Music'),...(/^https:\/\/[^/]*mzstatic\.com\//i.test(artwork)?{artwork:artwork.replace(/\d+x\d+bb(?:-\d+)?\./,'600x600bb.')}:{} )});
 }
 return out;
}
export function albumLookupStale(old, now=Date.now()){
 if(old?.albums?.length&&!globalThis.music98DiscoverCatalogPolicy.verifiedIdentity(old))return true;
 const checkedAt=old?.checkedAt?Date.parse(old.checkedAt):NaN;
 return !Number.isFinite(checkedAt)||(now-checkedAt)>6*86400_000;
}
// Avoid repeating ~1,000 paced Apple calls after a successful full catalog
// build merely because several code changes queued additional workflow runs.
export function reusableCatalog(previous,ranking,now=Date.now()){
 if(previous?.schema!==2||previous?.genrePolicyVersion!==POLICY_VERSION||previous?.identityPolicyVersion!==identityVersion)return false;
 const arr=previous.artists;
 if(!Array.isArray(arr)||arr.length!==LIMIT||!Array.isArray(ranking)||ranking.length<LIMIT)return false;
 const cache=new Map([...arr,...(previous.excludedArtists||[]),...(previous.missingArtists||[])]
   .map(a=>[normalize(a.name),a]));
 const expected=[];
 for(const entry of ranking){
  const old=cache.get(normalize(entry.name));
  if(!old||albumLookupStale(old,now))return false;
  if(old.reason!=='excluded-genre'&&eligibleAlbums(old).length)expected.push(entry);
  if(expected.length===LIMIT)break;
 }
 return expected.length===LIMIT&&expected.every((entry,i)=>{
  const old=arr[i];
  return old.rank===entry.rank&&normalize(old.name)===normalize(entry.name)
    &&old.position===i+1&&eligibleAlbums(old).length===old.albums.length;
 });
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
async function albumsFor(name,entry={}){
 if(globalThis.music98DiscoverCatalogPolicy.verifiedIdentity(entry)&&entry.appleArtistName){
  const lookup=new URL('https://itunes.apple.com/lookup');
  lookup.searchParams.set('id',String(entry.artistId));lookup.searchParams.set('country','us');
  lookup.searchParams.set('entity','album');lookup.searchParams.set('limit','200');
  const results=(await getJSON(lookup)).results||[];
  const artist=results.find(v=>v.wrapperType==='artist'&&v.artistId===entry.artistId);
  if(!artist||artistIdentityKey(artist.artistName)!==artistIdentityKey(entry.appleArtistName))throw Error('Apple artist identity changed: '+name);
  return {...entry,genre:String(artist.primaryGenreName||''),albums:albumCandidates(results,entry.appleArtistName,entry.artistId)};
 }
 const search=new URL('https://itunes.apple.com/search');
 search.searchParams.set('term',name);
 search.searchParams.set('country','us');
 search.searchParams.set('media','music');
 search.searchParams.set('entity','album');
 search.searchParams.set('limit','200');
 let entries=[],err,genre="";
 for(let attempt=0;attempt<2;attempt++){
  try{const result=await getJSON(search);entries=Array.isArray(result.results)?result.results:[];err=null;break}
  catch(e){err=e;if(attempt===0)await sleep(1100)}
 }
 if(err)throw err;
 // Search returns a relevance-limited window. For each matched artist,
 // an ID-based lookup often adds older releases the search did not return.
 const identity=await resolveArtistProfile({...entry,name},entries,{json:getJSON,text:async url=>{
  const r=await fetch(url,{signal:AbortSignal.timeout(25000)});
  if(!r.ok)throw Error('Spotify artist identity HTTP '+r.status);
  return r.text();
 }});
 const {artistId,appleArtistName}=identity;
 if(artistId){
  const lookup=new URL('https://itunes.apple.com/lookup');
  lookup.searchParams.set('id',String(artistId));
  lookup.searchParams.set('country','us');
  lookup.searchParams.set('entity','album');
  lookup.searchParams.set('limit','200');
  try{const result=await getJSON(lookup);
    const matched=(result.results||[]).find(v=>v.wrapperType==='artist'&&v.artistId===artistId&&artistIdentityKey(v.artistName)===artistIdentityKey(appleArtistName));
    genre=String(matched?.primaryGenreName||'');
    entries.push(...(Array.isArray(result.results)?result.results:[]))}
  catch(e){console.warn('ARTIST_LOOKUP_FALLBACK',name,e.message)}
 }
 return {...identity,albums:albumCandidates(entries,appleArtistName,artistId),genre};
}
export async function assembleCatalog(ranking,previous,{batch=750,lookup=albumsFor,now=Date.now()}={}){
 const oldRecords=[...(previous?.artists||[])];
 // Empty matches are independent of genre policy. Version 2 only adds genre
 // exclusions, so version 1's exclusions also remain valid until refreshed.
 oldRecords.push(...(previous?.missingArtists||[]));
 if(previous?.genrePolicyVersion===POLICY_VERSION
    ||previous?.genrePolicyVersion===1&&POLICY_VERSION===2)
  oldRecords.push(...(previous.excludedArtists||[]));
 const previousByName=new Map(oldRecords.map(a=>[normalize(a.name),a]));
 const artists=[],excludedArtists=[],missingArtists=[];
 const names=new Set();let fetched=0,failed=0,scanned=0;
 for(const entry of ranking){
  scanned++;
  const key=normalize(entry.name);
  if(!key||names.has(key))continue;
  names.add(key);
  const cached=previousByName.get(key);
  const old=previous?.identityPolicyVersion===identityVersion&&cached?.spotifyArtistId===entry.spotifyArtistId?cached:null;
  let profile=old?{...old,...entry}:{...entry,albums:[],checkedAt:null};
  if(albumLookupStale(old,now)&&fetched<batch){
   fetched++;
   try{
    const result=await lookup(entry.name,old?{...old,...entry}:entry);
    const albums=Array.isArray(result)?result:result.albums;
    if(!Array.isArray(albums))throw Error('Invalid Apple album response');
    // Preserve a prior positive match when an otherwise successful Apple
    // search unexpectedly returns nothing; do not erase a healthy catalog.
    if(albums.length||!old?.albums?.length)
      profile={...entry,...(Array.isArray(result)?{}:result),genre:Array.isArray(result)?'':String(result.genre||''),albums,checkedAt:new Date(now).toISOString()};
   }catch(e){failed++;console.warn('DEFER',entry.rank,entry.name,e.message);}
  }
  if(profile.reason==='excluded-genre'||excludedArtist(profile)){
   excludedArtists.push({...entry,reason:'excluded-genre',
    genres:[...new Set([profile.genre,...(profile.albums||[]).map(a=>a.genre),...(profile.genres||[])].filter(Boolean))],checkedAt:profile.checkedAt});
  }else{
   const albums=eligibleAlbums(profile);
   if(albums.length&&globalThis.music98DiscoverCatalogPolicy.verifiedIdentity(profile))artists.push({...profile,...entry,position:artists.length+1,albums,checkedAt:profile.checkedAt});
   else missingArtists.push({...entry,albums:[],checkedAt:profile.checkedAt});
  }
  if(scanned%25===0||artists.length===LIMIT)
   console.log('DISCOVER_PROGRESS',JSON.stringify({scanned,selected:artists.length,total:LIMIT,excluded:excludedArtists.length,unmatched:missingArtists.length,queries:fetched,errors:failed}));
  if(artists.length===LIMIT)break;
 }
 if(artists.length!==LIMIT)
  throw Error(`Catalog incomplete: ${artists.length}/500 eligible artists after ${scanned} ranked entries (${fetched} lookups). Preserve prior snapshot.`);
 const ids=new Set();let lastRank=0;
 for(let i=0;i<artists.length;i++){
  const artist=artists[i];
  if(artist.position!==i+1||artist.rank<=lastRank||ids.has(normalize(artist.name)))throw Error('Filtered ranking integrity failed');
  lastRank=artist.rank;ids.add(normalize(artist.name));
  const albums=new Set();
  for(const album of artist.albums){
   if(!Number.isSafeInteger(album.id)||album.id<=0||albums.has(album.id)||excludedGenre(album.genre))throw Error(`Invalid album for ${artist.name}`);
   albums.add(album.id);
  }
 }
 return {schema:2,identityPolicyVersion:identityVersion,genrePolicyVersion:POLICY_VERSION,source:'kworb-spotify-monthly-listeners-and-itunes-search',isSample:false,
  updatedAt:new Date(now).toISOString(),rankingCount:LIMIT,playableArtistCount:LIMIT,missingArtistCount:0,
  sourceRankingCount:ranking.length,scannedRankingCount:scanned,excludedArtistCount:excludedArtists.length,
  unmatchedArtistCount:missingArtists.length,fetchedArtistCount:fetched,failedLookupCount:failed,
  artists,excludedArtists,missingArtists};
}

export async function build({batch=750}={}){
 let ranking=[],rankError;
 for(let attempt=0;attempt<3;attempt++){
  try{
   const r=await fetch(RANKING,{signal:AbortSignal.timeout(30000),headers:{'user-agent':'Mozilla/5.0 (compatible; music98-catalog-maintainer/1.0)'}});
   if(!r.ok)throw Error(`Ranking HTTP ${r.status}`);
   ranking=parseRankedArtists(await r.text());
   if(ranking.length<LIMIT)throw Error(`Parsed only ${ranking.length} Kworb artists`);
   rankError=null;break;
  }catch(e){rankError=e;if(attempt<2)await sleep(3000*(attempt+1))}
 }
 if(rankError)throw Error(`Could not load ranking: ${rankError.message}`);
 let previous={artists:[]};try{previous=JSON.parse(await fs.readFile(OUT,'utf8'))}catch(e){if(e.code!=='ENOENT')throw e}
 if(reusableCatalog(previous,ranking)){
  console.log('DISCOVER_CATALOG_REUSED',JSON.stringify({rankedArtists:LIMIT,albums:previous.artists.reduce((n,a)=>n+a.albums.length,0),updatedAt:previous.updatedAt}));
  return previous;
 }
 const output=await assembleCatalog(ranking,previous,{batch});
 const tmp=new URL('../public/data/discover-albums.json.pending',import.meta.url);
 try{await fs.writeFile(tmp,JSON.stringify(output,null,2)+'\n');await fs.rename(tmp,OUT)}
 finally{await fs.rm(tmp,{force:true}).catch(()=>{})}
 const albums=output.artists.reduce((n,a)=>n+a.albums.length,0);
 console.log('DISCOVER_CATALOG',JSON.stringify({selected:LIMIT,scanned:output.scannedRankingCount,excluded:output.excludedArtistCount,albums,fetched:output.fetchedArtistCount,failed:output.failedLookupCount,updatedAt:output.updatedAt}));
 if(process.env.GITHUB_STEP_SUMMARY){
  const lines=['## music98 Discover catalog audit','',`- Eligible artists with Apple albums: **500/500**`,
   `- Source ranks scanned: **${output.scannedRankingCount}**`,`- Artists excluded by genre: **${output.excludedArtistCount}**`,
   `- Albums available: **${albums}**`,`- Failed lookups: **${output.failedLookupCount}**`,`- Refreshed: ${output.updatedAt}`,''];
  await fs.appendFile(process.env.GITHUB_STEP_SUMMARY,lines.join('\n'));
 }
 return output;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const arg=process.argv.find(x=>x.startsWith('--batch='));
 const batch=arg?Number(arg.slice(8)):750;
 if(!Number.isInteger(batch)||batch<1||batch>2500)throw Error('Use --batch=1..2500');
 build({batch}).catch(e=>{console.error('DISCOVER_FAILED',e.message);process.exitCode=1});
}
