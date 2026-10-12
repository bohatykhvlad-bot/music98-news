/* Сайты-источники Spotify-стримов (решение владельца: сайт — главный канал).
   Чистые функции для тестов и коллектора:
   - pickSearchHit: полбор трека в поиске сайта с учётом написаний (версии, фичеры, языки);
   - pickDailyForDate: выбор дневного значения из серии (окно дней, сглаживание склеек);
   - totalDelta: дневное из дельты снимков суммарных счётчиков;
   - medianValue: медиана для калибровки. */
import {artistKey,titleKey} from "./apple-spotify-chart.js";
import {versionSignature} from "./chart-identity.js";

export const FALLBACK_WINDOW_DAYS = 3;
export const STREAM_PROVIDER_PRIORITY = Object.freeze(["soundcamps","mystreamcount"]);

const NOISE = /karaoke|instrumental|lullaby|originally performed|cover version|tribute band/i;
const norm = s => String(s || "").trim();

export function spotifySearchQueries(title,artist,aliases=[]) {
 const base=String(title||"").trim();
 const bare=base.replace(/\s*[\(\[]\s*(?:feat\.?|ft\.?|featuring|with|w\/)\b[^\)\]]*[\)\]]/gi,"").trim();
 const lead=String(artist||"").split(/\s*(?:,|\s+&\s+| feat\.? | ft\.? )\s*/i)[0].trim();
 const names=[base,bare,...aliases].map(x=>String(x||"").trim()).filter(Boolean);
 const queries=[base+" "+artist,bare+" "+lead,
    ...names.flatMap(n=>[n+" "+lead,n])];
 return [...new Set(queries.map(x=>x.replace(/\s+/g," ").trim()).filter(Boolean))].slice(0,10);
}

/* A translation is not evidence that two RECORDINGS match. Reject wrong
   titles and version variants even if their artist names look correct.
   Japanese names are searched as verified catalog aliases, not guessed
   translations. Multiple equally credible different IDs remain ambiguous. */
export function pickSearchHit(title,artist,results,aliases=[]) {
 const tracks=(results||[]).filter(x=>x&&x.kind==="track"&&/^[A-Za-z0-9]{22}$/.test(x.id||""));
 const titles=[title,...aliases].map(titleKey).filter(Boolean);
 const wantedVersion=versionSignature(title);
 const lead=String(artist||"").trim().split(/\s*(?:,|\s+&\s+| feat\.? | ft\.? )\s*/i)[0];
 const names=[artist,lead,...String(artist||"").split(/\s*(?:,|\s+&\s+| feat\.? | ft\.? )\s*/i)]
   .map(artistKey).filter(x=>x.length>=3);
 const fullArtist=artistKey(artist);
 const ranked=tracks
  .filter(x=>!(NOISE.test(x.name||"")&&!NOISE.test(title)))
  .filter(x=>versionSignature(x.name||"")===wantedVersion)
  .map(x=>{
    const got=titleKey(x.name||"");
    const exact=titles.includes(got);
    const prefix=!exact&&got.length>=6&&titles.some(t=>t.length>=6&&
      (got.startsWith(t)||t.startsWith(got))&&Math.min(got.length,t.length)/Math.max(got.length,t.length)>.78);
    if(!exact&&!prefix)return null;
    const credit=artistKey(x.subtitle||"");
    if(!names.some(n=>credit.includes(n)))return null;
    const score=(exact?90:55)+(fullArtist.length>=5&&credit.includes(fullArtist)?20:0);
    return {hit:x,score};
  }).filter(Boolean)
  .sort((a,b)=>b.score-a.score||a.hit.id.localeCompare(b.hit.id));
 if(ranked.length>1&&ranked[0].score===ranked[1].score&&ranked[0].hit.id!==ranked[1].hit.id)return null;
 return ranked[0]?.hit||null;
}

