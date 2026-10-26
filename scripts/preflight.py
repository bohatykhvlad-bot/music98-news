#!/usr/bin/env python3
"""Read-only payload/state preflight for a music98 draft.

Mechanical rules come from editorial/CANON.md via canon_checks.py.
A MECHANICAL PASS does not certify prose, facts, photos, or a live page.
Manual canon duties are printed as NOT RUN and are never PASS.
"""
import argparse
import json
import os
import re
import sys
from pathlib import Path
from urllib.request import Request, urlopen

import canon_checks

MEDIA = re.compile(r"\[(photo|youtube|apple|instagram|ig|tiktok):([^\]]+)\]", re.I)


def select(payload, pid):
    if isinstance(payload, dict) and isinstance(payload.get("posts"), list):
        matches = [post for post in payload["posts"] if post.get("id") == pid]
        if len(matches) != 1:
            raise ValueError("article not unique in desk")
        return matches[0]
    if not isinstance(payload, dict) or payload.get("id") != pid:
        raise ValueError("wrong article ID")
    return payload


def get_remote(pid):
    key = os.getenv("MUSIC98_KEY") or os.getenv("ADMIN_PASSWORD")
    if not key:
        raise ValueError("MUSIC98_KEY/ADMIN_PASSWORD not configured")
    req = Request(
        "https://music98.news/api/desk",
        headers={
            "X-Admin-Key": key,
            "Cache-Control": "no-cache",
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0",
        },
    )
    with urlopen(req, timeout=30) as r:
        return select(json.loads(r.read()), pid)


def check(post, baseline, expected_media, min_words=None):
    failures, warnings = [], []
    ptype = (post.get("type") or "").strip().lower()
    body = post.get("body") or ""
    title = post.get("title") or ""
    media = [(m.group(1).lower(), m.group(2)) for m in MEDIA.finditer(body)]
    word_count = canon_checks.prose_word_count(body)

    if post.get("status") != "draft":
        failures.append("article is not a draft")
    if not title:
        failures.append("title missing")

    for code, message in canon_checks.mechanical_issues(post, structural=True, min_words=min_words):
        failures.append(message if code == "word-count" else "%s: %s" % (code, message))

    if expected_media is not None and len(media) != expected_media:
        failures.append(f"expected {expected_media} media, found {len(media)}")
    if ptype == "release":
        artist = (post.get("artist") or "").strip()
        rtype = (post.get("rtype") or "").strip().lower()
        if not artist:
            failures.append("release is missing artist field")
        if artist and title.lower().startswith(artist.lower()):
            failures.append("release title contains artist: store only the track/album title")
        if re.search(r"\b(releases?|announces?|unveils?|drops?|shares?|debuts?)\b", title, re.I):
            warnings.append("release title looks like a news headline; check that it is ONLY the release name")
        if rtype not in {"single", "ep", "album"}:
            warnings.append("release type must identify Single, EP or Album")
        # A single with its official music video does not need a duplicate Apple
        # embed. Albums and EPs use the site's Apple Music album player.
        if rtype in {"", "ep", "album"} and not any(
            kind == "apple" and value.lower().startswith("album:") for kind, value in media
        ):
            failures.append("album/EP release has no Apple Music album embed")

    for i, (kind, value) in enumerate(media, 1):
        if kind == "youtube" and not re.fullmatch(r"[A-Za-z0-9_-]{11}", value):
            failures.append(f"youtube {i} has malformed id")
        elif kind == "photo":
            fields = value.split("|")
            if not fields or not fields[0].startswith(("photos/", "https://")):
                failures.append(f"photo {i} missing original image path")

    if baseline:
        old_media = [(m.group(1).lower(), m.group(2)) for m in MEDIA.finditer(baseline.get("body") or "")]
        if old_media != media:
            failures.append("media order/content changed")
        if baseline.get("cover") != post.get("cover"):
            failures.append("cover changed")
        if baseline.get("id") != post.get("id"):
            failures.append("article ID changed")

    print(f"POST={post.get('id')} STATUS={post.get('status')} WORDS={word_count} MEDIA={len(media)}")
    for warning in warnings:
        print("WARN", warning)
    for failure in failures:
        print("FAIL", failure)
    for line in canon_checks.manual_not_run():
        print(line)
    verdict = "MECHANICAL PASS" if not failures else "MECHANICAL FAIL"
    print("PREFLIGHT:", verdict + "; MANUAL NOT RUN")
    return not failures


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--post", required=True)
    p.add_argument("--file", type=Path)
    p.add_argument("--baseline", type=Path)
    p.add_argument("--expected-media", type=int)
    p.add_argument("--min-words", type=int, default=None)
    args = p.parse_args()
    try:
        article = select(json.loads(args.file.read_text()), args.post) if args.file else get_remote(args.post)
        prior = select(json.loads(args.baseline.read_text()), args.post) if args.baseline else None
        sys.exit(0 if check(article, prior, args.expected_media, args.min_words) else 1)
    except Exception as exc:
        print("PREFLIGHT ERROR", type(exc).__name__, str(exc)[:140])
        sys.exit(2)
