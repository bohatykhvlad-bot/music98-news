#!/usr/bin/env python3
from __future__ import annotations
import base64, copy, io, json, sys, time, urllib.request, http.cookiejar, re, html
from pathlib import Path
from PIL import Image
import gdown
sys.path.insert(0, str(Path(__file__).resolve().parent))
import post as runner

PHOTO_API="https://music98.news/api/photo"
# Final pair sources rechecked 2026-09-30.
LISA_ID="lisa26vegas"
LP_ID="auleon930r1"
OLD_LEON_ID="auleon930r1"
LISA_PHOTO="https://cdn-p.smehost.net/sites/5b3bac59eb36401694af3a241173447f/wp-content/uploads/2026/09/lisa-foto-de-promocion-de-su-nuevo-single-sawadika-1788514207.jpg"
LISA_FUR_URL="https://s1.ticketm.net/dam/a/b6e/7eaa3ca1-d027-492e-a3bb-87f718f4db6e_TABLET_LANDSCAPE_LARGE_16_9.jpg"
LP_PHOTO="https://press.warnerrecords.com/sites/g/files/g2000014901/files/styles/artist_detail/public/2025-12/Linkin_Park_2_20_2535788%20M1A%20copy%20%281%29%20%281%29.jpg?itok=IxzVedtC"
LISA_FILESTACK_ORIGINAL="https://cdn.filestackcontent.com/R6COV2mESXGIYm9c5pBc"
LISA_MIRRORS=[
    "https://ca.rollingstone.com/music/lisa-sawadika-single-press-play-ep/",
    "https://www.bandwagon.asia/articles/blackpink-s-lisa-returns-to-bangkok-for-vibrant-sawadika-music-video-watch",
    "https://themusicuniverse.com/lisa-releases-sawadika/",
]
LP_MIRRORS=["https://www.visions.de/news/linkin-park-eroeffnungsauftritt-beim-uefa-champions-league-finale/","https://www.musikexpress.de/linkin-park-neue-single-unshatter-ist-da-3013217/"]

LISA_BODY='''LISA has added two shows to VIVA LA LISA at The Colosseum at Caesars Palace, taking the November residency from four dates to six. The new performances are November 12 and 29. They join the previously announced shows on November 13, 14, 27 and 28. Caesars says the original four dates sold out in under 10 minutes.

The residency will still run across two weekends. LISA now plays November 12 through 14, then returns for November 27 through 29. All six shows are at the 4,300-seat Colosseum. General sale for the added dates begins September 30. Caesars is billing VIVA LA LISA as the first Las Vegas residency by a K-pop artist.

[tickets:__TICKET__]

The extra dates arrive as LISA begins the campaign for *PRESS PLAY*, her new EP due October 23 through LLOUD Co. and RCA Records. Its first single, "SaWaDiKa," was released on September 4. Produced by Thom Bridges and Ojivolta, the song takes its name from the Thai greeting for "hello." Sony's store lists *PRESS PLAY* as a six-track EP, with "SaWaDiKa" followed by five titles that have not yet been revealed.

The "SaWaDiKa" video was directed by Bang Jae Yeob and filmed in Bangkok. LISA moves through several locations in the city, with Thai references built into the sets, styling and choreography. Caesars says it drew 70.8 million views in its first 24 hours, and LISA later performed the song at the 2026 MTV Video Music Awards. At the same show, "Dream feat. Kentaro Sakaguchi" won Best Pop. "Dream" appeared on *Alter Ego*, and LLOUD later released an official short film for the song starring LISA and Sakaguchi.

[youtube:FMX98ROVRCE]

*PRESS PLAY* arrives 20 days before the first Las Vegas show, so the EP will already be out when VIVA LA LISA opens. When Caesars first announced the residency in March, it followed LISA's 2025 album *Alter Ego*, which debuted at No. 1 on Billboard's Top Album Sales chart and No. 7 on the Billboard 200. The new EP now sits directly between that album cycle and the November residency.

The added shows do not change the venue or the two-weekend format. November 12 now opens the first weekend and November 29 closes the second, while the four original dates remain unchanged. VIVA LA LISA remains a limited six-show run at The Colosseum, with three performances on each weekend.'''

