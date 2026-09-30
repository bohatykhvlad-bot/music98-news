#!/usr/bin/env python3
from __future__ import annotations

import base64
import copy
import hashlib
import json
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

from PIL import Image
import io

sys.path.insert(0, str(Path(__file__).resolve().parent))
import post as runner

TAYLOR_ID = "autay25r1"
LISA_ID = "lisa26vegas"

TAYLOR_TITLE = "The Life of a Showgirl: The Encore"
TAYLOR_EXCERPT = "Taylor Swift has released *The Life of a Showgirl: The Encore*, an expanded edition of her 2025 album that adds four new songs to the original 12-track record."
TAYLOR_BODY = r'''Taylor Swift has released *The Life of a Showgirl: The Encore*, an expanded edition of her 2025 album that adds four new songs to the original 12-track record. The expanded edition arrived on September 25 with "Patient Zero," "Cleveland!," "Pink Clouding," and "Babylon" grouped as a second disc after the original sequence. All four songs reunite Swift with Max Martin and Shellback, the writing and production team behind *The Life of a Showgirl*. Rather than reshuffling the album, *The Encore* keeps the original 12 songs intact and gives the new material its own closing section, taking the release to 16 tracks.

The four songs came from another trip to Sweden with Martin and Shellback after the original album was complete. Swift made the 2025 record with the pair during breaks in the Eras Tour, and the encore returns to the same three-person writing and production core. "Patient Zero" adds violin, acoustic guitar and mandolin around the trio's pop production, while "Cleveland!" brings glockenspiel into the arrangement. "Pink Clouding" and "Babylon" complete the second disc, with Swift, Martin and Shellback credited as writers and producers across the new material. Keeping those songs on a separate disc preserves the original album's 12-track sequence while making the expansion easy to hear as one additional studio session.

[apple:album:6814995859]

"Patient Zero" also became the visual lead for the expanded edition. Swift directed its music video, with Colin Farrell and Dakota Johnson in the principal cast and Emmanuel Lubezki serving as cinematographer. The video premiered during the 2026 MTV Video Music Awards on September 27, putting the first song from the new disc at the center of the release weekend. The project keeps the same authorship pattern as the music itself: Swift remains directly involved in the visual work while Martin and Shellback anchor the new recordings. That makes "Patient Zero" the clearest bridge between the four-song studio addendum and the larger *Showgirl* campaign.

The original *The Life of a Showgirl* arrived on October 3, 2025 as Swift's 12th studio album, with Martin and Shellback sharing the core production work and Sabrina Carpenter appearing on the title track. *The Encore* extends that record rather than replacing it. The first disc remains the original album in the same order, and the second disc contains only the four 2026 additions. The four additions are new compositions, not remixes or acoustic takes on the original songs, so the second disc functions as new material rather than a variant package. It is a compact expansion, but it adds a complete new writing session, a new visual centerpiece and another chapter to the same album cycle. For listeners coming to the project now, the 16-song edition is the full version of *The Life of a Showgirl* currently available on streaming services.'''

LISA_TITLE = "LISA Adds Two Shows to Her Sold-Out Las Vegas Residency"
LISA_EXCERPT = "LISA has added two shows to her sold-out VIVA LA LISA residency at The Colosseum at Caesars Palace, expanding the November run from four dates to six."
LISA_BODY = r'''LISA has added two shows to her sold-out VIVA LA LISA residency at The Colosseum at Caesars Palace, expanding the November run from four dates to six. The new performances are set for November 12 and November 29, joining the previously announced November 13, 14, 27 and 28 shows. The first four dates sold out in under 10 minutes, and the added shows go on general sale September 30. VIVA LA LISA is LISA's first Las Vegas residency and the first Vegas residency by a K-pop artist. The format remains deliberately compact, with six performances split across two November weekends in the same room rather than a longer touring run.

The expansion arrives while LISA is moving into the next part of her solo catalog. "SaWaDiKa" opened the rollout for *PRESS PLAY*, a seven-song EP due October 23, and she gave the song its first televised performance at the 2026 MTV Video Music Awards. The new residency dates now land after the EP release, so the Caesars shows will arrive with a fresh set of solo material already in circulation. LISA is also coming off *Alter Ego*, her 2025 debut full-length solo album, and the completed BLACKPINK DEADLINE World Tour. VIVA LA LISA therefore sits between a group touring chapter and a new solo release rather than functioning as a standalone booking detached from her current music.

The residency was originally announced in March with four performances at The Colosseum. Selling out that first run changed the schedule before opening night, adding one show at the front of the first weekend and another at the end of the second. The final six-show calendar now runs November 12 through 14 and November 27 through 29. That keeps the original two-weekend structure intact while giving the residency one extra night on each side. For LISA, the Las Vegas run is a concentrated live stop in a year that has also included new solo music, the *Always Lalisa* documentary and continued work outside BLACKPINK.'''

