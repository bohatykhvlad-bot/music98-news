#!/usr/bin/env python3
from __future__ import annotations
import base64, copy, io, re, sys, time, urllib.request
from pathlib import Path
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import post as runner

POST_ID = "lisa26vegas"
# run-marker-final
PHOTO_API = "https://music98.news/api/photo"
PHOTO_URL = "https://s1.ticketm.net/dam/a/b6e/7eaa3ca1-d027-492e-a3bb-87f718f4db6e_TABLET_LANDSCAPE_LARGE_16_9.jpg"
PHOTO_SOURCE_PAGE = "https://www.livenation.com/event/1Ad0Z_6Gkmx6wSv/viva-la-lisa"
PHOTO_CREDIT = "LLOUD"
PHOTO_CREDIT_URL = "https://www.lloud.co/"

EXCERPT = """LISA has expanded VIVA LA LISA at The Colosseum at Caesars Palace to six shows, adding November 12 and 29 after the original four dates sold out in under 10 minutes."""

BODY_TEMPLATE = """LISA has expanded VIVA LA LISA at The Colosseum at Caesars Palace to six shows, adding November 12 and 29 after the original four dates sold out in under 10 minutes. The residency now opens a day earlier than first announced and closes a day later, turning each of the two Las Vegas weekends into a three-night run.

The full schedule is November 12, 13 and 14, followed by November 27, 28 and 29. General sale for the two added performances began September 30 through Ticketmaster, while the four dates announced in March remain in place. Caesars Entertainment says the run makes LISA the first K-pop artist to hold a Las Vegas residency. The Colosseum is a 4,300-seat theater inside Caesars Palace, and the two added dates extend each of the original weekends by one night without changing venues.

The additional shows arrive ahead of *PRESS PLAY*, LISA's six-track EP due October 23 through LLOUD Co. and RCA Records. Its lead single, "SaWaDiKa," was produced by Thom Bridges and Ojivolta. The video was directed by Bang Jae Yeob and filmed around Bangkok. Caesars says it drew 70.8 million views in its first 24 hours.

[youtube:FMX98ROVRCE]

LISA gave "SaWaDiKa" its first televised performance at the 2026 MTV Video Music Awards. At the same ceremony, "Dream feat. Kentaro Sakaguchi" won Best Pop. The residency begins 20 days after *PRESS PLAY* is released, so the EP will already be available before the first Las Vegas performance.

[tickets:__TICKET__]

Beyond the residency, LISA's fall schedule also includes *Always Lalisa*, the Sue Kim-directed documentary that premiered at the Toronto International Film Festival and is set for a limited worldwide theatrical run. Sony Music Vision says the film follows the year LISA steps away from BLACKPINK for a period of independence while launching her solo career, pursuing acting and building her own brand before returning to the group. The documentary will screen in cinemas worldwide, including IMAX presentations, before streaming globally on YouTube Premium."""

AI_STYLE_FLAGS = ("marks a new chapter","comes at a time","not only","rather than simply","serves as a","underscores","showcases","the announcement lands")

def is_lisa_residency(p):
    artist = str(p.get("artist") or "").strip().upper()
    text = (str(p.get("title") or "") + " " + str(p.get("body") or "")).upper()
    return artist == "LISA" and ("VIVA LA LISA" in text or "LAS VEGAS RESIDENCY" in text)

def get_photo():
    req = urllib.request.Request(PHOTO_URL, headers={
        "User-Agent": runner.UA,
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "Referer": PHOTO_SOURCE_PAGE,
    })
    with urllib.request.urlopen(req, timeout=60) as r:
        raw = r.read()
    with Image.open(io.BytesIO(raw)) as src:
        print("PHOTO_SOURCE", src.size, src.format, len(raw), PHOTO_SOURCE_PAGE)
        if max(src.size) < 1920:
            raise RuntimeError(f"official VIVA LA LISA press image below 1920px: {src.size}")
        im = src.convert("RGB")
        if max(im.size) > 3200:
            k = 3200 / max(im.size)
            im = im.resize((round(im.width*k), round(im.height*k)), Image.Resampling.LANCZOS)
        buf = io.BytesIO()
        im.save(buf, "JPEG", quality=92, optimize=True, progressive=True)
        raw = buf.getvalue()
    out = runner.http(PHOTO_API, runner.desk_key(), {
        "name": "lisa-viva-la-lisa-live-nation-2026.jpg",
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
    low = body.lower()
    bad = [x for x in AI_STYLE_FLAGS if x in low]
    print("AI_STYLE_SCAN", bad)
    if bad:
        raise RuntimeError(f"AI-style phrase(s) remain: {bad}")

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
            "pos": "50% 46%",
            "zoom": 1,
            "cardX": .50,
            "cardY": .45,
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
        ok = False
        lines = []
        for gate_attempt in range(8):
            ok, lines = runner.run_gate(POST_ID, quiet=False)
            print("GATE_PASS", pass_no, "ATTEMPT", gate_attempt + 1, "PASS" if ok else "FAIL")
            for line in lines:
                if "PASS" in line or "FAIL" in line or line.lstrip().startswith(("X ", "! ")):
                    print(line)
            if ok:
                break
            time.sleep(3)
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