LP_BODY='''LINKIN PARK have released *UNSHATTER Film Soundtrack (Live in São Paulo)*, the live album that accompanies the band's new *UNSHATTER* film. The soundtrack arrived September 25 through Warner Records and documents the São Paulo concert tied to the *FROM ZERO* release period. It is also available digitally alongside the physical editions.

The CD contains 20 tracks. Four are brief pieces called "Inception," "Creation," "Break Collapse" and "Resolution." That leaves 16 full songs. The two-LP edition drops those four pieces and carries only the full performances. The set includes "Somewhere I Belong," "The Catalyst," "Waiting for the End," "What I've Done," "Numb," "In the End," "Faint" and "Papercut." *FROM ZERO* material appears throughout the same show, including "The Emptiness Machine," "Casualty," "Two Faced," "Over Each Other" and "Heavy Is the Crown." "Bleed It Out" closes the record.

According to the band's official store, *UNSHATTER* follows LINKIN PARK from private studio sessions in 2022 through the making and release of *FROM ZERO* and the São Paulo concert. The film uses rare vault footage, performances from sold-out shows and interviews with band members and fans. It also covers the period in which Emily Armstrong and Colin Brittain joined the group after its seven-year hiatus. The store says the soundtrack contains live recordings that are not heard in the documentary, so the album keeps more of the São Paulo show than appears onscreen. The live version of "Faint" arrived ahead of the soundtrack with an official video from the same concert.

[youtube:zNYsw-cW8v8]

The physical editions differ slightly. The CD comes in a gatefold softpak with a 12-panel accordion booklet and keeps all 20 tracks, including the four short interludes. The two-LP Citrus vinyl edition is housed in a gatefold jacket with a 12-by-24-inch insert and carries the 16 full songs. Other vinyl variants are also available through the official LINKIN PARK store.

All 16 full performances come from the same São Paulo concert rather than different tours or venues. The sequence puts *FROM ZERO* songs beside older catalog staples, so the soundtrack works as a record of one specific show while still covering several eras of the band's music.'''

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
    raw=get(LISA_FUR_URL,"https://www.livenation.com/event/1Ad0Z_6Gkmx6wSv/viva-la-lisa")
    with Image.open(io.BytesIO(raw)) as probe:
        print("LISA_FUR_QC",probe.size,probe.format)
        if max(probe.size)<1920:
            raise RuntimeError("LISA Live Nation VIVA LA LISA promo below 1920px")
    return upload("lisa-viva-la-lisa-live-nation-2026.jpg",raw)

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
    runner.guarded_write(mutate)

    # Cloudflare KV can be briefly eventually consistent across edges. Do not
    # gate an older draft after a successful write; wait until the exact body,
    # excerpt and credit from this run are observable.
    p=None
    for attempt in range(12):
        desk=runner.http(runner.DESK_API+"?nocache="+str(time.time_ns()),runner.desk_key())
        p=next((x for x in desk.get("posts",[]) if str(x.get("id"))==pid),None)
        if (p and p.get("body")==rec.get("body")
                and p.get("excerpt")==rec.get("excerpt")
                and (p.get("cover") or {}).get("credit")==((rec.get("cover") or {}).get("credit"))
                and p.get("status")=="draft"):
            break
        print("DESK_PROPAGATION_WAIT",pid,attempt+1)
        time.sleep(2)
    else:
        raise RuntimeError("updated draft did not propagate: "+pid)

    ok=False
    lines=[]
    for gate_attempt in range(6):
        ok,lines=runner.run_gate(pid,quiet=False)
        if ok: break
        print("GATE_PROPAGATION_RETRY",pid,gate_attempt+1)
        time.sleep(2)
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
      "excerpt":"LISA has added two shows to VIVA LA LISA at The Colosseum at Caesars Palace, taking the November residency from four dates to six.",
      "body":LISA_BODY.replace("__TICKET__",ticket_url()),"date":"2026-09-30","status":"draft","pinned":False,
      "cover":{"kind":"img","src":lisa_photo(),"credit":"Courtesy of LLOUD","creditUrl":"https://www.lloud.co/","pos":"50% 46%","zoom":1,"cardX":.50,"cardY":.45,"cardZoom":1}
    }
    write(LISA_ID,lisa)
    lp={
      "id":LP_ID,"type":"release","tag":"New Release","artist":"LINKIN PARK",
      "title":"UNSHATTER Film Soundtrack (Live in São Paulo)",
      "excerpt":"LINKIN PARK have released *UNSHATTER Film Soundtrack (Live in São Paulo)*, the live album that accompanies the band's new *UNSHATTER* film.",
      "body":LP_BODY,"date":"2026-09-30","status":"draft","pinned":False,
      "cover":{"kind":"img","src":lp_photo(),"credit":"Jimmy Fontaine","creditUrl":"https://www.jimmyfontaine.com/","pos":"50% 50%","zoom":1,"cardX":.40,"cardY":.50,"cardZoom":1}
    }
    write(LP_ID,lp)

    # Final deterministic QA after both writes. This is separate from the
    # editorial read: it catches state/media/link regressions before review.
    final={str(p.get("id")):p for p in runner.http(runner.DESK_API+"?nocache="+str(time.time_ns()),runner.desk_key())["posts"]}
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
    for pid, body in ((LISA_ID,lisa_body),(LP_ID,lp_body)):
        prose="\n".join(line for line in body.splitlines() if not line.strip().startswith("["))
        if ":" in prose:
            raise RuntimeError("VISIBLE_COLON_QA failed for "+pid)
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
