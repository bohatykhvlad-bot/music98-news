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
html,ct=fetch(URL)
soup=BeautifulSoup(html,"html.parser")
h=soup.find(string=lambda t:t and "Ella Langley @ Stubb" in t)
if not h:raise RuntimeError("Ella 2026 album not found in gallery")
container=h.parent
print("ELLA_HEADING_HTML",str(container)[:300],flush=True)
els=[]
# Inspect HTML from specific heading to next artist heading; use DOM order
for tag in container.find_all_next(limit=450):
 text=tag.get_text(" ",strip=True)[:140] if tag.name in ("h2","h3") else ""
 if "Lindsay Ell @ TEN" in text:break
 if tag.name=="img":
  meta={"alt":tag.get("alt"),"src":tag.get("src"),"data-src":tag.get("data-src"),"srcset":str(tag.get("srcset",""))[:600],"data-srcset":str(tag.get("data-srcset",""))[:600]}
  if meta not in els:els.append(meta)
print("ELLA_GALLERY_IMG_TAGS",json.dumps(els,ensure_ascii=False)[:14000],flush=True)
# gallery is plugin: source URLs may be in script JSON rather than img tags
segment=str(container.find_parent("div") or soup)
urls=re.findall(r'https?:[^\s"\\]+?\.(?:jpg|jpeg|png|webp)(?:\?[^\s"\\]*)?',segment,re.I)
urls=[x.replace("&amp;","&").replace("\/","/") for x in urls]
urls=[x for x in urls if any(q in x.lower() for q in ("ella","stauffer","sxsw","ggm-wp","guitargirlmag"))]
dedup=list(dict.fromkeys(urls))[:38]
print("PAGE_ELLA_CANDIDATE_URLS",len(dedup),json.dumps(dedup,ensure_ascii=False)[:18000],flush=True)
sources=[]
for el in els:
 for u in [el.get("data-src"),el.get("src"),(el.get("srcset") or "").split(",")[-1].strip().split(" ")[0]]:
  if u and u.startswith(("http","/")) and not u.startswith("data:") and not any(q in u.lower() for q in ("avatar","logo","adserver")):
   sources.append(urljoin(URL,u))
sources+=dedup
sources=list(dict.fromkeys(sources))[:36]
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
