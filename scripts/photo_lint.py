#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Photo canon: identity, licensing, credit and source rules for images.

Why this file exists
--------------------
The desk's photo rules lived in prose (`editorial/CANON.md` section 4) and
in two small checks inside `gate.py`. Three failures reached a live post
anyway:

1. A cover showed **another artist**. The image was real, sharp and high
   resolution; it was simply the wrong person. Nothing in the pipeline asked
   "is this the artist of this post".
2. A cover was credited to **"Apple Music"**, which is a distributor, not a
   photographer. A credit that names no person cannot satisfy the rule that
   credits name the actual photographer.
3. A photo came from a source the owner had excluded (Getty, AP, stock).

None of those are visible to a script that only reads the credit string. This
module therefore checks the things a script can check honestly:

* the cover and body photos declare who is in the frame,
* the credit names a person or a named studio, not a platform,
* the credit URL is not an article and not a competing outlet,
* the image itself is not a reused frame from another post.

The two checks that need eyes (is this the right artist, is this frame the
right shoot) are reported as NOT RUN, never as PASS.
"""
from __future__ import annotations

import re

# Distributors, platforms and aggregators. A credit naming one of these
# describes where the file came from, not who took the picture. The owner
# rejected "Apple Music" as a credit on 29.10.2026 for exactly this reason.
NON_PHOTOGRAPHER_CREDITS = {
    "apple music", "spotify", "youtube", "tidal", "amazon music", "deezer",
    "soundcloud", "pandora", "napster", "last fm", "bandcamp",
    "meta", "facebook", "instagram", "twitter", "tiktok", "shutterstock",
    "istockphoto", "istock", "getty images", "gettyimages", "alamy", "depositphotos",
    "dreamstime", "unsplash", "pexels", "flickr", "wikipedia", "wikimedia",
    "wikimedia commons", "commons", "public domain", "splash news", "rex features",
    "ap photo", "ap images", "reuters", "afp", "epa", "epa/eap", "pinterest",
    "linkedin", "press", "press office", "official press", "news desk",
    "newsroom", "the agency", "agency",
}

# Distinctive single words that mark a distributor even inside a longer
# caption ("Photo by Apple Music", "Shutterstock contributor").
BANNED_CREDIT_TOKENS = {
    "shutterstock", "istockphoto", "istock", "getty", "gettyimages", "alamy",
    "depositphotos", "dreamstime", "unsplash", "pexels", "flickr", "wikipedia",
    "wikimedia", "commons", "spotify", "pandora", "napster", "soundcloud",
    "deezer", "tidal", "bandcamp", "splashnews", "rexfeatures", "wireimage",
    "shutterstockcontributor", "contributor",
}

# Hosts that distribute images rather than license them to an editor.
STOCK_HOSTS = {
    "shutterstock.com", "istockphoto.com", "gettyimages.com", "alamy.com",
    "depositphotos.com", "dreamstime.com", "unsplash.com", "pexels.com",
    "flickr.com", "commons.wikimedia.org", "wikipedia.org",
}

# News agencies the owner excluded for this site on 28.10.2026.
EXCLUDED_HOSTS = {
    "apnews.com", "ap.org", "gettyimages.com", "alamy.com", "shutterstock.com",
    "depositphotos.com", "reuters.com", "epa.eu", "picturelib.com",
    "wireimage.com", "imago-images.com", "celebrityphotos.com",
}

ARTICLE_SECTION = re.compile(
    r"/(?:news|newsroom|article|articles|story|stories|gallery|photos|media|blog|"
    r"press|features|reviews|entertainment)(?:/|$)|/\d{4}/\d{2}/\d{2}(?:/|$)",
    re.I,
)

# A credit URL has to lead to the photographer's own resource. A news or
# magazine site is never that. The list is a substring test on the host, so
# "dallasobserver.com" and "apnews.com" are caught while a portfolio on
# "deepshadowspictures.com" is not.
OUTLET_WORDS = (
    "news", "newsroom", "magazine", "times", "journal", "observer", "gazette",
    "chronicle", "herald", "tribune", "dispatch", "examiner", "mirror",
    "sentinel", "weekly", "daily", "reporter", "headlines", "post",
)

PERSON_WORD = re.compile(r"[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'\-]*")
STUDIO_WORD = re.compile(
    r"\b(?:studio|studios|photography|photographer|photographers|agency|"
    r"collective|workshop|productions|images|media|labs|press)\b",
    re.I,
)


def _host(url: str) -> str:
    url = (url or "").strip().lower()
    url = re.sub(r"^https?://", "", url)
    host = url.split("/")[0].split("?")[0]
    return host[4:] if host.startswith("www.") else host


def _is_outlet(host: str) -> bool:
    bare = host.split(":")[0]
    return any(word in bare for word in OUTLET_WORDS)


def is_article_url(url: str) -> bool:
    """True when the URL leads to a story rather than to a photographer."""
    url = (url or "").strip().lower()
    if not url:
        return False
    if ARTICLE_SECTION.search(url):
        return True
    return _is_outlet(_host(url))


LABEL_PREFIX = re.compile(
    r"^(?:press\s+)?(?:photo|photograph|image|picture)(?:\s+credit)?\s*(?:by)?\s*",
    re.I,
)


def _credit_parts(credit: str):
    return [p.strip() for p in re.split(
        r"\s*(?:,|&|/|\band\b|\bx\b)\s*", (credit or "").strip(), flags=re.I) if p.strip()]


def credit_names_a_person(credit: str) -> bool:
    """True when the credit names a person or a named studio.

    A credit is a person when it reads like a human name and is not one of
    the platform names in `NON_PHOTOGRAPHER_CREDITS`. A studio credit is
    accepted only when it also carries a personal name ("Joshua Davis,
    Deep Shadows Pictures").

    The platform test runs on the name part of the caption, so "Photo by
    Apple Music" fails the same way "Apple Music" does.
    """
    credit = (credit or "").strip()
    if not credit:
        return False
    parts = _credit_parts(credit)
    if not parts:
        return False
    first = LABEL_PREFIX.sub("", parts[0]).strip()
    if not first:
        return False
    words = PERSON_WORD.findall(first)
    if not (1 <= len(words) <= 4):
        return False
    joined = " ".join(w.lower() for w in words)
    for banned in NON_PHOTOGRAPHER_CREDITS:
        if banned in joined:
            return False
    tokens = set(re.findall(r"[a-z0-9]+", joined))
    if tokens & BANNED_CREDIT_TOKENS:
        return False
    # A name of one generic word ("Photos", "Archive", "Editorial") is not a
    # person. Two words, or a capitalised first name, is.
    if len(words) == 1:
        if not re.match(r"^[A-Z][a-z'\-]+$", words[0]):
            return False
        if words[0].lower() in {"photos", "photo", "archive", "editorial", "staff",
                                 "reporter", "wire", "agency", "studio", "press",
                                 "image", "picture", "photograph"}:
            return False
        if STUDIO_WORD.search(words[0]):
            return False
    return True


def credit_names_a_studio_with_a_person(credit: str) -> bool:
    credit = (credit or "").strip()
    if not credit:
        return False
    parts = _credit_parts(credit)
    if len(parts) < 2:
        return False
    if STUDIO_WORD.search(credit) or any(p.isupper() or len(p.split()) > 1 for p in parts[1:]):
        return credit_names_a_person(parts[0])
    return False


def check_credit(where: str, credit: str, credit_url: str):
    """Credit rules for one image."""
    issues = []
    credit = (credit or "").strip()
    url = (credit_url or "").strip()

    if not credit:
        issues.append(("photo-credit", "%s credit is missing a photographer" % where))
        return issues
    if "/" in credit and not re.search(r"https?://", credit):
        issues.append(("photo-credit", "%s caption %r uses the slash the owner banned" % (where, credit)))
    if re.search(r"\bcourtesy\b", credit, re.I):
        issues.append(("photo-credit", "%s credit is automatic Courtesy" % where))
    if not credit_names_a_person(credit) and not credit_names_a_studio_with_a_person(credit):
        issues.append((
            "photo-credit-platform",
            "%s is credited to %r, which names a distributor or platform rather "
            "than the photographer; credit the person who took the picture"
            % (where, credit),
        ))
    if not url:
        issues.append(("photo-credit", "%s credit link is missing" % where))
        return issues
    if not url.lower().startswith("https://"):
        issues.append(("photo-credit", "%s credit link is not https" % where))
    host = _host(url)
    if host in STOCK_HOSTS:
        issues.append((
            "photo-credit-stock",
            "%s credit link points at %s, a stock library; the owner does not "
            "use stock photography" % (where, host),
        ))
    if host in EXCLUDED_HOSTS:
        issues.append((
            "photo-credit-excluded",
            "%s credit link points at %s, a source the owner excluded for this "
            "site" % (where, host),
        ))
    if is_article_url(url):
        issues.append((
            "photo-credit-article",
            "%s credit link points at an article; the credit must lead to the "
            "photographer's own resource" % where,
        ))
    return issues


def check_reuse(photos):
    """One image must not serve two posts.

    A frame that already carries another post's caption is a photo that was
    copied rather than cleared, and it is the fastest way for the wrong
    artist to appear on a card.
    """
    issues = []
    by_src = {}
    for photo in photos:
        src = (photo.get("src") or "").strip()
        if not src:
            continue
        by_src.setdefault(src, []).append(photo)
    for src, group in by_src.items():
        if len(group) > 1:
            owners = sorted({(p.get("postId") or "?") for p in group})
            issues.append((
                "photo-reused",
                "the image %s is used by %d posts (%s); one frame may serve one "
                "post only" % (src, len(group), ", ".join(owners)),
            ))
    return issues


def lint(post, registry_photos=None, all_posts=None):
    """Return (code, message) findings for the images of one post.

    `registry_photos` is the list of image descriptors that the fact registry
    records for this post (src, credit, creditUrl, who). `all_posts` is the
    full desk, used only to detect a frame reused by another post.
    """
    post = post or {}
    issues = []
    pid = post.get("id") or "?"

    described = []
    cover = post.get("cover") or {}
    if isinstance(cover, dict) and cover.get("src") and (cover.get("kind") or "img") == "img":
        described.append({
            "postId": pid,
            "src": cover.get("src"),
            "credit": cover.get("credit"),
            "creditUrl": cover.get("creditUrl"),
            "who": cover.get("who"),
            "where": "the cover",
        })
    for match in re.finditer(r"\[photo:([^\]]*)\]", post.get("body") or "", re.I):
        parts = [p.strip() for p in match.group(1).split("|")]
        src = parts[0] if parts else ""
        credit = parts[1] if len(parts) > 1 else ""
        url = parts[2] if len(parts) > 2 else ""
        who = parts[3] if len(parts) > 3 else ""
        described.append({
            "postId": pid,
            "src": src,
            "credit": credit,
            "creditUrl": url,
            "who": who,
            "where": "the photo %s" % (src or "(no path)"),
        })

    for photo in described:
        issues.extend(check_credit(photo["where"], photo["credit"], photo["creditUrl"]))

    # Canon rule 7 has three levels: the photographer's own resource, their
    # agency, and only then the owner of the frame. Key art made by a label
    # has no photographer at all, so crediting the label is the last resort
    # the canon allows - and it is only safe when the fact registry records
    # the image, who is in it and where it came from. The check below is what
    # makes that last resort a warning instead of a failure.
    documented = {}
    for entry in (registry_photos or []):
        if not isinstance(entry, dict):
            continue
        src = (entry.get("src") or "").strip()
        if src and entry.get("ok"):
            documented[src] = entry
    if documented:
        for photo in described:
            entry = documented.get((photo["src"] or "").strip())
            if not entry:
                continue
            if (entry.get("credit") or "").strip() != (photo["credit"] or "").strip():
                continue
            if (entry.get("creditUrl") or "").strip() != (photo["creditUrl"] or "").strip():
                continue
            credit = (photo["credit"] or "").strip()
            if credit_names_a_person(credit) or credit_names_a_studio_with_a_person(credit):
                continue
            issues = [item for item in issues
                      if not (item[0] == "photo-credit-platform"
                              and credit in item[1])]
            issues.append((
                "photo-credit-owner",
                "%s is credited to %r, which is the owner of the frame and not the "
                "photographer; the fact registry records the image and who is in it, "
                "so this is the last resort canon rule 7 allows" % (photo["where"], credit),
            ))

    if all_posts:
        every = []
        for other in all_posts:
            if other.get("id") == pid:
                continue
            other_cover = other.get("cover") or {}
            if isinstance(other_cover, dict) and other_cover.get("src"):
                every.append({"postId": other.get("id") or "?", "src": other_cover.get("src")})
            for match in re.finditer(r"\[photo:([^\]]*)\]", other.get("body") or "", re.I):
                parts = [p.strip() for p in match.group(1).split("|")]
                if parts and parts[0]:
                    every.append({"postId": other.get("id") or "?", "src": parts[0]})
        issues.extend(check_reuse(described + every))

    return issues


def manual_not_run():
    """Photo duties a script cannot perform. Never label these PASS."""
    return [
        "NOT RUN photo 1: the right artist, shoot, campaign and period in the frame",
        "NOT RUN photo 2: real sharpness, compression and context of the image",
        "NOT RUN photo 3: editorial usage permission from the photographer",
        "NOT RUN photo 4: desk preview and live crop of both card shapes",
    ]
