#!/usr/bin/env python3
"""Nonmutating portrait and guitar QC, public photographer original 4.3k."""
import urllib.request,io,base64,subprocess,json
from pathlib import Path
from PIL import Image,ImageOps,ImageDraw
links={
"Commons CC BY 4.0 BrDen original":"https://commons.wikimedia.org/wiki/Special:Redirect/file/EllaLangleyInConcert2025.jpg",
"Getty syndication Stagecoach tentative":"https://parade.com/.image/ODowMDAwMDAwMDAyMDIxMTQy/2026-stagecoach-festival-day-1.jpg?profile=w2560&x=50&y=50"
}
sheet=Image.new("RGB",(900,len(links)*560),"white");draw=ImageDraw.Draw(sheet);out=[]
for j,(name,url) in enumerate(links.items()):
 try:
  req=urllib.request.Request(url,headers={"User-Agent":"music98 editorial/1.0 contact web site research"})
  with urllib.request.urlopen(req,timeout=42) as r:
   data=r.read();ct=r.headers.get("Content-Type");final=r.geturl()
  im=Image.open(io.BytesIO(data))
  print("IMAGE",name,im.size,im.mode,"bytes",len(data),"mime",ct,"redirect",final,flush=True)
  if j==0:
   assert im.size==(4284,5712),("Unexpected commons original",im.size)
  im=ImageOps.exif_transpose(im).convert("RGB")
  tile=ImageOps.fit(im,(880,495),Image.Resampling.LANCZOS,centering=(.5,.4))
  sheet.paste(tile,(10,j*560+30))
  draw.text((10,j*560+7),name+" "+str(im.size),fill="black")
  out.append({"name":name,"size":im.size,"final":final,"bytes":len(data)})
 except Exception as e:
  print("PHOTO_ERR",name,type(e).__name__,str(e)[:220],flush=True)
b=io.BytesIO();sheet.save(b,"JPEG",quality=83)
p=Path(".editorial/ella-public-hires-guitar-contact.b64");p.parent.mkdir(exist_ok=True);p.write_text(base64.b64encode(b.getvalue()).decode())
q=Path(".editorial/ella-public-hires-guitar-provenance.json");q.write_text(json.dumps(out,indent=2))
subprocess.run(["git","config","user.name","music98 photo QC"],check=True)
subprocess.run(["git","config","user.email","qc@music98.news"],check=True)
subprocess.run(["git","add",str(p),str(q)],check=True)
if subprocess.run(["git","diff","--cached","--quiet"]).returncode:
 subprocess.run(["git","commit","-m","Review original freely licensed concert photography in full 4.3k and visual QC"],check=True)
 subprocess.run(["git","push"],check=True)
print("HIRES_GUITAR_QC_DONE",flush=True)
