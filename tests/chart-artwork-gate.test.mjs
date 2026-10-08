import test from "node:test";
import assert from "node:assert/strict";
import {hasCompleteChartArtwork,isTrustedChartArtwork,missingChartArtwork,artworkRegistryMismatches} from "../functions/lib/chart-artwork-gate.js";

const apple="https://is1-ssl.mzstatic.com/image/thumb/Music221/test/600x600bb.jpg";
const deezer="https://cdn-images.dzcdn.net/images/cover/test/1000x1000.jpg";
const rows=()=>Array.from({length:50},(_,i)=>({
  rank:i+1,title:"Song "+i,artist:"Artist",art:i%2?deezer:apple,
}));

test("50 verified CDN covers are valid, including previously audited Deezer editions",()=>{
  assert.equal(hasCompleteChartArtwork(rows()),true);
  assert.deepEqual(missingChartArtwork(rows()),[]);
});

test("a single missing or invalid artwork blocks the whole chart",()=>{
  for(const invalid of ["",undefined,"data:image/svg+xml,abc","https://example.com/image.jpg",
    "http://is1-ssl.mzstatic.com/image.jpg","https://fake-mzstatic.com/x.jpg","https://is1-ssl.mzstatic.com/"]){
    const tracks=rows();
    tracks[49].art=invalid;
    assert.equal(hasCompleteChartArtwork(tracks),false,String(invalid));
    assert.equal(missingChartArtwork(tracks).length,1,String(invalid));
    assert.equal(missingChartArtwork(tracks)[0].rank,50);
    assert.equal(isTrustedChartArtwork(invalid),false);
  }
});

test("a truncated or duplicated-size edition is never considered fully imaged",()=>{
  assert.equal(hasCompleteChartArtwork(rows().slice(0,49)),false);
  assert.equal(hasCompleteChartArtwork([]),false);
  assert.equal(hasCompleteChartArtwork(null),false);
  assert.equal(missingChartArtwork(rows().slice(0,49))[0].error,"invalid_chart_size");
});

test("trusted artwork allows HTTPS Apple and Deezer hosts only",()=>{
  assert.equal(isTrustedChartArtwork(apple),true);
  assert.equal(isTrustedChartArtwork(deezer),true);
  assert.equal(isTrustedChartArtwork("https://mzstatic.com/a.jpg"),true);
  assert.equal(isTrustedChartArtwork("https://dzcdn.net/a.jpg"),true);
});

test("production proof checks exact artwork registry, not just 50 valid-looking URLs",()=>{
  const tracks=rows();
  const key=(title,artist)=>title+"|"+artist;
  const registry=Object.fromEntries(tracks.map(t=>[key(t.title,t.artist),t.art]));
  assert.deepEqual(artworkRegistryMismatches(tracks,registry,key,key),[]);
  tracks[49].art=apple; // still a trusted URL, but no longer the verified release
  assert.equal(hasCompleteChartArtwork(tracks),true);
  const mismatch=artworkRegistryMismatches(tracks,registry,key,key);
  assert.equal(mismatch.length,1);
  assert.equal(mismatch[0].reason,"artwork_not_deployed");
  assert.equal(mismatch[0].rank,50);
  delete registry[key(tracks[49].title,tracks[49].artist)];
  assert.equal(artworkRegistryMismatches(tracks,registry,key,key)[0].reason,"not_in_registry");
});
