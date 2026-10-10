# Music98 Daily Top 50 — Apple USA 40 / Spotify 30 / Apple Global 30

## Three independent entry paths

A candidate can originate from any of these daily charts:

- Apple Music **Top 100: USA** (40% weight).
- Spotify **Daily Top 200: Global**, with published daily stream numbers (30%).
- Apple Music **Top 100: Global** (30%).

Songs are joined using validated title, lead artist, and version. The
candidate pool is a UNION, never the strict three-way intersection or merely
50 Apple USA songs. An Apple-exclusive candidate can be considered, but it
must have independently confirmed Spotify daily streams before reaching the
published Top 50. Thus the published chart never reports a fabricated 0,
a misleading `null`, or a lifetime total as a daily counter.

Spotify counts come from the Global Daily chart on Kworb and, for songs not
listed there, a matching `Daily` field on a credited artist's page. Region,
source URL, source date and metric type are retained per recording.
The chart daily-stream series and artist-page Daily series may differ in
tracking conventions; this is explicitly recorded rather than described as
a single Spotify API feed. Artist names alone are not enough for matching.

## Rank formula

```
Apple USA score    = 40 * (101 - usRank) / 100, or 0 when absent
Spotify score      = 30 * sqrt(verifiedDaily / maximumDailyAmongCandidates)
Apple Global score = 30 * (101 - globalRank) / 100, or 0 when absent
Total              = sum of the three scores
```

Spotify's square-root transform keeps one enormous hit from overwhelming
all other songs while still allowing daily differences to reorder nearby
positions. All three signals have a maximum of their declared percentage
points. The maximum Spotify stream count comes from the full matched
candidate pool, not just the final Top 50. Only the highest-scoring 50
songs with strictly verified Spotify daily numbers are selected.

The weighting and transformations are Music98 editorial methodology,
not a Spotify or Apple-endorsed sales/stream-equivalent chart.

## Collection and fail-safe behavior

GitHub Actions collects the official Apple USA and Global Top 100 **every day**
and saves two immutable-by-date ranking snapshots. Spotify's Global Daily
Top 200 (and its numerical daily streams) is also saved under its true
source date. The collector selects only the **latest common calendar date**
present in all three archives within the two-day lag window.

On 10 October, the most recently confirmed common date is 8 October:
Apple USA Top 100 via the dated ChartStats historical archive (100 positions),
official Apple Global Top 50 recovered from music98's own verified 8 October
commit (50 positions), and Spotify Global Daily Top 200 from 8 October.
The initial Global archive is only 50 positions, so the collector does not
invent positions 51–100: any unlisted song earns no Global ranking points
for that edition. After 10 October, the daily archive captures all 100
official Global ranks. Dated third-party Apple history is explicitly marked
as a historical source, not represented as Apple's official archived API.

Additional artist pages are checked only if their daily edition date
actually equals the selected chart date. This prevents taking an older
Spotify chart while accidentally supplementing it with today's artist
counters. Verified song identities, positions, stream provenance and
capture dates remain in the source files. Historical input is retained for
14 days to accommodate source lag, retries and publishing audits.

The publisher rejects stale, malformed, partial and cross-edition input,
ambiguous IDs, duplicate song/Spotify IDs, missing artwork, broken previews
and damaged tenure or movement metadata. The worker writes the full
validated chart LAST, so a failed build never overwrites a good edition.

The source refresh runs every four hours (UTC: 01:45, 05:45, 09:45,
13:45, 17:45, 21:45). If no day has all three verified inputs, the
collector **does not substitute another date**, even if that source is
newer or older. Failure leaves the preceding healthy edition
untouched. The next scheduled run retries; an earlier manual refresh is
also possible. A missing independent Spotify measurement is not filled
using Apple positions, regional US streams, or synthetic estimates.

Historical NEW/RE-ENTRY, arrows, and days are carried forward under the
existing continuity rules even when the scoring methodology changes.
