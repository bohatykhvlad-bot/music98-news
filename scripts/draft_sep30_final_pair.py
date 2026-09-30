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
LISA_PHOTO="https://cdn-p.smehost.net/sites/5b3bac59eb36401694af3a241173447f/wp-content/uploads/2026/09/lisa-foto-de-promocion-de-su-nuevo-single-sawadika-1788514207.jpg"
LP_PHOTO="https://press.warnerrecords.com/sites/g/files/g2000014901/files/styles/artist_detail/public/2025-12/Linkin_Park_2_20_2535788%20M1A%20copy%20%281%29%20%281%29.jpg?itok=IxzVedtC"
LISA_MIRROR_PAGE="https://deepcut.gr/lisa-sawadika/91638/"
LP_MIRRORS=["https://www.visions.de/news/linkin-park-eroeffnungsauftritt-beim-uefa-champions-league-finale/","https://www.musikexpress.de/linkin-park-neue-single-unshatter-ist-da-3013217/"]

LISA_BODY='''LISA has added two shows to VIVA LA LISA at The Colosseum at Caesars Palace, taking the November residency from four dates to six. The new performances are November 12 and 29. They join the previously announced shows on November 13, 14, 27 and 28. Caesars says the original four dates sold out in under 10 minutes.

The residency will still run across two weekends. LISA now plays November 12 through 14, then returns for November 27 through 29. All six shows are at the 4,300-seat Colosseum. General sale for the added dates begins September 30. Caesars is billing VIVA LA LISA as the first Las Vegas residency by a K-pop artist.

[tickets:__TICKET__]

The new dates arrive while LISA is promoting *PRESS PLAY*, her six-track EP due October 23 through LLOUD Co. and RCA Records. Its first single, "SaWaDiKa," was released in September. The video was directed by Bang Jae Yeob and filmed in Bangkok. Caesars says it drew 70.8 million views in its first 24 hours. LISA also performed the song at the 2026 MTV Video Music Awards.

"Dream" gives the article a second piece of current solo context without repeating the same song in two formats. The track won Best Pop at the 2026 VMAs, and LLOUD released an official short film starring LISA and Kentaro Sakaguchi. That video is included below as the post's only media block.

[youtube:FMX98ROVRCE]

*PRESS PLAY* is scheduled for October 23, less than three weeks before the first Las Vegas show. That means the residency will open after the EP is already out, rather than relying only on material from *Alter Ego* and earlier solo releases. The added dates also leave the format unchanged. VIVA LA LISA remains a limited six-show run in one venue, spread over two November weekends.

The expansion is straightforward. Four shows sold out, two more were added, and the venue stayed the same. For fans trying to see the residency, the new inventory is concentrated at the beginning and end of the run, on November 12 and 29.'''

LP_BODY='''LINKIN PARK have released *UNSHATTER Film Soundtrack (Live in São Paulo)*, the live album that accompanies the band's new *UNSHATTER* film. The soundtrack arrived September 25 through Warner Records and documents the São Paulo concert connected to the *FROM ZERO* release period.

The CD and digital edition run to 20 tracks. Four of those are short intro or interlude pieces, leaving 16 full performances. The vinyl edition lists those 16 songs without the four interludes. The set moves from "Somewhere I Belong" and "Waiting for the End" to newer material including "The Emptiness Machine," "Casualty," "Two Faced" and "Heavy Is the Crown." It closes with "Bleed It Out."

According to the band's official store, *UNSHATTER* follows LINKIN PARK from private studio sessions in 2022 through the making and release of *FROM ZERO* and the São Paulo concert. The film combines archive material, live footage and interviews with band members and fans. The soundtrack also includes recordings that are not heard in the film.

"Faint" was released ahead of the full soundtrack with an official live video from São Paulo. It is one of the clearest examples of what this release is for. The performance keeps the song in its familiar live arrangement while documenting the current lineup in front of the Brazilian crowd.

[youtube:zNYsw-cW8v8]

The physical editions keep the focus on the concert. The CD comes in a gatefold softpak with a 12-panel accordion booklet. The two-LP Citrus vinyl edition comes in a gatefold jacket with a 12-by-24-inch insert. Warner also lists other vinyl variants through the official LINKIN PARK store.

The release is more specific than a general live compilation. Every full song comes from the São Paulo show, and the track list deliberately mixes *FROM ZERO* material with older staples. For listeners following the band's return, it puts the same performance documented in *UNSHATTER* into a standalone album rather than reducing the project to clips from the film.'''

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
    try:
        return upload("lisa-sawadika-wontae-go.jpg",get(LISA_PHOTO,"https://www.sonymusic.es/actualidad/lisa-sawadika-nuevo-single-adelanto-ep-press-play/"))
    except Exception as direct:
        print("LISA_SONY_DIRECT_BLOCKED",repr(direct))
    page=html_bytes(LISA_MIRROR_PAGE).decode("utf-8","replace")
    m=re.search(r'<meta[^>]+(?:property|name)=["\\']og:image["\\'][^>]+content=["\\']([^"\\']+)',page,re.I)
    if not m:
        m=re.search(r'<meta[^>]+content=["\\']([^"\\']+)["\\'][^>]+(?:property|name)=["\\']og:image["\\']',page,re.I)
    if not m:
        raise RuntimeError("LISA promo mirror has no og:image")
    img=html.unescape(m.group(1))
    raw=get(img,LISA_MIRROR_PAGE)
    with Image.open(io.BytesIO(raw)) as probe:
        print("LISA_MIRROR_QC",img,probe.size,probe.format)
        if max(probe.size)<1920:
            raise RuntimeError("LISA Wontae Go mirror below 1920")
    return upload("lisa-sawadika-wontae-go.jpg",raw)

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
      "cover":{"kind":"img","src":lisa_photo(),"credit":"Wontae Go","creditUrl":"https://www.lloud.co/","pos":"50% 44%","zoom":1,"cardX":.5,"cardY":.44,"cardZoom":1.15}
    }
    write(LISA_ID,lisa)
    lp={
      "id":LP_ID,"type":"release","tag":"New Release","artist":"LINKIN PARK",
      "title":"UNSHATTER Film Soundtrack (Live in São Paulo)",
      "excerpt":"LINKIN PARK have released *UNSHATTER Film Soundtrack (Live in São Paulo)*, a 20-track live companion to the band's new documentary.",
      "body":LP_BODY,"date":"2026-09-30","status":"draft","pinned":False,
      "cover":{"kind":"img","src":lp_photo(),"credit":"Jimmy Fontaine","creditUrl":"https://www.jimmyfontaine.com/","pos":"50% 50%","zoom":1,"cardX":.5,"cardY":.5,"cardZoom":1}
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
