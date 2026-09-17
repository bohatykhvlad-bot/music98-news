# music98.news

Independent music desk: news, releases, and a Top 50 that can rebuild itself once a day.

## Run locally

```bash
cp .env.example .env    # then change ADMIN_PASSWORD
python3 scripts/serve.py
```

Open http://127.0.0.1:43123  
Editorial desk: http://127.0.0.1:43123/admin.html (password from `.env`, default `music98`)

## Cloudflare, in plain language

Uploading the zip as **static files only** (R2, “Assets”, a plain CDN) is like putting a printed newspaper on a shelf: the site opens, but nothing can save a new post, a new email, or rebuild the chart by itself.

To have the chart and the desk work on Cloudflare you want **Cloudflare Pages** (not just a dump of files):

1. Create a Pages project and connect this folder (or GitHub).
2. Add environment variables: `ADMIN_PASSWORD`, later `RESEND_API_KEY` and `FROM_EMAIL`.
3. Create a **KV** namespace, bind it as `DESK`. That is the notebook where posts and subscriber emails are stored.
4. After that, `/api/top50` rebuilds the chart on the first visit of the day (cached 24 hours). The GitHub Action in `.github/workflows/daily-top50.yml` is a second, optional timer if you connect GitHub.

If Pages Functions time out on the chart rebuild, the baked `data/top50.json` still shows, and the GitHub Action can refresh that file daily.

## Editorial desk

`/admin.html` is a separate page. You log in, write a story, attach a photo, press **Publish to the site**. Visitors see it on News / Releases. This is not the old browser-only drawer: it writes to the server (`data/desk.json` locally, KV on Cloudflare).

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
