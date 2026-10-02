#!/usr/bin/env python3
"""Read-only original image discovery. No draft/desk mutations."""
import urllib.request,re,html,io,base64,subprocess,json
from urllib.parse import urljoin,urlsplit,urlunsplit
from pathlib import Path
from bs4 import BeautifulSoup
from PIL import Image,ImageOps,ImageDraw
SOURCES={
"MusicRow Ella ExitIn Caylee":"https://musicrow.com/2024/11/ella-langley-crushes-two-sold-out-nights-at-exit-in/",
"MusicRow Ella Ryman Caylee":"https://musicrow.com/2025/11/ella-langley-wraps-tour-with-two-sold-out-nights-at-the-ryman/",
"CountryNow CRS Andrew":"https://countrynow.com/crs-2026-new-faces-show-delivers-breakout-moments-from-ella-langley-chase-matthew-more/",
"MusicRow CRS":"https://musicrow.com/2026/03/crs-highlights-six-at-2026-new-faces-of-country-music-showcase/",
"Pollstar Ella":"https://news.pollstar.com/2026/01/30/a-legend-in-the-making-ella-langley-is-a-multi-platinum-award-winning-chart-topper-with-a-major-tour-on-the-horizon/",
"NormaKamali photo":"https://normakamali.com/blogs/featured-press/260207-ella-langley",
}
def get(u):
 req=urllib.request.Request(u,headers={"User-Agent":"Mozilla/5.0","Accept":"image/avif,image/webp,image/apng,image/*,*/*;q=0.8"})
 with urllib.request.urlopen(req,timeout=24) as r:return r.read(),r.headers.get("Content-Type","")
images=[]
for name,url in SOURCES.items():
 try:
  raw,t=get(url);soup=BeautifulSoup(raw,"html.parser")
  print("PAGE",name,len(raw),t,flush=True)
  arr=[]
  for im in soup.find_all("img"):
   alt=im.get("alt","");typ=im.get("title","");cap=" ".join(x.get_text(" ",strip=True)[:140] for x in [im.parent,im.parent.parent] if x)
   related=("ella" in (alt+" "+typ+" "+cap).lower() or any(z in (im.get("src") or "").lower() for z in ("ella","langley","el-","ery","caylee")))
   if name=="NormaKamali photo":related=True
   if not related:continue
   opts=[]
   for v in ("src","data-src","data-lazy-src","data-original","data-full-image"):
    if im.get(v):opts.append(im[v])
   for v in ("srcset","data-srcset"):
    if im.get(v):opts.extend(z.strip().split(" ")[0] for z in im[v].split(","))
   for u in opts:
    u=urljoin(url,html.unescape(u).replace("\\/","/"))
    if not re.search(r"\.(?:jpe?g|webp|png)(?:\?|$)",u,re.I):continue
    # Restore native WP original without thumbnail suffix.
    v=re.sub(r"-\d{2,4}x\d{2,4}(?=\.(?:jpe?g|webp|png)(?:\?|$))","",u,flags=re.I)
    arr.append((v,alt[:100],cap[:110]))
  for meta in soup.select('meta[property="og:image"], meta[name="twitter:image"]'):
   if meta.get("content"): arr.append((urljoin(url,meta["content"]),"og_image",""))
  arr=list({v[0]:v for v in arr}.values())
  print("POSSIBLE",name,len(arr),str(arr[:12])[:2500],flush=True)
  for u,alt,cap in arr[:28]:
   try:
    bb,tt=get(u);img=Image.open(io.BytesIO(bb))
    dim=img.size
    print("CANDIDATE_IMAGE",name,dim,"BYTES",len(bb),"ALT",alt[:80],"URL",u[:280],flush=True)
    if max(dim)>=1900:
     tile=ImageOps.fit(ImageOps.exif_transpose(img).convert("RGB"),(600,350),Image.Resampling.LANCZOS,centering=(.5,.38))
     images.append((name+" "+str(dim)+" "+alt[:53],tile,u,dim))
   except Exception as e:print("PHOTO_FETCH_ERR",name,str(e)[:95],u[:130],flush=True)
 except Exception as e:print("PAGE_ERROR",name,str(e)[:150],flush=True)
if images:
 board=Image.new("RGB",(620,len(images)*380),"white");d=ImageDraw.Draw(board)
 for i,(desc,tile,u,sz) in enumerate(images):
  y=i*380;d.text((7,y+7),desc,fill="black");board.paste(tile,(8,y+25))
 buf=io.BytesIO();board.save(buf,"JPEG",quality=72)
 p=Path(".editorial/ella-hires-candidates-sheet.b64");p.parent.mkdir(exist_ok=True)
 p.write_text(base64.b64encode(buf.getvalue()).decode())
 q=Path(".editorial/ella-hires-candidates-urls.json")
 q.write_text(json.dumps([{"name":a,"url":u,"size":size} for a,_,u,size in images],indent=2))
 subprocess.run(["git","config","user.name","music98 photo QC"],check=True)
 subprocess.run(["git","config","user.email","qc@music98.news"],check=True)
 subprocess.run(["git","add",str(p),str(q)],check=True)
 if subprocess.run(["git","diff","--cached","--quiet"]).returncode:
  subprocess.run(["git","commit","-m","Stage high-resolution originals and contact sheet for Ella concert QC"],check=True)
  subprocess.run(["git","push"],check=True)
 print("HIGHRES_CANDIDATE_COUNT",len(images),flush=True)
