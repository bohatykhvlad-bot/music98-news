const url = "https://music98.news/api/top50?audit=" + Date.now();
const r = await fetch(url, {headers:{"user-agent":"music98-chart-audit/1.0"}});
if (!r.ok) throw new Error("live top50 HTTP " + r.status);
const j = await r.json();
const news = (j.tracks || []).filter(x => String(x.delta).toLowerCase() === "new");
const olivia = (j.tracks || []).find(x => /drop dead/i.test(x.title || "") && /olivia rodrigo/i.test(x.artist || ""));
const rankSnapshot = (j.tracks || []).map((t, i) => ({
  rank: i + 1,
  title: t.title,
  artist: t.artist,
  weeks: Number(t.weeks) || 0,
  delta: String(t.delta == null ? "" : t.delta),
}));
console.log("RANK_SNAPSHOT", JSON.stringify(rankSnapshot));
console.log("UPDATED", j.updated, "REV", j.rev);
console.log("ARROWS", JSON.stringify(j.arrows || {}));
console.log("MEMORY", JSON.stringify(j.memory || {}));
console.log("OLIVIA_DROP_DEAD", JSON.stringify(olivia || null));
console.log("NEW_ROWS", JSON.stringify(news.map(x => ({rank:x.rank,title:x.title,artist:x.artist,weeks:x.weeks,delta:x.delta}))));
const missingArtwork=(j.tracks||[]).map((t,i)=>({rank:i+1,title:t.title,artist:t.artist,url:t.url||""})).filter((_,i)=>!String(j.tracks[i]?.art||"").trim());
console.log("ARTWORK_STATUS", JSON.stringify({missing:missingArtwork.length,rows:(j.tracks||[]).length,missingRows:missingArtwork}));
const near=(j.memory && j.memory.nearMiss) || [];
if (olivia) {
  const hit=near.find(x => /dropdead/i.test(String(x.key||"").replace(/[^a-z0-9]/gi,"")));
  console.log("OLIVIA_NEAR_MISS", JSON.stringify(hit || null));
}
if (j.arrows && j.arrows.ok === false) throw new Error("arrow/tenure self-check failed");

/* A structurally valid arrow map can still hide a destroyed tenure registry:
   on 2026-10-01 every row became "1 day" after a rebuild. Compare against the
   last healthy repo snapshot so a mass reset can never pass CI again. */
const fs = await import("node:fs");
const {mergeKey} = await import("../functions/lib/chart-identity.js");
const backup = JSON.parse(fs.readFileSync(new URL("../public/data/chart-tenure-backup.json", import.meta.url), "utf8"));
const prior = backup && backup.current;
if (prior && Array.isArray(prior.tracks) && prior.tracks.length >= 10) {
  const priorDay = Date.parse(String(prior.updated || "") + "T00:00:00Z");
  const liveDay = Date.parse(String(j.updated || "") + "T00:00:00Z");
  const gap = Number.isFinite(priorDay) && Number.isFinite(liveDay)
    ? Math.round((liveDay - priorDay) / 86400000) : null;
  const old = new Map(prior.tracks.map(t => [mergeKey(t.title,t.artist), t]));
  const overlap = (j.tracks || []).map(t => {
    const p = old.get(mergeKey(t.title,t.artist));
    return p ? {now:t, prior:p} : null;
  }).filter(Boolean);
  const established = overlap.filter(x => Number(x.prior.weeks) >= 2);
  const regressed = established.filter(x => Number(x.now.weeks) <= Number(x.prior.weeks));
  const ones = established.filter(x => Number(x.now.weeks) <= 1);
  console.log("TENURE_CONTINUITY", JSON.stringify({
    backupUpdated: prior.updated, liveUpdated: j.updated, gap,
    overlap: overlap.length, established: established.length,
    regressed: regressed.length, oneDay: ones.length
  }));
  if (gap === 1 && established.length >= 10) {
    if (ones.length >= Math.ceil(established.length * 0.25)) {
      throw new Error("mass tenure reset detected: established songs collapsed to 1 day");
    }
    if (regressed.length >= Math.ceil(established.length * 0.25)) {
      throw new Error("tenure continuity regressed against previous healthy day");
    }
  }
}
console.log("LIVE_CHART_AUDIT PASS");