export function seriesRows(series) {
  return Object.entries(series || {})
    .map(([date, v]) => ({date, daily: Number(v?.daily), total: Number(v?.total)}))
    .filter(r => /^20\d{2}-\d{2}-\d{2}$/.test(r.date) && Number.isSafeInteger(r.daily) && r.daily > 0)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

export function pickDailyForDate(series, date, {windowDays = FALLBACK_WINDOW_DAYS} = {}) {
  const at = Date.parse(date + "T00:00:00Z");
  const day = d => Date.parse(d + "T00:00:00Z");
  const rows = Object.entries(series || {})
    .map(([d, v]) => ({date: d, daily: Number(v?.daily), total: Number(v?.total)}))
    .filter(r => /^20\d{2}-\d{2}-\d{2}$/.test(r.date))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  if (!rows.length) return null;
  let latestIdx = -1;
  for (let i = rows.length - 1; i >= 0; i--) {
    const ms = day(rows[i].date);
    if (ms <= at && at - ms <= windowDays * 86400000) { latestIdx = i; break; }
  }
  if (latestIdx < 0) return null;
  const latest = rows[latestIdx];
  /* Способ 1: среднее по разнице суммарных счётчиков за окно 2–4 дня —
     шум захватов и «склейки» взаимно сокращаются. */
  if (Number.isSafeInteger(latest.total) && latest.total > 0) {
    let best = null;
    for (let i = Math.max(0, latestIdx - 6); i < latestIdx; i++) {
      const anchor = rows[i];
      if (!Number.isSafeInteger(anchor.total) || anchor.total <= 0) continue;
      const span = Math.round((day(latest.date) - day(anchor.date)) / 86400000);
      if (span < 1 || span > 4) continue;
      const diff = latest.total - anchor.total;
      if (diff <= 0) continue;
      const score = Math.abs(span - 3);
      if (!best || score < best.score || (score === best.score && span > best.span)) best = {span, diff, score};
    }
    if (best) return {date: latest.date, daily: Math.round(best.diff / best.span), method: "totals-window-" + best.span + "d"};
  }
  /* Способ 2 (резерв): дневные значения с нормализацией на пропуски захвата.
     Только записи внутри окна — дата ряда не должна из него выпадать. */
  const before = rows.slice(0, latestIdx + 1);
  const norms = [];
  before.forEach((r, i) => {
    if (!(Number.isSafeInteger(r.daily) && r.daily > 0)) return;
    const ms = day(r.date);
    if (!(ms <= at && at - ms <= windowDays * 86400000)) return;
    const prev = before[i - 1];
    const gap = prev ? Math.max(1, Math.round((day(r.date) - day(prev.date)) / 86400000)) : 1;
    norms.push({date: r.date, raw: r.daily, norm: Math.round(r.daily / gap)});
  });
  if (!norms.length) return null;
  if (norms.length === 1) {
    const only = norms[0];
    return {date: only.date, daily: only.raw, method: only.date === date ? "exact-lone" : "lone"};
  }
  const sorted = norms.slice(-3).sort((a, b) => a.norm - b.norm);
  const picked = sorted.length === 2 ? sorted[0] : sorted[Math.floor(sorted.length / 2)];
  return {date: picked.date, daily: picked.norm, method: picked.date === date ? "exact-daily" : "nearest"};
}

export function totalDelta(entries, date, {windowDays = FALLBACK_WINDOW_DAYS, maxStepDays = 7} = {}) {
  const at = Date.parse(date + "T00:00:00Z");
  const rows = (entries || [])
    .map(e => ({date: e?.date, total: Number(e?.total)}))
    .filter(e => /^20\d{2}-\d{2}-\d{2}$/.test(e.date || "") && Number.isSafeInteger(e.total) && e.total >= 0)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  for (let i = rows.length - 1; i > 0; i--) {
    const cur = rows[i], prev = rows[i - 1];
    const step = (Date.parse(cur.date + "T00:00:00Z") - Date.parse(prev.date + "T00:00:00Z")) / 86400000;
    if (!(step >= 1 && step <= maxStepDays)) continue;
    const daily = Math.round((cur.total - prev.total) / step);
    if (!(daily > 0)) continue;
    const ms = Date.parse(cur.date + "T00:00:00Z");
    if (ms <= at && at - ms <= windowDays * 86400000)
      return {date: cur.date, daily, method: step === 1 ? "totals-delta" : "totals-delta-" + step + "d"};
  }
  return null;
}

export function medianValue(values, minimum = 1) {
  const a = [...(values || [])].filter(v => Number.isFinite(v) && v > 0).sort((x, y) => x - y);
  if (a.length < minimum) return null;
  return a[Math.floor(a.length / 2)];
}

/* Never treat a total count as a daily count. Use only TWO observations
   from the SAME provider and their real UTC capture dates. */
export function saveCounterObservation(records,day,total,provider) {
 if(!/^20\d{2}-\d{2}-\d{2}$/.test(day||"")||!Number.isSafeInteger(total)||total<0||
    !["mystreamcount","soundcamps"].includes(provider)) return records||[];
 const valid=(records||[]).filter(x=>x?.provider&&x?.date&&Number.isSafeInteger(x.total)&&
   !(x.date===day&&x.provider===provider));
 return [...valid,{date:day,total,provider}].sort((a,b)=>a.date.localeCompare(b.date)).slice(-28);
}
export function measuredProviderDelta(records,day,provider){
 return totalDelta((records||[]).filter(x=>x.provider===provider),day);
}
export function extractCounterTotal(html){
 const flat=String(html||"").replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ")
  .replace(/<[^>]*>/g," ").replace(/\s+/g," ");
 const x=flat.match(/Total Streams\s*([\d,]+)/i);
 if(!x)return null;
 const value=Number(x[1].replace(/,/g,""));
 return Number.isSafeInteger(value)&&value>=0?value:null;
}
