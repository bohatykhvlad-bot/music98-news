#!/usr/bin/env python3
from __future__ import annotations
import base64, copy, io, re, sys, time, urllib.request
from pathlib import Path
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import post as runner

POST_ID = "lisa26vegas"
# run-marker
PHOTO_API = "https://music98.news/api/photo"
PHOTO_URL = "https://jp.kith.com/cdn/shop/files/16_8fb06779-b440-460a-aeb1-449e2c474c4d.jpg?v=1771350968&width=1920"
PHOTO_REFERER = "https://jp.kith.com/blogs/discover/lisa-for-kith-women-spring-2026-campaign-1"
PHOTO_CREDIT = "Sahra Zadat"
PHOTO_CREDIT_URL = "https://www.sahrazadat.com/"

EXCERPT = """LISA has expanded VIVA LA LISA at The Colosseum at Caesars Palace to six shows, adding November 12 and 29 after the original four dates sold out in under 10 minutes."""

BODY_TEMPLATE = """LISA has expanded VIVA LA LISA at The Colosseum at Caesars Palace to six shows, adding November 12 and 29 after the original four dates sold out in under 10 minutes. The residency will now run November 12 through 14 and return for a second three-show stretch from November 27 through 29.

The added performances extend each of the two previously announced weekends by one night. General sale for the new dates began September 30, while the four original shows remain unchanged. Caesars is billing VIVA LA LISA as the first Las Vegas residency by a K-pop artist.

[tickets:__TICKET__]

The announcement comes less than a month before LISA releases *PRESS PLAY* on October 23 through LLOUD Co. and RCA Records. The six-track EP follows *Alter Ego* and is led by "SaWaDiKa." Its release puts the new project three weeks ahead of the first Las Vegas show.

"SaWaDiKa" was filmed in Bangkok and became the first release from *PRESS PLAY*. Caesars says the video drew 70.8 million views in its first 24 hours. LISA later performed the song at the 2026 MTV Video Music Awards, where "Dream feat. Kentaro Sakaguchi" won Best Pop.

[youtube:FMX98ROVRCE]

VIVA LA LISA remains a limited run at The Colosseum rather than a tour extension. November 12 now opens the first weekend and November 29 closes the second, with three performances scheduled on each weekend. No additional venues or cities were announced with the two new dates."""

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
            "pos": "50% 28%",
            "zoom": 1,
            "cardX": .50,
            "cardY": .30,
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
