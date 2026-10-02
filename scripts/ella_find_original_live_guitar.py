#!/usr/bin/env python3
"""Read-only bustled artist supplied concert image metadata and native crop proof."""
import urllib.request,io,json,base64,subprocess
from pathlib import Path
from bs4 import BeautifulSoup
from PIL import Image,ImageOps,ImageDraw
SOURCE="https://www.elitedaily.com/entertainment/ella-langley-weekend-in-the-life-cma-fest-2024"
req=urllib.request.Request(SOURCE,headers={"User-Agent":"Mozilla/5.0"})
with urllib.request.urlopen(req,timeout=30) as r: doc=r.read()
soup=BeautifulSoup(doc,"html.parser")
lst=[]
for x in soup.find_all("img"):
 alt=x.get("alt") or ""
 for attr in ("src","data-src","srcset"):
  raw=x.get(attr)
  if not raw or "bustle.com" not in raw:continue
  for u in (raw.split(",") if attr=="srcset" else [raw]):
   u=u.split(" ")[0]
   if u.startswith("//"):u="https:"+u
   u=u.split("?")[0]
   if u not in [r[0] for r in lst]:lst.append((u,alt))
print("BUSTLE_IMAGE_URLS",len(lst),flush=True)
tiles=[]
for name,alt in lst[:25]:
 try:
  rq=urllib.request.Request(name,headers={"User-Agent":"Mozilla/5.0"})
  with urllib.request.urlopen(rq,timeout=28) as r:raw=r.read();mime=r.headers.get("Content-Type")
  im=Image.open(io.BytesIO(raw)); print("BUSTLE_ORIGINAL",im.size,"bytes",len(raw),"alt",alt[:110],"url",name,flush=True)
  if max(im.size)<1800:continue
  v=ImageOps.fit(ImageOps.exif_transpose(im).convert("RGB"),(640,360),Image.Resampling.LANCZOS,centering=(.5,.43))
  tiles.append((alt or name.split("/")[-1],v,im.size,name))
 except Exception as e:print("BAD",type(e).__name__,str(e)[:100],name[:140],flush=True)
if tiles:
 sheet=Image.new("RGB",(660,len(tiles)*390),"white");d=ImageDraw.Draw(sheet)
 for i,(label,v,dim,u) in enumerate(tiles):
  y=i*390;d.text((7,y+5),str(dim)+" "+label[:85],fill="black");sheet.paste(v,(9,y+25))
 buf=io.BytesIO();sheet.save(buf,"JPEG",quality=79)
 p=Path(".editorial/ella-bustle-tour-photo-originals-sheet.b64");p.parent.mkdir(exist_ok=True);p.write_text(base64.b64encode(buf.getvalue()).decode())
 q=Path(".editorial/ella-bustle-tour-photo-originals.json");q.write_text(json.dumps([{"alt":a,"dim":d,"url":u} for a,_,d,u in tiles],indent=2))
 subprocess.run(["git","config","user.name","music98 photo QC"],check=True)
 subprocess.run(["git","config","user.email","qc@music98.news"],check=True)
 subprocess.run(["git","add",str(p),str(q)],check=True)
 if subprocess.run(["git","diff","--cached","--quiet"]).returncode:
  subprocess.run(["git","commit","-m","Review Ella tour photographer's original guitar photo crops"],check=True)
  subprocess.run(["git","push"],check=True)
 print("BUSTLE_HIRES_COUNT",len(tiles),flush=True)
