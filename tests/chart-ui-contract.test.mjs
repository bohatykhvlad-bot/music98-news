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
// Browser contract test: project the last checked-in reference edition onto
// the CURRENT source schema. This is a synthetic UI fixture, not published data.
const fixtureDate=new Date().toISOString().slice(0,10);
const fixtureRows=seed.tracks.map(t=>({...t,spotify:t.spotify.status==="matched"
 ? {...t.spotify,metric:"musicrank-spotify-chart-global-daily",
    sourceUrl:"https://musicrank.org/spotify",date:fixtureDate}:t.spotify}));
const chosen=rankTriCandidates(fixtureRows,fixtureDate);
const chart={
 methodology:TRI_METHOD,consensus:TRI_RULE,complete:true,
 updated:fixtureDate,sources:{U:100,A:seed.sourceSizes.A,S:seed.sourceSizes.S},
 sourceDetails:{A:{provenance:seed.archiveProvenance?.A}},
 sourceDates:{U:fixtureDate,A:fixtureDate,S:fixtureDate},
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
test("Spotify-only songs are eligible but not required in every top 50 edition",()=>{
 // Every track must carry at least one source rank.
 assert.ok(chart.tracks.every(t=>t.sourceRanks.U!==null||t.sourceRanks.A!==null||t.sourceRanks.S!==null));
 assert.equal(validates("isDailySourceEdition",chart),true);
 // A track with no Apple rank is eligible: the edition must still validate.
 // The checked-in daily sample changes every day, so this asserts the rule
 // rather than the presence of a Spotify-only track in today's data.
 const withoutApple=structuredClone(chart);
 const target=withoutApple.tracks.find(t=>t.sourceRanks.A!==null);
 assert.ok(target,"the fixture must contain an Apple-ranked track to drop");
 target.sourceRanks.A=null;
 assert.ok(target.sourceRanks.U!==null||target.sourceRanks.S!==null);
 assert.equal(validates("isDailySourceEdition",withoutApple),true);
});
test("browser blocks truly incomplete chart versions, fake streams and duplicate ranks",()=>{
 for(const mutate of [
  x=>{x.methodology="unknown";},
  x=>{x.tracks[0].spotify.daily=null;},
  x=>{x.tracks[0].spotify.status="track-not-found";},
  x=>{x.tracks[2].sourceRanks.U=x.tracks[0].sourceRanks.U;},
  x=>{x.tracks.pop();},
  x=>{x.spotifyFingerprint="not-valid";},
  x=>{x.sourceDates.S="not-a-date";},
  x=>{x.sourceDates.U="2020-10-07";},
  x=>{x.sources.A=50;x.sourceDetails.A.provenance={source:"unknown",rows:50};}
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
