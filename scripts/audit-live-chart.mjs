import fs from "node:fs";
import {verifiedStreamSeed,HYBRID_METHOD,isAppleSpotifyChart} from "../functions/lib/apple-spotify-chart.js";
import {verifiedTriSeed,TRI_METHOD,isTriChart} from "../functions/lib/tri-source-chart.js";

/* Production and GitHub's independent Spotify reference must match exactly.
   Wait briefly for Workers Builds to deploy when a new snapshot is committed. */
const mirror=JSON.parse(fs.readFileSync(new URL("../public/data/apple-spotify-streams.json",import.meta.url),"utf8"));
const verified=verifiedTriSeed(mirror)||verifiedStreamSeed(mirror);
const validChart=j=>j?.methodology===TRI_METHOD?isTriChart(j):isAppleSpotifyChart(j);
if(!verified)throw new Error("Spotify reference is missing, unverified or too old");
let j=null,reason="";
const attempts=20;
for(let attempt=0;attempt<attempts;attempt++){
 try{
 const res=await fetch("https://music98.news/api/top50?audit="+Date.now()+"&try="+attempt,
   {headers:{"user-agent":"music98-chart-audit/2.0","cache-control":"no-cache"},signal:AbortSignal.timeout(15000)});
 if(res.ok){
   j=await res.json();
   if(!j.fallback && validChart(j) &&
     j.sourceDates?.S===verified.spotifyDate && j.spotifyFingerprint===verified.fingerprint)break;
 }
 reason=JSON.stringify({status:res.status,updated:j?.updated,rev:j?.rev,
  fallback:j?.fallback,sources:j?.sources,spotifyDate:j?.sourceDates?.S});
 }catch(error){reason=String(error?.message||error);}
 if(attempt<attempts-1)await new Promise(done=>setTimeout(done,15000));
}
if(!j || j.fallback || j.complete!==true ||
  j.methodology!==verified.methodology || !validChart(j) ||
  j.sourceDates?.S!==verified.spotifyDate || j.spotifyFingerprint!==verified.fingerprint)
  throw new Error("Published chart differs from the verified source: "+reason);
if(j.methodology===TRI_METHOD && j.tracks.some(t=>t.spotify?.status!=="matched"||!Number.isSafeInteger(t.spotify.daily)))
 throw new Error("live Top 50 contains unverified or missing Spotify daily stream counts");
console.log("SPOTIFY_SOURCE_AUDIT",JSON.stringify({date:verified.spotifyDate,provider:verified.methodology,
  rows:j.tracks.length,fingerprint:verified.fingerprint,liveOrigin:j.sourceOrigin?.S,updated:j.updated}));
const news = (j.tracks || []).filter(x => String(x.delta).toLowerCase() === "new");
const olivia = (j.tracks || []).find(x => /drop dead/i.test(x.title || "") && /olivia rodrigo/i.test(x.artist || ""));
const rankSnapshot = (j.tracks || []).map((t, i) => ({
  rank: i + 1,
  title: t.title,
  artist: t.artist,
  weeks: Number(t.weeks) || 0,
  delta: String(t.delta == null ? "" : t.delta),
}));
console.log("RANK_SNAPSHOT", JSON.stringify(rankSnapshot));
console.log("UPDATED", j.updated, "REV", j.rev);
console.log("SOURCES", JSON.stringify(j.sources || {}));
console.log("ARROWS", JSON.stringify(j.arrows || {}));
console.log("MEMORY", JSON.stringify(j.memory || {}));
console.log("OLIVIA_DROP_DEAD", JSON.stringify(olivia || null));
console.log("NEW_ROWS", JSON.stringify(news.map(x => ({rank:x.rank,title:x.title,artist:x.artist,weeks:x.weeks,delta:x.delta}))));
const missingArtwork=(j.tracks||[]).map((t,i)=>({rank:i+1,title:t.title,artist:t.artist,url:t.url||""})).filter((_,i)=>!String(j.tracks[i]?.art||"").trim());
console.log("ARTWORK_STATUS", JSON.stringify({missing:missingArtwork.length,rows:(j.tracks||[]).length,missingRows:missingArtwork}));
if(missingArtwork.length) throw new Error("BLOCKED: published Top 50 has missing artwork: "+JSON.stringify(missingArtwork));
const near=(j.memory && j.memory.nearMiss) || [];
if (olivia) {
  const hit=near.find(x => /dropdead/i.test(String(x.key||"").replace(/[^a-z0-9]/gi,"")));
  console.log("OLIVIA_NEAR_MISS", JSON.stringify(hit || null));
}
if (j.arrows && j.arrows.ok === false) throw new Error("arrow/tenure self-check failed");

