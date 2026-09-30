#!/usr/bin/env python3
from __future__ import annotations
import base64, copy, io, json, sys, time, urllib.request, http.cookiejar, re, html
from pathlib import Path
from PIL import Image
import gdown
sys.path.insert(0, str(Path(__file__).resolve().parent))
import post as runner

PHOTO_API="https://music98.news/api/photo"
LISA_ID="lisa26vegas"
LP_ID="auleon930r1"
OLD_LEON_ID="auleon930r1"
LISA_PHOTO="https://s202.q4cdn.com/508919455/files/content_files/Static_Social-Instagram_1080x1080_Lisa_2026_Regional_TheColosseumatCaesarsPalace_1101_V2-20-41-27.jpg"
LP_PHOTO="https://press.warnerrecords.com/sites/g/files/g2000014901/files/styles/artist_detail/public/2025-12/Linkin_Park_2_20_2535788%20M1A%20copy%20%281%29%20%281%29.jpg?itok=IxzVedtC"
LP_MIRRORS=["https://www.visions.de/news/linkin-park-eroeffnungsauftritt-beim-uefa-champions-league-finale/","https://www.musikexpress.de/linkin-park-neue-single-unshatter-ist-da-3013217/"]

LISA_BODY='''LISA has added two shows to her sold-out VIVA LA LISA residency at The Colosseum at Caesars Palace, expanding the November run from four dates to six. The new performances are scheduled for November 12 and 29, joining previously announced shows on November 13, 14, 27 and 28. Caesars says the original four dates sold out in under 10 minutes, and general sale for the two added performances begins September 30.

The residency remains concentrated across two weekends rather than becoming a longer Vegas season. The complete schedule is November 12-14 and November 27-29, all at the 4,300-seat Colosseum. Caesars is billing VIVA LA LISA as the first Las Vegas residency by a K-pop artist. The two additions preserve the original structure: one extra performance now opens the first weekend, while another closes the second.

[tickets:__TICKET__]

The announcement lands in the middle of LISA's current solo campaign. "SaWaDiKa," released through LLOUD Co. and RCA Records, is the first single from her seven-song EP *PRESS PLAY*, due October 23. The video was filmed in Bangkok and, according to Caesars, drew 70.8 million views in its first 24 hours. The official clip puts LISA's Thai roots at the center of the campaign rather than treating them as background to a generic pop release. LISA also brought "SaWaDiKa" to the 2026 MTV Video Music Awards for its first televised performance. At the same VMAs, "Dream" won Best Pop. LLOUD's official short film for "Dream," starring LISA and Kentaro Sakaguchi, is included below as the article's single media block.

[youtube:FMX98ROVRCE]

By the time the residency opens in November, *PRESS PLAY* will have been out for several weeks, giving the show new material alongside songs from *Alter Ego*, her 2025 debut solo album. That gives VIVA LA LISA a different musical context from the four-date version first announced earlier in the year.

The Vegas run follows another unusually active stretch. BLACKPINK completed the DEADLINE World Tour, while LISA continued building a separate solo schedule across music and screen work. Her documentary *Always Lalisa*, directed by Sue Kim, premiered at the Toronto International Film Festival and is also headed to cinemas worldwide in October. That places the film, the EP and the residency within a compact fall campaign.

Demand for VIVA LA LISA was clear before rehearsals began: the initial four-show allocation disappeared almost immediately, and Caesars added capacity without changing the venue or limited-run format. The residency now stands at six performances across the same two weekends.'''

LP_BODY='''LINKIN PARK have released *UNSHATTER Film Soundtrack (Live in São Paulo)*, a 20-track live companion to the band's new documentary. The Warner Records release arrived September 25 and captures the *FROM ZERO* release concert in São Paulo, while its track list reaches across several periods of the band's catalog. Rather than presenting only the material created for the comeback, the set places newer recordings beside songs that have been central to LINKIN PARK's live shows for years.

The sequence includes "Somewhere I Belong," "Waiting for the End," "What I've Done," "Numb," "In the End," "Faint," "Papercut" and "Bleed It Out," alongside newer tracks such as "The Emptiness Machine," "Casualty," "Two Faced," "Over Each Other" and "Heavy Is the Crown." Three short intro or interlude pieces bring the digital edition to 20 tracks. Mike Shinoda and Emily Armstrong share the vocal center of the performance, with Colin Brittain, Brad Delson, Dave Farrell and Joe Hahn completing the current lineup represented by the project.

The soundtrack is tied directly to *UNSHATTER*. According to the band's official store, the film follows LINKIN PARK from private studio sessions in 2022 through the creation and release of *FROM ZERO* and the São Paulo concert. It combines archive material, newer interviews and footage from the band's return to the stage. The soundtrack also includes live recordings that are not heard in the film, so it works as more than an audio transcription of the documentary.

"Faint" was one of the performances released ahead of the full soundtrack. The official live video keeps the scale of the São Paulo show visible while showing how the current lineup handles one of the band's best-known songs.

[youtube:zNYsw-cW8v8]

The physical editions follow the same concert-document approach. The CD comes in a gatefold softpak with a 12-panel accordion booklet, while the double-vinyl edition is pressed on Citrus vinyl in a gatefold jacket with a large insert. Both formats use the São Paulo performance as the center of the package rather than presenting *UNSHATTER* as a conventional greatest-hits collection.

That makes the release useful in two ways: it documents LINKIN PARK's present lineup in a major live setting, and it gives the documentary its own standalone concert record. For listeners following the *FROM ZERO* era, *UNSHATTER Film Soundtrack (Live in São Paulo)* is a substantial companion release rather than a small collection of bonus tracks.'''

