#!/usr/bin/env python3
from __future__ import annotations

import base64, copy, hashlib, io, json, sys, time, urllib.request
from pathlib import Path
from PIL import Image
import gdown

sys.path.insert(0, str(Path(__file__).resolve().parent))
import post as runner

PHOTO_API="https://music98.news/api/photo"
LEON_ID="auleon930r1"
LISA_ID="lisa26vegas"

LEON_TITLE="Happiness Anytime"
LEON_EXCERPT="Leon Bridges has released *Happiness Anytime*, a 12-song album produced by J Lloyd-Watson and Lydia Kitto of Jungle."
LEON_BODY=r'''Leon Bridges has released *Happiness Anytime*, a 12-song album produced by J Lloyd-Watson and Lydia Kitto of Jungle. Released through Columbia Records on September 25, the album follows *Leon* and moves Bridges back toward the warmth of his early soul work while keeping the looser rhythmic instincts he explored alongside Khruangbin. The album is concise - 12 tracks in under half an hour - and built around movement rather than long-form arrangements, with Bridges' voice remaining the constant as the production shifts through soul, funk, Afrobeat and Caribbean-leaning grooves.

The collaboration with Lloyd-Watson and Kitto shapes the entire record rather than appearing as a one-off pairing. Columbia introduced four songs in July: "Light the Way," "Tears of Joy," "Illusion" and "Your Love Is Electric." A second four-song set followed in August, adding "Talk It Over," the title track, "All Day, All Night" featuring Lydia Kitto and "Fly Baby." "Watch You Dance" arrived shortly before the album, leaving the full release to complete the sequence with "The Way It Goes," "Take My Hand" and "Please Don't Say Goodbye."

[apple:album:6789289866]

That release sequence makes *Happiness Anytime* feel less like a single release-day reveal and more like a record assembled in public. Nearly the entire first two-thirds of the track list was available before September 25, but the final album gives those songs a clear pacing and context. "Light the Way" opens with one of the set's brighter grooves, while the closing stretch slows the pulse without abandoning the rhythmic focus that runs through the project. Bridges does not treat the album as a return to the exact sound of *Coming Home*; instead, he uses that record's warmth as a base for a broader palette.

The official campaign has matched that emphasis on immediacy. Bridges previewed the material through pop-up performances in Paris, Cannes, Los Angeles, Montreux, London, Chicago and Montreal, and performed a medley from the album on *The Tonight Show*. The project also arrives with a strong visual identity photographed by Joshua Kissi, continuing the polished, fashion-forward presentation that has become part of Bridges' work alongside the music. *Happiness Anytime* is his fifth full-length album and one of the week's most substantial major-label R&B releases: compact, collaborative and deliberately centered on groove.'''

LISA_TITLE="LISA Adds Two Shows to Her Sold-Out Las Vegas Residency"
LISA_EXCERPT="LISA has added two shows to her sold-out VIVA LA LISA residency at The Colosseum at Caesars Palace, expanding the November run from four dates to six."
LISA_BODY=r'''LISA has added two shows to her sold-out VIVA LA LISA residency at The Colosseum at Caesars Palace, expanding the November run from four dates to six. The new performances are scheduled for November 12 and 29, joining previously announced shows on November 13, 14, 27 and 28. Caesars says the original four dates sold out in under 10 minutes. General sale for the two added performances begins September 30.

The six-show run keeps the residency concentrated across two November weekends rather than turning it into a longer Vegas season. The final schedule is November 12-14 and November 27-29, all at The Colosseum. Caesars is billing VIVA LA LISA as the first Las Vegas residency by a K-pop artist. The expansion also preserves the original shape of the booking: one extra show has been added to the front of the first weekend and another to the end of the second.

The timing connects the residency directly to LISA's current solo cycle. "SaWaDiKa" opened the release campaign for *PRESS PLAY*, a seven-song EP due October 23, and she gave the song its first televised performance at the 2026 MTV Video Music Awards. Caesars says the Bangkok-shot video drew 70.8 million views in its first 24 hours. At the same VMAs, LISA won Best Pop for "Dream feat. Kentaro Sakaguchi," adding another high-profile moment to the weeks leading into the residency.

That solo work follows *Alter Ego*, LISA's 2025 debut full-length album. The record reached No. 1 on Billboard's Top Album Sales chart and No. 7 on the Billboard 200, giving her a substantial solo catalog before the new EP arrives. She has also recently completed BLACKPINK's sold-out DEADLINE World Tour, so the Caesars dates come after a major group touring cycle rather than replacing one. By November, the residency will have both the established *Alter Ego* material and a newly released EP to draw from.

LISA's schedule outside music is busy as well. Her documentary *Always Lalisa*, directed by Sue Kim, recently premiered at the Toronto International Film Festival and is set for a worldwide cinema release on October 12. That places the film, the new EP and the Las Vegas residency within a compact seven-week stretch, giving VIVA LA LISA a clear role in a broader solo campaign rather than making it an isolated live booking.

The demand for the shows is already measurable. Four dates disappeared in under 10 minutes, two more were added before opening night, and the venue remains the same 4,300-seat Colosseum at Caesars Palace. For now, VIVA LA LISA stands at six performances across two weekends. The added dates increase capacity without changing the limited-run format that was announced in March.'''

LISA_PHOTO_URL="https://static.wixstatic.com/media/62f912_f1ddf672d4cc45d893e90bd9bcc86adc~mv2.jpg"
LEON_DRIVE_ID="1MAJ5rXUa92P6BK_SZPKiNxQYtxNgN1HG"

