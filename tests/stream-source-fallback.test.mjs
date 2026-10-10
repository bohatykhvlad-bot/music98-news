import test from "node:test";
import assert from "node:assert/strict";
import {pickSearchHit, pickDailyForDate, totalDelta, medianValue, FALLBACK_WINDOW_DAYS} from "../functions/lib/stream-fallback.js";
import {verifiedSpotifyRow} from "../functions/lib/tri-source-chart.js";

const id = "b".repeat(22);
const day = new Date().toISOString().slice(0, 10);
const back = n => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

test("search hit selection handles spellings, feat credits and noise", () => {
  const hit = (name, subtitle, trackId = id) => ({kind: "track", id: trackId, name, subtitle});
  assert.equal(pickSearchHit("Quebec", "Drake", [hit("Quebec", "Drake")]).id, id);
  assert.equal(pickSearchHit("I'M DAT N***A", "Future", [hit("I'M DAT N****", "Future")]).id, id);
  assert.equal(pickSearchHit("musubi", "Ayumu Imazu", [hit("結び", "Ayumu Imazu")]).id, id);
  assert.equal(pickSearchHit("Song", "Artist", [hit("Song (Karaoke Version)", "Karaoke SESH")]), null);
  assert.equal(pickSearchHit("Song", "Artist", [hit("Other Song", "Different Band")]), null);
  assert.equal(pickSearchHit("Song", "Artist", [{kind: "artist", id, name: "Artist"}]), null);
});

test("daily picker prefers the totals window and smooths capture merges", () => {
  // склейка: 08-е собрано как 2.1M при типичном дне ~1M — берём окно, не блоб
  const merged = pickDailyForDate({
    [back(3)]: {total: 1000000, daily: 1000000},
    [back(2)]: {total: 2000000, daily: 1000000},
    [back(1)]: {total: 3000000, daily: 0},
    [day]: {total: 5100000, daily: 2100000}
  }, day, {windowDays: FALLBACK_WINDOW_DAYS});
  assert.match(merged.method, /^totals-window/);
  assert.equal(merged.daily, 1366667);
  const clean = pickDailyForDate({
    [back(1)]: {total: 1000000, daily: 1000000},
    [day]: {total: 2050000, daily: 1050000}
  }, day, {windowDays: FALLBACK_WINDOW_DAYS});
  assert.equal(clean.method, "totals-window-1d");
  assert.equal(clean.daily, 1050000);
  const oneLone = pickDailyForDate({[back(2)]: {total: 900000, daily: 450000}}, day, {windowDays: FALLBACK_WINDOW_DAYS});
  assert.equal(oneLone.method, "lone");
  assert.equal(oneLone.daily, 450000);
  const nearest = pickDailyForDate({[back(2)]: {total: 900000, daily: 450000}, [back(1)]: {total: 1400000, daily: 500000}}, day, {windowDays: FALLBACK_WINDOW_DAYS});
  assert.equal(nearest.method, "totals-window-1d");
  assert.equal(nearest.daily, 500000);
  assert.equal(pickDailyForDate({[back(9)]: {total: 900000, daily: 450000}}, day, {windowDays: FALLBACK_WINDOW_DAYS}), null);
  const lone = pickDailyForDate({[day]: {total: 9000000, daily: 9000000}}, day, {windowDays: FALLBACK_WINDOW_DAYS});
  assert.equal(lone.method, "exact-lone");
  assert.equal(lone.daily, 9000000);
});

test("totals window cancels capture gaps and merged buckets", () => {
  const series = {
    [back(5)]: {total: 100000000, daily: 4000000},
    [back(4)]: {total: 100000000, daily: 0},
    [back(3)]: {total: 106000000, daily: 6000000},
    [back(2)]: {total: 106000000, daily: 0},
    [back(1)]: {total: 112000000, daily: 6000000},
    [day]: {total: 118000000, daily: 6000000}
  };
  const pick = pickDailyForDate(series, day, {windowDays: FALLBACK_WINDOW_DAYS});
  assert.equal(pick.method, "totals-window-3d");
  assert.equal(pick.daily, 4000000);
});

test("fallback path never returns a value dated outside the window", () => {
  const series = {
    [back(30)]: {total: 0, daily: 500000},
    [back(20)]: {total: 0, daily: 600000},
    [back(11)]: {total: 0, daily: 700000},
    [back(1)]: {total: 0, daily: 900000}
  };
  const pick = pickDailyForDate(series, day, {windowDays: FALLBACK_WINDOW_DAYS});
  assert.equal(pick.method, "lone");
  assert.equal(pick.date, back(1));
  assert.equal(pick.daily, 900000);
});

test("totals delta works across capture gaps and respects the window", () => {
  const entries = [
    {date: back(3), total: 1000000},
    {date: back(1), total: 1300000},
    {date: day, total: 1400000}
  ];
  const one = totalDelta(entries, day, {windowDays: FALLBACK_WINDOW_DAYS});
  assert.equal(one.daily, 100000);
  assert.equal(one.method, "totals-delta");
  const two = totalDelta(entries.slice(0, 2), day, {windowDays: FALLBACK_WINDOW_DAYS});
  assert.equal(two.daily, 150000);
  assert.equal(two.method, "totals-delta-2d");
  assert.equal(totalDelta([{date: back(9), total: 100}, {date: back(8), total: 200}], day), null);
  assert.equal(totalDelta([{date: day, total: 500}], day), null);
});

test("calibration median needs enough samples", () => {
  assert.equal(medianValue([undefined, 1.05, 1.04, 1.06, 1.05], 3), 1.05);
  assert.equal(medianValue([1.05, 1.04], 3), null);
});

test("verified rows accept site metrics with guards and official only by exact date", () => {
  const site = {status: "matched", daily: 12345, spotifyId: id, date: back(2), metric: "mystreamcount-daily-delta",
    estimated: true, sourceUrl: `https://www.mystreamcount.com/track/${id}`};
  assert.ok(verifiedSpotifyRow(site, day));
  assert.equal(verifiedSpotifyRow({...site, estimated: false}, day), false);
  assert.equal(verifiedSpotifyRow({...site, sourceUrl: `https://www.mystreamcount.com/track/${"c".repeat(22)}`}, day), false);
  assert.equal(verifiedSpotifyRow({...site, date: back(5)}, day), false);
  const sc = {status: "matched", daily: 999, spotifyId: id, date: back(1), metric: "soundcamps-total-delta",
    estimated: true, sourceUrl: "https://soundcamps.com/spotify-stream-checker/", trackUrl: `https://open.spotify.com/track/${id}`};
  assert.ok(verifiedSpotifyRow(sc, day));
  assert.equal(verifiedSpotifyRow({...sc, trackUrl: `https://open.spotify.com/track/${"d".repeat(22)}`}, day), false);
  const official = {status: "matched", daily: 777, spotifyId: id, date: day, metric: "kworb-track-global-daily",
    sourceUrl: `https://kworb.net/spotify/track/${id}.html`};
  assert.ok(verifiedSpotifyRow(official, day));
  assert.equal(verifiedSpotifyRow({...official, date: back(1)}, day), false);
});
