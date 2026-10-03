# music98.news

Source for the music98 music news, releases, daily chart and concerts website.

## Runtime

The site is deployed as a Cloudflare Worker using `worker.js`, `functions/`, `public/` and `wrangler.toml`. Site data and uploaded editorial media live in the configured Cloudflare resources, not in temporary GitHub research files.

## Development

```bash
npm ci
npm run check
```

The chart's scheduled source refreshes and artwork validation live in `.github/workflows/`. Keep their associated scripts and `public/data/` snapshots: the live chart can depend on the last completely verified data during source outages.

## Configuration

Configure credentials as environment secrets outside Git, never in source code, example files, documentation or commit messages. A non-empty `ADMIN_PASSWORD` must be configured for editor access. The required external API credentials belong in the Cloudflare settings or encrypted CI secrets.

## Editorial

The public admin interface is part of the website. Private house-style and editorial notes are maintained separately from this public repository. The optional manual editorial check workflow can validate a specified post without automatically running for every code change.
