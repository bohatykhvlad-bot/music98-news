import fs from "node:fs";
import {mergeKey} from "../functions/lib/chart-identity.js";
import {verifiedSpotifySnapshot} from "../functions/lib/spotify-chart.js";

const OUT = new URL("../public/data/chart-tenure-backup.json", import.meta.url);
const liveUrl = "https://music98.news/api/top50?tenureSnapshot=" + Date.now();
const r = await fetch(liveUrl, {
  headers: {
    "user-agent": "music98-tenure-snapshot/1.0",
    "cache-control": "no-cache",
    pragma: "no-cache",
  },
});
if (!r.ok) throw new Error("live top50 HTTP " + r.status);
const j = await r.json();
const spotifyRef=verifiedSpotifySnapshot(JSON.parse(fs.readFileSync(
  new URL("../public/data/spotify-chart.json",import.meta.url),"utf8")));
if(!spotifyRef || j.fallback || j.complete!==true ||
   !["A","S","D","B","Y"].every(k=>Number(j.sources?.[k])===50) ||
   j.sourceDates?.S!==spotifyRef.date || j.spotifyFingerprint!==spotifyRef.fingerprint)
  throw new Error("refusing snapshot unless all five are complete and Spotify edition matches");
const tracks = Array.isArray(j.tracks) ? j.tracks : [];
if (tracks.length !== 50) throw new Error("refusing tenure snapshot: expected 50 rows, got " + tracks.length);
if (j.arrows && j.arrows.ok === false) throw new Error("refusing tenure snapshot: live arrow/tenure self-check failed");

let backup = {schema:1,current:null,previous:null};
try { backup = JSON.parse(fs.readFileSync(OUT, "utf8")); } catch {}
if (!backup || backup.schema !== 1) backup = {schema:1,current:null,previous:null};

const dayMs = (s) => Date.parse(String(s || "") + "T00:00:00Z");
const current = backup.current && Array.isArray(backup.current.tracks) ? backup.current : null;

if (current) {
  const oldMs = dayMs(current.updated);
  const liveMs = dayMs(j.updated);
  if (!Number.isFinite(liveMs)) throw new Error("refusing tenure snapshot: live updated date missing");
  if (Number.isFinite(oldMs) && liveMs < oldMs) throw new Error("refusing tenure snapshot: live chart is older than backup");

  const gap = Number.isFinite(oldMs) ? Math.round((liveMs - oldMs) / 86400000) : null;
  if (gap === 1) {
    const old = new Map(current.tracks.map(t => [mergeKey(t.title,t.artist), t]));
    const overlap = tracks.map(t => {
      const prior = old.get(mergeKey(t.title,t.artist));
      return prior ? {now:t, prior} : null;
    }).filter(Boolean);
    const established = overlap.filter(x => Number(x.prior.weeks) >= 2);
    const regressed = established.filter(x =>
      Number(x.now.weeks) <= Number(x.prior.weeks) ||
      /^(?:new|re-entry)$/i.test(String(x.now.delta || ""))
    );
    const ones = established.filter(x => Number(x.now.weeks) <= 1);
    const stats = {
      old: current.updated,
      live: j.updated,
      overlap: overlap.length,
      established: established.length,
      regressed: regressed.length,
      oneDay: ones.length,
    };
    console.log("TENURE_SNAPSHOT_CONTINUITY", JSON.stringify(stats));
    if (established.length >= 10 && (
      ones.length >= Math.ceil(established.length * 0.25) ||
      regressed.length >= Math.ceil(established.length * 0.25)
    )) {
      throw new Error("refusing tenure snapshot: mass tenure regression detected");
    }
  }
}

const memoryWeek = Number(j.memory && j.memory.week);
const payloadWeek = Number(j.week);
const snapshot = {
  updated: String(j.updated || ""),
  week: Number.isFinite(memoryWeek) ? memoryWeek : (Number.isFinite(payloadWeek) ? payloadWeek - 1 : null),
  rev: String(j.rev || ""),
  complete:true,
  sources:Object.fromEntries(["A","S","D","B","Y"].map(k=>[k,Number(j.sources[k])])),
  sourceDates:j.sourceDates,
  sourceOrigin:j.sourceOrigin,
  spotifyFingerprint:j.spotifyFingerprint,
  tracks: tracks.map((t,i) => ({
    rank: Number(t.rank) || i + 1,
    title: String(t.title || ""),
    artist: String(t.artist || ""),
    weeks: Math.max(1, Number(t.weeks) || 1),
    delta: String(t.delta == null ? "" : t.delta),
  })),
};

if (!snapshot.updated || !Number.isFinite(snapshot.week)) {
  throw new Error("refusing tenure snapshot: missing updated/week metadata");
}

if (current && current.updated === snapshot.updated) {
  backup.current = snapshot;
} else {
  backup.previous = current || backup.previous || null;
  backup.current = snapshot;
}
backup.schema = 1;
fs.writeFileSync(OUT, JSON.stringify(backup, null, 2) + "\n");
console.log("TENURE_SNAPSHOT_SAVED", JSON.stringify({
  updated:snapshot.updated,
  week:snapshot.week,
  rev:snapshot.rev,
  previous:backup.previous && backup.previous.updated,
}));