def fresh():
    return runner.http(runner.DESK_API+"?nocache="+str(time.time_ns()), runner.desk_key())

def digest(x):
    return hashlib.sha256(json.dumps(x,ensure_ascii=False,sort_keys=True,separators=(",",":")).encode()).hexdigest()

def upload_bytes(name, raw):
    with Image.open(io.BytesIO(raw)) as src:
        size=src.size
        fmt=src.format
        if max(size)<1920:
            raise RuntimeError(f"{name} below 1920px floor: {size}")
        im=src.convert("RGB")
        # Keep the official hi-res source for QC, but upload a delivery JPEG that
        # stays below the Desk endpoint payload ceiling.
        if max(im.size)>3200:
            scale=3200/max(im.size)
            im=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.LANCZOS)
        outbuf=io.BytesIO()
        im.save(outbuf,"JPEG",quality=86,optimize=True,progressive=True)
        raw=outbuf.getvalue()
        size=im.size
    if len(raw)>2_700_000:
        raise RuntimeError(f"{name} compressed upload still too large: {len(raw)}")
    payload={"name":name,"data":"data:image/jpeg;base64,"+base64.b64encode(raw).decode("ascii")}
    out=runner.http(PHOTO_API,runner.desk_key(),payload,method="POST")
    if not out.get("ok") or not out.get("url"):
        raise RuntimeError("photo upload failed: "+repr(out))
    print("PHOTO",name,size,fmt,len(raw),out["url"])
    return out["url"]

def upload_leon():
    path="/tmp/leon-joshua-kissi.jpg"
    gdown.download(id=LEON_DRIVE_ID,output=path,quiet=True)
    return upload_bytes("leon-bridges-happiness-anytime-joshua-kissi.jpg",Path(path).read_bytes())

def upload_lisa():
    req=urllib.request.Request(LISA_PHOTO_URL,headers={"User-Agent":runner.UA,"Referer":"https://www.lloud.co/"})
    with urllib.request.urlopen(req,timeout=60) as r:
        raw=r.read()
    return upload_bytes("lisa-viva-la-lisa-2026.jpg",raw)

def write_one(pid, rec):
    def mutate(posts):
        existing=next((p for p in posts if str(p.get("id"))==pid),None)
        if existing and (existing.get("status") or "live")!="draft":
            raise RuntimeError("refusing to overwrite non-draft "+pid)
        if existing is None:
            posts.insert(0,copy.deepcopy(rec))
            return posts[0]
        keep_publish=existing.get("publishAt")
        existing.clear(); existing.update(copy.deepcopy(rec))
        if keep_publish:
            existing["publishAt"]=keep_publish
        return existing
    now=runner.guarded_write(mutate)
    if now.get("status")!="draft":
        raise RuntimeError(pid+" is not draft")
    ok,lines=runner.run_gate(pid,quiet=False)
    print("GATE",pid,"PASS" if ok else "FAIL")
    for line in lines:
        if "PASS" in line or "FAIL" in line or line.lstrip().startswith(("X ","! ")):
            print(line)
    if not ok:
        raise RuntimeError("gate failed: "+pid)
    print("DRAFT_OK",pid,now.get("type"),now.get("title"),len((now.get("body") or "").split()))
    return now

def main():
    runner.load_env()
    current=fresh()["posts"]
    dup=[(p.get("id"),p.get("status"),p.get("title")) for p in current if
         "HAPPINESS ANYTIME" in str(p.get("title") or "").upper() or
         ("LISA" in str(p.get("title") or "").upper() and "LAS VEGAS" in str(p.get("title") or "").upper()) or
         "VIVA LA LISA" in str(p.get("title") or "").upper()]
    dup=[x for x in dup if str(x[0]) not in (LEON_ID,LISA_ID)]
    if dup:
        raise RuntimeError("possible duplicate target posts: "+repr(dup))

    leon_src=upload_leon()
    leon={
      "id":LEON_ID,"type":"release","tag":"New Release","artist":"Leon Bridges",
      "title":LEON_TITLE,"excerpt":LEON_EXCERPT,"body":LEON_BODY,"date":"2026-09-30",
      "status":"draft","pinned":False,
      "cover":{"kind":"img","src":leon_src,"credit":"Joshua Kissi",
               "creditUrl":"https://www.joshuakissi.com/",
               "pos":"50% 44%","zoom":1,"lockX":0.50,"cardX":0.50,"cardY":0.43,"cardZoom":1.35}
    }
    write_one(LEON_ID,leon)

    lisa_src=upload_lisa()
    lisa={
      "id":LISA_ID,"type":"news","tag":"News","artist":"LISA",
      "title":LISA_TITLE,"excerpt":LISA_EXCERPT,"body":LISA_BODY,"date":"2026-09-30",
      "status":"draft","pinned":False,
      "cover":{"kind":"img","src":lisa_src,"credit":"LLOUD","creditUrl":"https://www.lloud.co/",
               "pos":"50% 35%","zoom":1,"lockX":0.50,"cardX":0.50,"cardY":0.27,"cardZoom":2.4}
    }
    write_one(LISA_ID,lisa)

    final={str(p.get("id")):p for p in fresh()["posts"]}
    for pid in (LEON_ID,LISA_ID):
        p=final[pid]
        print("FINAL",pid,p.get("status"),p.get("type"),p.get("title"),len((p.get("body") or "").split()))

if __name__=="__main__":
    main()
