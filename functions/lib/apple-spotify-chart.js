import {mergeKey,versionSignature} from './chart-identity.js';

export const HYBRID_METHOD='apple-top50-spotify-daily-v1';
export const HYBRID_RULE='apple-candidates-spotify-boost-v1';
export const SPOTIFY_BONUS_MAX=10;
export const KWORB_ARTISTS_URL='https://kworb.net/spotify/artists.html';
export const MIN_STREAM_COVERAGE=25;
const UNKNOWN_STATUSES=new Set(['track-not-found','artist-not-tracked','ambiguous','stale','different-edition']);

export function htmlText(s){
 return String(s||'').replace(/<[^>]*>/g,'').replace(/&#x([\da-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)))
  .replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)))
  .replace(/&(amp|quot|apos|nbsp|lt|gt);/gi,(_,n)=>({amp:'&',quot:'"',apos:"'",nbsp:' ',lt:'<',gt:'>'})[n.toLowerCase()])
  .replace(/\s+/g,' ').trim();
}
export const artistKey=s=>String(s||'').normalize('NFKD').toLowerCase().replace(/\p{M}/gu,'').replace(/[^\p{L}\p{N}]+/gu,'');
export const titleKey=s=>artistKey(String(s||'').replace(/\((?:feat\.?|ft\.?|with|w\/)\s+[^)]*\)/gi,''));
export function leadingArtist(s){return String(s||'').split(/\s*(?:,| & | feat\.? | ft\.? )\s*/i)[0].trim();}
export function parseKworbArtists(html){
 if(!/Spotify most streamed artists/i.test(htmlText(String(html).slice(0,12000))))throw new Error('kworb_wrong_artist_index');
 const out=new Map();
 for(const m of String(html).matchAll(/<a\b[^>]*href=["'](?:https:\/\/kworb.net)?\/spotify\/artist\/([A-Za-z0-9]{22})_songs\.html["'][^>]*>([\s\S]*?)<\/a>/gi)){
  const name=htmlText(m[2]),key=artistKey(name);
  if(out.has(key)&&(!out.get(key)||out.get(key).id!==m[1])){out.set(key,null);continue;}
  out.set(key,{name,id:m[1],url:`https://kworb.net/spotify/artist/${m[1]}_songs.html`});
 }
 if(out.size<100)throw new Error('kworb_partial_artist_index');
 return out;
}
export function parseKworbArtistDaily(html,artist){
 const h=String(html),pageTitle=htmlText(h.match(/<title>(.*?)<\/title>/is)?.[1]);
 if(pageTitle!==artist.name+' - Spotify Top Songs')throw new Error('kworb_wrong_artist_page:'+artist.name);
 const date=h.match(/Last updated:\s*(20\d{2}\/\d{2}\/\d{2})/i)?.[1]?.replaceAll('/','-');
 if(!date)throw new Error('kworb_artist_date_missing');
 const table=[...h.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)].find(m=>/Song Title/.test(m[1])&&/Daily/.test(m[1]));
 if(!table)throw new Error('kworb_daily_table_missing');
 const headers=[...table[1].matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)].map(m=>htmlText(m[1]));
 if(JSON.stringify(headers)!==JSON.stringify(['Song Title','Streams','Daily']))throw new Error('kworb_daily_columns_changed');
 const tracks=[];
 for(const row of table[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
  const cells=[...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)];if(!cells.length)continue;
  const link=cells[0][1].match(/<a\b[^>]*href=["']https:\/\/open\.spotify\.com\/track\/([A-Za-z0-9]{22})["'][^>]*>([\s\S]*?)<\/a>/i);
  if(!link||cells.length!==3)throw new Error('kworb_daily_row_changed');
  const dailyText=htmlText(cells[2][1]),totalText=htmlText(cells[1][1]);
  const number=s=>/^\d[\d,]*$/.test(s)?Number(s.replaceAll(',','')):null;
  const daily=number(dailyText),total=number(totalText);
  if(!Number.isSafeInteger(total)||total<0|| (daily!==null&&(!Number.isSafeInteger(daily)||daily<0||daily>total)))throw new Error('kworb_invalid_daily_streams');
  tracks.push({title:htmlText(link[2]),spotifyId:link[1],daily,total,featured:/^\s*\*/.test(htmlText(cells[0][1]))});
 }
 if(!tracks.length)throw new Error('kworb_empty_artist_page');
 return {date,tracks};
}
export function matchKworbTrack(apple,page){
 // The page is resolved by the full leading artist, not an ambiguous title-only search.
 const same=t=>titleKey(t.title)===titleKey(apple.title)&&versionSignature(t.title)===versionSignature(apple.title);
 const hits=page.tracks.filter(t=>!t.featured&&same(t));
 const ids=new Set(hits.map(t=>t.spotifyId));
 if(ids.size>1)return {status:'ambiguous'};
 const hit=hits[0];
 return hit&&hit.daily!==null?{status:'matched',...hit}:{status:'track-not-found'};
}
export function freshDay(day,now=Date.now(),lag=2){
 const ms=Date.parse(day+'T00:00:00Z'),today=Math.floor(now/86400000)*86400000;
 return /^20\d{2}-\d{2}-\d{2}$/.test(day||'')&&Number.isFinite(ms)&&new Date(ms).toISOString().slice(0,10)===day&&ms<=today&&today-ms<=lag*86400000;
}
export function validHybridRows(rows){
 if(!Array.isArray(rows)||rows.length!==50)return false;
 const ranks=new Set(),keys=new Set(),ids=new Set();
 return rows.every(t=>{
  const a=t.sourceRanks?.A??t.pos,key=mergeKey(t.title,t.artist);
  if(!t.title||!t.artist||!Number.isInteger(a)||a<1||a>50||ranks.has(a)||keys.has(key))return false;
  ranks.add(a);keys.add(key);
  const s=t.spotify;
  if(s?.status==='matched'){
   if(!Number.isSafeInteger(s.daily)||s.daily<0||!/^[A-Za-z0-9]{22}$/.test(s.spotifyId||'')||ids.has(s.spotifyId)||
     !/^https:\/\/kworb\.net\/spotify\/artist\/[A-Za-z0-9]{22}_songs\.html$/.test(s.sourceUrl||'')||!freshDay(s.date,Date.parse(s.date+'T00:00:00Z')))return false;
   ids.add(s.spotifyId);return true;
  }
  return UNKNOWN_STATUSES.has(s?.status)&&s.daily===null;
 });
}
export function verifiedStreamSeed(s,now=Date.now()){
 if(s?.schema!==1||s.methodology!==HYBRID_METHOD||!freshDay(s.appleDate,now)||!freshDay(s.spotifyDate,now)||
   !/^[a-f0-9]{64}$/.test(s.fingerprint||'')||!validHybridRows(s.tracks))return null;
 const hits=s.tracks.filter(t=>t.spotify.status==='matched');
 if(hits.length<MIN_STREAM_COVERAGE||hits.length!==s.coverage?.matched||hits.some(t=>t.spotify.date!==s.spotifyDate))return null;
 return s;
}
export function rankAppleSpotify(rows){
 if(!validHybridRows(rows))throw new Error('invalid_hybrid_candidates');
 const max=Math.max(1,...rows.filter(t=>t.spotify.status==='matched').map(t=>t.spotify.daily));
 return rows.map(t=>{
  const a=t.sourceRanks?.A??t.pos,applePoints=51-a;
  const spotifyBonus=t.spotify.status==='matched'?SPOTIFY_BONUS_MAX*t.spotify.daily/max:0;
  return {...t,sourceRanks:{A:a},score:applePoints+spotifyBonus,applePoints,spotifyBonus};
 }).sort((a,b)=>b.score-a.score||a.sourceRanks.A-b.sourceRanks.A).map((t,i)=>({...t,rank:i+1}));
}
export function isAppleSpotifyChart(j){
 if(j?.methodology!==HYBRID_METHOD||j.consensus!==HYBRID_RULE||j.complete!==true||j.sources?.A!==50||Object.keys(j.sources||{}).length!==2||
   !/^[a-f0-9]{64}$/.test(j.spotifyFingerprint||'')||!validHybridRows(j.tracks))return false;
 const matched=j.tracks.filter(t=>t.spotify.status==='matched');
 if(matched.length<MIN_STREAM_COVERAGE||matched.length!==j.sources.S||matched.some(t=>t.spotify.date!==j.sourceDates?.S))return false;
 const expected=rankAppleSpotify(j.tracks);
 return expected.every((t,i)=>mergeKey(t.title,t.artist)===mergeKey(j.tracks[i].title,j.tracks[i].artist)&&
  j.tracks[i].rank===i+1&&Math.abs(t.score-j.tracks[i].score)<1e-8);
}
