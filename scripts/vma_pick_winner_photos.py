#!/usr/bin/env python3
import re, html, urllib.request
UA="Mozilla/5.0"
pages=[
  "https://www.paramountpressexpress.com/cbs-entertainment/photos/download-highres?id=91603&limit=100&page=1",
  "https://www.paramountpressexpress.com/cbs-entertainment/photos/download-webres?id=142100&limit=100&page=1",
  "https://www.paramountpressexpress.com/mtv/shows/2026-mtv-video-music-awards-vmas/photos?limit=500&page=1",
]
targets=["3228388_VMAS_2026_2881b.jpg","3244981_VMAS_2026_4001b.jpg","3244981_VMAS_2026_3835b.jpg","3244981_VMAS_2026_4278b.jpg","3244981_VMAS_2026_3905b.jpg"]
docs=[]
for u in pages:
    raw=urllib.request.urlopen(urllib.request.Request(u,headers={"User-Agent":UA}),timeout=90).read().decode("utf-8","replace")
    docs.append((u,raw))
for fn in targets:
    print("TARGET",fn)
    found=False
    for pageurl,page in docs:
        for m in re.finditer(r"<li id=['\"]photo-([^'\"]+)['\"][^>]*>([\s\S]*?)</li>",page,re.I):
            key=m.group(1); block=m.group(2)
            if fn not in block: continue
            cap=re.search(r"<dd class=['\"]photo-caption['\"]>([\s\S]*?)</dd>",block,re.I)
            deturl="https://www.paramountpressexpress.com/mtv/shows/2026-mtv-video-music-awards-vmas/photos/?view="+key
            det=urllib.request.urlopen(urllib.request.Request(deturl,headers={"User-Agent":UA}),timeout=90).read().decode("utf-8","replace")
            emb=re.search(r"https://public-assets-pressexpress\.s3\.amazonaws\.com/assets/photos/embed/[^\"'<> ]+",html.unescape(det))
            print("PAGE",pageurl)
            print("KEY",key)
            print("DETAIL",deturl)
            print("EMBED",emb.group(0) if emb else "")
            print("CAPTION",re.sub("<[^>]+>","",html.unescape(cap.group(1))) if cap else "")
            found=True
            break
        if found: break
    if not found: print("NOT_FOUND")


print("=== SIENNA_CANDIDATES ===")
seen=set()
for pageurl,page in docs:
    for m in re.finditer(r"<li id=['\"]photo-([^'\"]+)['\"][^>]*>([\s\S]*?)</li>",page,re.I):
        key=m.group(1); block=m.group(2)
        plain=html.unescape(block)
        if "sienna spiro" not in plain.lower() or key in seen:
            continue
        seen.add(key)
        fnm=re.search(r"<dd class=['\"]photo-filename['\"]>([^<]+)",block,re.I)
        cap=re.search(r"<dd class=['\"]photo-caption['\"]>([\s\S]*?)</dd>",block,re.I)
        deturl="https://www.paramountpressexpress.com/mtv/shows/2026-mtv-video-music-awards-vmas/photos/?view="+key
        det=urllib.request.urlopen(urllib.request.Request(deturl,headers={"User-Agent":UA}),timeout=90).read().decode("utf-8","replace")
        emb=re.search(r"https://public-assets-pressexpress\.s3\.amazonaws\.com/assets/photos/embed/[^\"'<> ]+",html.unescape(det))
        print("SIENNA",key,fnm.group(1) if fnm else "")
        print("DETAIL",deturl)
        print("EMBED",emb.group(0) if emb else "")
        print("CAPTION",re.sub("<[^>]+>","",html.unescape(cap.group(1))) if cap else "")


# Visual-QC contact sheets for editorial review in chat.
import base64, io
from PIL import Image, ImageDraw, ImageFont

def collect_candidates(predicate, limit=24):
    out=[]
    seen=set()
    for pageurl,page in docs:
        for m in re.finditer(r"<li id=['\"]photo-([^'\"]+)['\"][^>]*>([\s\S]*?)</li>",page,re.I):
            key=m.group(1); block=m.group(2)
            if key in seen:
                continue
            capm=re.search(r"<dd class=['\"]photo-caption['\"]>([\s\S]*?)</dd>",block,re.I)
            cap=re.sub("<[^>]+>","",html.unescape(capm.group(1))).strip() if capm else ""
            if not predicate(cap.lower()):
                continue
            fnm=re.search(r"<dd class=['\"]photo-filename['\"]>([^<]+)",block,re.I)
            deturl="https://www.paramountpressexpress.com/mtv/shows/2026-mtv-video-music-awards-vmas/photos/?view="+key
            det=urllib.request.urlopen(urllib.request.Request(deturl,headers={"User-Agent":UA}),timeout=90).read().decode("utf-8","replace")
            emb=re.search(r"https://public-assets-pressexpress\.s3\.amazonaws\.com/assets/photos/embed/[^\"'<> ]+",html.unescape(det))
            if not emb:
                continue
            seen.add(key)
            out.append((key, fnm.group(1).strip() if fnm else "", emb.group(0), cap, deturl))
            if len(out)>=limit:
                return out
    return out

def contact_sheet(label, items, cols=4):
    tw, th = 320, 230
    rows=(len(items)+cols-1)//cols
    sheet=Image.new("RGB",(tw*cols,th*rows),"white")
    draw=ImageDraw.Draw(sheet)
    for idx,(key,fn,url,cap,deturl) in enumerate(items):
        try:
            raw=urllib.request.urlopen(urllib.request.Request(url,headers={"User-Agent":UA}),timeout=90).read()
            im=Image.open(io.BytesIO(raw)).convert("RGB")
            im.thumbnail((tw,180))
            x=(idx%cols)*tw+(tw-im.width)//2
            y=(idx//cols)*th
            sheet.paste(im,(x,y))
            draw.text(((idx%cols)*tw+6,y+184),f"{idx+1}. {key} {fn[:24]}",fill="black")
            draw.text(((idx%cols)*tw+6,y+202),cap[:44],fill="black")
        except Exception as e:
            draw.text(((idx%cols)*tw+8,(idx//cols)*th+20),f"ERR {key}: {e}",fill="black")
    buf=io.BytesIO()
    sheet.save(buf,"JPEG",quality=62,optimize=True)
    print("CONTACT_SHEET",label,len(items),base64.b64encode(buf.getvalue()).decode("ascii"))
    for idx,item in enumerate(items,1):
        key,fn,url,cap,deturl=item
        print("CONTACT_ITEM",label,idx,key,fn,deturl,cap)

sienna_items=collect_candidates(lambda cap: "sienna spiro" in cap, limit=24)
contact_sheet("SIENNA",sienna_items)

hero_items=collect_candidates(
    lambda cap: (
        ("taylor swift" in cap and ("win" in cap or "video of the year" in cap or "madonna" in cap))
        or ("madonna" in cap and ("win" in cap or "artist of the year" in cap or "taylor swift" in cap))
    ),
    limit=24,
)
contact_sheet("HERO",hero_items)
