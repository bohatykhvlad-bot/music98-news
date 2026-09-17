# music98.news

Static music desk with a weekly **consensus Top 50**. The ranking averages Apple Music, Spotify, Deezer and Billboard. Amazon Music is excluded because it has no public web chart.

Each of the 50 rows expands the same way: a 30-second Apple preview plus the official **Listen on Apple Music** badge (from [Apple Marketing Tools](https://toolbox.marketingtools.apple.com/api/v2/badges/listen-on-apple-music/badge/en-us)), linked to the song with Apple affiliate parameters.

## Formula

For every source list of 50 titles:

```
points(position) = max(0, 51 − position)
missing chart    = 0
score            = A + S + D + B
```

Ties: more sources, then best rank, then title. Maximum score is 200.

On load the page renders `data/chart-snapshot.json`, then refreshes Apple Music and Deezer live. Spotify and Billboard stay in the snapshot.

## Run locally

Any static server. From the repo root:

```bash
python3 -m http.server 43123
```

Open http://127.0.0.1:43123

## Affiliate token

In `assets/app.js` set `APPLE_AFFILIATE.at` to your Apple Music / iTunes affiliate token. Links already include `itsct=music_box_badge`, `itscg=30200`, `ls=1`, and `app=music`. Leave `at` empty until you have a token — the badge still opens the correct song on Apple Music.

A MusicKit developer token is not required for this slice.

## Publish

Upload the whole folder (HTML, `assets/`, `data/`, `badges/`) to Beget, Timeweb, GitHub Pages, Netlify, or Vercel. No build step.
