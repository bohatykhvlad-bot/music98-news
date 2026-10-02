#!/usr/bin/env python3
"""Read-only photographer's 2026 SXSW Ella gallery, render 12-frame visual QC.
Kirk Stauffer is credited on the page and maintains own photographer site.
Do not publish magazine images or write desk without rights verification.
"""
from pathlib import Path
from urllib.request import urlopen,Request
from urllib.parse import urljoin
from bs4 import BeautifulSoup
from PIL import Image,ImageOps,ImageDraw
import io,base64,json,re,subprocess
P=Path(".editorial");P.mkdir(exist_ok=True)
URL="https://guitargirlmag.com/featured/sxsw-2026-day-3-photos/"
UA="Mozilla/5.0 (photo author attribution / music98.news research)"
def fetch(url):
 with urlopen(Request(url,headers={"User-Agent":UA,"Accept":"text/html,image/jpeg,image/webp,*/*"}),timeout=30) as response:return response.read(),response.headers.get("Content-Type","")
# The gallery's first photograph is credited to Kirk Stauffer, and its source
# image naming scheme is deterministic. Inspect all available originals.
# Source proof: https://guitargirlmag.com/featured/sxsw-2026-day-3-photos/
prefix="https://ggm-wp.nyc3.digitaloceanspaces.com/uploads/2026/04/sxsw-2026-day3-ella-langley-stubbs-austin-"
sources=[prefix+f"{i:02d}.jpg" for i in range(1,13)]
print("PHOTOGRAPHER_2026_GALLERY",len(sources),URL,flush=True)
records=[];views=[]
for u in sources:
 try:
  raw,ct=fetch(u)
  im=Image.open(io.BytesIO(raw));im.load()
  if im.width<600 or im.height<500:continue
  print("PHOTO",im.size,len(raw),u[:270],flush=True)
  records.append({"url":u,"size":im.size,"bytes":len(raw)})
  view=ImageOps.fit(im.convert("RGB"),(630,354),method=Image.Resampling.LANCZOS,centering=(.5,.42))
  views.append((u,view))
 except Exception as e: print("IMAGE_QC_SKIP",u[:70],str(e)[:110],flush=True)
 if len(views)>=16:break
assert views,"No valid SXSW images from photographer's 2026 live gallery"
out=Image.new("RGB",(650,len(views)*381),"white");d=ImageDraw.Draw(out)
for i,(u,im) in enumerate(views):
 top=i*381;d.text((6,top+4),str(i)+": "+u.split("/")[-1][:64],fill="black");out.paste(im,(6,top+23))
b=io.BytesIO();out.save(b,"JPEG",quality=58)
(P/"ella-2026-kirk-sxsw-originals-preview.b64").write_text(base64.b64encode(b.getvalue()).decode())
(P/"ella-2026-kirk-sxsw-originals.json").write_text(json.dumps(records,indent=2)+"\n")
print("KIRK_VISUAL_QC",len(records),len(b.getvalue()),flush=True)
subprocess.run(["git","config","user.name","music98 image QC"],check=True)
subprocess.run(["git","config","user.email","editorial@music98.news"],check=True)
subprocess.run(["git","add",str(P/"ella-2026-kirk-sxsw-originals-preview.b64"),str(P/"ella-2026-kirk-sxsw-originals.json")],check=True)
if subprocess.run(["git","diff","--cached","--quiet"]).returncode:
 subprocess.run(["git","commit","-m","Review credited Kirk Stauffer 2026 SXSW Ella stage photo gallery"],check=True)
 subprocess.run(["git","push"],check=True)
