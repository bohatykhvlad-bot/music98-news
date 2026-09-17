# music98.news

Independent music desk: news, releases, and a **Top 50** that rebuilds itself once per day. English UI.

Click a chart row (or focus it and press Enter) to play the 30-second preview in place. Each row has the official **Listen on Apple Music** badge; the link includes Apple affiliate parameters (`app=music`, `at`, `ct`).

## Daily Top 50

The ranking is rebuilt automatically:

- **Vercel:** the first visit of the day hits `/api/top50`, which rebuilds the list and caches it for 24 hours. A Vercel cron at 07:00 UTC warms that cache when the plan allows it.
- **GitHub:** `.github/workflows/daily-top50.yml` runs at 07:00 UTC, writes `data/top50.json`, and commits.
- **Any static host:** cron `python3 scripts/update_top50.py` once a day.

The page also keeps today’s list in the browser, so a second visit the same day does not wait on the network.

Turn this off in **Editor → Settings** (“Automatically refresh the Top 50 each day”).

## Run locally

```bash
python3 scripts/serve.py
```

Open http://127.0.0.1:43123

Or any static server plus a baked `data/top50.json`:

```bash
python3 -m http.server 43123
```

## Editor

`Ctrl+Shift+E` or the footer **Editor** control. Posts, the Top 50, and settings (including your Apple affiliate token) live in this browser’s local storage.

## Publish

Upload the folder (at least `index.html`, `badges/`, `data/`, `api/`) to Beget, Timeweb, GitHub Pages, Netlify, or Vercel. On Vercel the `/api/top50` function is what keeps the chart current.
