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
const near=(j.memory && j.memory.nearMiss) || [];
if (olivia) {
  const hit=near.find(x => /dropdead/i.test(String(x.key||"").replace(/[^a-z0-9]/gi,"")));
  console.log("OLIVIA_NEAR_MISS", JSON.stringify(hit || null));
}
if (j.arrows && j.arrows.ok === false) throw new Error("arrow/tenure self-check failed");
console.log("LIVE_CHART_AUDIT PASS");
