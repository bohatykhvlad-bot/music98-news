# music98.news

Independent music desk: news, releases, and a Top 50 that can rebuild itself once a day.

The chart scores a title across five public lists: Apple Music most-played (US), Spotify global daily, Deezer global, Billboard Hot 100, and YouTube Weekly Top Songs. A miss on a list is zero points. Trending videos are not used.

## Run locally

```bash
cp .env.example .env    # then change ADMIN_PASSWORD
python3 scripts/serve.py
```

Open http://127.0.0.1:43123  
Private desk (not linked on the public site): http://127.0.0.1:43123/m98desk  
Password is `ADMIN_PASSWORD` in `.env` (default `music98`). Change it before you go live.

In the desk: drop a cover and drag/zoom it like Instagram, type the story, click **Italic album** / **“Song title”** / **Photo in story** / **Apple song** / **Apple album**. Paste a `music.apple.com` link — the affiliate token is attached for you. **Publish to the site** goes live now. **Save draft** stays private. Set **Go live at** and press **Schedule** to wait until that time.

## Netlify

The public site is static HTML. On Netlify, keep **Build command empty** and **Publish directory** `public`. Do not set Functions directory to `functions/` — that folder is Cloudflare Workers. Use `netlify/functions` (empty). The homepage still loads `data/top50.json` if `/api/top50` is missing.

## Cloudflare

Do not upload a zip. Connect **Workers & Pages** to GitHub and deploy with `npx wrangler deploy` (this repo already has `worker.js` + `wrangler.toml`).

Russian click-by-click: see **КАК-ЗАЛИТЬ.md**.

Short version:

1. [Workers & Pages](https://dash.cloudflare.com/?to=/:account/workers-and-pages) → open **music98-news**.
2. If a build is red: **Retry build**. After it turns green, open the `*.workers.dev` link.
3. Live site: `https://music98-news.bohatykhvlad.workers.dev`
4. Desk URL: `https://music98-news.bohatykhvlad.workers.dev/m98desk` (not linked on the public site). Password defaults to `music98` until you set `ADMIN_PASSWORD`.
5. KV namespace `DESK` is provisioned from `wrangler.toml` on deploy.

`/api/top50` rebuilds on the first visit of the day and stores the result in KV. If that times out, the baked `data/top50.json` is served.

## Editorial desk

`/m98desk` is a private page. It is not linked in the footer. Bookmark it. You log in, write a story, frame the cover, click to insert photos and Apple players, then **Publish to the site**, **Save draft**, or **Schedule**. Visitors only see live stories. This writes to the server (`data/desk.json` locally, KV on Cloudflare).

Until you publish at least one post, the homepage keeps the demo stories.

## Newsletter

The Subscribe box saves the address to the same notebook (`/api/subscribe`).

A normal mailbox (Gmail, iCloud) is the wrong tool for a list: providers block bulk send, and there is no API meant for this.

Use a mail API, free tier is enough to start:

1. Create a [Resend](https://resend.com) account.
2. Put `RESEND_API_KEY` and `FROM_EMAIL` in `.env` (local) or in Cloudflare / Vercel env vars.
3. Verify your domain in Resend (or use their onboarding sender while testing).
4. Open the desk → Mail → write subject and text → **Send to the list**.

The server sends the letters. They do not go “from Gmail” unless you later connect a domain mailbox to Resend.

## Vercel

`/api/top50.py` is the Python rebuild. Add the same env vars. For the desk on Vercel you still need a store (KV). Cloudflare KV is the path already wired; we can add Vercel KV later if you publish there instead.
