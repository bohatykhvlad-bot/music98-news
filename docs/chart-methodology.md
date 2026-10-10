# Daily Top 50: Apple candidates with Spotify daily stream correction

The candidate set is exactly positions 1–50 of Apple Music's **Top 100: Global**
playlist `pl.d25f5d1181894928af76c85c967f8f31`. Spotify does not add candidates.
Deezer and the previous three-chart intersection are not used for this edition.

For each candidate, the collector resolves the leading artist in Kworb's artist
directory (supplemented by artist links in its global chart for newer artists).
It reads the artist's **Spotify Top Songs → Daily** column, not lifetime Streams
or the separate Spotify chart Streams column. Those metrics must not be mixed.
These are Kworb-reported Spotify counters; this site does not directly query
Spotify's internal play-count API.

Matches require the correct artist page, normalized title, and the same track
version. Featured rows on another lead artist's page and ambiguous multiple IDs
are rejected. Spotify IDs and source URLs are preserved in the public snapshot.

## Formula v1

```
applePoints = 51 - appleRank
spotifyBonus = 10 × dailyStreams / maxDailyStreamsAmongMatchedCandidates
score = applePoints + spotifyBonus
```

Order is descending score; ties retain Apple order. Spotify's bonus is bounded
between 0 and 10 points. All 50 Apple candidates remain, including songs outside
Spotify's global Top 200. The 10-point correction is a music98 editorial choice,
not a formula provided by Apple, Spotify, or Kworb.

An unmatched, ambiguous, stale, or different-edition counter is **unknown**
(`daily: null`). It gets no Spotify bonus and retains its Apple base points.
That is not a claim that the song has zero Spotify streams. Thus coverage can
affect relative ordering; coverage and missing-data reasons are recorded.

## Dates and publication

Apple's playlist publication date and Kworb's page **Last updated** date are
stored separately. Kworb's update date is not relabelled as an official Spotify
chart date. All counters used in one edition must have the same recent update
date. The collector chooses the recent date covering the most candidate songs;
other dates receive no bonus. Recent means no more than two UTC days old.

GitHub Actions collects paired Apple/Kworb assets every four hours. It publishes
them atomically only after validation, with at least 25 matched counters out of
50. Network failures, malformed source tables, insufficient coverage, and a
same-Apple-date loss of more than five matches retain the last verified snapshot.
These guards distinguish a source outage from a legitimately untracked song.

The Worker reads these assets instead of scraping 50 pages per visitor. Source
fingerprints invalidate cached rankings even during same-day counter updates.
Old three-source browser and Worker caches cannot be served as this methodology.
Artwork, audio previews, stable track identity, tenure, and movement checks
remain publication requirements. Historical editions retain their original
methodology; they are never relabelled as the new chart.
