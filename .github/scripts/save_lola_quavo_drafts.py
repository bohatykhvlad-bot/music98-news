from __future__ import annotations

import base64
import hashlib
import io
import json
import os
import re
import time
import urllib.request

from PIL import Image

KEY = os.environ.get("ADMIN_PASSWORD", "").strip()
if not KEY:
    raise SystemExit("NO_EDITOR_CREDENTIAL")

DESK = "https://music98.news/api/desk"
PHOTO = "https://music98.news/api/photo"
UA = "music98-editorial-draft-2026-10-06"

LOLA_COVER_SRC = "https://ca.rollingstone.com/media-library/image.webp?coordinates=0%2C0%2C0%2C0&height=1600&id=68053917&quality=95&width=2400"
QUAVO_COVER_SRC = "https://www.universalmusic.ca/wp-content/uploads/sites/1843/2026/08/TranceBTS-49.jpg"
QUAVO_BODY_SRC = "https://www.universalmusic.ca/wp-content/uploads/sites/1843/2026/08/TranceBTS-28.jpg"


def fetch_bytes(url: str):
    last = None
    for attempt in range(5):
        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "Mozilla/5.0", "Accept": "image/avif,image/webp,image/*,*/*"},
            )
            with urllib.request.urlopen(req, timeout=60) as r:
                data = r.read()
                ctype = (r.headers.get("Content-Type") or "").split(";")[0].lower()
            return data, ctype
        except Exception as exc:
            last = exc
            if attempt == 4:
                break
            time.sleep(2 + attempt * 2)
    raise last


def verify_image(label: str, url: str, min_width: int = 1920):
    data, ctype = fetch_bytes(url)
    with Image.open(io.BytesIO(data)) as im:
        w, h = im.size
        fmt = im.format
    if w < min_width or h < 900:
        raise SystemExit(f"{label}_TOO_SMALL {w}x{h}")
    if len(data) < 100000:
        raise SystemExit(f"{label}_SUSPICIOUS_BYTES {len(data)}")
    print(
        f"{label}_VERIFIED {w}x{h} bytes={len(data)} "
        f"format={fmt} sha256={hashlib.sha256(data).hexdigest()}"
    )
    return data, ctype


def upload_photo(name: str, data: bytes, ctype: str):
    encoded = base64.b64encode(data).decode("ascii")
    payload = json.dumps({"name": name, "data": f"data:{ctype};base64,{encoded}"}).encode()
    req = urllib.request.Request(
        PHOTO,
        data=payload,
        method="POST",
        headers={
            "X-Admin-Key": KEY,
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": UA,
        },
    )
    with urllib.request.urlopen(req, timeout=90) as r:
        result = json.load(r)
    if not result.get("ok"):
        raise SystemExit("PHOTO_UPLOAD_FAILED " + name)
    return result["url"]


def word_count(text: str) -> int:
    return len(re.findall(r"\b[\w'*-]+\b", text))


lola_data, lola_type = verify_image("LOLA_PRESS", LOLA_COVER_SRC)
qc_data, qc_type = verify_image("QUAVO_PRESS_COVER", QUAVO_COVER_SRC)
qb_data, qb_type = verify_image("QUAVO_PRESS_BODY", QUAVO_BODY_SRC)

lola_cover = upload_photo(
    "lola-young-everything-begins-harriet-k-bols-2026.webp", lola_data, lola_type
)
quavo_cover = upload_photo(
    "quavo-qromelife-tariq-mcallister-cover.jpg", qc_data, qc_type
)
quavo_body_photo = upload_photo(
    "quavo-qromelife-tariq-mcallister-body.jpg", qb_data, qb_type
)

