#!/usr/bin/env python3
"""No mutation of website or article; visual diagnostics for independently credited live Ella photographers 2026."""
import urllib.request,io,re,html,json,subprocess,base64
from PIL import Image,ImageOps,ImageDraw
from pathlib import Path
ROOT=Path(".editorial");ROOT.mkdir(exist_ok=True)
URL="https://offrecord.blog/sxsw-2026-spotify-house-at-stubbs-amphitheater/"
UA="Mozilla/5.0"
def download(url):
 with urllib.request.urlopen(urllib.request.Request(url,headers={"User-Agent":UA}),timeout=20) as r:return r.read(),r.headers.get("Content-Type","")
sources=[]
raw,ct=download(URL);page=raw.decode("utf8","replace")
# Find unembedded originals in gallery, not just the page hero (Alanis).
for m in re.finditer(r'https?[^"'+"'" +r'\s<>]+?(?:\.jpg|\.jpeg|\.webp)',html.unescape(page),re.I):
 url=m.group(0).replace("\\/","/")
 if any(x in url.lower() for x in ("ella","langley","sxsw2026-kp")):sources.append(url)
print("OFFRECORD_HTML_LENGTH",len(page),"ELLA_CANDIDATES",len(sources),flush=True)
for x in list(dict.fromkeys(sources))[:50]:print("CANDIDATE",x[:300],flush=True)
# CountryNow Andrew is known named photographer with his own official portfolio.
for n in range(1,6):
 sources.extend(["https://countrynow.com/wp-content/uploads/2026/03/Ella-Langley-Photo-by-Andrew-Wendowski-"+str(n)+".jpg"])
sources=list(dict.fromkeys(sources))[:45]
items=[];results=[]
for u in sources:
 try:
  b,c=download(u);img=Image.open(io.BytesIO(b));img.load()
  if img.width<700:continue
  photog="Keylee Baque" if "offrecord" in u else "Andrew Wendowski"
  print("ORIGINAL",photog,img.size,len(b),u,flush=True)
  results.append({"photographer":photog,"dimensions":img.size,"url":u,"bytes":len(b)})
  prev=ImageOps.fit(img.convert("RGB"),(600,338),method=Image.Resampling.LANCZOS,centering=(.5,.36))
  items.append((u.split("/")[-1][:64],prev))
 except Exception as e:print("IMAGE_SKIP",u[-95:],str(e)[:90],flush=True)
 if len(items)>=15:break
if not items:raise RuntimeError("No valid image")
sheet=Image.new("RGB",(630,len(items)*370),"white");d=ImageDraw.Draw(sheet)
for i,(name,im) in enumerate(items):
 y=i*370;d.text((8,y+7),str(i)+" "+name,fill="black");sheet.paste(im,(8,y+28))
b=io.BytesIO();sheet.save(b,"JPEG",quality=68)
(ROOT/"ella-keylee-andrew-2026-photo-qc.b64").write_text(base64.b64encode(b.getvalue()).decode())
(ROOT/"ella-keylee-andrew-2026-photo-qc.json").write_text(json.dumps(results,indent=2))
print("QC_SHEET_READY",len(results),"BYTES",len(b.getvalue()),flush=True)
subprocess.run(["git","config","user.name","music98 photo audit"],check=True)
subprocess.run(["git","config","user.email","editorial@music98.news"],check=True)
subprocess.run(["git","add",str(ROOT/"ella-keylee-andrew-2026-photo-qc.b64"),str(ROOT/"ella-keylee-andrew-2026-photo-qc.json")],check=True)
if subprocess.run(["git","diff","--cached","--quiet"]).returncode:
 subprocess.run(["git","commit","-m","Inspect 2026 independent photographer Ella live frames"],check=True)
 subprocess.run(["git","push"],check=True)
