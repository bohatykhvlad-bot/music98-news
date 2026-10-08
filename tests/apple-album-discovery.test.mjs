import test from "node:test";
import assert from "node:assert/strict";
import {discoverAppleAlbumTracks} from "../functions/lib/apple-album-discovery.js";
import {candidateCompatible,isDerivativeRelease,isGenericRelease,rankArtworkCandidates} from "../functions/lib/artwork-resolver.js";
import {primaryArtist} from "../functions/lib/chart-identity.js";

const track={title:"Kid Myself",artist:"John Morgan"};
const art="https://is1-ssl.mzstatic.com/image/thumb/Music221/test/600x600bb.jpg";
const album={collectionId:1786449460,collectionName:"Carolina Blue",artistName:"John Morgan",trackCount:12,releaseDate:"2025-04-25"};
const stripped={collectionId:6796527394,collectionName:"Kid Myself (Stripped) - Single",artistName:"John Morgan",trackCount:2,releaseDate:"2026-08-03"};
const song={...album,trackId:1786450277,trackName:"Kid Myself",artworkUrl100:art,collectionArtistName:"John Morgan"};
const appleCandidate=(raw,provider)=>({
  provider,trackTitle:raw.trackName,artist:raw.artistName,
  releaseTitle:raw.collectionName,releaseArtist:raw.collectionArtistName||raw.artistName,
  art:raw.artworkUrl100,releaseDate:raw.releaseDate,trackCount:raw.trackCount,
  collectionId:String(raw.collectionId),id:String(raw.trackId||"")
});
const run=(mock,options)=>discoverAppleAlbumTracks(track,{
  json:async url=>mock(new URL(url)),appleCandidate,candidateCompatible,
  isDerivativeRelease,isGenericRelease,primaryArtist
},options);

test("finds original John Morgan album track by Apple artist ID when song search only saw stripped version",async()=>{
 const calls=[];
 const found=await run(u=>{
   calls.push(u.pathname+"?"+u.searchParams.toString());
   const id=u.searchParams.get("id"), entity=u.searchParams.get("entity");
   if(entity==="musicArtist")return {results:[{artistId:1578753790,artistName:"John Morgan"}]};
   if(entity==="album" && !id)return {results:[stripped]};
   if(entity==="album" && id==="1578753790")return {results:[{artistId:1578753790,artistName:"John Morgan"},album]};
   if(entity==="song" && id===String(album.collectionId))return {results:[album,song]};
   return {results:[]};
 },{countries:["US"]});
 assert.equal(found.length,1);
 assert.equal(found[0].id,"1786450277");
 assert.equal(found[0].releaseTitle,"Carolina Blue");
 assert.equal(rankArtworkCandidates(track,found)[0].art,art);
 assert.ok(calls.some(c=>c.includes("id=1578753790")&&c.includes("entity=album")));
 assert.ok(!calls.some(c=>c.includes("id=6796527394")&&c.includes("entity=song")));
});

test("tries GB catalog when the US storefront lacks an original album",async()=>{
 const found=await run(u=>{
   if(u.searchParams.get("country")==="US") return {results:[]};
   if(u.searchParams.get("entity")==="album" && !u.searchParams.has("id"))return {results:[album]};
   if(u.searchParams.get("entity")==="song")return {results:[song]};
   return {results:[]};
 },{countries:["US","GB"]});
 assert.equal(found.length,1);
 assert.equal(found[0].collectionId,String(album.collectionId));
});

test("never accepts an unrelated artist's recording or stripped release artwork",async()=>{
 const found=await run(u=>{
  if(u.searchParams.get("entity")==="album" && !u.searchParams.has("id"))
   return {results:[stripped,{...album,artistName:"Other Singer"}]};
  return {results:[]};
 },{countries:["US"]});
 assert.deepEqual(found,[]);
});

test("artist top-songs lookup restores original without searching every album",async()=>{
 const calls=[];
 const found=await run(u=>{
   const id=u.searchParams.get("id"),entity=u.searchParams.get("entity");
   calls.push(entity+":"+id);
   if(entity==="musicArtist")return {results:[{artistId:1578753790,artistName:"John Morgan"}]};
   if(entity==="song" && id==="1578753790")return {results:[{artistId:1578753790,artistName:"John Morgan"},song]};
   return {results:[]};
 },{countries:["US"]});
 assert.equal(found.length,1);
 assert.equal(found[0].releaseTitle,"Carolina Blue");
 assert.ok(calls.includes("song:1578753790"));
 assert.ok(!calls.includes("album:1578753790"),"artist's original song avoids expensive album scan");
});
