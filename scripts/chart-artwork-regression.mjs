import assert from "node:assert/strict";
import fs from "node:fs";
import {
  appleCandidateCompatible,
  mergeKey,
  pickAppleCandidate,
  versionSignature,
} from "../functions/lib/chart-identity.js";

const original = {
  trackId: 100,
  trackName: "Loser",
  artistName: "Tame Impala",
  collectionArtistName: "Tame Impala",
  collectionName: "Loser - Single",
  trackCount: 1,
  releaseDate: "2025-09-01T00:00:00Z",
};
const album = {
  trackId: 101,
  trackName: "Loser",
  artistName: "Tame Impala",
  collectionArtistName: "Tame Impala",
  collectionName: "Deadbeat",
  trackCount: 12,
  releaseDate: "2025-10-17T00:00:00Z",
};
const remix = {
  trackId: 102,
  trackName: "Loser (Fcukers Remix)",
  artistName: "Tame Impala & Fcukers",
  collectionName: "Loser (Fcukers Remix) - Single",
  releaseDate: "2026-09-25T00:00:00Z",
};

assert.notEqual(mergeKey("Loser", "Tame Impala"), mergeKey("Loser (Fcukers Remix)", "Tame Impala & Fcukers"));
assert.equal(versionSignature("Dracula (with JENNIE)"), "");
assert.equal(versionSignature("Dracula (Boys Noize Disko Version)"), "version");
assert.equal(versionSignature("Bad Times (Extended Version)"), "extended");
assert.equal(versionSignature("Beauty and a Beat (Wideboys Dub)"), "dub");
assert.equal(versionSignature("Song (Unplugged Session)"), "session");
assert.equal(appleCandidateCompatible("Loser", "Tame Impala", remix), false);
assert.equal(appleCandidateCompatible("Loser", "Tame Impala", original), true);
assert.equal(pickAppleCandidate("Loser", "Tame Impala", [remix, album, original]).trackId, 101);

const live = {
  trackId: 200,
  trackName: "Uninvited (Live at Newport Folk)",
  artistName: "Brandi Carlile",
  collectionName: "Uninvited (Live at Newport Folk) - Single",
  releaseDate: "2026-09-01T00:00:00Z",
};
const studio = {
  trackId: 201,
  trackName: "Uninvited",
  artistName: "Brandi Carlile",
  collectionName: "Uninvited - Single",
  releaseDate: "2026-08-01T00:00:00Z",
};
assert.equal(pickAppleCandidate("Uninvited (Live at Newport Folk)", "Brandi Carlile", [studio, live]).trackId, 200);

const instr = {
  trackId: 300,
  trackName: "Dracula (with JENNIE) [Instrumental]",
  artistName: "Tame Impala",
  collectionName: "Dracula (with JENNIE) [Instrumental] - Single",
  releaseDate: "2026-09-01T00:00:00Z",
};
const vocal = {
  trackId: 301,
  trackName: "Dracula (with JENNIE)",
  artistName: "Tame Impala",
  collectionName: "Dracula (with JENNIE) - Single",
  releaseDate: "2026-08-01T00:00:00Z",
};
assert.equal(pickAppleCandidate("Dracula (with JENNIE)", "Tame Impala", [instr, vocal]).trackId, 301);

/* The repository resolver pins known canonical Apple collections for catalog
 * cases where search ranking can drift between alternate packages. These IDs are
 * official Apple releases and the artwork job must not silently fall back to a
 * playlist/variant package on a later run. */
const resolverSource = fs.readFileSync(new URL("./build-covers.mjs", import.meta.url), "utf8");
assert.match(resolverSource, /"animal\\|katseye": "6793209963"/);
assert.match(resolverSource, /"hootiefrutti\\|katseye": "1891779764"/);
assert.match(resolverSource, /"billiejean\\|michaeljackson": "269572838"/);
assert.match(resolverSource, /function pickDedicatedAppleRelease\\(/);


const beautyStudio={
  trackId:500,trackName:"Beauty and a Beat (feat. Nicki Minaj)",
  artistName:"Justin Bieber",collectionArtistName:"Justin Bieber",
  collectionName:"Believe",trackCount:16,releaseDate:"2012-06-15T00:00:00Z"
};
const beautyDub={
  trackId:501,trackName:"Beauty and a Beat (Wideboys Dub)",
  artistName:"Justin Bieber",collectionArtistName:"Justin Bieber",
  collectionName:"Beauty and a Beat (Wideboys Dub) - Single",trackCount:1,releaseDate:"2012-12-01T00:00:00Z"
};
assert.equal(appleCandidateCompatible("Beauty and a Beat (feat. Nicki Minaj)","Justin Bieber",beautyDub),false);
assert.equal(pickAppleCandidate("Beauty and a Beat (feat. Nicki Minaj)","Justin Bieber",[beautyDub,beautyStudio]).trackId,500);

const corrections = JSON.parse(fs.readFileSync(new URL("../public/data/cover-corrections.json", import.meta.url), "utf8"));
const tameCorrection = corrections["loser|tameimpala"];
assert.equal(tameCorrection.appleCollectionId, "1836226516");
assert.equal(tameCorrection.appleTrackId, "1836226731");
assert.match(tameCorrection.art, /196873555331\.jpg\/600x600bb\.jpg$/);
const daftCorrection = corrections["getlucky~v:edit|daftpunk"];
assert.equal(daftCorrection.appleCollectionId, "617154241");
assert.match(daftCorrection.art, /886443919266\.jpg\/600x600bb\.jpg$/);
assert.match(daftCorrection.reason, /never.*Remix/);

console.log("chart artwork regression: PASS");

const livePackPlain={
  trackId:400,trackName:"Ain't No Mountain High Enough",
  artistName:"Marvin Gaye & Tammi Terrell",
  collectionArtistName:"Marvin Gaye & Tammi Terrell",
  collectionName:"Ain't No Mountain High Enough (Live) - EP",
  trackCount:4,releaseDate:"2026-01-01T00:00:00Z"
};
const united={
  trackId:401,trackName:"Ain't No Mountain High Enough",
  artistName:"Marvin Gaye & Tammi Terrell",
  collectionArtistName:"Marvin Gaye & Tammi Terrell",
  collectionName:"United",trackCount:12,releaseDate:"1967-08-29T00:00:00Z"
};
const compilation={
  trackId:402,trackName:"Ain't No Mountain High Enough",
  artistName:"Marvin Gaye & Tammi Terrell",
  collectionArtistName:"Marvin Gaye & Tammi Terrell",
  collectionName:"20th Century Masters - The Millennium Collection: The Best of Marvin Gaye & Tammi Terrell",
  trackCount:11,releaseDate:"2001-01-01T00:00:00Z"
};
assert.equal(appleCandidateCompatible("Ain't No Mountain High Enough","Marvin Gaye & Tammi Terrell",livePackPlain),false);
assert.equal(pickAppleCandidate("Ain't No Mountain High Enough","Marvin Gaye & Tammi Terrell",[compilation,livePackPlain,united]).trackId,401);
