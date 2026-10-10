import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import {rankTriCandidates, TRI_METHOD, TRI_RULE} from "../functions/lib/tri-source-chart.js";

const site=readFileSync(new URL("../public/index.html",import.meta.url),"utf8");
const seed=JSON.parse(readFileSync(new URL("../public/data/apple-spotify-streams.json",import.meta.url),"utf8"));

function sliceBetween(source,begin,end){
 const a=source.indexOf(begin);
 const b=source.indexOf(end,a);
 assert.ok(a>=0&&b>a, "HTML chart functions not found: "+begin);
 return source.slice(a,b);
}
const setup=sliceBetween(site,"const DAILY_CHART_METHOD =","const APPLE_AT =");
const validators=sliceBetween(site,"function chartHasConsensusTracks(tracks){","function refreshDailyTop50(){");
const context=vm.createContext({
 URL,Number,Set,Map,
 normText:s=>String(s||"").normalize("NFKD").toLowerCase().replace(/[^\p{L}\p{N}]+/gu,""),
});
vm.runInContext(setup+"\n"+validators,context,{timeout:500});
function validates(method,chart) {
 return vm.runInContext(method+"(chart)",vm.createContext({...context,chart}),{timeout:500});
}
const chosen=rankTriCandidates(seed.tracks,seed.spotifyDate);
const chart={
 methodology:TRI_METHOD,consensus:TRI_RULE,complete:true,
 updated:seed.appleUsDate,sources:{U:100,A:100,S:seed.sourceSizes.S},
 sourceDates:{U:seed.appleUsDate,A:seed.appleGlobalDate,S:seed.spotifyDate},
 spotifyFingerprint:seed.fingerprint,tracks:chosen.tracks
};
test("production candidate sample is accepted by the real browser's current chart validators",()=>{
 assert.equal(chosen.tracks.length,50);
 assert.ok(chosen.tracks.every(t=>Number.isSafeInteger(t.spotify.daily)&&t.art&&t.url));
 assert.equal(validates("isDailySourceEdition",chart),true);
 assert.equal(validates("chartHasCompleteArtwork",{...chart,methodology:chart.methodology}.tracks) === true,false,
  "Methodology must be passed explicitly to artwork validation");
 const v=vm.runInContext("chartHasCompleteArtwork(chart.tracks,chart.methodology)",vm.createContext({...context,chart}),{timeout:500});
 assert.equal(v,true);
});
test("Spotify-only songs are accepted rather than rejected for having no Global Apple position",()=>{
 assert.ok(chart.tracks.some(t=>t.sourceRanks.A===null));
 assert.ok(chart.tracks.some(t=>t.sourceRanks.U===null&&t.sourceRanks.A===null));
 assert.equal(validates("isDailySourceEdition",chart),true);
});
test("browser blocks truly incomplete chart versions, fake streams and duplicate ranks",()=>{
 for(const mutate of [
  x=>{x.methodology="unknown";},
  x=>{x.tracks[0].spotify.daily=null;},
  x=>{x.tracks[0].spotify.status="track-not-found";},
  x=>{x.tracks[2].sourceRanks.U=x.tracks[0].sourceRanks.U;},
  x=>{x.tracks.pop();},
  x=>{x.spotifyFingerprint="not-valid";},
  x=>{x.sourceDates.S="not-a-date";}
 ]){
  const altered=structuredClone(chart);
  mutate(altered);
  assert.equal(validates("isDailySourceEdition",altered),false);
 }
 const wrongArtwork=structuredClone(chart);
 wrongArtwork.tracks[0].art="";
 const c=vm.createContext({...context,chart:wrongArtwork});
 assert.equal(vm.runInContext("chartHasCompleteArtwork(chart.tracks,chart.methodology)",c,{timeout:500}),false);
});
test("page fetch still targets live API and respects validation before painting",()=>{
 assert.match(site,/fetch\("\/api\/top50\?d="/);
 assert.match(site,/if\(!isDailySourceEdition\(j\) \|\| !chartHasCompleteArtwork\(tracks,j\.methodology\)\)/);
 assert.match(site,/applyDaily\(tracks, fresh \? "live" : "backup", j\.updated\)/);
});
