import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { mergeKey } from "../functions/lib/chart-identity.js";

const OUT = path.resolve("public/data/loudness.json");
const CHART_URL = process.env.CHART_URL || "https://music98.news/api/top50";
const TARGET_LUFS = -16;
const TRUE_PEAK_CEILING_DBTP = -1;

const round1 = (n) => Math.round(Number(n) * 10) / 10;
const finite = (n) => Number.isFinite(Number(n));

function loadPrevious() {
  try {
    const j = JSON.parse(fs.readFileSync(OUT, "utf8"));
    return j && typeof j === "object" ? j : {};
  } catch {
    return {};
  }
}

async function loadChart() {
  try {
    const u = CHART_URL + (CHART_URL.includes("?") ? "&" : "?") + "loudness=" + Date.now();
    const r = await fetch(u, { headers: { "user-agent": "music98-loudness-audit/1.0" } });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const j = await r.json();
    if (Array.isArray(j?.tracks) && j.tracks.length) return j.tracks;
  } catch (e) {
    console.log("live chart unavailable, using baked fallback:", e.message);
  }
  const baked = JSON.parse(fs.readFileSync(path.resolve("public/data/top50.json"), "utf8"));
  return Array.isArray(baked?.tracks) ? baked.tracks : [];
}

function measure(url) {
  const args = [
    "-hide_banner", "-nostats", "-loglevel", "info",
    "-i", String(url),
    "-filter_complex", "ebur128=peak=true",
    "-f", "null", "-"
  ];
  const r = spawnSync("ffmpeg", args, {
    encoding: "utf8",
    timeout: 120000,
    maxBuffer: 8 * 1024 * 1024,
  });
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error((r.stderr || "").slice(-700) || ("ffmpeg exit " + r.status));
  const text = String(r.stderr || "");
  const summaryAt = text.lastIndexOf("Summary:");
  const summary = summaryAt >= 0 ? text.slice(summaryAt) : text;
  const im = summary.match(/I:\s*(-?\d+(?:\.\d+)?)\s*LUFS/i);
  const pm = summary.match(/Peak:\s*(-?\d+(?:\.\d+)?)\s*dBFS/i);
  if (!im || !pm) throw new Error("ffmpeg ebur128 summary missing");
  return { integratedLufs: Number(im[1]), truePeakDbtp: Number(pm[1]) };
}

function gainFor(i, tp) {
  // Apple Sound Check's public support docs describe equal-loudness playback but
  // do not publish one fixed Apple Music LUFS target. We use BS.1770/EBU-style
  // integrated loudness measurement, normalize DOWN to -16 LUFS and never boost.
  // The -1 dBTP ceiling is an additional safety guard for inter-sample peaks.
  return round1(Math.min(0, TARGET_LUFS - i, TRUE_PEAK_CEILING_DBTP - tp));
}

const previous = loadPrevious();
const tracks = await loadChart();
const out = {
  __meta: {
    schema: 1,
    targetLufs: TARGET_LUFS,
    truePeakCeilingDbtp: TRUE_PEAK_CEILING_DBTP,
    method: "ffmpeg ebur128 (ITU-R BS.1770), attenuation only",
    measuredAt: new Date().toISOString(),
  }
};

let measured = 0, reused = 0, failed = 0;
for (const t of tracks) {
  const key = mergeKey(t.title, t.artist);
  const preview = String(t.prev || t.preview || "");
  if (!key || !preview) continue;
  const old = previous[key];
  if (
    old &&
    old.preview === preview &&
    finite(old.integratedLufs) &&
    finite(old.truePeakDbtp) &&
    finite(old.gainDb)
  ) {
    out[key] = old;
    reused++;
    continue;
  }
  try {
    const m = measure(preview);
    out[key] = {
      integratedLufs: round1(m.integratedLufs),
      truePeakDbtp: round1(m.truePeakDbtp),
      gainDb: gainFor(m.integratedLufs, m.truePeakDbtp),
      preview,
      measuredAt: new Date().toISOString(),
    };
    measured++;
    console.log("LOUDNESS", JSON.stringify({
      key, title:t.title, artist:t.artist,
      integratedLufs:out[key].integratedLufs,
      truePeakDbtp:out[key].truePeakDbtp,
      gainDb:out[key].gainDb
    }));
  } catch (e) {
    failed++;
    if (old && finite(old.gainDb)) out[key] = old;
    console.log("LOUDNESS_FAIL", JSON.stringify({key,title:t.title,artist:t.artist,error:String(e.message||e).slice(0,300)}));
  }
}

const rows = Object.entries(out)
  .filter(([k,v]) => k !== "__meta" && finite(v?.integratedLufs))
  .map(([key,v]) => ({key,...v}))
  .sort((a,b) => b.integratedLufs - a.integratedLufs);
const vals = rows.map(x=>x.integratedLufs).sort((a,b)=>a-b);
const median = vals.length ? vals[Math.floor(vals.length/2)] : null;
console.log("LOUDNESS_SUMMARY", JSON.stringify({
  tracks:rows.length,measured,reused,failed,targetLufs:TARGET_LUFS,
  loudest:rows.slice(0,8).map(x=>({key:x.key,lufs:x.integratedLufs,tp:x.truePeakDbtp,gainDb:x.gainDb})),
  quietest:rows.slice(-5).map(x=>({key:x.key,lufs:x.integratedLufs,tp:x.truePeakDbtp,gainDb:x.gainDb})),
  medianLufs:median
}));

const sortedEntries = Object.entries(out).sort(([a],[b]) => {
  if (a === "__meta") return -1;
  if (b === "__meta") return 1;
  return a.localeCompare(b);
});
fs.writeFileSync(OUT, JSON.stringify(Object.fromEntries(sortedEntries), null, 2) + "\n");
