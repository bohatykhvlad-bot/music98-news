#!/usr/bin/env python3
"""Visual native-resolution QC for photographer Caylee Robillard live-electric-guitar alternate.
Read-only; never replace current editor photo with an unverified asset.
"""
from PIL import Image,ImageOps,ImageDraw
import urllib.request,io,hashlib,base64,json,subprocess
from pathlib import Path
sources={
 "2025 official Caylee Robillard live electric":"https://static.pollstar.com/wp-content/uploads/2026/01/Elle-playing-live.jpg",
 "2026 Andrew Wendowski live acoustic":"https://countrynow.com/wp-content/uploads/2026/03/Ella-Langley-Photo-by-Andrew-Wendowski-4.jpg"
}
views=[];results=[]
for label,url in sources.items():
 try:
  req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0","Accept":"image/jpeg,*/*"})
  with urllib.request.urlopen(req,timeout=28) as res:raw=res.read()
  im=Image.open(io.BytesIO(raw));im.load()
  print("SOURCE",label,"DIMENSIONS",im.size,"BYTES",len(raw),"FORMAT",im.format,"SHA256",hashlib.sha256(raw).hexdigest(),flush=True)
  results.append({"label":label,"url":url,"dimensions":im.size,"bytes":len(raw),"sha256":hashlib.sha256(raw).hexdigest()})
  for y in (.19,.28,.36):
   v=ImageOps.fit(im.convert("RGB"),(960,540),method=Image.Resampling.LANCZOS,centering=(.5,y))
   views.append((label+" crop preview "+str(y),v))
 except Exception as e:print("SOURCE_FAILED",label,str(e)[:190],flush=True)
if not views:raise RuntimeError("No source reachable")
out=Image.new("RGB",(990,575*len(views)),"white");d=ImageDraw.Draw(out)
for i,(name,img) in enumerate(views):
 y=575*i;d.text((10,y+8),name,fill="black");out.paste(img,(10,y+32))
v=io.BytesIO();out.save(v,"JPEG",quality=72)
path=Path(".editorial");path.mkdir(exist_ok=True)
(path/"ella-caylee-live-original-option-qc.b64").write_text(base64.b64encode(v.getvalue()).decode())
(path/"ella-caylee-live-original-option-qc.json").write_text(json.dumps(results,indent=2))
print("CROP_PREVIEW_READY",len(views),flush=True)
subprocess.run(["git","config","user.name","music98 QC"],check=True)
subprocess.run(["git","config","user.email","qc@music98.news"],check=True)
subprocess.run(["git","add",str(path/"ella-caylee-live-original-option-qc.b64"),str(path/"ella-caylee-live-original-option-qc.json")],check=True)
if subprocess.run(["git","diff","--cached","--quiet"]).returncode:
 subprocess.run(["git","commit","-m","Review photographer's alternate full 2025 Ella live guitar original"],check=True)
 subprocess.run(["git","push"],check=True)
