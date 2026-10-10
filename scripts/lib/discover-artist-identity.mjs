import '../../public/discover-catalog-policy.js';
import {titleKey,htmlText} from '../../functions/lib/apple-spotify-chart.js';
const {artistIdentityKey,identityVersion}=globalThis.music98DiscoverCatalogPolicy;
export {artistIdentityKey,identityVersion};
export function spotifySongTitles(html, name) {
 const label=htmlText(String(html).match(/<title>(.*?)<\/title>/is)?.[1]);
 if(artistIdentityKey(label)!==artistIdentityKey(name+' - Spotify Top Songs'))throw Error('Wrong Spotify artist page: '+name);
 return [...String(html).matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].flatMap(m=>{
  const text=htmlText(m[1]);
  const title=m[1].match(/href=["']https:\/\/open\.spotify\.com\/track\/[A-Za-z0-9]{22}["'][^>]*>([\s\S]*?)<\/a>/i)?.[1];
  return title&&!/^\*/.test(text)?[htmlText(title)]:[];
 }).slice(0,30);
}
export function anchorArtistId(items, titles, expectedName) {
 const anchors=[...new Set(titles.map(titleKey))], byArtist=new Map();
 const loose=s=>artistIdentityKey(s).normalize('NFD').replace(/\p{M}/gu,'').replace(/[^\p{L}\p{N}]/gu,'');
 const profiles=new Map(items.filter(v=>v.wrapperType==='artist').map(v=>[v.artistId,v.artistName]));
 for(const song of items){
  if(song.kind!=='song'||!Number.isSafeInteger(song.artistId)||!song.trackName)continue;
  if(expectedName){
   const label=profiles.get(song.artistId)||song.artistName;
   const same=loose(label)===loose(expectedName)||(!profiles.has(song.artistId)
     && (artistIdentityKey(label).startsWith(artistIdentityKey(expectedName)+' & ')
       ||artistIdentityKey(label).startsWith(artistIdentityKey(expectedName)+', ')));
   if(!same)continue;
  }
  const key=titleKey(song.trackName);
  if(!anchors.includes(key))continue;
  const hit=byArtist.get(song.artistId)||{id:song.artistId,name:song.artistName,keys:new Set()};
  hit.keys.add(key);byArtist.set(song.artistId,hit);
 }
 const ranked=[...byArtist.values()].sort((a,b)=>b.keys.size-a.keys.size);
 // Multiple distinct recordings corroborate the artist ID. A count of albums
 // or the first same-name search result cannot establish this identity.
 const best=ranked[0];
 if(!best||best.keys.size<2||(ranked[1]&&best.keys.size<ranked[1].keys.size+2))return null;
 const profile=items.find(v=>v.wrapperType==='artist'&&v.artistId===best.id);
 return {artistId:best.id,appleArtistName:profile?.artistName||best.name,identityEvidence:best.keys.size};
}
export async function resolveArtistProfile(entry, searchItems, {json,text}) {
 if(!/^[A-Za-z0-9]{22}$/.test(entry.spotifyArtistId||''))throw Error('Spotify artist ID missing: '+entry.name);
 const loose=s=>artistIdentityKey(s).normalize('NFD').replace(/\p{M}/gu,'').replace(/[^\p{L}\p{N}]/gu,'');
 const ids=[...new Set(searchItems.filter(v=>loose(v.artistName)===loose(entry.name))
   .map(v=>v.artistId).filter(v=>Number.isSafeInteger(v)&&v>0))];
 if(!ids.length)throw Error('Apple artist ID missing: '+entry.name);
 const source=`https://kworb.net/spotify/artist/${entry.spotifyArtistId}_songs.html`;
 const titles=spotifySongTitles(await text(source),entry.name);
 if(!titles.length)throw Error('Spotify identity anchors missing: '+entry.name);
 const url=new URL('https://itunes.apple.com/lookup');
 url.searchParams.set('id',ids.join(','));url.searchParams.set('country','us');url.searchParams.set('entity','song');url.searchParams.set('limit','200');
 const result=await json(url);let resolved=anchorArtistId(result.results||[],titles,entry.name);
 if(!resolved){
  // The real artist may have been absent from the relevance-limited album
  // search. Resolve through distinct Spotify recordings before choosing an ID.
  const songs=[];
  for(const title of titles.slice(0,3)){
   const search=new URL('https://itunes.apple.com/search');
   search.searchParams.set('term',entry.name+' '+title);search.searchParams.set('entity','song');
   search.searchParams.set('country','us');search.searchParams.set('limit','50');
   const found=await json(search);songs.push(...(found.results||[]));
  }
  resolved=anchorArtistId(songs,titles,entry.name);
  if(resolved){
   const artistUrl=new URL('https://itunes.apple.com/lookup');artistUrl.searchParams.set('id',String(resolved.artistId));artistUrl.searchParams.set('country','us');
   const profile=(await json(artistUrl)).results?.find(v=>v.wrapperType==='artist'&&v.artistId===resolved.artistId);
   if(!profile)throw Error('Apple canonical artist unavailable: '+entry.name);
   resolved.appleArtistName=profile.artistName;
  }
 }
 if(!resolved)throw Error('Ambiguous Apple artist: '+entry.name);
 return {...resolved,spotifyArtistId:entry.spotifyArtistId,identitySource:source};
}
