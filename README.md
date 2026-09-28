# music98.news

Independent music desk: news, releases, and a Top 50 that can rebuild itself once a day.

The chart scores a title across five public lists: Apple Music most-played (US), Spotify global daily, Deezer global, Billboard Hot 100, and YouTube Weekly Top Songs. A miss on a list is zero points. Trending videos are not used.

## Обложки чарта и Apple metadata

`public/data/covers.json` — **канонический immutable registry обложек**. Ключ песни
(`title + primary artist + version`) получает одну проверенную картинку и после этого
автоматически больше не меняется. Remix, live, acoustic, sped-up, remaster и другие версии
имеют отдельную identity и не могут занять cover-lock оригинала.

Для новой песни `scripts/build-covers.mjs` сначала ищет точный релиз в Deezer, затем
использует Apple как fallback. Совпадение строго проверяется по title, primary artist и
version. После первого успешного выбора URL записывается в `covers.json` навсегда.
Изменить существующий lock можно только явной редакторской правкой, если выяснилось, что
изначально была закреплена неправильная обложка. CI отдельно проверяет, что ежедневная
сборка может только добавлять новые ключи и не переписывает существующие.

Apple по-прежнему отвечает за написание артистов/треков, ссылку Listen on Apple Music,
preview и год через `public/data/apple-names.json`. Это отделено от cover registry,
потому что внешний каталог способен задним числом менять artwork даже у того же track ID.

`.github/workflows/apple-data.yml` запускается ежедневно в 09:20 по Киеву и вручную через
Run workflow. Воркер считает `covers.json` источником истины, а KV — только runtime-кэшем.
Если для новой песни точная обложка временно не найдена, лучше оставить её незакреплённой
до следующей проверки, чем автоматически поставить картинку другого релиза.

## Run locally

```bash
cp .env.example .env    # then change ADMIN_PASSWORD
python3 scripts/serve.py
```

Open http://127.0.0.1:43123  
Private desk (not linked on the public site): http://127.0.0.1:43123/admin-desk  
Password is `ADMIN_PASSWORD` in `.env` (default `music98`). Change it before you go live.

In the desk: drop a cover and drag/zoom it like Instagram, type the story, click **Italic album** / **“Song title”** / **Photo in story** / **Apple song** / **Apple album**. Paste a `music.apple.com` link — the affiliate token is attached for you. **Publish to the site** goes live now. **Save draft** stays private. Set **Go live at** and press **Schedule** to wait until that time.

## Cloudflare

Do not upload a zip. Connect **Workers & Pages** to GitHub and deploy with `npx wrangler deploy` (this repo already has `worker.js` + `wrangler.toml`).

Russian click-by-click: see **КАК-ЗАЛИТЬ.md**.

Short version:

1. [Workers & Pages](https://dash.cloudflare.com/?to=/:account/workers-and-pages) → open **music98-news**.
2. If a build is red: **Retry build**. After it turns green, open the `*.workers.dev` link.
3. Live site: `https://music98-news.bohatykhvlad.workers.dev`
4. Desk URL: `https://music98.news/admin-desk` (not linked on the public site). Password defaults to `music98` until you set `ADMIN_PASSWORD`.
5. KV namespace `DESK` is provisioned from `wrangler.toml` on deploy.

`/api/top50` rebuilds on the first visit of the day and stores the result in KV. If that times out, the baked `data/top50.json` is served.

## Editorial desk

`/admin-desk` is a private page. It is not linked in the footer. Bookmark it. You log in, write a story, frame the cover, click to insert photos and Apple players, then **Publish to the site**, **Save draft**, or **Schedule**. Visitors only see live stories. This writes to the server (`data/desk.json` locally, KV on Cloudflare).

Until you publish at least one post, the homepage keeps the demo stories.

## Newsletter

The Subscribe box saves the address to the same notebook (`/api/subscribe`).

Letters go out through [Resend](https://resend.com). The live site stores the send key on the private desk (not in the public repo). Until `music98.news` is verified in Resend, the sender is `onboarding@resend.dev`, which only delivers to the inbox used to sign up there.

Open the desk → Mail → write subject and text → **Send to the list**.

The server sends the letters. They do not go “from Gmail”.

## Post runner

`scripts/post.py` runs the whole editorial cycle from the terminal and prints
only a compact report, so working through a chat does not re-read the desk and
the sources on every step.

```bash
python scripts/post.py list
python scripts/post.py show <id>
python scripts/post.py about "keywords" <url>...        # facts, not whole pages
python scripts/post.py finish <id> --body-file body.txt # set -> gate -> publish -> verify
```

`finish` refuses to publish unless `scripts/gate.py` reports PASS. It needs
`ADMIN_PASSWORD` in `.env`. `python scripts/post.py --help` lists everything.
