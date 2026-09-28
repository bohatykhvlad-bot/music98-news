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


taylor_all=collect_candidates(lambda cap: "taylor swift" in cap, limit=24)
contact_sheet("TAYLOR_ALL",taylor_all)
madonna_all=collect_candidates(lambda cap: "madonna" in cap, limit=24)
contact_sheet("MADONNA_ALL",madonna_all)


def lookup_key(want):
    for pageurl,page in docs:
        for m in re.finditer(r"<li id=['\"]photo-([^'\"]+)['\"][^>]*>([\s\S]*?)</li>",page,re.I):
            if m.group(1)!=want:
                continue
            block=m.group(2)
            capm=re.search(r"<dd class=['\"]photo-caption['\"]>([\s\S]*?)</dd>",block,re.I)
            cap=re.sub("<[^>]+>","",html.unescape(capm.group(1))).strip() if capm else ""
            fnm=re.search(r"<dd class=['\"]photo-filename['\"]>([^<]+)",block,re.I)
            deturl="https://www.paramountpressexpress.com/mtv/shows/2026-mtv-video-music-awards-vmas/photos/?view="+want
            det=urllib.request.urlopen(urllib.request.Request(deturl,headers={"User-Agent":UA}),timeout=90).read().decode("utf-8","replace")
            emb=re.search(r"https://public-assets-pressexpress\.s3\.amazonaws\.com/assets/photos/embed/[^\"'<> ]+",html.unescape(det))
            return (want, fnm.group(1).strip() if fnm else "", emb.group(0) if emb else "", cap, deturl)
    raise RuntimeError("key not found "+want)

def render_169(item, fx, fy, zoom=1.0, size=(640,360)):
    key,fn,url,cap,deturl=item
    raw=urllib.request.urlopen(urllib.request.Request(url,headers={"User-Agent":UA}),timeout=90).read()
    im=Image.open(io.BytesIO(raw)).convert("RGB")
    sw,sh=size; iw,ih=im.size
    base=max(sw/iw,sh/ih)*zoom
    dw=max(1,round(iw*base)); dh=max(1,round(ih*base))
    im=im.resize((dw,dh),Image.Resampling.LANCZOS)
    left=sw/2-fx*dw; top=sh/2-fy*dh
    left=min(0,max(sw-dw,left)); top=min(0,max(sh-dh,top))
    canvas=Image.new("RGB",(sw,sh),"black")
    canvas.paste(im,(round(left),round(top)))
    return canvas

crop_specs=[
    ("HERO 45%", "69c1ac19ff", .50,.45,1.0),
    ("HERO 50%", "69c1ac19ff", .50,.50,1.0),
    ("TAYLOR 22%", "dded7f7e94", .50,.22,1.0),
    ("TAYLOR 25%", "dded7f7e94", .50,.25,1.0),
    ("TAYLOR 28%", "dded7f7e94", .50,.28,1.0),
    ("TAYLOR 31%", "dded7f7e94", .50,.31,1.0),
    ("SIENNA 45%", "3f54be88ed", .50,.45,1.0),
    ("SIENNA 50%", "3f54be88ed", .50,.50,1.0),
    ("LISA 48%", "932c1f928d", .50,.48,1.0),
    ("LISA 54%", "932c1f928d", .50,.54,1.0),
    ("LISA 60%", "932c1f928d", .50,.60,1.0),
    ("NIRVANA 44%", "b3e87895ab", .50,.44,1.0),
    ("NIRVANA 50%", "b3e87895ab", .50,.50,1.0),
    ("NIRVANA 56%", "b3e87895ab", .50,.56,1.0),
]
previews=[]
for lab,key,fx,fy,z in crop_specs:
    try:
        item=lookup_key(key)
        previews.append((lab,render_169(item,fx,fy,z)))
    except Exception as e:
        print("CROP_QC_ERROR",lab,key,repr(e))
cw,ch=660,405
cols=2; rows=(len(previews)+1)//2
sheet=Image.new("RGB",(cw*cols,ch*rows),"white")
draw=ImageDraw.Draw(sheet)
for i,(lab,im) in enumerate(previews):
    x=(i%cols)*cw+10; y=(i//cols)*ch+10
    sheet.paste(im,(x,y))
    draw.text((x,y+365),lab,fill="black")
buf=io.BytesIO(); sheet.save(buf,"JPEG",quality=70,optimize=True)
print("CONTACT_SHEET CROP_QC",len(previews),base64.b64encode(buf.getvalue()).decode("ascii"))


nirvana_all=collect_candidates(
    lambda cap: ("dave grohl" in cap or "krist novoselic" in cap or "pat smear" in cap or "nirvana" in cap),
    limit=24,
)
contact_sheet("NIRVANA_ALL",nirvana_all)


final_specs=[
    ("HERO", "69c1ac19ff", .50,.45,1.0),
    ("TAYLOR INLINE", "dded7f7e94", .50,.25,1.0),
    ("SIENNA INLINE", "3f54be88ed", .50,.45,1.0),
    ("LISA INLINE", "932c1f928d", .50,.54,1.0),
    ("NIRVANA INLINE", "2f1e0f8fc4", .50,.50,1.0),
]
final_previews=[]
for lab,key,fx,fy,z in final_specs:
    item=lookup_key(key)
    final_previews.append((lab,render_169(item,fx,fy,z)))
cw,ch=660,405
sheet=Image.new("RGB",(cw, ch*len(final_previews)),"white")
draw=ImageDraw.Draw(sheet)
for i,(lab,im) in enumerate(final_previews):
    x=10; y=i*ch+10
    sheet.paste(im,(x,y))
    draw.text((x,y+365),lab,fill="black")
buf=io.BytesIO(); sheet.save(buf,"JPEG",quality=76,optimize=True)
print("CONTACT_SHEET FINAL_CROP_QC",len(final_previews),base64.b64encode(buf.getvalue()).decode("ascii"))
