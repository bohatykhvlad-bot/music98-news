# music98.news

Independent music desk: news, releases, and a Top 50 that can rebuild itself once a day.

## Run locally

```bash
cp .env.example .env    # then change ADMIN_PASSWORD
python3 scripts/serve.py
```

Open http://127.0.0.1:43123  
Private desk (not linked on the public site): http://127.0.0.1:43123/m98desk.html  
Password is `ADMIN_PASSWORD` in `.env` (default `music98`). Change it before you go live.

## Netlify

The public site is static HTML. On Netlify, keep **Build command empty** and **Publish directory** `.`. Do not set Functions directory to `functions/` — that folder is Cloudflare Pages. Use `netlify/functions` (empty). The homepage still loads `data/top50.json` if `/api/top50` is missing.

## Cloudflare

Do not upload a zip. Use **Cloudflare Pages connected to GitHub** so the `functions/` API (chart, desk, subscribe) actually runs.

Russian click-by-click: see **КАК-ЗАЛИТЬ.md**.

Short version:

1. [Sign up](https://dash.cloudflare.com/sign-up) → [Workers & Pages](https://dash.cloudflare.com/?to=/:account/workers-and-pages) → **Create** → **Pages** → **Connect to Git**.
2. Framework preset **None**, empty build command, output `/`.
3. Create a [KV namespace](https://dash.cloudflare.com/?to=/:account/workers/kv/namespaces), then in the project: **Settings → Bindings → Add → KV namespace**. Variable name must be `DESK`.
4. **Settings → Variables and Secrets**: `ADMIN_PASSWORD` (encrypt). Retry the deployment.
5. Desk URL: `https://YOUR-PROJECT.pages.dev/m98desk.html` (not linked on the public site).

`/api/top50` rebuilds on the first visit of the day and stores the result in KV. If that times out, the baked `data/top50.json` is served.

## Editorial desk

`/m98desk.html` is a private page. It is not linked in the footer. Bookmark it. You log in, write a story, attach a photo, press **Publish to the site**. Visitors see it on News / Releases. This writes to the server (`data/desk.json` locally, KV on Cloudflare).

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
