import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read = rel => readFileSync(new URL(rel, import.meta.url), "utf8");

test("artwork audit accepts the current chart family and rejects stale or fallback editions", () => {
  const build = read("../scripts/build-covers.mjs");
  const verify = read("../scripts/verify-live-artwork.mjs");
  const top50 = read("../functions/api/top50.js");
  const lib = read("../functions/lib/daily-chart-sources.js");
  assert.match(lib, /export function isVerifiedChartEdition/);
  assert.match(build, /candidate\.updated===new Date\(\)\.toISOString\(\)\.slice\(0,10\)/);
  assert.match(build, /candidate\?\.artworkAuditOnly===true/);
  assert.match(build, /isVerifiedChartEdition\(candidate\)/);
  assert.match(build, /!candidate\.fallback/);
  assert.doesNotMatch(build, /isAppleSpotifyChart/);
  assert.match(verify, /isVerifiedChartEdition\(j\)/);
  assert.doesNotMatch(verify, /isAppleSpotifyChart/);
  assert.match(top50, /isVerifiedChartEdition\(s\)/);
});

test("collector defers the published advance outside the morning window", () => {
  const streams = read("../scripts/refresh-apple-spotify-streams.mjs");
  assert.match(streams, /shouldPublishSeed/);
  assert.match(streams, /TRI_PUBLICATION_DEFERRED/);
  assert.match(streams, /published:Boolean\(changed&&decision\.publish\)/);
});

test("Apple collection runs stay byte-stable while the data is unchanged", () => {
  const ranking = read("../scripts/refresh-apple-ranking.mjs");
  assert.match(ranking, /function writeVerified\(fileUrl, snapshot, label\)/);
  assert.match(ranking, /CHART_SOURCE_UNCHANGED/);
  assert.doesNotMatch(ranking, /fs\.writeFileSync\(archived/);
});
