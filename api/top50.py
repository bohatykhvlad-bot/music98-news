#!/usr/bin/env python3
"""Rebuild the music98.news Top 50.

Score = sum of max(0, 51 - position) across five public lists
(Apple, Spotify, Deezer, Billboard, YouTube Weekly Top Songs).
A list a title is missing from contributes 0. Ties: more lists, then
best rank, then title. Amazon Music is not included (no public chart).
YouTube Trending is not used: it mixes non-music videos.

This module is both the Vercel serverless handler and the local CLI.
"""
from __future__ import annotations

import html as htmlmod
import json
import re
import ssl
import sys
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

SIZE = 50
SOURCES = ("A", "S", "D", "B", "Y")
LAUNCH = date(2026, 9, 17)
YT_CHARTS = (
    "https://charts.youtube.com/youtubei/v1/browse?alt=json"
    "&key=AIzaSyCzEW7JUJdSql0-2V4tHUb6laYm4iAE_dM"
)
ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
TENURE_PATH = PUBLIC / "data" / "chart-tenure.json"
# day a song first appeared, kept separately so a rebuilt registry cannot zero the counter
FIRST_PATH = PUBLIC / "data" / "chart-first.json"
# Apple-only artwork per song, so covers do not flip between sources day to day
COVERS_PATH = PUBLIC / "data" / "chart-covers.json"
# offline-built Apple covers (scripts/build-covers.mjs, обновляет GitHub Actions)
SEED_COVERS_PATH = PUBLIC / "data" / "covers.json"
# one accepted spelling per song (same idea as the covers: what we took once stays)
NAMES_PATH = PUBLIC / "data" / "chart-names.json"
# Apple spellings collected by scripts/build-covers.mjs on the GitHub runner
SEED_NAMES_PATH = PUBLIC / "data" / "apple-names.json"
UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
)
CTX = ssl.create_default_context()
APPLE_AT = "1001l3aZW"
APPLE_CT = "music98"

TITLE_ALIASES = {
    "iknewitiknewyoufromtoystory5": "iknewitiknewyou",
    "daidaiwiburnaboy": "daidai",
    "daidaififaworldcupofficialsong2026": "daidai",
    "bbywowwjudelinerusowsky": "bbywow",
    "draculawithjennie": "dracula",
    "soeasytofallinlove": "soeasy",
    "cinderellawtydollasign": "cinderella",
    "beautyandabeatwnickiminaj": "beautyandabeat",
    "diewithasmilewbrunomars": "diewithasmile",
}
ARTIST_ALIASES = {
    "karolgjudelinerusowsky": "karolg",
    "karolgwithjudeline": "karolg",
    "shakiraxburnaboy": "shakira",
    "tameimpalaandjennie": "tameimpala",
    "ellalangleyandmorganwallen": "ellalangley",
    "macmillerfeaturingtydollasign": "macmiller",
    "stellaleftyfeaturingvincentmason": "stellalefty",
}


def log(*args):
    print(*args, file=sys.stderr)


def fetch(url: str, timeout: int = 22) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
    with urllib.request.urlopen(req, timeout=timeout, context=CTX) as resp:
        return resp.read().decode("utf-8", "replace")


def fetch_json(url: str, timeout: int = 22):
    return json.loads(fetch(url, timeout=timeout))


def fetch_post_json(url: str, body: dict, timeout: int = 22):
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "User-Agent": UA,
            "Accept": "*/*",
            "Content-Type": "application/json",
            "Origin": "https://charts.youtube.com",
            "Referer": "https://charts.youtube.com/charts/TopSongs/global/weekly",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout, context=CTX) as resp:
        return json.loads(resp.read().decode("utf-8", "replace"))


def strip_paren(s: str) -> str:
    return re.sub(r"\([^)]*\)|\[[^\]]*\]", " ", s or "")


