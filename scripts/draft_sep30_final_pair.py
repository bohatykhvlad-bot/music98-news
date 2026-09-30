#!/usr/bin/env python3
from __future__ import annotations
import base64, copy, io, json, sys, time, urllib.request
from pathlib import Path
from PIL import Image
import gdown
sys.path.insert(0, str(Path(__file__).resolve().parent))
import post as runner

PHOTO_API="https://music98.news/api/photo"
LISA_ID="lisa26vegas"
LP_ID="aulp930r1"
OLD_LEON_ID="auleon930r1"
LISA_PHOTO="https://cdn-p.smehost.net/sites/5b3bac59eb36401694af3a241173447f/wp-content/uploads/2026/09/lisa-foto-de-promocion-de-su-nuevo-single-sawadika-1788514207.jpg"
LP_PHOTO="https://press.warnerrecords.com/sites/g/files/g2000014901/files/2025-12/Linkin_Park_2_20_2535788%20M1A%20copy%20%281%29%20%281%29.jpg"

LISA_BODY='''LISA has added two shows to her sold-out VIVA LA LISA residency at The Colosseum at Caesars Palace, expanding the November run from four dates to six. The new performances are scheduled for November 12 and 29, joining previously announced shows on November 13, 14, 27 and 28. Caesars says the original four dates sold out in under 10 minutes, and general sale for the two added performances begins September 30.

The residency remains concentrated across two weekends rather than becoming a longer Vegas season. The complete schedule is November 12-14 and November 27-29, all at the 4,300-seat Colosseum. Caesars is billing VIVA LA LISA as the first Las Vegas residency by a K-pop artist. The two additions preserve the original structure: one extra performance now opens the first weekend, while another closes the second.

[tickets:__TICKET__]

The announcement lands in the middle of LISA's current solo campaign. "SaWaDiKa," released through LLOUD Co. and RCA Records, is the first single from her seven-song EP *PRESS PLAY*, due October 23. The video was filmed in Bangkok and, according to Caesars, drew 70.8 million views in its first 24 hours. The official clip puts LISA's Thai roots at the center of the rollout rather than treating them as background to a generic pop campaign.

[youtube:FyS5dAywkEo]

[apple:song:6804002989:6804002992]

LISA also brought "SaWaDiKa" to the 2026 MTV Video Music Awards for its first televised performance. The same night, "Dream" won Best Pop. By the time the residency opens in November, *PRESS PLAY* will have been out for several weeks, giving the show new material alongside songs from *Alter Ego*, her 2025 debut solo album.

The Vegas run follows another unusually active stretch. BLACKPINK completed the DEADLINE World Tour, while LISA continued building a separate solo schedule across music and screen work. Her documentary *Always Lalisa*, directed by Sue Kim, premiered at the Toronto International Film Festival and is set for a worldwide cinema release on October 12. That places the film, the EP and the residency within a compact fall campaign.

The demand around VIVA LA LISA is unusually easy to measure: four announced shows sold out in under 10 minutes, then two more were added before opening night without changing the venue or limited-run format. The November 12 and 29 additions bring the residency to six performances in total.'''

LP_BODY='''LINKIN PARK have released *UNSHATTER Film Soundtrack (Live in São Paulo)*, a 20-track live companion to the band's new documentary. The Warner Records release arrived September 25, five days before *UNSHATTER* opens in theaters worldwide for a limited run. The album captures the band's November 2024 *FROM ZERO* release show in São Paulo and stretches across material from multiple eras of the catalog.

The soundtrack is built around the current LINKIN PARK lineup with Mike Shinoda and Emily Armstrong sharing the vocal center of the set. Its sequence moves between *FROM ZERO* material and established songs including "Somewhere I Belong," "Waiting for the End," "What I've Done," "Numb," "In the End," "Faint," "Papercut" and "Bleed It Out." Newer songs such as "The Emptiness Machine," "Two Faced" and "Heavy Is the Crown" sit beside them rather than being isolated in a separate section.

[apple:album:6794460856]

That structure mirrors the film's larger subject. Directed by Joe Hahn, *UNSHATTER* follows the group from private studio sessions in 2022 through the process that led to the band's return, the arrival of Armstrong and drummer-producer Colin Brittain, the *FROM ZERO* album and the São Paulo performance. The documentary combines new interviews, studio footage, archive material and concert sequences rather than functioning as a conventional tour film.

[youtube:zNYsw-cW8v8]

The São Paulo recordings give the soundtrack a specific role inside that story. They document the point where songs created during LINKIN PARK's restart met a full live audience, while older material was being performed by a changed lineup. "Faint," one of the performances released ahead of the film, makes that contrast especially direct: the arrangement keeps the song's familiar shape while the vocal handoff reflects the band's current configuration.

The physical editions extend the release beyond streaming, with CD and double-vinyl versions offered through the band's official store. The soundtrack arrives as both a standalone live record and a companion piece to a documentary about how LINKIN PARK rebuilt its working identity after a long hiatus.'''

def get(url):
    req=urllib.request.Request(url,headers={"User-Agent":runner.UA})
    with urllib.request.urlopen(req,timeout=60) as r: return r.read()

def upload(name, raw):
    with Image.open(io.BytesIO(raw)) as src:
        if max(src.size)<1920: raise RuntimeError(f"{name} too small: {src.size}")
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
    return upload("lisa-sawadika-2026-sony.jpg",get(LISA_PHOTO))

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
      "cover":{"kind":"img","src":lisa_photo(),"credit":"Sony Music","creditUrl":"https://www.sonymusic.es/actualidad/lisa-sawadika-nuevo-single-adelanto-ep-press-play/","pos":"50% 46%","zoom":1,"cardX":.5,"cardY":.5,"cardZoom":1}
    }
    write(LISA_ID,lisa)
    lp={
      "id":LP_ID,"type":"release","tag":"New Release","artist":"LINKIN PARK",
      "title":"UNSHATTER Film Soundtrack (Live in São Paulo)",
      "excerpt":"LINKIN PARK have released *UNSHATTER Film Soundtrack (Live in São Paulo)*, a 20-track live companion to the band's new documentary.",
      "body":LP_BODY,"date":"2026-09-30","status":"draft","pinned":False,
      "cover":{"kind":"img","src":upload("linkin-park-unshatter-jimmy-fontaine.jpg",get(LP_PHOTO)),"credit":"Jimmy Fontaine","creditUrl":"https://press.warnerrecords.com/linkinpark","pos":"50% 48%","zoom":1,"cardX":.5,"cardY":.48,"cardZoom":1.22}
    }
    write(LP_ID,lp)
    remove_leon()

if __name__=="__main__": main()
