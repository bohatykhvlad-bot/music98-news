import assert from "node:assert/strict";
import fs from "node:fs";
import { artworkArtistSignature, artworkCreditSignature, artworkKey, mergeKey, versionSignature } from "../functions/lib/chart-identity.js";
import { candidateCompatible, isGenericRelease, selectArtworkCandidate } from "../functions/lib/artwork-resolver.js";
const track=(title,artist)=>({title,artist});
const c=o=>({provider:"apple",id:"1",collectionId:"10",trackTitle:"Song",artist:"Artist",releaseTitle:"Album",releaseArtist:"Artist",releaseDate:"2026-01-01",trackCount:10,genre:"Pop",art:"https://is1-ssl.mzstatic.com/a.jpg",url:"",...o});

assert.equal(versionSignature("Dracula (with JENNIE)"),"");
assert.notEqual(mergeKey("Loser","Tame Impala"),mergeKey("Loser (Fcukers Remix)","Tame Impala & Fcukers"));
assert.notEqual(artworkKey("BbY WOW","KAROL G, Judeline & rusowsky"),artworkKey("BbY WOW","KAROL G & Feid"));
assert.equal(artworkArtistSignature("Ella Langley & Morgan Wallen"),artworkArtistSignature("Morgan Wallen, Ella Langley"));
assert.equal(
  artworkCreditSignature("Beauty and a Beat","Justin Bieber, Nicki Minaj"),
  artworkCreditSignature("Beauty and a Beat (feat. Nicki Minaj)","Justin Bieber")
);
assert.equal(
  artworkCreditSignature("Get Lucky (Radio Edit - feat. Pharrell Williams and Nile Rodgers)","Daft Punk"),
  artworkCreditSignature("Get Lucky (feat. Pharrell Williams & Nile Rodgers) [Radio Edit]","Daft Punk, Pharrell Williams & Nile Rodgers")
);
assert.equal(candidateCompatible(track("The One That Got Away","Katy Perry"),c({trackTitle:"The One That Got Away",artist:"Katy Perry & B.o.B"})),false);
assert.equal(candidateCompatible(track("Babydoll","Dominic Fike"),c({trackTitle:"Babydoll (From The Carwash)",artist:"Dominic Fike"})),false);
assert.equal(isGenericRelease("20th Century Masters - The Millennium Collection: The Best of Marvin Gaye & Tammi Terrell"),true);
assert.equal(isGenericRelease("United"),false);

const mountain=track("Ain't No Mountain High Enough","Marvin Gaye & Tammi Terrell");
const united=c({provider:"apple",id:"1469575663",trackTitle:mountain.title,artist:mountain.artist,releaseTitle:"United",releaseArtist:mountain.artist,releaseDate:"1967-08-29",trackCount:12});
const lateSingle=c({provider:"apple",id:"999",trackTitle:mountain.title,artist:mountain.artist,releaseTitle:"Ain't No Mountain High Enough - Single",releaseArtist:mountain.artist,releaseDate:"2025-01-01",trackCount:1,art:"https://is1-ssl.mzstatic.com/b.jpg"});
assert.equal(selectArtworkCandidate(mountain,[lateSingle,united]).selected.releaseTitle,"United");
const unitedDz={...united,provider:"deezer",id:"dz1",art:"https://e-cdns-images.dzcdn.net/images/cover/x/1000x1000.jpg"};
assert.equal(selectArtworkCandidate(mountain,[lateSingle,united,unitedDz]).selected.releaseTitle,"United");

const bby=track("BbY WOW","KAROL G, Judeline & rusowsky");
const album=c({provider:"apple-feed",id:"6796864754",trackTitle:bby.title,artist:bby.artist,releaseTitle:"NO ME ARREPIENTO DE SENTIR TANTO",releaseArtist:"KAROL G",releaseDate:"2026-08-07",trackCount:14});
const single=c({provider:"apple",id:"6816228072",trackTitle:bby.title,artist:bby.artist,releaseTitle:"BbY WOW - Single",releaseArtist:bby.artist,releaseDate:"2026-08-05",trackCount:1,art:"https://is1-ssl.mzstatic.com/c.jpg"});
assert.equal(selectArtworkCandidate(bby,[single,album]).selected.provider,"apple-feed");

const source=fs.readFileSync(new URL("./build-covers.mjs",import.meta.url),"utf8");
assert.match(source,/APPLE_FEED/);
assert.match(source,/feedDirect:true/, "official Apple chart feed must cover lookup-index lag"); assert.match(source,/api\.deezer\.com/); assert.match(source,/currentAppleCandidate/); assert.match(source,/ARTWORK_UNRESOLVED/);
assert.match(source,/runtimeBridge:true/, "new Apple chart rows may bridge catalog indexing lag without a point fix");
assert.doesNotMatch(source,/DIRECT_COLLECTION|animal\\\|katseye|billiejean\\\|michaeljackson|boston\\\|stellalefty/);
const corrections=JSON.parse(fs.readFileSync(new URL("../public/data/cover-corrections.json",import.meta.url),"utf8"));
assert.deepEqual(corrections,{});
try{
  const audit=JSON.parse(fs.readFileSync(new URL("../public/data/artwork-audit.json",import.meta.url),"utf8"));
  if(audit?.schema===2&&audit?.entries&&Object.keys(audit.entries).length){
    for(const [key,e] of Object.entries(audit.entries)){
      assert.equal(e.verified,true,key); assert.ok(e.confidence>=91,key+" confidence");
      assert.notEqual(e.releaseClass,"generic",key); assert.notEqual(e.releaseClass,"derivative",key);
      assert.match(e.art,/^https:\/\/(?:[^/]*mzstatic\.com|[^/]*dzcdn\.net)\//i,key);
    }
  }
}catch{}
console.log("chart artwork regression: PASS");