def norm_title(s: str) -> str:
    t = strip_paren(s).lower().replace("’", "'").replace("‘", "'")
    t = re.sub(r"\b(remastered|remix|single|deluxe|from)\b", "", t)
    t = re.sub(r"[^a-z0-9]+", "", t)
    return TITLE_ALIASES.get(t, t)


def primary_artist(s: str) -> str:
    part = re.split(
        r"\s*(?:,|&|/|\+| x | × | feat\.? | ft\.? | featuring | with | w/ )\s*",
        s or "",
        flags=re.I,
    )[0]
    a = re.sub(r"[^a-z0-9]+", "", part.lower())
    return ARTIST_ALIASES.get(a, a)


def merge_key(title: str, artist: str) -> str:
    return f"{norm_title(title)}|{primary_artist(artist)}"


def points(pos) -> int:
    try:
        n = int(pos)
    except (TypeError, ValueError):
        return 0
    if n < 1 or n > SIZE:
        return 0
    return SIZE + 1 - n


def parse_apple(data: dict) -> list[dict]:
    rows = []
    for i, item in enumerate((data.get("feed") or {}).get("results") or [], 1):
        url = item.get("url") or ""
        art = (item.get("artworkUrl100") or "").replace("100x100bb", "600x600bb")
        rows.append(
            {
                "pos": i,
                "title": item.get("name") or "",
                "artist": item.get("artistName") or "",
                "url": url,
                "art": art,
                "year": (item.get("releaseDate") or "")[:4],
                "prev": "",
            }
        )
        if i >= SIZE:
            break
    return [r for r in rows if r["title"] and r["artist"]]


def parse_deezer(data: dict) -> list[dict]:
    rows = []
    for i, item in enumerate(data.get("data") or [], 1):
        album = item.get("album") or {}
        artist = (item.get("artist") or {}).get("name") or ""
        rows.append(
            {
                "pos": i,
                "title": item.get("title") or "",
                "artist": artist,
                "url": "",
                "art": album.get("cover_xl") or album.get("cover_medium") or "",
                "year": "",
                "prev": item.get("preview") or "",
            }
        )
        if i >= SIZE:
            break
    return [r for r in rows if r["title"] and r["artist"]]


