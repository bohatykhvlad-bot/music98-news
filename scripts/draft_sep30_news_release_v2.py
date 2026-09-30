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
LEON_EXCERPT="Leon Bridges has released *Happiness Anytime*, a 12-song album produced by J Lloyd-Watson and Lydia Kitto of Jungle that pushes his soul sound toward warmer, rhythm-first territory."
LEON_BODY=r'''Leon Bridges has released *Happiness Anytime*, a 12-song album produced by J Lloyd-Watson and Lydia Kitto of Jungle. Released through Columbia Records on September 25, the record follows *Leon* and moves Bridges back toward the warmth of his early soul records while keeping the looser rhythmic instincts he explored with Khruangbin. The album is concise - 12 tracks in under half an hour - and built around movement rather than long-form arrangements, with Bridges' voice remaining the constant as the production shifts through soul, funk, Afrobeat and Caribbean-leaning grooves.

The collaboration with Lloyd-Watson and Kitto shapes the entire record rather than appearing as a one-off pairing. Columbia introduced the project with four songs in July - "Light the Way," "Tears of Joy," "Illusion" and "Your Love Is Electric" - before another four-song drop in August added "Talk It Over," the title track, "All Day, All Night" with Lydia Kitto and "Fly Baby." "Watch You Dance" arrived just before the album, leaving the full release to complete the sequence with "The Way It Goes," "Take My Hand" and "Please Don't Say Goodbye."

[apple:album:6789289866]

That rollout makes *Happiness Anytime* feel less like a single release-day reveal and more like a record assembled in public. Nearly the entire first two-thirds of the track list was available before September 25, but the final album gives those songs a clear pacing and context. "Light the Way" opens with one of the set's brighter grooves, while the closing stretch slows the pulse without abandoning the rhythmic focus that runs through the project. Bridges does not treat the album as a return to the exact sound of *Coming Home*; instead, he uses that record's warmth as a base for a broader palette.

The official campaign has matched that emphasis on immediacy. Bridges previewed the material through pop-up performances in Paris, Cannes, Los Angeles, Montreux, London, Chicago and Montreal, and performed a medley from the album on *The Tonight Show*. The project also arrives with a strong visual identity photographed by Joshua Kissi, continuing the polished, fashion-forward presentation that has become part of Bridges' work alongside the music. *Happiness Anytime* is his fifth full-length album and one of the week's most substantial major-label R&B releases: compact, collaborative and deliberately centered on groove.'''

LISA_TITLE="LISA Adds Two Shows to Her Sold-Out Las Vegas Residency"
LISA_EXCERPT="LISA has added two shows to her sold-out VIVA LA LISA residency at The Colosseum at Caesars Palace, expanding the November run from four dates to six."
LISA_BODY=r'''LISA has added two shows to her sold-out VIVA LA LISA residency at The Colosseum at Caesars Palace, expanding the November run from four dates to six. The new performances are scheduled for November 12 and November 29, joining the previously announced November 13, 14, 27 and 28 shows. Caesars says the original four dates sold out in under 10 minutes. General sale for the two added performances begins September 30.

The six-show run keeps the residency concentrated across two November weekends rather than turning it into a longer Vegas season. The final schedule is November 12-14 and November 27-29, all at The Colosseum. Caesars is billing VIVA LA LISA as the first Las Vegas residency by a K-pop artist, giving the run a milestone beyond the sellout itself. The expansion also preserves the original shape of the booking: one extra show has been added to the front of the first weekend and another to the end of the second.

The timing connects the residency directly to LISA's current solo cycle. "SaWaDiKa" opened the rollout for *PRESS PLAY*, a seven-song EP due October 23, and she performed the song at the 2026 MTV Video Music Awards. By the time VIVA LA LISA opens in November, that new project will have been out for several weeks, giving the residency fresh material beyond the songs from *Alter Ego*, her 2025 debut solo album.

The Vegas dates also arrive after the BLACKPINK DEADLINE World Tour and during a stretch in which LISA has kept her solo work moving across music, performance and screen projects. That makes the residency less of a detached one-off and more of a focused live chapter in an already active year. With the original four dates gone almost immediately and two more now added before opening night, the demand story is unusually clear: the first announced capacity was not enough. VIVA LA LISA now stands at six shows, with no change to the venue or two-weekend format.'''

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
               "creditUrl":"https://www.sonymusic.ca/press_release/leon-bridges-releases-four-songs",
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
