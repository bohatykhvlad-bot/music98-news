#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""The photo section of a fact registry.

Canon section 4 asks for a photo search in a fixed order, the highest
resolution original, and a credit to the photographer. Nothing recorded
*that* a photo had been checked, so a cover could be replaced with any
sharp, high-resolution image of any artist and pass every automated check.

A registry may now carry a photo manifest:

```
## Photos
- cover photos/taylor-swift-patient-zero-acoustic-2026.jpg | https://music.apple.com/... | Mert Alas & Marcus Piggott | Taylor Swift | https://www.artpartner.com/mert-alas-marcus-piggott
- photo photos/bigxthaplug-dallas-2026.jpg | https://theneedledrop.com/... | Joshua Davis | BigXthaPlug | https://www.deepshadowspictures.com/
```

Each line is `<role> <path> | <source url> | <photographer> | <who is in the frame> | <credit link>`.
The source url is where the file was found; the credit link is the
photographer's own resource, which canon section 4 asks for. They are
different links on purpose, so the registry records both.
The desk must agree with the manifest: the credit that ships with the image
has to be the photographer the registry names, and the artist in the frame
has to be the artist of the post. A cover that was swapped without a
matching manifest line fails.
"""
from __future__ import annotations

import re

PHOTOS_HEADER = re.compile(r"^##\s+photos\s*$", re.I)
PHOTO_LINE = re.compile(r"^-\s*(cover|photo)\s+(photos/\S+?)\s*\|")


def photo_section(ledger_text: str):
    """Return the raw lines of the photo section of a registry."""
    out = []
    inside = False
    for raw in (ledger_text or "").splitlines():
        line = raw.strip()
        if PHOTOS_HEADER.match(line):
            inside = True
            continue
        if inside:
            if line.startswith("##"):
                break
            if line.startswith("- "):
                out.append(line)
    return out


def manifest(ledger_text: str):
    """Parse the photo manifest into descriptors.

    A line that cannot be read is kept with its problem, so the caller can
    report it instead of silently ignoring a broken manifest.
    """
    entries = []
    for line in photo_section(ledger_text):
        parts = [p.strip() for p in line[2:].split("|")]
        role = (parts[0] if parts else "").split()
        kind = role[0].lower() if role else ""
        src = role[1] if len(role) > 1 else ""
        source = parts[1] if len(parts) > 1 else ""
        credit = parts[2] if len(parts) > 2 else ""
        who = parts[3] if len(parts) > 3 else ""
        credit_url = parts[4] if len(parts) > 4 else ""
        entries.append({
            "kind": kind,
            "src": src,
            "source": source,
            "credit": credit,
            "who": who,
            "creditUrl": credit_url,
            "line": line,
            "ok": bool(kind and src and source and credit and who),
        })
    return entries


def for_post(ledger_text: str):
    """The manifest entries that describe this post's images."""
    return [entry for entry in manifest(ledger_text) if entry["kind"] in ("cover", "photo")]


def check(post, ledger_text: str):
    """Return (code, message) findings for the images of one post."""
    issues = []
    entries = for_post(ledger_text or "")
    if not entries:
        issues.append((
            "photo-manifest-missing",
            "the fact registry has no photo section, so no image of this post "
            "is on record; add a '## Photos' section naming every image, its "
            "source, its photographer and who is in the frame",
        ))
        return issues

    by_src = {}
    for entry in entries:
        if not entry["ok"]:
            issues.append((
                "photo-manifest-incomplete",
                "the photo manifest line %r must name the image, its source "
                "url, its photographer and who is in the frame" % entry["line"][:110],
            ))
            continue
        by_src[entry["src"]] = entry

    post = post or {}
    artist = (post.get("artist") or "").strip()
    cover = post.get("cover") or {}
    if isinstance(cover, dict) and cover.get("src"):
        src = cover["src"]
        entry = by_src.get(src)
        if not entry:
            issues.append((
                "photo-manifest-unlisted",
                "the cover %s is not in the photo manifest of the fact registry" % src,
            ))
        else:
            issues.extend(_compare("the cover", src, cover.get("credit"),
                                   cover.get("creditUrl"), entry, artist))
    for match in re.finditer(r"\[photo:([^\]]*)\]", post.get("body") or "", re.I):
        parts = [p.strip() for p in match.group(1).split("|")]
        src = parts[0] if parts else ""
        credit = parts[1] if len(parts) > 1 else ""
        url = parts[2] if len(parts) > 2 else ""
        entry = by_src.get(src)
        if not entry:
            issues.append((
                "photo-manifest-unlisted",
                "the photo %s is not in the photo manifest of the fact registry" % src,
            ))
            continue
        issues.extend(_compare("the photo %s" % src, src, credit, url, entry, artist))
    return issues


def _compare(where, src, credit, credit_url, entry, artist):
    issues = []
    if (credit or "").strip() != entry["credit"]:
        issues.append((
            "photo-credit-mismatch",
            "%s is credited %r in the desk but %r in the fact registry; the "
            "shipped credit must be the one that was verified"
            % (where, (credit or "").strip(), entry["credit"]),
        ))
    expected_url = (entry.get("creditUrl") or entry["source"] or "").strip()
    if credit_url.strip() and expected_url and credit_url.strip() != expected_url:
        issues.append((
            "photo-source-mismatch",
            "%s links to %r while the fact registry records the verified link as %r"
            % (where, credit_url.strip(), expected_url),
        ))
    who = entry["who"].strip()
    if artist and who and who.lower() != artist.lower():
        issues.append((
            "photo-identity-mismatch",
            "the photo manifest says %r is in %s, but the post is about %s; "
            "the image and the article have to be about the same artist"
            % (who, where, artist),
        ))
    return issues
