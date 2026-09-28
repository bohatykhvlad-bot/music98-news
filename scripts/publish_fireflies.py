#!/usr/bin/env python3
"""One-off guarded publisher for the 2026-09-28 Fireflies release post.

Sources are locked here so the prose cannot silently outrun the research:
- Universal Music Canada, 2026-09-25 Fireflies release/video announcement
- Universal Music Canada, 2026-09-08 Muse album announcement
- Apple/iTunes lookup for exact release names, IDs and credits
- Official Republic/UMG press asset folder, photo credit embedded in filename
"""
from __future__ import annotations

import base64
import io
import json
import os
import sys
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path

from PIL import Image, ImageOps

sys.path.insert(0, str(Path(__file__).resolve().parent))
import post as runner

PID = "aujlfire28r1"
PRESS_ZIP = (
    "https://www.dropbox.com/scl/fo/3b5x15fece0gdmyaxe0n8/"
    "ABBEEwylW6nVnCf3DF52rCk?rlkey=oxpvy17mb6nurbb13321itr5e&st=me4uptj5&dl=1"
)
PHOTO_IN_ZIP = "PC Pari Dukovic.jpg"
PHOTO_NAME = "john-legend-muse-pari-dukovic.jpg"
PHOTO_CREDIT = "Pari Dukovic"
PHOTO_CREDIT_URL = "https://www.paridukovic.com/"
UMG_FIREFLIES = (
    "https://www.universalmusic.ca/2026/09/25/"
    "john-legend-debuts-music-video-for-fireflies-from-his-forthcoming-album-muse-"
    "produced-in-full-by-pharrell-williams-out-october-23-via-republic-records/"
)
UMG_MUSE = (
    "https://www.universalmusic.ca/2026/09/08/"
    "john-legend-announces-new-album-muse-produced-in-full-by-pharrell-williams-out-october-23/"
)
YOUTUBE_ID = "fEw6VZq9xg8"

FACTS = [
    ("Fireflies is by John Legend with Pharrell Williams and belongs to Muse", UMG_FIREFLIES),
    ("Muse is due October 23 via Republic Records", UMG_FIREFLIES),
    ("Pharrell produced the full album and co-wrote the project", UMG_MUSE),
    ("Paul Hunter directed the Fireflies video", UMG_FIREFLIES),
    ("The video pairs Legend, the Hollywood Cinematic Orchestra and housing-project portraits", UMG_FIREFLIES),
    ("Muse grew from Legend's Clipse appearance and sessions at Louis Vuitton HQ in Paris", UMG_FIREFLIES),
    ("The press portrait is credited to Pari Dukovic", "official UMG/Republic press asset: PC Pari Dukovic.jpg"),
]