lola_body = """Lola Young has announced the Everything Begins Tour, a 17-date North American run set for spring 2027.

The tour opens at The Pinnacle in Nashville on April 6 and closes at the Greek Theatre in Los Angeles on May 4. Between those dates, Young will play Radio City Music Hall in New York, two nights at Massey Hall in Toronto and a run of theaters and larger venues across the United States and Canada.

Everything Begins will be Young's first North American headline tour since she stepped away from touring in 2025. She returned to regular live performances this year, including two sold-out hometown shows at London's O2 Academy Brixton, and "Messy" won Best Pop Solo Performance at the 2026 Grammy Awards.

The return has also brought new music. In May, Young released "From Down Here," a single co-written and co-produced by James Blake. It followed *I'm Only F**king Myself* and arrived as Young began rebuilding her live schedule after the cancellations that ended her 2025 run.

The 17-show itinerary now gives that return a full North American headline route rather than another stretch of one-off appearances. Tickets go on sale to the general public on October 9 at 10 a.m. local time through Young's official site, with presales beginning two days earlier."""

quavo_body = f"""Quavo has released *QRÖMELIFE*, a 14-track album executive produced by Pharrell Williams.

The record grew out of more than a year and a half of work between Quavo and Pharrell, with sessions stretching from Louis Vuitton's headquarters in Paris to a yacht in Miami. Pharrell's role went beyond a late executive-production credit: the collaboration became the framework for an album built around Quavo's melodic instincts, Atlanta rap and the broader sound he has explored since Migos.

[photo:{quavo_body_photo}|Tariq McAllister|https://www.instagram.com/riq.mc/|50% 42%|1]

The rollout began with "HAAVIN," first heard during Pharrell's Louis Vuitton Spring-Summer 2027 men's show in Paris. "Trance (Walk It Down)" followed before Quavo returned to Atlanta to introduce "Backwards" with T.I. The sequence set up the album without requiring *QRÖMELIFE* to function as a collection of guest appearances.

One of its most significant moments comes on "Away," which reunites Quavo and Offset on record after years in which their relationship and the future of Migos were uncertain. The song arrives in a different emotional context from Quavo's 2023 album *Rocket Power*, which was made in the aftermath of Takeoff's death and centered directly on grief.

That loss still sits behind *QRÖMELIFE*, but the new record is more concerned with what came after it. Quavo has described the project in terms of perseverance, faith and reaching the other side of difficult periods. He has also spoken about becoming a father and the new sense of purpose that parenthood has brought to his life and work.

Pharrell helps give the album room to move between those ideas without locking it into one sound. "House Music" with Justin Timberlake leans toward glossy pop and funk, while other tracks return to harder drums and the clipped melodic phrasing associated with Quavo's Atlanta records. The shifts feel less like separate experiments than parts of the same solo identity.

Quavo has also said that he and Offset are working on another Migos project intended to honor Takeoff, although no release date has been announced. Until that takes shape, *QRÖMELIFE* is Quavo's first full solo album since *Rocket Power* and the clearest document of where his music has moved since then."""

drafts = [
    {
        "id": "lola27everythingbegins",
        "type": "news",
        "tag": "News",
        "rtype": "",
        "artist": "Lola Young",
        "title": "Lola Young Announces 2027 Everything Begins Tour",
        "excerpt": "Lola Young has announced the Everything Begins Tour, a 17-date North American run set for spring 2027.",
        "body": lola_body,
        "date": "2026-10-06",
        "pinned": False,
        "status": "draft",
        "cover": {
            "kind": "img",
            "src": lola_cover,
            "credit": "Harriet K Bols",
            "creditUrl": "https://www.instagram.com/harriettkbols/",
            "pos": "50% 42%",
            "zoom": 1,
            "cardY": 0.42,
            "cardZoom": 1,
            "lockX": 0.5,
        },
    },
    {
        "id": "quavo26qromelife",
        "type": "release",
        "tag": "Release",
        "rtype": "Album",
        "artist": "Quavo",
        "title": "QRÖMELIFE",
        "excerpt": "Quavo has released *QRÖMELIFE*, a 14-track album executive produced by Pharrell Williams.",
        "body": quavo_body,
        "date": "2026-10-06",
        "pinned": False,
        "status": "draft",
        "cover": {
            "kind": "img",
            "src": quavo_cover,
            "credit": "Tariq McAllister",
            "creditUrl": "https://www.instagram.com/riq.mc/",
            "pos": "50% 38%",
            "zoom": 1,
            "cardY": 0.38,
            "cardZoom": 1,
            "lockX": 0.5,
        },
    },
]

