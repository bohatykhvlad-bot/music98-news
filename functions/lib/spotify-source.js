import {parseMusicrankSpotify,spotifyDateCurrent,SPOTIFY_INPUT_SIZE,
 SPOTIFY_CHART_PROVIDERS,buildSpotifySnapshot,verifiedSpotifySnapshot} from "./spotify-chart.js";

/* The Spotify Global Daily chart is read by the Worker.
   Musicrank publishes it, but it answers a Cloudflare challenge to the
   machines that run the daily collection job, and not to the Worker. The
   Worker reads the chart, keeps the verified snapshot in the key-value store,
   and the job takes the snapshot from there. */

export const SPOTIFY_SOURCE_KV="spotify-chart-source";
export const SPOTIFY_SOURCE_ENDPOINT="https://music98.news/api/spotify-source";

const UA={"user-agent":"Mozilla/5.0 (compatible; music98-chart-source/8.0)","cache-control":"no-cache"};

export async function fetchSpotifyChartText(url=SPOTIFY_CHART_PROVIDERS.musicrank.sourceUrl){
 const res=await fetch(url,{headers:UA,signal:AbortSignal.timeout(30000)});
 if(!res.ok)throw new Error("HTTP "+res.status+" "+url);
 return await res.text();
}

/* Read the chart and build the verified snapshot of it. */
export async function collectSpotifySnapshot(){
 const provider=SPOTIFY_CHART_PROVIDERS.musicrank;
 const html=await fetchSpotifyChartText(provider.sourceUrl);
 const chosen=provider.parse(html,SPOTIFY_INPUT_SIZE);
 if(!spotifyDateCurrent(chosen.date))throw new Error("stale_or_future_spotify_edition_"+chosen.date);
 return buildSpotifySnapshot(chosen,provider.id);
}

/* Keep the newest verified snapshot. An older edition never replaces a newer
   one, and an unchanged chart is not written again. */
export async function refreshSpotifySource(env){
 if(!env||!env.DESK)return {ok:false,reason:"no_kv"};
 const previous=await env.DESK.get(SPOTIFY_SOURCE_KV,{type:"json"});
 let snapshot;
 try{ snapshot=await collectSpotifySnapshot(); }
 catch(error){ return {ok:false,reason:String(error?.message||error)}; }
 if(previous?.chartDate&&previous.chartDate>snapshot.chartDate)
  return {ok:false,reason:"older_edition_"+snapshot.chartDate};
 if(previous?.chartDate===snapshot.chartDate&&previous?.fingerprint===snapshot.fingerprint&&
    verifiedSpotifySnapshot(previous))
  return {ok:true,changed:false,date:snapshot.chartDate};
 await env.DESK.put(SPOTIFY_SOURCE_KV,JSON.stringify(snapshot));
 return {ok:true,changed:true,date:snapshot.chartDate,rows:snapshot.tracks.length};
}

/* The snapshot the job reads when the source itself cannot be reached from
   the machine that runs the job. */
export async function snapshotFromWorker(url=SPOTIFY_SOURCE_ENDPOINT,fetcher=fetch){
 let res;
 try{ res=await fetcher(url,{headers:UA,signal:AbortSignal.timeout(25000)}); }
 catch(e){ throw new Error("Worker snapshot unreachable: "+String(e?.message||e)); }
 if(!res.ok)throw new Error("Worker snapshot HTTP "+res.status);
 const payload=await res.json();
 if(!verifiedSpotifySnapshot(payload))throw new Error("Worker snapshot failed verification");
 return payload;
}

/* The snapshot the job reads. */
export async function readSpotifySource(env){
 if(!env||!env.DESK)return null;
 const value=await env.DESK.get(SPOTIFY_SOURCE_KV,{type:"json"});
 if(!value||!verifiedSpotifySnapshot(value))return null;
 return value;
}