class _Text(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []

    def handle_data(self, data):
        self.parts.append(data)

    def text(self) -> str:
        return htmlmod.unescape("".join(self.parts))


def strip_tags(chunk: str) -> str:
    p = _Text()
    try:
        p.feed(chunk)
        p.close()
    except Exception:
        return re.sub(r"<[^>]+>", "", chunk)
    return p.text()


def parse_spotify_kworb(page: str) -> list[dict]:
    rows = []
    for m in re.finditer(
        r'<tr><td class="np">(\d+)</td>\s*<td class="np">[^<]*</td>\s*'
        r'<td class="text mp"><div>(.*?)</div></td>',
        page,
        re.S,
    ):
        pos = int(m.group(1))
        if pos > SIZE:
            continue
        text = re.sub(r"\s+", " ", strip_tags(m.group(2))).strip()
        if " - " not in text:
            continue
        artist, title = text.split(" - ", 1)
        rows.append(
            {
                "pos": pos,
                "title": title.strip(),
                "artist": artist.strip(),
                "url": "",
                "art": "",
                "year": "",
                "prev": "",
            }
        )
    rows.sort(key=lambda r: r["pos"])
    return rows[:SIZE]


def parse_youtube(data: dict) -> list[dict]:
    try:
        content = (
            data["contents"]["sectionListRenderer"]["contents"][0][
                "musicAnalyticsSectionRenderer"
            ]["content"]
        )
    except (KeyError, IndexError, TypeError):
        return []
    groups = content.get("trackTypes") or []
    weekly = next(
        (g for g in groups if g.get("chartPeriodType") == "CHART_PERIOD_TYPE_WEEKLY"),
        groups[0] if groups else {},
    )
    seen = set()
    rows = []
    for item in weekly.get("trackViews") or []:
        title = item.get("name") or ""
        artist = ", ".join(
            a.get("name") or "" for a in (item.get("artists") or []) if a.get("name")
        )
        if not title or not artist:
            continue
        key = merge_key(title, artist)
        if key in seen:
            continue
        seen.add(key)
        meta = item.get("chartEntryMetadata") or {}
        try:
            pos = int(meta.get("currentPosition") or 0)
        except (TypeError, ValueError):
            pos = 0
        if pos < 1:
            pos = len(rows) + 1
        if pos > SIZE:
            continue
        rows.append(
            {
                "pos": pos,
                "title": title,
                "artist": artist,
                "url": "",
                "art": "",
                "year": "",
                "prev": "",
            }
        )
        if len(rows) >= SIZE:
            break
    rows.sort(key=lambda r: r["pos"])
    return rows[:SIZE]


def parse_billboard(page: str) -> list[dict]:
    parts = page.split("o-chart-results-list-row //")
    seen = set()
    rows = []
    for chunk in parts[1:]:
        tm = re.search(r'id="title-of-a-story"[^>]*>\s*([^<]+)', chunk)
        am = re.search(
            r'href="https://www\.billboard\.com/artist/[^"]+"[^>]*>\s*([^<]+)',
            chunk,
        )
        if not tm or not am:
            continue
        title = htmlmod.unescape(tm.group(1)).strip()
        artist = htmlmod.unescape(am.group(1)).strip()
        if not title or not artist:
            continue
        key = merge_key(title, artist)
        if key in seen:
            continue
        seen.add(key)
        rows.append(
            {
                "pos": len(rows) + 1,
                "title": title,
                "artist": artist,
                "url": "",
                "art": "",
                "year": "",
                "prev": "",
            }
        )
        if len(rows) >= SIZE:
            break
    return rows


def load_source(name: str, fn):
    try:
        rows = fn()
        log(f"{name}: {len(rows)} titles")
        return rows
    except Exception as exc:
        log(f"{name}: failed ({exc})")
        return []


def is_apple_preview(url: str) -> bool:
    u = (url or "").lower()
    return "apple.com" in u or "mzstatic.com" in u


def is_deezer_art(url: str) -> bool:
    host = (urllib.parse.urlparse(url or "").hostname or "").lower()
    return host == "dzcdn.net" or host.endswith(".dzcdn.net")


def is_apple_art(url: str) -> bool:
    host = (urllib.parse.urlparse(url or "").hostname or "").lower()
    return host == "mzstatic.com" or host.endswith(".mzstatic.com")


def clean_display(title: str, artist: str) -> tuple[str, str]:
    """Spotify puts features in the title ("Die With A Smile (w/ Bruno Mars)"),
    Apple puts them in the artist line. Move them over so "w/" never shows up."""
    t0 = (title or "").strip()
    m = re.search(r"\s*[(\[](?:w/|w\.|with|feat\.?|ft\.?|featuring)\s+([^)\]]+)[)\]]\s*$", t0, re.I)
    if not m:
        return t0, (artist or "").strip()
    head = t0[: m.start()].strip() or t0
    artist2 = (artist or "").strip()
    feats = [s.strip() for s in re.split(r"\s*(?:,|&|\+|/| x | × | and )\s*", m.group(1), flags=re.I) if s.strip()]
    have = artist2.lower()
    for f in feats:
        if f.lower() not in have:
            artist2 = f"{artist2}, {f}" if artist2 else f
    return head, artist2


def pick_name(seed_rec, cached_rec, cur, name_src) -> tuple[str, str, str]:
    """Какое написание показываем: засев Apple -> запомненное ранее -> текущее.
    Если Apple назвал ту же песню версией-вариантом ("... (Track by Track)"), а в чарте
    название плоское - оставляем плоское."""
    if isinstance(seed_rec, dict) and seed_rec.get("title") and seed_rec.get("artist"):
        title = seed_rec["title"]
        same_song = norm_title(title) == norm_title(cur[0])
        seed_variant = strip_paren(title).strip() != str(title).strip()
        cur_plain = strip_paren(cur[0]).strip() == str(cur[0]).strip()
        if same_song and seed_variant and cur_plain:
            title = cur[0]
        return title, seed_rec["artist"], "seed"
    cached = cached_rec if isinstance(cached_rec, dict) else {}
    upgrade = name_src == "A" and cached and cached.get("src") != "A"
    if cached.get("title") and cached.get("artist") and not upgrade:
        return cached["title"], cached["artist"], cached.get("src") or ""
    return cur[0], cur[1], name_src or ""


def apply_names(tracks: list[dict]) -> None:
    """Apple spelling from the seed wins; otherwise the first variant we accepted stays.
    If Apple ever answers with its full credits, that spelling replaces a shortened one, once."""
    try:
        names = json.loads(NAMES_PATH.read_text(encoding="utf-8"))
        if not isinstance(names, dict):
            names = {}
    except Exception:
        names = {}
    try:
        seed = json.loads(SEED_NAMES_PATH.read_text(encoding="utf-8"))
        if not isinstance(seed, dict):
            seed = {}
    except Exception:
        seed = {}
    changed = False
    for t in tracks:
        cur = clean_display(t["title"], t["artist"])
        key = merge_key(cur[0], cur[1])
        title, artist, src = pick_name(seed.get(key), names.get(key), cur, t.get("nameSrc"))
        title, artist = clean_display(title, artist)
        t["title"], t["artist"] = title, artist
        rec = {"title": title, "artist": artist, "src": src}
        if names.get(key) != rec:
            names[key] = rec
            changed = True
    if changed:
        NAMES_PATH.parent.mkdir(exist_ok=True)
        try:
            NAMES_PATH.write_text(
                json.dumps(names, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
            )
        except OSError:
            pass


def fill_covers_apple(tracks: list[dict]) -> None:
    """Apple covers for the rest: exact release by the track id in the link (?i=...)."""
    want: list[tuple[dict, str]] = []
    for t in tracks:
        if is_apple_art(t.get("art") or ""):
            continue
        m = re.search(r"[?&]i=(\d+)", t.get("url") or "")
        if m:
            want.append((t, m.group(1)))
    if not want:
        return
    ids = sorted({i for _, i in want})
    found: dict[str, str] = {}
    for n in range(0, len(ids), 50):
        try:
            data = fetch_json(
                "https://itunes.apple.com/lookup?id="
                + ",".join(ids[n : n + 50])
                + "&entity=song&country=US",
                timeout=10,
            )
        except Exception:
            continue
        for item in data.get("results") or []:
            tid = str(item.get("trackId") or "")
            art = (item.get("artworkUrl100") or "").replace("100x100bb", "600x600bb")
            if tid and art:
                found[tid] = art
    for t, tid in want:
        if found.get(tid):
            t["art"] = found[tid]


def apply_covers(tracks: list[dict]) -> None:
    """Apple cover per song, remembered so the sleeve never changes day to day.
    Deezer art is only a last resort so a card is never empty."""
    try:
        covers = json.loads(COVERS_PATH.read_text(encoding="utf-8"))
        if not isinstance(covers, dict):
            covers = {}
    except Exception:
        covers = {}
    try:
        seed = json.loads(SEED_COVERS_PATH.read_text(encoding="utf-8"))
        if not isinstance(seed, dict):
            seed = {}
    except Exception:
        seed = {}
    changed = False
    for t in tracks:
        key = merge_key(t["title"], t["artist"])
        cached = covers.get(key) or ""
        apple = (t.get("art") or "") if is_apple_art(t.get("art") or "") else seed.get(key) or ""
        if is_apple_art(apple) and not is_apple_art(cached):
            covers[key] = apple
            t["art"] = apple
            changed = True
            continue
        if cached:
            t["art"] = cached
            continue
        if is_apple_art(apple):
            covers[key] = apple
            t["art"] = apple
            changed = True
            continue
        if is_deezer_art(t.get("art") or ""):
            covers[key] = t["art"]
            changed = True
            continue
        t["art"] = ""
    if changed:
        COVERS_PATH.parent.mkdir(exist_ok=True)
        try:
            COVERS_PATH.write_text(
                json.dumps(covers, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
            )
        except OSError:
            pass


def apple_aff(url: str) -> str:
    if not url or "apple.com" not in url.lower():
        return url or ""
    parsed = urllib.parse.urlparse(url)
    q = urllib.parse.parse_qsl(parsed.query, keep_blank_values=True)
    q = [(k, v) for k, v in q if k not in ("at", "ct", "app")]
    q.extend([("app", "music"), ("at", APPLE_AT), ("ct", APPLE_CT)])
    return urllib.parse.urlunparse(parsed._replace(query=urllib.parse.urlencode(q)))


def itunes_lookup(title: str, artist: str) -> dict:
    term = urllib.parse.quote(f"{artist} {strip_paren(title)}".strip())
    url = f"https://itunes.apple.com/search?term={term}&entity=song&limit=5&country=US"
    try:
        data = fetch_json(url, timeout=10)
    except Exception:
        return {}
    want_t, want_a = norm_title(title), primary_artist(artist)
    hit = None
    for item in data.get("results") or []:
        if norm_title(item.get("trackName") or "") == want_t:
            hit = item
            if primary_artist(item.get("artistName") or "") == want_a:
                break
    if not hit and data.get("results"):
        hit = data["results"][0]
    if not hit:
        return {}
    album = str(hit.get("collectionId") or "")
    track = str(hit.get("trackId") or "")
    apple = ""
    if album and track:
        apple = f"https://music.apple.com/us/album/{album}?i={track}"
    elif hit.get("trackViewUrl"):
        apple = hit["trackViewUrl"]
    return {
        "url": apple,
        "art": (hit.get("artworkUrl100") or "").replace("100x100bb", "600x600bb"),
        "prev": hit.get("previewUrl") or "",
        "year": (hit.get("releaseDate") or "")[:4],
    }


def enrich_tracks(tracks: list[dict]) -> None:
    def one(t):
        if t.get("url"):
            t["url"] = apple_aff(t["url"])
        if (
            t.get("url")
            and is_apple_preview(t.get("prev") or "")
        ):
            return t
        extra = itunes_lookup(t["title"], t["artist"])
        if extra.get("prev") and (
            is_apple_preview(extra["prev"]) or not is_apple_preview(t.get("prev") or "")
        ):
            t["prev"] = extra["prev"]
        if extra.get("url") and not t.get("url"):
            t["url"] = extra["url"]
        if extra.get("art") and not is_apple_art(t.get("art") or ""):
            t["art"] = extra["art"]
        if extra.get("year") and not t.get("year"):
            t["year"] = extra["year"]
        if t.get("url"):
            t["url"] = apple_aff(t["url"])
        if t.get("prev") and not is_apple_preview(t["prev"]):
            t["prev"] = ""
        return t

    with ThreadPoolExecutor(max_workers=8) as pool:
        list(pool.map(one, tracks))


def ingest(bucket: dict, src: str, rows: list[dict]) -> None:
    for row in rows:
        key = merge_key(row["title"], row["artist"])
        rec = bucket.get(key) or {
            "title": row["title"],
            "artist": row["artist"],
            "ranks": {},
            "url": "",
            "art": "",
            "prev": "",
            "year": "",
        }
        rec["ranks"][src] = row["pos"]
        if src == "A":
            rec["title"] = row["title"]
            rec["artist"] = row["artist"]
            rec["nameSrc"] = "A"
        if row.get("url") and not rec["url"]:
            rec["url"] = row["url"]
        if row.get("art") and (
            not rec["art"] or (is_apple_art(row["art"]) and not is_apple_art(rec["art"]))
        ):
            rec["art"] = row["art"]
        prev = row.get("prev") or ""
        if is_apple_preview(prev) and not is_apple_preview(rec.get("prev") or ""):
            rec["prev"] = prev
        if row.get("year") and not rec["year"]:
            rec["year"] = row["year"]
        bucket[key] = rec


def score_of(ranks: dict) -> int:
    return sum(points(ranks.get(k)) for k in SOURCES)


def chart_week(day=None) -> int:
    """The chart rebuilds daily: the period counter is a day index, not weeks."""
    day = day or datetime.now(timezone.utc).date()
    return max(0, (day - LAUNCH).days)


def tenure_key(title: str, artist: str) -> str:
    """A song's identity is merge_key (normalized title + primary artist) - the same
    key ingest() uses to fold the five sources into one chart row. Building it from the
    raw display string made Apple's "BbY WOW / KAROL G, Judeline & rusowsky" and
    Spotify's "BbY WOW (w/ Judeline, rusowsky) / KAROL G" two different songs, so a
    source that answered differently re-flagged a song already on the chart as NEW."""
    return merge_key(title, artist)


def rekey_seen(seen: dict) -> dict:
    """Re-key a registry written before the fix (old "title|artist" keys). Idempotent,
    so it is safe on every load; a missing day still counts as NEW."""
    out: dict = {}
    for k, v in (seen or {}).items():
        cut = str(k).find("|")
        if cut < 0:
            continue
        nk = tenure_key(k[:cut], k[cut + 1 :])
        prev = out.get(nk)
        if prev is None or int((v or {}).get("weeks") or 0) > int((prev or {}).get("weeks") or 0):
            out[nk] = v
    return out


def apply_tenure(tracks: list[dict]) -> list[dict]:
    """Daily chart: delta/weeks vs the previous day's order (mirrors the worker)."""
    week = chart_week()
    try:
        ten = json.loads(TENURE_PATH.read_text(encoding="utf-8"))
    except Exception:
        ten = {}
    if ten.get("launch") != LAUNCH.isoformat():
        ten = {"launch": LAUNCH.isoformat(), "week": week, "keys": [], "seen": {}}
    try:
        first_day = json.loads(FIRST_PATH.read_text(encoding="utf-8"))
    except Exception:
        first_day = {}
    prev_keys = []
    for k in ten.get("keys") or []:
        cut = str(k).find("|")
        prev_keys.append(tenure_key(k[:cut], k[cut + 1 :]) if cut >= 0 else k)
    seen = rekey_seen(ten.get("seen") or {})
    # first fill of the ledger: the day a song appeared comes from the registry it has
    # (counted from the record's lastWeek, not from today - otherwise the count is off by one)
    for k, rec in seen.items():
        if k in first_day:
            continue
        w = int((rec or {}).get("weeks") or 1)
        at = (rec or {}).get("lastWeek")
        at = int(at) if isinstance(at, (int, float)) else week
        first_day[k] = max(0, at - (w - 1))
    first = not prev_keys
    rolled = (not first) and ten.get("week") != week
    new_keys = []
    for i, track in enumerate(tracks):
        key = tenure_key(track["title"], track["artist"])
        new_keys.append(key)
        try:
            prev_pos = prev_keys.index(key)
        except ValueError:
            prev_pos = -1
        rec = seen.get(key) or {"weeks": 0}
        if first:
            first_day.setdefault(key, week)
            track["delta"] = "0"
        elif not rolled:
            first_day.setdefault(key, week)
            # same-day rebuild: show movement only if it was computed today
            track["delta"] = (
                str(rec["delta"])
                if rec.get("lastWeek") == week and rec.get("delta") not in (None, "")
                else "0"
            )
        elif prev_pos < 0:
            # the song was not on the chart yesterday: a new streak starts -> NEW
            first_day[key] = week
            track["delta"] = "new"
        else:
            first_day.setdefault(key, week)
            track["delta"] = str(prev_pos - i)
        track["weeks"] = max(1, week - first_day[key] + 1)
        seen[key] = {
            "weeks": track["weeks"],
            "lastPos": i,
            "lastWeek": week,
            "delta": track["delta"],
        }
    if first or rolled:
        ten["keys"] = new_keys
    ten["week"] = week
    ten["seen"] = seen
    TENURE_PATH.parent.mkdir(exist_ok=True)
    try:
        TENURE_PATH.write_text(
            json.dumps(ten, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        FIRST_PATH.write_text(
            json.dumps(first_day, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
    except OSError:
        pass
    return tracks


def build_payload(enrich: bool = False) -> dict:
    apple = load_source(
        "A",
        lambda: parse_apple(
            fetch_json(
                "https://rss.applemarketingtools.com/api/v2/us/music/most-played/50/songs.json"
            )
        ),
    )
    if not apple:
        apple = load_source(
            "A-rss",
            lambda: parse_apple_rss(
                fetch_json("https://itunes.apple.com/us/rss/topsongs/limit=50/json")
            ),
        )
    spotify = load_source(
        "S",
        lambda: parse_spotify_kworb(
            fetch("https://kworb.net/spotify/country/global_daily.html")
        ),
    )
    deezer = load_source(
        "D", lambda: parse_deezer(fetch_json("https://api.deezer.com/chart/0/tracks?limit=50"))
    )
    billboard = load_source(
        "B", lambda: parse_billboard(fetch("https://www.billboard.com/charts/hot-100/"))
    )
    youtube = load_source(
        "Y",
        lambda: parse_youtube(
            fetch_post_json(
                YT_CHARTS,
                {
                    "context": {
                        "client": {
                            "clientName": "WEB_MUSIC_ANALYTICS",
                            "clientVersion": "2.0",
                            "hl": "en",
                            "gl": "US",
                            "theme": "MUSIC",
                        }
                    },
                    "browseId": "FEmusic_analytics_charts_home",
                    "query": json.dumps({"region": "global"}),
                },
            )
        ),
    )

    bucket: dict[str, dict] = {}
    ingest(bucket, "A", apple)
    ingest(bucket, "S", spotify)
    ingest(bucket, "D", deezer)
    ingest(bucket, "B", billboard)
    ingest(bucket, "Y", youtube)

    ranked = sorted(
        bucket.values(),
        key=lambda r: (
            -score_of(r["ranks"]),
            -sum(1 for v in r["ranks"].values() if v),
            min([v for v in r["ranks"].values() if v] or [99]),
            r["title"].lower(),
        ),
    )[:SIZE]

    if enrich:
        apply_covers(ranked)        # KV -> Apple из сборки -> засев -> Deezer -> пусто
        fill_covers_apple(ranked)   # точный релиз по Apple-ID из ссылки
        enrich_tracks(ranked)       # ссылка/превью/год из iTunes, если Apple ответил
        apply_covers(ranked)        # запомнить найденное

    tracks = []
    for i, rec in enumerate(ranked, 1):
        prev = rec.get("prev") or ""
        if not is_apple_preview(prev):
            prev = ""
        tracks.append(
            {
                "rank": i,
                "title": rec["title"],
                "artist": rec["artist"],
                "url": apple_aff(rec.get("url") or ""),
                "art": rec.get("art") or "",
                "prev": prev,
                "year": rec.get("year") or "",
                "nameSrc": rec.get("nameSrc") or "",
            }
        )
    apply_names(tracks)               # одно написание имени на песню
    for t in tracks:
        t.pop("nameSrc", None)
    return {
        "updated": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "launch": LAUNCH.isoformat(),
        "week": chart_week() + 1,
        "tracks": apply_tenure(tracks),
    }


def parse_apple_rss(data: dict) -> list[dict]:
    entries = (data.get("feed") or {}).get("entry") or []
    rows = []
    for i, e in enumerate(entries, 1):
        title = (e.get("im:name") or {}).get("label") or ""
        artist = (e.get("im:artist") or {}).get("label") or ""
        url = ""
        prev = ""
        link = e.get("link")
        if isinstance(link, list):
            for item in link:
                attrs = (item or {}).get("attributes") or {}
                if attrs.get("im:assetType") == "preview" or attrs.get("title") == "Preview":
                    prev = attrs.get("href") or prev
                elif attrs.get("href") and "preview" not in (attrs.get("type") or ""):
                    url = url or attrs.get("href") or ""
        elif isinstance(link, dict):
            url = ((link.get("attributes") or {}).get("href")) or ""
        images = e.get("im:image") or []
        art = (images[-1].get("label") if images else "") or ""
        art = art.replace("170x170bb", "300x300bb").replace("100x100bb", "300x300bb")
        rd = e.get("im:releaseDate")
        year = (rd if isinstance(rd, str) else (rd or {}).get("label") or "")[:4]
        rows.append(
            {
                "pos": i,
                "title": title,
                "artist": artist,
                "url": url,
                "art": art,
                "year": year,
                "prev": prev,
            }
        )
        if i >= SIZE:
            break
    return [r for r in rows if r["title"] and r["artist"]]


def js_obj(track: dict, weeks: int, delta: str) -> str:
    payload = {
        "title": track["title"],
        "artist": track["artist"],
        "weeks": weeks,
        "delta": delta,
        "url": apple_aff(track.get("url") or ""),
        "art": track.get("art") or "",
        "prev": track.get("prev") or "",
        "year": track.get("year") or "",
    }
    parts = []
    for key, val in payload.items():
        if isinstance(val, int):
            parts.append(f"{key}:{val}")
        else:
            parts.append(f"{key}:{json.dumps(val, ensure_ascii=False)}")
    return "{" + ",".join(parts) + "}"


def write_static(payload: dict) -> None:
    out_dir = PUBLIC / "data"
    out_dir.mkdir(exist_ok=True)
    (out_dir / "top50.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    index = PUBLIC / "index.html"
    html = index.read_text(encoding="utf-8")
    items = []
    for i, track in enumerate(payload["tracks"], 1):
        weeks = int(track.get("weeks") or 1)
        delta = str(track.get("delta") if track.get("delta") is not None else "0")
        items.append("  " + js_obj(track, weeks, delta))
    block = "const TOP50 = [\n" + ",\n".join(items) + "\n];"
    html2, n = re.subn(r"const TOP50 = \[\n[\s\S]*?\n\];", block, html, count=1)
    if n != 1:
        raise SystemExit("Could not patch const TOP50 in index.html")
    index.write_text(html2, encoding="utf-8")
    log(f"wrote data/top50.json and patched index.html ({len(payload['tracks'])} tracks)")


def main_cli() -> int:
    payload = build_payload(enrich=True)
    if len(payload["tracks"]) < 10:
        log("not enough titles; refusing to overwrite")
        return 1
    write_static(payload)
    print(json.dumps({"updated": payload["updated"], "count": len(payload["tracks"])}))
    return 0


def _send(req) -> None:
    try:
        payload = build_payload(enrich=False)
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        status = 200
    except Exception as exc:
        body = json.dumps({"error": "rebuild_failed", "detail": str(exc)}).encode()
        status = 502
    req.send_response(status)
    req.send_header("Content-Type", "application/json; charset=utf-8")
    req.send_header("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=3600")
    req.send_header("Access-Control-Allow-Origin", "*")
    req.send_header("Content-Length", str(len(body)))
    req.end_headers()
    req.wfile.write(body)


from http.server import BaseHTTPRequestHandler as _BH


class handler(_BH):
    def do_GET(self):
        _send(self)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.end_headers()

    def log_message(self, *args):
        return


if __name__ == "__main__":
    raise SystemExit(main_cli())