curly = set("“”‘’")
for p in drafts:
    text_blob = "\n".join([p["title"], p["excerpt"], p["body"]])
    bad = sorted(curly.intersection(text_blob))
    if bad:
        raise SystemExit(f"{p['id']}_CURLY_QUOTES_FOUND {bad!r}")
    if not p["body"].startswith(p["excerpt"]):
        raise SystemExit(p["id"] + "_EXCERPT_NOT_LITERAL_PREFIX")
    if p["status"] != "draft":
        raise SystemExit(p["id"] + "_NOT_DRAFT")
    wc = word_count(p["body"])
    if p["type"] == "news" and wc < 200:
        raise SystemExit(p["id"] + "_TOO_SHORT")
    if p["type"] == "release" and wc < 350:
        raise SystemExit(p["id"] + "_TOO_SHORT")
    print(f"TEXT_REVIEWED id={p['id']} words={wc} curly_quotes=0")


def desk_get():
    req = urllib.request.Request(
        DESK,
        headers={
            "X-Admin-Key": KEY,
            "Accept": "application/json",
            "Cache-Control": "no-cache",
            "User-Agent": UA,
        },
    )
    with urllib.request.urlopen(req, timeout=45) as r:
        return json.load(r)


before = desk_get()
posts = before.get("posts") or []
ids = {d["id"] for d in drafts}
titles = {d["title"] for d in drafts}
existing = [p for p in posts if p.get("id") in ids or p.get("title") in titles]
for p in existing:
    if p.get("id") not in ids or p.get("status") != "draft":
        raise SystemExit("UNSAFE_EXISTING_TARGET " + str(p.get("id")))
    expected = next(d for d in drafts if d["id"] == p["id"])
    if p.get("title") != expected["title"]:
        raise SystemExit("EXISTING_TITLE_MISMATCH " + str(p.get("id")))

untouched_before = [p for p in posts if p.get("id") not in ids]
snapshot = json.dumps(untouched_before, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
new_posts = drafts + untouched_before
payload = json.dumps({"posts": new_posts}, ensure_ascii=False).encode("utf-8")
req = urllib.request.Request(
    DESK,
    data=payload,
    method="POST",
    headers={
        "X-Admin-Key": KEY,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": UA,
    },
)
with urllib.request.urlopen(req, timeout=90) as r:
    saved = json.load(r)
if not saved.get("ok"):
    raise SystemExit("DESK_SAVE_FAILED")

after = desk_get()
ap = after.get("posts") or []
untouched = [p for p in ap if p.get("id") not in ids]
if json.dumps(
    untouched, sort_keys=True, ensure_ascii=False, separators=(",", ":")
) != snapshot:
    raise SystemExit("NON_TARGET_POST_CHANGED")

for d in drafts:
    p = next((x for x in ap if x.get("id") == d["id"]), None)
    checks = {
        "exists": bool(p),
        "status": bool(p and p.get("status") == "draft"),
        "body": bool(p and p.get("body") == d["body"]),
        "excerpt": bool(p and p.get("excerpt") == d["excerpt"]),
        "credit": bool(p and p.get("cover", {}).get("credit") == d["cover"]["credit"]),
        "title": bool(p and p.get("title") == d["title"]),
    }
    print("VERIFY", d["id"], json.dumps(checks, sort_keys=True))
    if not all(checks.values()):
        if p:
            print("VERIFY_LENGTHS", d["id"], len(p.get("body") or ""), len(d["body"]), len(p.get("excerpt") or ""), len(d["excerpt"]))
            print("VERIFY_COVER", d["id"], json.dumps(p.get("cover"), ensure_ascii=False, sort_keys=True))
        raise SystemExit(d["id"] + "_POST_SAVE_VERIFY_FAILED")
    print(
        f"DRAFT_SAVED id={d['id']} status=draft "
        f"cover={p.get('cover', {}).get('src')} credit={p.get('cover', {}).get('credit')}"
    )

print("OTHER_POSTS_UNCHANGED true")
