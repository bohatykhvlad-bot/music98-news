#!/usr/bin/env python3
"""SOURCE ONLY. Visual contact sheet of real Ella Langley live originals from
Wikimedia Commons and photographer's own Flickr portfolio. No draft writes.
"""
import urllib.request,io,base64,re,html,json,subprocess
from pathlib import Path
from PIL import Image,ImageOps,ImageDraw
DIR=Path(".editorial");DIR.mkdir(exist_ok=True)
SOURCES=[
("Wikimedia 2026 Rick Munroe Jun 12", "https://commons.wikimedia.org/wiki/Special:FilePath/Ella_Langley_2026.jpg", "https://commons.wikimedia.org/wiki/File:Ella_Langley_2026.jpg","Rick Munroe","CC BY-SA 4.0"),
("Wikimedia BrDen 2025 FULL 4284x5712", "https://commons.wikimedia.org/wiki/Special:FilePath/EllaLangleyInConcert2025.jpg","https://commons.wikimedia.org/wiki/File:EllaLangleyInConcert2025.jpg","BrDen","CC BY 4.0"),
("Wikimedia BrDen 2025 OTHER", "https://commons.wikimedia.org/wiki/Special:FilePath/Ella_Langley_in_Concert_2025.jpg","https://commons.wikimedia.org/wiki/File:Ella_Langley_in_Concert_2025.jpg","BrDen","CC BY 4.0"),
]
FLICKR=[
("Photographer Flickr SNAP ATL 2023 A","https://www.flickr.com/photos/christopherwarrick/53660328998","SNAP ATL"),
("Photographer Flickr SNAP ATL 2023 B","https://www.flickr.com/photos/christopherwarrick/53660462579","SNAP ATL"),
("Photographer Flickr SNAP ATL 2023 C","https://www.flickr.com/photos/christopherwarrick/53660571800","SNAP ATL"),
]
UA="Mozilla/5.0 (compatible; Music98 image research; +https://music98.news)"
def fetch(url):
 req=urllib.request.Request(url,headers={"User-Agent":UA,"Accept":"image/avif,image/webp,image/jpeg,*/*"})
 with urllib.request.urlopen(req,timeout=28) as res:return res.read(),res.headers.get("Content-Type","")
for name,url,photographer in FLICKR:
 try:
  raw,ctype=fetch(url);h=raw.decode("utf8","replace")
  og=re.search(r'<meta[^>]*property="og:image"[^>]*content="([^"]+)"',h)
  if not og:og=re.search(r'<meta[^>]*content="([^"]+)"[^>]*property="og:image"',h)
  ogurl=html.unescape(og.group(1)) if og else ""
  if ogurl and "staticflickr" in ogurl:
   # Use the account's own source service rather than a syndication thumbnail.
   raw,ctype=fetch(ogurl)
   SOURCES.append((name,ogurl,url,photographer,"Rights to be verified before reuse"))
  else:print("FLICKR_NO_SOURCE",name,ctype,len(raw),flush=True)
 except Exception as err:print("FLICKR_ERROR",name,str(err)[:180],flush=True)
items=[];records=[]
for name,url,page,credit,license in SOURCES:
 try:
  raw,ctype=fetch(url)
  img=Image.open(io.BytesIO(raw));img.load()
  im=ImageOps.exif_transpose(img).convert("RGB")
  print("FOUND",name,im.size,len(raw),ctype,page,credit,license,flush=True)
  # Review ONLY: thumbnails do not change or replace the original.
  thumb=ImageOps.fit(im,(660,372),method=Image.Resampling.LANCZOS,centering=(.5,.37))
  items.append((name,thumb))
  records.append({"name":name,"source":url,"page":page,"photographer":credit,"license":license,
                  "original_pixels":list(im.size),"downloaded_bytes":len(raw)})
 except Exception as err:print("IMAGE_ERROR",name,str(err)[:220],flush=True)
if not records:raise RuntimeError("Photo sources unavailable")
result=Image.new("RGB",(680,len(items)*400),"white")
draw=ImageDraw.Draw(result)
for i,(name,thumb) in enumerate(items):
 y=400*i;draw.text((8,y+7),name,fill="black");result.paste(thumb,(8,y+23))
out=io.BytesIO();result.save(out,"JPEG",quality=67)
preview=DIR/"ella-flickr-commons-live-qc.b64";preview.write_text(base64.b64encode(out.getvalue()).decode())
meta=DIR/"ella-flickr-commons-live-qc.json";meta.write_text(json.dumps(records,indent=2)+"\n")
print("LIVE_PHOTO_CONTACT_SHEET",len(items),"JPEG_BYTES",len(out.getvalue()),flush=True)
subprocess.run(["git","config","user.name","music98 editorial photo QC"],check=True)
subprocess.run(["git","config","user.email","editorial@music98.news"],check=True)
subprocess.run(["git","add",str(preview),str(meta)],check=True)
if subprocess.run(["git","diff","--cached","--quiet"]).returncode:
 subprocess.run(["git","commit","-m","Visually review Wikimedia and photographer's Flickr Ella live original photos"],check=True)
 subprocess.run(["git","push"],check=True)
