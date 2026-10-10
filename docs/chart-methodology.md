# Music98 Daily Top 50 — USA-led hybrid (v2)

## Sources and candidates

The 50 candidates are positions 1–50 of Apple Music's **Top 100: USA**
playlist `pl.606afcbb70264d2eb2b51d8dbcfa6a12`.
Apple **Top 100: Global** (`pl.d25f5d1181894928af76c85c967f8f31`)
provides additional positions among its Top 100. The official Apple
playlists must share a publication date; storefront locale is not used
as a proxy for ranking region.

Spotify supplies daily stream counters from Kworb artist pages. The collector
tries all credited performers with independently verified pages and can
recover globally charting tracks from Kworb's Spotify Global Daily Chart
using exact song/version and Spotify ID. **Chart Streams and artist-page
Daily are not identical metrics**. Each song records which metric and URL
was used. Regional US stream counters are not silently mixed with global
numbers. No cumulative/lifetime counter is substituted for a daily one.

## Ranking and limits

```
US points      = 70 * (51 - appleUSRank) / 50
Spotify points = 20 * sqrt(daily / maxMeasuredDaily)
Global points  = globalRank ? 10 * (101 - globalRank) / 100 : 0
Total          = US points + Spotify points + Global points
```

When Spotify data is missing, `daily` remains **null** with its reason.
For **scoring only**, the median of confirmed candidate daily values is
substituted, so unknown is not falsely treated as zero plays. It is never
reported as a confirmed counter. A supplementary source cannot move a
track more than ten chart positions relative to the original US order.
This 70/20/10 split and movement cap are Music98 editorial choices,
not a chart endorsed by Apple or Spotify.

The chart always has the 50 Apple USA candidates; 50 **verified Spotify
counters** cannot be promised because independent services may not expose
them. The collector records matched/unmatched counts and recovery paths.
Publication needs at least 25 genuine dated matched values. All 50 tracks
must have verified audio/artwork and stable song identities before the Worker
writes rank/tenure KV data. Missing or stale source snapshots cause the
last verified full edition to be retained instead of fabricating rankings.

## Update safeguards

Apple USA and Global snapshots are fetched together. A complete paired
stream snapshot is gathered with one recent Spotify edition date
(maximum age two UTC days). Missing or mixed-region measurements are
not silently converted. GitHub Actions regenerates source JSON from
current main following a concurrent push rather than rebasing generated
JSON through merge conflicts.

Historic editions use the scoring method under which they were created.
Stored lifetime days and NEW/RE-ENTRY signals are not zeroed on migration.