LISA_PHOTO_URL = "https://static.wixstatic.com/media/62f912_f1ddf672d4cc45d893e90bd9bcc86adc~mv2.jpg"
PHOTO_API = "https://music98.news/api/photo"


def fresh_desk():
    return runner.http(runner.DESK_API + "?nocache=" + str(time.time_ns()), runner.desk_key())


def digest(obj) -> str:
    return hashlib.sha256(json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")).hexdigest()


def backup(label: str, desk: dict) -> None:
    path = Path("/tmp") / ("desk-before-" + label + ".json")
    path.write_text(json.dumps(desk, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("BACKUP", path)


def guarded_single_write(pid: str, label: str, mutate):
    before = fresh_desk()
    backup(label, before)
    posts = copy.deepcopy(before["posts"])
    before_map = {str(p.get("id")): copy.deepcopy(p) for p in posts}
    target = mutate(posts)
    if str(target.get("id")) != pid:
        raise RuntimeError("mutator returned wrong target")
    runner.http(runner.DESK_API, runner.desk_key(), {"posts": posts}, method="POST")
    after = fresh_desk()
    after_map = {str(p.get("id")): p for p in after["posts"]}
    if pid not in after_map:
        raise RuntimeError("target missing after write: " + pid)
    changed_others = []
    for other_id, old in before_map.items():
        if other_id == pid:
            continue
        if other_id not in after_map or digest(old) != digest(after_map[other_id]):
            changed_others.append(other_id)
    if changed_others:
        raise RuntimeError("other posts changed: " + repr(changed_others))
    print("WRITE_OK", pid, after_map[pid].get("status"), len((after_map[pid].get("body") or "").split()))
    return after_map[pid]


def run_gate(pid: str) -> None:
    ok, lines = runner.run_gate(pid, quiet=False)
    print("GATE", pid, "PASS" if ok else "FAIL")
    for line in lines:
        if "PASS" in line or "FAIL" in line or line.lstrip().startswith(("X ", "! ")):
            print(line)
    if not ok:
        raise RuntimeError("gate failed for " + pid)


def upload_lisa_photo() -> str:
    req = urllib.request.Request(
        LISA_PHOTO_URL,
        headers={"User-Agent": runner.UA, "Referer": "https://www.lloud.co/"},
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        raw = r.read()
    with Image.open(io.BytesIO(raw)) as im:
        size = im.size
        fmt = im.format
    if max(size) < 2500:
        raise RuntimeError("LLOUD source below cover floor: " + repr(size))
    if len(raw) > 2_850_000:
        raise RuntimeError("LLOUD source unexpectedly above upload limit")
    payload = {
        "name": "lisa-viva-la-lisa-2026.jpg",
        "data": "data:image/jpeg;base64," + base64.b64encode(raw).decode("ascii"),
    }
    out = runner.http(PHOTO_API, runner.desk_key(), payload, method="POST")
    if not out.get("ok") or not out.get("url"):
        raise RuntimeError("photo upload failed: " + repr(out))
    print("LISA_PHOTO", size, fmt, len(raw), out["url"])
    return out["url"]


def update_taylor():
    def mutate(posts):
        p = next((x for x in posts if str(x.get("id")) == TAYLOR_ID), None)
        if p is None:
            raise RuntimeError("Taylor draft not found: " + TAYLOR_ID)
        if (p.get("status") or "live") != "draft":
            raise RuntimeError("refusing to touch non-draft Taylor post: " + repr(p.get("status")))
        p["title"] = TAYLOR_TITLE
        p["excerpt"] = TAYLOR_EXCERPT
        p["body"] = TAYLOR_BODY
        cover = p.get("cover") or {}
        if cover.get("credit") == "TAS Rights Management / Paramount Press Express":
            cover = copy.deepcopy(cover)
            cover["credit"] = "TAS Rights Management"
            cover["creditUrl"] = "https://www.taylorswift.com/"
            p["cover"] = cover
        return p

    now = guarded_single_write(TAYLOR_ID, "taylor-encore-sep30", mutate)
    if now.get("status") != "draft":
        raise RuntimeError("Taylor status changed")
    if TAYLOR_EXCERPT not in now.get("body", ""):
        raise RuntimeError("Taylor excerpt not literal body substring")
    run_gate(TAYLOR_ID)
    print("TAYLOR_DONE", now["title"], now.get("status"), now.get("cover", {}).get("credit"))


def create_lisa():
    photo_src = upload_lisa_photo()

    def mutate(posts):
        possible = [
            p for p in posts
            if str(p.get("id")) != LISA_ID
            and (
                "VIVA LA LISA" in str(p.get("title") or "").upper()
                or ("LISA" in str(p.get("title") or "").upper() and "LAS VEGAS" in str(p.get("title") or "").upper())
            )
        ]
        if possible:
            raise RuntimeError("possible duplicate LISA residency post: " + repr([(p.get("id"), p.get("status"), p.get("title")) for p in possible]))
        p = next((x for x in posts if str(x.get("id")) == LISA_ID), None)
        if p is not None and (p.get("status") or "live") != "draft":
            raise RuntimeError("refusing to touch non-draft LISA post: " + repr(p.get("status")))
        rec = {
            "id": LISA_ID,
            "type": "news",
            "tag": "News",
            "artist": "LISA",
            "title": LISA_TITLE,
            "excerpt": LISA_EXCERPT,
            "body": LISA_BODY,
            "date": "2026-09-30",
            "status": "draft",
            "pinned": False,
            "cover": {
                "kind": "img",
                "src": photo_src,
                "credit": "LLOUD",
                "creditUrl": "https://www.lloud.co/",
                "pos": "50% 35%",
                "zoom": 1,
                "lockX": 0.50,
                "cardX": 0.50,
                "cardY": 0.27,
                "cardZoom": 2.4,
            },
        }
        if p is None:
            posts.insert(0, rec)
            return posts[0]
        preserved_pinned = p.get("pinned", False)
        preserved_publish_at = p.get("publishAt")
        p.clear()
        p.update(rec)
        p["pinned"] = preserved_pinned
        if preserved_publish_at:
            p["publishAt"] = preserved_publish_at
        return p

    now = guarded_single_write(LISA_ID, "lisa-vegas-sep30", mutate)
    if now.get("status") != "draft":
        raise RuntimeError("LISA status changed")
    if LISA_EXCERPT not in now.get("body", ""):
        raise RuntimeError("LISA excerpt not literal body substring")
    run_gate(LISA_ID)
    print("LISA_DONE", now["title"], now.get("status"), now.get("cover", {}).get("src"))


def main():
    runner.load_env()
    # Owner sequence: finish one post completely before writing the next.
    update_taylor()
    create_lisa()
    final = fresh_desk()["posts"]
    for pid in (TAYLOR_ID, LISA_ID):
        p = next(x for x in final if str(x.get("id")) == pid)
        print("FINAL", pid, p.get("status"), p.get("type"), p.get("title"), len((p.get("body") or "").split()))
        if p.get("status") != "draft":
            raise RuntimeError(pid + " is not draft")


if __name__ == "__main__":
    main()
