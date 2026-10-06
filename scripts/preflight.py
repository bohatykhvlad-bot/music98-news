#!/usr/bin/env python3
"""Read-only payload/state preflight for a music98 draft.

This script does NOT judge prose quality. That belongs to editorial_readthrough.py.
It validates fields, status, media, cover, minimum format length and mutation safety.
"""
import argparse
import json
import os
import re
import sys
from pathlib import Path
from urllib.request import Request, urlopen

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
    inferred_min = {"news": 300, "release": 450, "longread": 1300}.get(ptype, 300)
    min_words = inferred_min if min_words is None else max(min_words, inferred_min)

    body = post.get("body") or ""
    title = post.get("title") or ""
    excerpt = post.get("excerpt") or ""
    media = [(m.group(1).lower(), m.group(2)) for m in MEDIA.finditer(body)]
    blocks = [p.strip() for p in body.split("\n\n") if p.strip()]
    prose = [p for p in blocks if not MEDIA.fullmatch(p)]
    word_count = len(re.findall(r"\b[\w'’-]+\b", "\n".join(prose)))

    if post.get("status") != "draft":
        failures.append("article is not a draft")
    if not title:
        failures.append("title missing")
    elif ":" in title:
        failures.append("forbidden colon in title")

    if not excerpt or not body.startswith(excerpt):
        failures.append("excerpt must begin the actual article verbatim")
    elif not excerpt.rstrip('"’”').endswith((".", "!", "?")):
        failures.append("excerpt must end at a full sentence")
    elif len(excerpt) < 85 or len(excerpt) > 170:
        warnings.append("excerpt length is outside preferred range")

    if word_count < min_words:
        failures.append(f"too few words for {ptype or 'post'}: {word_count} < {min_words}")

    if not post.get("cover"):
        failures.append("cover missing")

    if expected_media is not None and len(media) != expected_media:
        failures.append(f"expected {expected_media} media, found {len(media)}")
    if ptype in {"news", "release", "longread"} and not media:
        failures.append(f"{ptype} has no body media")
    if ptype == "release" and not any(
        kind == "apple" and value.lower().startswith("album:") for kind, value in media
    ):
        failures.append("release has no Apple Music album embed")

    for i, (kind, value) in enumerate(media, 1):
        if kind == "photo":
            fields = value.split("|")
            if len(fields) < 3 or not fields[1].strip() or not fields[2].startswith("https://"):
                failures.append(f"photo {i} missing photographer credit or secure portfolio link")
            if not fields or not fields[0].startswith(("photos/", "https://")):
                failures.append(f"photo {i} missing original image path")
        elif kind == "youtube" and not re.fullmatch(r"[A-Za-z0-9_-]{11}", value):
            failures.append(f"youtube {i} has malformed id")

    if any(MEDIA.fullmatch(a) and MEDIA.fullmatch(b) for a, b in zip(blocks, blocks[1:])):
        failures.append("back-to-back media without prose")

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
    print("PREFLIGHT:", "PASS" if not failures else "FAIL")
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