def get(url, referer=""):
    jar=http.cookiejar.CookieJar()
    opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
    if referer:
        try:
            opener.open(urllib.request.Request(referer,headers={
                "User-Agent":runner.UA,
                "Accept":"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language":"en-US,en;q=0.9",
            }),timeout=30).read(1024)
        except Exception:
            pass
    headers={
        "User-Agent":runner.UA,
        "Accept":"image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "Accept-Language":"en-US,en;q=0.9",
    }
    if referer: headers["Referer"]=referer
    req=urllib.request.Request(url,headers=headers)
    try:
        with opener.open(req,timeout=60) as r: return r.read()
    except Exception:
        if "press.warnerrecords.com" in url and referer:
            try:
                page=opener.open(urllib.request.Request(referer,headers={"User-Agent":runner.UA}),timeout=30).read().decode("utf-8","replace")
                key="Linkin_Park_2_20_2535788"
                at=page.find(key)
                if at>=0: print("WARNER_HTML",page[max(0,at-1200):at+1800].replace("\n"," "))
            except Exception as dbg:
                print("WARNER_DEBUG_ERROR",repr(dbg))
        raise

def upload(name, raw, min_px=1920):
    with Image.open(io.BytesIO(raw)) as src:
        if max(src.size)<min_px: raise RuntimeError(f"{name} too small: {src.size}")
        im=src.convert("RGB")
        if max(im.size)>3200:
            k=3200/max(im.size)
            im=im.resize((round(im.width*k),round(im.height*k)),Image.Resampling.LANCZOS)
        buf=io.BytesIO(); im.save(buf,"JPEG",quality=87,optimize=True,progressive=True)
        raw=buf.getvalue()
    out=runner.http(PHOTO_API,runner.desk_key(),{"name":name,"data":"data:image/jpeg;base64,"+base64.b64encode(raw).decode()},method="POST")
    if not out.get("ok"): raise RuntimeError(out)
    print("PHOTO",name,im.size,len(raw))
    return out["url"]

def lisa_photo():
    return upload("lisa-viva-la-lisa-caesars-2026.jpg",get(LISA_PHOTO,"https://newsroom.caesars.com/"),1080)

def html_bytes(url):
    req=urllib.request.Request(url,headers={"User-Agent":runner.UA,"Accept":"text/html,application/xhtml+xml"})
    with urllib.request.urlopen(req,timeout=45) as r: return r.read()

