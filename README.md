# music98.news

Independent music desk: news, releases, and a weekly **Top 50**. English UI. Static files only — no build step.

Click a chart row (or focus it and press Enter) to play the 30-second preview in place. Each row also has the official **Listen on Apple Music** badge; the link includes Apple affiliate parameters (`app=music`, `at`, `ct`).

## Run locally

From the repo root:

```bash
python3 -m http.server 43123
```

Open http://127.0.0.1:43123

## Editor

`Ctrl+Shift+E` or the footer **Editor** control. Posts, the Top 50, and settings (including your Apple affiliate token) live in this browser’s local storage.

## Publish

Upload the folder as-is (at least `index.html` and `badges/`) to Beget, Timeweb, GitHub Pages, Netlify, or Vercel.
