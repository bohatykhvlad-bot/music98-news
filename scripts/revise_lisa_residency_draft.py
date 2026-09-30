#!/usr/bin/env python3
from __future__ import annotations
import base64, copy, io, re, sys, time, urllib.request
from pathlib import Path
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import post as runner

POST_ID = "lisa26vegas"
PHOTO_API = "https://music98.news/api/photo"
PHOTO_URL = "https://jp.kith.com/cdn/shop/files/16_8fb06779-b440-460a-aeb1-449e2c474c4d.jpg?v=1771350968&width=1920"
PHOTO_REFERER = "https://jp.kith.com/blogs/discover/lisa-for-kith-women-spring-2026-campaign-1"
PHOTO_CREDIT = "Sahra Zadat"
PHOTO_CREDIT_URL = "https://www.sahrazadat.com/"

EXCERPT = """LISA has expanded VIVA LA LISA at The Colosseum at Caesars Palace to six shows, adding November 12 and 29 after the original four dates sold out in under 10 minutes."""

BODY_TEMPLATE = """LISA has expanded VIVA LA LISA at The Colosseum at Caesars Palace to six shows, adding November 12 and 29 after the original four dates sold out in under 10 minutes. The residency now opens on November 12 and runs for three nights before returning for another three-show stretch from November 27 through 29.

The two new dates keep the residency at the same venue and extend each weekend by one performance. General sale for November 12 and 29 began September 30. Caesars is billing the run as the first Las Vegas residency by a K-pop artist.

[tickets:__TICKET__]

The announcement lands less than a month before LISA releases *PRESS PLAY* on October 23 through LLOUD Co. and RCA Records. The six-track EP follows *Alter Ego* and is led by "SaWaDiKa." Caesars included the new single in its residency announcement, tying the November shows to the next phase of LISA's solo material rather than simply extending the earlier *Alter Ego* cycle.

"SaWaDiKa" was filmed in Bangkok and became LISA's first release from *PRESS PLAY*. She later performed the song at the 2026 MTV Video Music Awards, where "Dream feat. Kentaro Sakaguchi" won Best Pop. The residency will therefore begin after *PRESS PLAY* is already out, giving the new material a place in the same release window as the six Las Vegas dates.

[youtube:FMX98ROVRCE]

All six performances are scheduled for The Colosseum, with shows on November 12, 13, 14, 27, 28 and 29. The venue lists a capacity of roughly 4,300, making VIVA LA LISA a compact residency rather than an arena run. The first four dates remain unchanged, while the added Thursday and Sunday shows bookend the two original weekends.

The Las Vegas dates arrive during a busy fall for LISA. Her documentary *Always Lalisa* premiered at the Toronto International Film Festival in September and is set for a worldwide cinema release on October 12. *PRESS PLAY* follows eleven days later, before the residency begins in November. That sequence puts the documentary, the EP and VIVA LA LISA within the same two-month stretch without changing the six-show scope of the residency."""

def is_lisa_residency(p):
    artist = str(p.get("artist") or "").strip().upper()
    text = (str(p.get("title") or "") + " " + str(p.get("body") or "")).upper()
    return artist == "LISA" and ("VIVA LA LISA" in text or "LAS VEGAS RESIDENCY" in text)

def get_photo():
    req = urllib.request.Request(PHOTO_URL, headers={
        "User-Agent": runner.UA,
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "Referer": PHOTO_REFERER,
    })
    with urllib.request.urlopen(req, timeout=60) as r:
        raw = r.read()
    with Image.open(io.BytesIO(raw)) as src:
        print("PHOTO_SOURCE", src.size, src.format, len(raw))
        if max(src.size) < 1920:
            raise RuntimeError(f"press photo too small: {src.size}")
        im = src.convert("RGB")
        if max(im.size) > 3200:
            k = 3200 / max(im.size)
            im = im.resize((round(im.width*k), round(im.height*k)), Image.Resampling.LANCZOS)
        buf = io.BytesIO()
        im.save(buf, "JPEG", quality=90, optimize=True, progressive=True)
        raw = buf.getvalue()
    out = runner.http(PHOTO_API, runner.desk_key(), {
        "name": "lisa-kith-spring-2026-sahra-zadat.jpg",
        "data": "data:image/jpeg;base64," + base64.b64encode(raw).decode(),
    }, method="POST")
    if not out.get("ok"):
        raise RuntimeError(out)
    print("PHOTO_UPLOAD", out["url"], im.size, len(raw))
    return out["url"]

