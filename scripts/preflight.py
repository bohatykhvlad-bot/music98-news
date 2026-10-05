#!/usr/bin/env python3
"""Read-only editorial preflight for a saved desk draft.

Remote: MUSIC98_KEY=... python scripts/preflight.py --post POST_ID --expected-media 10
Local:  python scripts/preflight.py --post POST_ID --file draft.json --baseline original.json --expected-media 10
Never publishes or changes desk data.
"""
import argparse, json, os, re, sys
from pathlib import Path
from urllib.request import Request, urlopen

MEDIA = re.compile(r"\[(photo|youtube|apple|instagram|ig|tiktok):([^\]]+)\]", re.I)
def select(payload, pid):
    if isinstance(payload, dict) and isinstance(payload.get("posts"), list):
        matches = [post for post in payload["posts"] if post.get("id") == pid]
        if len(matches) != 1: raise ValueError("article not unique in desk")
        return matches[0]
    if not isinstance(payload, dict) or payload.get("id") != pid:
        raise ValueError("wrong article ID")
    return payload

def get_remote(pid):
    key = os.getenv("MUSIC98_KEY") or os.getenv("ADMIN_PASSWORD")
    if not key: raise ValueError("MUSIC98_KEY/ADMIN_PASSWORD not configured")
    req = Request("https://music98.news/api/desk",
                  headers={"X-Admin-Key": key, "Cache-Control": "no-cache", "Accept":"application/json", "User-Agent":"Mozilla/5.0"})
    with urlopen(req, timeout=30) as r:
        return select(json.loads(r.read()), pid)

def check(post, baseline, expected_media, min_words):
    failures, warnings = [], []
    body, title, excerpt = (post.get("body") or "", post.get("title") or "", post.get("excerpt") or "")
    media = [(m.group(1).lower(), m.group(2)) for m in MEDIA.finditer(body)]
    paragraphs = [p.strip() for p in body.split("\n\n") if p.strip()]
    prose = [p for p in paragraphs if not MEDIA.fullmatch(p)]
    words = len(re.findall(r"\b[\w'-]+\b", "\n".join(prose)))
    if post.get("status") != "draft": failures.append("article is not a draft")
    if not title or ":" in title: failures.append("missing title or forbidden colon")
    if not excerpt or not body.startswith(excerpt): failures.append("excerpt must begin the actual article verbatim")
    elif not re.search(r'[.!?](?:["\u2019\u201d])?$\', excerpt): failures.append("excerpt must end at a full sentence")
    elif len(excerpt) < 85 or len(excerpt) > 170: warnings.append("excerpt length is outside preferred range")
    if expected_media is not None and len(media) != expected_media:
        failures.append(f"expected {expected_media} media, found {len(media)}")
    if words < min_words: failures.append(f"too few words: {words}")
    if not post.get("cover"): failures.append("cover missing")
    for i, (kind, value) in enumerate(media, 1):
        if kind == "photo":
            fields = value.split("|")
            if len(fields) < 3 or not fields[1].strip() or not fields[2].startswith("https://"):
                failures.append(f"photo {i} missing photographer credit or secure portfolio link")
            if len(fields) >= 1 and not fields[0].startswith(("photos/","https://")):
                failures.append(f"photo {i} missing original image path")
        elif kind == "youtube" and not re.fullmatch(r"[A-Za-z0-9_-]{11}", value):
            failures.append(f"youtube {i} has malformed id")
    if any(MEDIA.fullmatch(a) and MEDIA.fullmatch(b) for a,b in zip(paragraphs,paragraphs[1:])):
        failures.append("back-to-back media without prose")
    if prose and len(prose[-1].split()) < 75: warnings.append("finale may be thin")
    if baseline:
        oldmedia = [(m.group(1).lower(),m.group(2)) for m in MEDIA.finditer(baseline.get("body") or "")]
        if oldmedia != media: failures.append("media order/content changed")
        if baseline.get("cover") != post.get("cover"): failures.append("cover changed")
        if baseline.get("id") != post.get("id"): failures.append("article ID changed")
    print(f"POST={post.get('id')} STATUS={post.get('status')} WORDS={words} MEDIA={len(media)}")
    for warning in warnings: print("WARN", warning)
    for failure in failures: print("FAIL", failure)
    print("PREFLIGHT:", "PASS" if not failures else "FAIL")
    return not failures

if __name__ == "__main__":
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--post", required=True)
    p.add_argument("--file", type=Path)
    p.add_argument("--baseline", type=Path)
    p.add_argument("--expected-media", type=int)
    p.add_argument("--min-words", type=int, default=1300)
    args=p.parse_args()
    try:
        article = select(json.loads(args.file.read_text()),args.post) if args.file else get_remote(args.post)
        prior = select(json.loads(args.baseline.read_text()),args.post) if args.baseline else None
        sys.exit(0 if check(article, prior, args.expected_media, args.min_words) else 1)
    except Exception as exc:
        print("PREFLIGHT ERROR",type(exc).__name__,str(exc)[:140]);sys.exit(2)
