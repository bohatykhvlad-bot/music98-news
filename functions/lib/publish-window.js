/* Publication cadence for the daily chart.
 *
 * The four-hour collection runs keep capturing dated archives all day, but the
 * seed the site reads (apple-spotify-streams.json -> Worker -> Top 50) may
 * advance to a newer common source date at most once per day, and that advance
 * is taken in the morning window (UTC). Outside the window the published chart
 * is left untouched: visitors see one stable edition per day.
 *
 * Safety rails:
 *  - the previously published seed stays acceptable to the Worker until the
 *    next morning advance (TRI_MAX_LAG_DAYS in tri-source-chart.js);
 *  - a stale seed (catch-up) or a forced run (TRI_FORCE_PUBLISH=1) bypasses
 *    the window so the site can never stall behind failing morning runs.
 */

export const PUBLISH_WINDOW_START_UTC_HOUR = 5; // 05:45 UTC run = ~08:45 Kyiv
export const PUBLISH_WINDOW_END_UTC_HOUR = 9;   // 09:45 UTC run = ~12:45 Kyiv
export const MAX_DEFERRAL_DAYS = 3;             // must match TRI_MAX_LAG_DAYS

export function inPublishWindow(nowMs = Date.now()) {
  const hour = new Date(nowMs).getUTCHours();
  return hour >= PUBLISH_WINDOW_START_UTC_HOUR && hour <= PUBLISH_WINDOW_END_UTC_HOUR;
}

export function dayAge(day, nowMs = Date.now()) {
  const at = Date.parse(String(day || "") + "T00:00:00Z");
  if (!Number.isFinite(at)) return Infinity;
  const today = Math.floor(nowMs / 86400000) * 86400000;
  return Math.round((today - at) / 86400000);
}

export function shouldPublishSeed({previousDate, candidateDate = null, lastPublishedAt = null,
  nowMs = Date.now(), forced = false} = {}) {
  if (forced) return {publish: true, reason: "forced"};
  if (!previousDate) return {publish: true, reason: "initial"};
  const age = dayAge(previousDate, nowMs);
  const today = new Date(nowMs).toISOString().slice(0,10);
  /* A chart already published today must not rebuild under a late-arriving
     source edition. Keep today's ranks and movement stable until tomorrow. */
  if (String(lastPublishedAt||"").slice(0,10)===today)
    return {publish: false, reason: "already-published-today", age};
  if (age > MAX_DEFERRAL_DAYS) return {publish: true, reason: "catch-up", age};
  if (inPublishWindow(nowMs)) return {publish: true, reason: "morning-window", age};
  /* The morning may have failed on a rate limit, missing cover or temporary
     outage. A later scheduled run can publish a genuinely newer COMMON source
     date today, without waiting for the old seed to expire. */
  if (candidateDate && candidateDate>previousDate)
    return {publish: true, reason: "missed-morning-retry", age};
  return {publish: false, reason: "deferred-to-morning", age};
}