def lp_photo():
    try:
        return upload("linkin-park-unshatter-jimmy-fontaine.jpg",get(LP_PHOTO,"https://press.warnerrecords.com/linkinpark"))
    except Exception as direct:
        print("WARNER_DIRECT_BLOCKED",repr(direct))
    for page_url in LP_MIRRORS:
        try:
            page=html_bytes(page_url).decode("utf-8","replace")
            m=re.search(r'<meta[^>]+(?:property|name)=["\']og:image["\'][^>]+content=["\']([^"\']+)',page,re.I)
            if not m:
                m=re.search(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+(?:property|name)=["\']og:image["\']',page,re.I)
            if not m: continue
            img=html.unescape(m.group(1))
            raw=get(img,page_url)
            with Image.open(io.BytesIO(raw)) as probe:
                print("LP_MIRROR_QC",page_url,img,probe.size,probe.format)
                if max(probe.size)<1920:
                    continue
            return upload("linkin-park-unshatter-jimmy-fontaine.jpg",raw)
        except Exception as e:
            print("LP_MIRROR_FAIL",page_url,repr(e))
    raise RuntimeError("no >=1920 Jimmy Fontaine press mirror available")

def ticket_url():
    d=json.loads(get("https://music98.news/api/concerts?artist=LISA&nocache="+str(time.time_ns())))
    rows=[]
    for e in d.get("events") or []:
        if str(e.get("city") or "").lower()!="las vegas": continue
        if str(e.get("date") or "") not in {"2026-11-12","2026-11-13","2026-11-14","2026-11-27","2026-11-28","2026-11-29"}: continue
        rows += [str(e.get("url") or "")] + [str(x.get("url") or "") for x in (e.get("ticketOptions") or []) if isinstance(x,dict)]
    rows=[u for u in rows if "ticketmaster.evyy.net/c/4932692/" in u]
    if not rows: raise RuntimeError("Impact 4932692 LISA ticket URL not found")
    print("TICKET",rows[0])
    return rows[0]

def write(pid, rec):
    def mutate(posts):
        p=next((x for x in posts if str(x.get("id"))==pid),None)
        if p and (p.get("status") or "live")!="draft": raise RuntimeError("non-draft "+pid)
        if p is None: posts.insert(0,copy.deepcopy(rec)); return posts[0]
        p.clear(); p.update(copy.deepcopy(rec)); return p
    p=runner.guarded_write(mutate)
    ok,lines=runner.run_gate(pid,quiet=False)
    for line in lines:
        if "PASS" in line or "FAIL" in line or line.lstrip().startswith(("X ","! ")): print(line)
    if not ok: raise RuntimeError("gate failed "+pid)
    print("DRAFT_OK",pid,len((p.get("body") or "").split()))

def remove_leon():
    def mutate(posts):
        p=next((x for x in posts if str(x.get("id"))==OLD_LEON_ID),None)
        if not p: return {"removed":False}
        if (p.get("status") or "live")!="draft": raise RuntimeError("Leon is not draft")
        posts[:]=[x for x in posts if str(x.get("id"))!=OLD_LEON_ID]
        return {"removed":True}
    print("OLD_LEON",runner.guarded_write(mutate))

def main():
    runner.load_env()
    lisa={
      "id":LISA_ID,"type":"news","tag":"News","artist":"LISA",
      "title":"LISA Adds Two Shows to Her Sold-Out Las Vegas Residency",
      "excerpt":"LISA has added two shows to her sold-out VIVA LA LISA residency at The Colosseum at Caesars Palace, expanding the November run from four dates to six.",
      "body":LISA_BODY.replace("__TICKET__",ticket_url()),"date":"2026-09-30","status":"draft","pinned":False,
      "cover":{"kind":"img","src":lisa_photo(),"credit":"Caesars Entertainment and LLOUD","creditUrl":"https://newsroom.caesars.com/press-releases/press-release-details/2026/LISA-ADDS-TWO-NEW-DATES-TO-HER-SOLD-OUT-LAS-VEGAS-RESIDENCY-DUE-TO-OVERWHEMING-DEMAND-VIVA-LA-LISA-AT-THE-COLOSSEUM-AT-CAESARS-PALACE--NOV-12-13-14-27-28--29-2026--2026-eGkXjvCgqE/default.aspx","pos":"50% 38%","zoom":1,"cardX":.5,"cardY":.5,"cardZoom":1}
    }
    write(LISA_ID,lisa)
    lp={
      "id":LP_ID,"type":"release","tag":"New Release","artist":"LINKIN PARK",
      "title":"UNSHATTER Film Soundtrack (Live in São Paulo)",
      "excerpt":"LINKIN PARK have released *UNSHATTER Film Soundtrack (Live in São Paulo)*, a 20-track live companion to the band's new documentary.",
      "body":LP_BODY,"date":"2026-09-30","status":"draft","pinned":False,
      "cover":{"kind":"img","src":lp_photo(),"credit":"Jimmy Fontaine","creditUrl":"https://www.jimmyfontaine.com/","pos":"50% 48%","zoom":1,"cardX":.5,"cardY":.48,"cardZoom":1.22}
    }
    write(LP_ID,lp)

    # Final deterministic QA after both writes. This is separate from the
    # editorial read: it catches state/media/link regressions before review.
    final={str(p.get("id")):p for p in runner.desk_read()["posts"]}
    lisa_now=final.get(LISA_ID)
    lp_now=final.get(LP_ID)
    if not lisa_now or not lp_now:
        raise RuntimeError("final pair missing from Desk")
    if lisa_now.get("status")!="draft" or lp_now.get("status")!="draft":
        raise RuntimeError("final pair must remain draft")
    if lisa_now.get("artist")!="LISA" or lp_now.get("artist")!="LINKIN PARK":
        raise RuntimeError("final pair artist mismatch")
    lisa_body=str(lisa_now.get("body") or "")
    lp_body=str(lp_now.get("body") or "")
    if lisa_body.count("[youtube:")!=1 or "[youtube:FMX98ROVRCE]" not in lisa_body or "[apple:" in lisa_body:
        raise RuntimeError("LISA media contract failed")
    if lp_body.count("[youtube:")!=1 or "[youtube:zNYsw-cW8v8]" not in lp_body or "[apple:" in lp_body:
        raise RuntimeError("LINKIN PARK media contract failed")
    if "ticketmaster.evyy.net/c/4932692/" not in lisa_body:
        raise RuntimeError("LISA affiliate ticket link missing")
    if len(lisa_body.split())<380 or len(lp_body.split())<350:
        raise RuntimeError("final pair below editorial length floor")
    for pass_no in (1,2,3):
        for pid in (LISA_ID,LP_ID):
            ok, lines=runner.run_gate(pid,quiet=True)
            print("QA_GATE",pass_no,pid,"PASS" if ok else "FAIL")
            for line in lines:
                if "PASS" in line or "FAIL" in line or line.lstrip().startswith(("X ","! ")):
                    print(line)
            if not ok:
                raise RuntimeError(f"QA gate pass {pass_no} failed for {pid}")
    print("FINAL_PAIR_OK",LISA_ID,len(lisa_body.split()),LP_ID,len(lp_body.split()))

if __name__=="__main__": main()
