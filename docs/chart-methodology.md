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

GitHub Actions requests fresh USA and Global Apple Top 100 charts as an
atomic date-matched pair, then reads Spotify's dated Global Daily ranking.
Up to 200 Spotify chart entries can bring their own verified daily streams.
Additional artist pages are checked concurrently to recover Apple-only
songs. Collection records the number of candidates, verified counts,
unmatched songs, and each source's edition date.

The publisher rejects stale, malformed, partial and cross-edition input,
ambiguous IDs, duplicate song/Spotify IDs, missing artwork, broken previews
and damaged tenure or movement metadata. The worker writes the full
validated chart LAST, so a failed build never overwrites a good edition.

The source refresh runs every four hours (UTC: 01:45, 05:45, 09:45,
13:45, 17:45, 21:45). Failure leaves the preceding healthy edition
untouched. The next scheduled run retries; an earlier manual refresh is
also possible. A missing independent Spotify measurement is not filled
using Apple positions, regional US streams, or synthetic estimates.

Historical NEW/RE-ENTRY, arrows, and days are carried forward under the
existing continuity rules even when the scoring methodology changes.