def main():
    runner.load_env()
    before = runner.desk_read()["posts"]
    matches = [(str(p.get("id")), p.get("status"), p.get("title")) for p in before if is_lisa_residency(p)]
    print("MATCHES_BEFORE", matches)

    current = runner.find_post(before, POST_ID)
    if current.get("status") != "draft":
        raise RuntimeError(f"{POST_ID} is not draft")

    m = re.search(r"(?im)^\s*\[tickets:(https?://[^\]]+)\]\s*$", str(current.get("body") or ""))
    if not m:
        raise RuntimeError("existing affiliate ticket CTA not found")
    ticket = m.group(1)

    photo_url = get_photo()
    body = BODY_TEMPLATE.replace("__TICKET__", ticket)

    def mutate(posts):
        p = runner.find_post(posts, POST_ID)
        if p.get("status") != "draft":
            raise RuntimeError("LISA status changed during guarded write")
        # Remove duplicate drafts for this same residency, preserving the canonical draft.
        posts[:] = [
            x for x in posts
            if not (str(x.get("id")) != POST_ID and (x.get("status") or "live") == "draft" and is_lisa_residency(x))
        ]
        p = runner.find_post(posts, POST_ID)
        p["excerpt"] = EXCERPT
        p["body"] = body
        p["cover"] = {
            "kind": "img",
            "src": photo_url,
            "credit": PHOTO_CREDIT,
            "creditUrl": PHOTO_CREDIT_URL,
            "pos": "50% 50%",
            "zoom": 1,
            "cardX": .50,
            "cardY": .50,
            "cardZoom": 1,
        }
        return copy.deepcopy(p)

    runner.guarded_write(mutate)

    for attempt in range(12):
        desk = runner.http(runner.DESK_API + "?nocache=" + str(time.time_ns()), runner.desk_key())
        p = next((x for x in desk.get("posts", []) if str(x.get("id")) == POST_ID), None)
        if (p and p.get("status") == "draft" and p.get("body") == body
                and p.get("excerpt") == EXCERPT
                and (p.get("cover") or {}).get("credit") == PHOTO_CREDIT
                and (p.get("cover") or {}).get("src") == photo_url):
            break
        time.sleep(2)
    else:
        raise RuntimeError("LISA revision did not propagate")

    # Media/status/duplicate contract.
    if re.search(r"(?im)^\s*\[apple:", p.get("body") or ""):
        raise RuntimeError("unexpected Apple media block")
    if len(re.findall(r"(?im)^\s*\[youtube:", p.get("body") or "")) != 1:
        raise RuntimeError("LISA must contain exactly one YouTube block")
    if len(re.findall(r"(?im)^\s*\[tickets:", p.get("body") or "")) != 1:
        raise RuntimeError("LISA must contain exactly one ticket CTA")

    for pass_no in (1, 2, 3):
        ok, lines = runner.run_gate(POST_ID, quiet=False)
        print("GATE_PASS", pass_no, "PASS" if ok else "FAIL")
        for line in lines:
            if "PASS" in line or "FAIL" in line or line.lstrip().startswith(("X ", "! ")):
                print(line)
        if not ok:
            raise RuntimeError(f"gate failed on pass {pass_no}")

    final = runner.desk_read()["posts"]
    matches = [(str(x.get("id")), x.get("status"), x.get("title")) for x in final if is_lisa_residency(x)]
    print("MATCHES_AFTER", matches)
    print("MEDIA_COUNTS", {
        "apple": len(re.findall(r"(?im)^\s*\[apple:", body)),
        "youtube": len(re.findall(r"(?im)^\s*\[youtube:", body)),
        "tickets": len(re.findall(r"(?im)^\s*\[tickets:", body)),
    })
    print("FINAL_COVER", photo_url, PHOTO_CREDIT)

if __name__ == "__main__":
    main()
