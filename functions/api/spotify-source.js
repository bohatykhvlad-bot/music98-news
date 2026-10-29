import {readSpotifySource} from "../lib/spotify-source.js";

/* The verified Spotify Global Daily chart, as the Worker read it. The daily
   job takes the snapshot from here, because the machine that runs the job
   cannot reach the source itself. */
export async function onRequestGet(c){
 const snapshot=await readSpotifySource(c?.env);
 if(!snapshot)return new Response(JSON.stringify({error:"spotify_source_unavailable"}),
  {status:503,headers:{"content-type":"application/json","cache-control":"no-store"}});
 return new Response(JSON.stringify(snapshot),
  {headers:{"content-type":"application/json","cache-control":"no-store"}});
}