/* A structurally valid arrow map can still hide a destroyed tenure registry:
   on 2026-10-01 every row became "1 day" after a rebuild. Compare against the
   last healthy repo snapshot so a mass reset can never pass CI again. */
const {mergeKey} = await import("../functions/lib/chart-identity.js");
const backup = JSON.parse(fs.readFileSync(new URL("../public/data/chart-tenure-backup.json", import.meta.url), "utf8"));
const currentSnap = backup && backup.current;
const previousSnap = backup && backup.previous;
const prior = currentSnap && currentSnap.updated === j.updated ? previousSnap : currentSnap;
if (prior && Array.isArray(prior.tracks) && prior.tracks.length >= 10) {
  const priorDay = Date.parse(String(prior.updated || "") + "T00:00:00Z");
  const liveDay = Date.parse(String(j.updated || "") + "T00:00:00Z");
  const gap = Number.isFinite(priorDay) && Number.isFinite(liveDay)
    ? Math.round((liveDay - priorDay) / 86400000) : null;
  const old = new Map(prior.tracks.map(t => [mergeKey(t.title,t.artist), t]));
  const live = Array.isArray(j.tracks) ? j.tracks : [];
  const compared = live.map((t, i) => {
    const p = old.get(mergeKey(t.title,t.artist)) || null;
    const expectedDelta = p ? String(Number(p.rank) - (i + 1)) : null;
    const actualDelta = String(t.delta == null ? "" : t.delta).toLowerCase();
    const arrowOk = p
      ? actualDelta === expectedDelta
      : actualDelta === "new" || actualDelta === "re-entry";
    const daysOk = !p || gap !== 1 || Number(t.weeks) === Number(p.weeks) + 1;
    return {
      rank:i+1,title:t.title,artist:t.artist,priorRank:p && p.rank,
      actualDelta:String(t.delta == null ? "" : t.delta),
      expectedDelta,arrowOk,
      days:Number(t.weeks)||0,priorDays:p && Number(p.weeks),daysOk
    };
  });
  const badArrows = compared.filter(x => !x.arrowOk);
  const badDays = compared.filter(x => !x.daysOk);
  const matched = compared.filter(x => x.priorRank != null);
  const entrants = compared.filter(x => x.priorRank == null);
  const liveKeys = new Set(live.map(t => mergeKey(t.title,t.artist)));
  const dropped = prior.tracks
    .filter(t => !liveKeys.has(mergeKey(t.title,t.artist)))
    .map(t => ({rank:t.rank,title:t.title,artist:t.artist}));
  const established = matched.filter(x => Number(x.priorDays) >= 2);
  const regressed = established.filter(x => Number(x.days) <= Number(x.priorDays));
  const ones = established.filter(x => Number(x.days) <= 1);

  console.log("DAY_OVER_DAY", JSON.stringify({
    priorUpdated:prior.updated,liveUpdated:j.updated,gap,
    rows:live.length,matched:matched.length,entrants,dropped,
    badArrows,badDays
  }));
  console.log("TENURE_CONTINUITY", JSON.stringify({
    backupUpdated: prior.updated, liveUpdated: j.updated, gap,
    overlap: matched.length, established: established.length,
    regressed: regressed.length, oneDay: ones.length
  }));

  if (!validChart(j)) throw new Error("live chart did not pass independent source verification");
  if (badArrows.length) throw new Error("day-over-day arrow mismatch: " + JSON.stringify(badArrows));
  if (badDays.length) throw new Error("day-over-day tenure mismatch: " + JSON.stringify(badDays));
  if (gap === 1 && established.length >= 10) {
    if (ones.length >= Math.ceil(established.length * 0.25)) {
      throw new Error("mass tenure reset detected: established songs collapsed to 1 day");
    }
    if (regressed.length >= Math.ceil(established.length * 0.25)) {
      throw new Error("tenure continuity regressed against previous healthy day");
    }
  }
}
console.log("LIVE_CHART_AUDIT PASS");