def get_json(url: str):
    req = urllib.request.Request(url, headers={"User-Agent": runner.UA, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=90) as r:
        return json.loads(r.read().decode("utf-8"))


def resolve_apple():
    q = urllib.parse.urlencode({
        "term": "John Legend Pharrell Williams Fireflies",
        "entity": "song",
        "country": "US",
        "limit": 50,
    })
    data = get_json("https://itunes.apple.com/search?" + q)
    matches = []
    for x in data.get("results", []):
        if (x.get("trackName") or "").strip().lower() != "fireflies":
            continue
        artist = (x.get("artistName") or "").lower()
        coll = (x.get("collectionName") or "").strip().lower()
        if "john legend" in artist and "pharrell" in artist and coll == "muse":
            matches.append(x)
    if not matches:
        raise RuntimeError("Apple exact-match lookup failed for John Legend & Pharrell Williams - Fireflies / Muse")
    x = matches[0]
    album_id = int(x["collectionId"])
    track_id = int(x["trackId"])
    if album_id <= 0 or track_id <= 0:
        raise RuntimeError("Apple returned invalid IDs")
    print("APPLE", x.get("artistName"), "|", x.get("collectionName"), "|", album_id, track_id)
    return album_id, track_id


def fetch_press_photo() -> bytes:
    req = urllib.request.Request(PRESS_ZIP, headers={"User-Agent": runner.UA})
    with urllib.request.urlopen(req, timeout=120) as r:
        raw = r.read()
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        names = z.namelist()
        exact = next((n for n in names if n.endswith(PHOTO_IN_ZIP)), None)
        if not exact:
            raise RuntimeError("press portrait not found; archive contained: " + ", ".join(names))
        photo = z.read(exact)
    print("PRESS", PHOTO_IN_ZIP, len(photo), "bytes")
    return photo


def prep_photo(raw: bytes) -> bytes:
    im = ImageOps.exif_transpose(Image.open(io.BytesIO(raw))).convert("RGB")
    print("SOURCE_DIMS", im.width, im.height)
    if max(im.size) < 1920:
        raise RuntimeError("press photo below 1920px floor")
    # Preserve enough pixel budget for the site's hero/card surfaces while staying under KV limit.
    max_w = 3600
    if im.width > max_w:
        nh = round(im.height * max_w / im.width)
        im = im.resize((max_w, nh), Image.Resampling.LANCZOS)
    chosen = None
    for quality in (88, 85, 82, 79):
        b = io.BytesIO()
        im.save(b, "JPEG", quality=quality, optimize=True, progressive=True)
        if len(b.getvalue()) < 2_900_000:
            chosen = b.getvalue()
            print("ENCODE", im.width, im.height, "q", quality, len(chosen), "bytes")
            break
    if chosen is None:
        # Last fallback keeps the width above the house minimum.
        nw = max(2400, min(3200, im.width))
        nh = round(im.height * nw / im.width)
        im = im.resize((nw, nh), Image.Resampling.LANCZOS)
        b = io.BytesIO()
        im.save(b, "JPEG", quality=80, optimize=True, progressive=True)
        chosen = b.getvalue()
        print("ENCODE_FALLBACK", im.width, im.height, len(chosen), "bytes")
    if len(chosen) >= 3_000_000:
        raise RuntimeError("processed photo still exceeds photo API limit")
    return chosen


def upload_photo(raw: bytes) -> str:
    data = "data:image/jpeg;base64," + base64.b64encode(raw).decode("ascii")
    out = runner.http(
        "https://music98.news/api/photo",
        runner.desk_key(),
        {"name": PHOTO_NAME, "data": data},
        method="POST",
    )
    if not out.get("ok"):
        raise RuntimeError("photo upload failed: " + repr(out))
    print("PHOTO_UPLOAD", out.get("url"), out.get("bytes"))
    return out["url"]


def make_body(album_id: int, track_id: int) -> tuple[str, str]:
    excerpt = (
        'John Legend has released "Fireflies," a new song featuring Pharrell Williams from his '
        'forthcoming album *Muse*, which arrives October 23 with 16 tracks.'
    )
    body = f'''{excerpt} Pharrell produced the full album and is a co-writer across the project. On "Fireflies," Apple Music credits Legend on piano, Pharrell on additional vocals and production, Voices of Fire in the choir, and an arrangement that brings strings, horns and rhythm-section players into the same recording.

The song arrives with a video directed by Paul Hunter, the PRETTYBIRD co-founder who also directed Legend's "Daylight" video from this album cycle. The "Fireflies" clip puts Legend at the piano with the Hollywood Cinematic Orchestra, then cuts through portraits of life in a housing project. The official release connects those scenes to the song's subjects of inequality, loss and resilience rather than building a separate storyline around the performance.

[youtube:{YOUTUBE_ID}]

The recording credits show how many players sit behind that arrangement. Alongside Legend's piano and Pharrell's production, Apple lists conductors Larry Gold and Matt Jones, a full string section, brass and saxophone, Rhodes piano and synthesizer, plus Voices of Fire and additional chorus singers. Pharrell is the song's sole listed songwriter on Apple Music, while Gold, Jones, Steven Tirpak and Terrace Martin share arranging credits. The credits put a large ensemble around Legend without changing the basic center of the recording, his voice and piano.

[apple:song:{album_id}:{track_id}]

*Muse* grew out of Legend's appearance on Clipse's *Let God Sort 'Em Out*. According to the album announcement, his vocal on "The Birds Don't Sing" prompted Pharrell to build a larger project around Legend's voice. The two wrote and recorded at Pharrell's studio inside Louis Vuitton headquarters in Paris. Their reference points included Nina Simone, Nat King Cole and Marvin Gaye, while the album also draws from gospel, standards, doo-wop, classic soul, Afrobeat and hip-hop. It is their first full album together after more than two decades of friendship.

[apple:album:{album_id}]

"Fireflies" is track 14 on the 16-song album and follows "Daylight," the first song released from *Muse*. Pharrell also appears as a featured artist on the title track, "Her," "Get Back," "Are You OK?" and "Next Time," while Clipse guests on "Bodies On The Floor." His role goes further than those features. Pharrell produced the album from front to back, and "Fireflies" places his writing and additional vocals inside a recording built around Legend's piano, choir and orchestra.

Hunter's "Fireflies" clip is the second Paul Hunter-directed video released in this album cycle after "Daylight." It keeps Legend's piano performance and the orchestra in view while moving through the people and places the song is addressing. Apple Music lists the song at 3:02 and places it at No. 14 in the album sequence. *Muse* is due October 23 through Republic Records.'''
    return excerpt, body


def main():
    runner.load_env()
    print("FACT_REGISTRY")
    for detail, source in FACTS:
        print(" -", detail, "=>", source)

    before = runner.desk_read()["posts"]
    for p in before:
        if p.get("id") == PID or (
            (p.get("title") or "").strip().lower() == "fireflies"
            and "john legend" in (p.get("artist") or "").lower()
        ):
            print("DUPLICATE_STOP", p.get("id"), p.get("status"), p.get("title"))
            if p.get("status") == "live":
                return
            raise RuntimeError("Fireflies already exists but is not live; refusing to create a second copy")

    album_id, track_id = resolve_apple()
    raw = prep_photo(fetch_press_photo())
    photo_url = upload_photo(raw)
    excerpt, body = make_body(album_id, track_id)

    post_record = {
        "id": PID,
        "type": "release",
        "tag": "Release",
        "rtype": "Single",
        "artist": "John Legend & Pharrell Williams",
        "title": "Fireflies",
        "excerpt": excerpt,
        "body": body,
        "date": "2026-09-28",
        "pinned": False,
        "status": "draft",
        "cover": {
            "kind": "img",
            "src": photo_url,
            "credit": PHOTO_CREDIT,
            "creditUrl": PHOTO_CREDIT_URL,
            # Official portrait is vertical. These values keep the eyes high in the hero
            # and give the square card a little more room below the face.
            "pos": "50% 27%",
            "zoom": 1,
            "cardY": 0.34,
            "cardZoom": 1,
            "lockX": 0.50,
        },
    }

    def add(posts):
        posts.insert(0, json.loads(json.dumps(post_record)))
        return posts[0]

    now = runner.guarded_write(add)
    print("DRAFT_WRITE", now.get("id"), now.get("status"), len(now.get("body", "").split()), "raw tokens")

    ok = runner.cmd_gate(PID)
    if not ok:
        print("STOPPED: draft remains private because gate failed")
        raise SystemExit(2)

    runner.cmd_publish(PID)
    runner.cmd_verify(PID)
    print("PUBLISHED", PID)


if __name__ == "__main__":
    main()
