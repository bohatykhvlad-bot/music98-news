import test from "node:test";
import assert from "node:assert/strict";
import {shouldPublishSeed, inPublishWindow, dayAge} from "../functions/lib/publish-window.js";
import {verifiedTriSeed, TRI_METHOD} from "../functions/lib/tri-source-chart.js";

const at = iso => Date.parse(iso);

test("published seed advances only inside the morning UTC window", () => {
  const previous = "2026-10-08";
  assert.equal(shouldPublishSeed({previousDate: previous, nowMs: at("2026-10-09T02:00:00Z")}).publish, false);
  assert.equal(shouldPublishSeed({previousDate: previous, nowMs: at("2026-10-09T05:30:00Z")}).publish, true);
  assert.equal(shouldPublishSeed({previousDate: previous, nowMs: at("2026-10-09T09:59:00Z")}).reason, "morning-window");
  assert.equal(shouldPublishSeed({previousDate: previous, nowMs: at("2026-10-09T10:00:00Z")}).publish, false);
  assert.equal(shouldPublishSeed({previousDate: previous, nowMs: at("2026-10-13T02:00:00Z")}).reason, "catch-up");
});

test("bootstrap, forced runs and stale seeds bypass the window", () => {
  assert.equal(shouldPublishSeed({previousDate: null, nowMs: at("2026-10-09T22:00:00Z")}).reason, "initial");
  assert.equal(shouldPublishSeed({previousDate: "2026-10-08", nowMs: at("2026-10-09T22:00:00Z"), forced: true}).reason, "forced");
  assert.equal(shouldPublishSeed({previousDate: "2026-10-08", nowMs: at("2026-10-09T22:00:00Z")}).publish, false);
});

test("window boundaries cover the whole morning hour range", () => {
  assert.equal(inPublishWindow(at("2026-10-09T04:59:59Z")), false);
  assert.equal(inPublishWindow(at("2026-10-09T05:00:00Z")), true);
  assert.equal(inPublishWindow(at("2026-10-09T09:59:59Z")), true);
  assert.equal(inPublishWindow(at("2026-10-09T10:00:00Z")), false);
});

test("the published seed stays valid until the next morning advance", () => {
  const day = new Date().toISOString().slice(0, 10);
  const id = n => String(n + 1).padStart(22, "0");
  const rows = Array.from({length: 110}, (_, i) => ({
    title: "Song " + (i + 1), artist: "Artist " + (i + 1),
    sourceRanks: {U: i < 90 ? i + 1 : i < 100 ? null : i - 9, A: i < 90 ? i + 1 : i < 100 ? null : i - 9, S: i < 100 ? i + 1 : null},
    spotify: i < 100 ? {status: "matched", daily: 1000000 - i * 6500, spotifyId: id(i), date: day,
      metric: "musicrank-spotify-chart-global-daily",
      sourceUrl: "https://musicrank.org/spotify"} :
      {status: "unavailable", daily: null, reason: "not-in-spotify-daily-chart"}
  }));
  rows[0].sourceRanks.U = null; rows[0].sourceRanks.A = null;
  rows[99].sourceRanks.U = 1; rows[99].sourceRanks.A = 1;
  const build = date => {
    const shifted = rows.map(t => t.spotify.status === "matched" ? {...t, spotify: {...t.spotify, date}} : t);
    return {schema: 3, methodology: TRI_METHOD, appleUsDate: date, appleGlobalDate: date, spotifyDate: date,
      fingerprint: "a".repeat(64), sourceSizes: {U: 100, A: 100, S: 200},
      coverage: {candidates: shifted.length, matched: 100, unmatched: shifted.length - 100},
      tracks: shifted};
  };
  const offset = n => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
  assert.ok(verifiedTriSeed(build(offset(2))), "two-day-old seed accepted");
  assert.ok(verifiedTriSeed(build(offset(3))), "three-day-old seed still accepted (morning cycle)");
  assert.equal(verifiedTriSeed(build(offset(5))), null, "five-day-old seed rejected");
  assert.ok(dayAge(offset(3)) <= 3);
});

test("a missed morning publisher recovers in an afternoon run only for a newer dated edition",()=>{
  const now=at("2026-10-12T13:45:00Z");
  assert.deepEqual(shouldPublishSeed({previousDate:"2026-10-09",candidateDate:"2026-10-10",
    lastPublishedAt:"2026-10-11T06:12:00Z",nowMs:now}),
    {publish:true,reason:"missed-morning-retry",age:3});
  assert.equal(shouldPublishSeed({previousDate:"2026-10-09",candidateDate:"2026-10-09",
    lastPublishedAt:"2026-10-11T06:12:00Z",nowMs:now}).publish,false);
  assert.equal(shouldPublishSeed({previousDate:"2026-10-09",candidateDate:null,
    lastPublishedAt:"2026-10-11T06:12:00Z",nowMs:now}).publish,false);
});
test("an already-published edition stays frozen for the rest of the UTC day",()=>{
  const opts={previousDate:"2026-10-10",candidateDate:"2026-10-11",
    lastPublishedAt:"2026-10-12T05:48:00Z"};
  for(const clock of ["2026-10-12T09:45:00Z","2026-10-12T13:45:00Z","2026-10-12T21:45:00Z"])
    assert.equal(shouldPublishSeed({...opts,nowMs:at(clock)}).reason,"already-published-today");
  assert.equal(shouldPublishSeed({...opts,nowMs:at("2026-10-13T05:45:00Z")}).publish,true);
  assert.equal(shouldPublishSeed({...opts,nowMs:at("2026-10-12T09:45:00Z"),forced:true}).reason,"forced");
});

test("an unchanged common source date never becomes a second publication day",()=>{
 const now=at("2026-10-12T05:45:00Z");
 const result=shouldPublishSeed({previousDate:"2026-10-09",
  candidateDate:"2026-10-09",lastPublishedAt:"2026-10-11T05:48:00Z",
  nowMs:now});
 assert.equal(result.publish,false);
 assert.equal(result.reason,"no-new-source-edition");
 assert.equal(shouldPublishSeed({previousDate:"2026-10-09",
  candidateDate:"2026-10-10",lastPublishedAt:"2026-10-11T05:48:00Z",
  nowMs:now}).publish,true);
});
