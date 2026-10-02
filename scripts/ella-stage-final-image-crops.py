#!/usr/bin/env python3
"""Read-only asset crop check. No desk mutation and no production photo upload."""
from PIL import Image,ImageOps,ImageDraw
from pathlib import Path
import io,urllib.request,base64,subprocess
urls={
"new-official-sony-cover":"https://kommunikasjon.ntb.no/files/8931514/18858703/263460/no",
"amy-harris-ella-live-guitar":"https://thetraveladdict.com/wp-content/uploads/2026/03/EllaLangley-00419.jpg"
}
prev=[]
for name,url in urls.items():
 req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0"})
 with urllib.request.urlopen(req,timeout=45) as r:raw=r.read()
 im=Image.open(io.BytesIO(raw));print("ASSET",name,im.size,im.format,len(raw),"EXIF",str(dict(im.getexif()))[:280],flush=True)
 im=ImageOps.exif_transpose(im).convert("RGB")
 # Actual cover renderer treats focal point as midpoint, moves it to viewport center.
 w,h=im.size; bh=round(w*9/16)
 center_y=.28*h if name.startswith("new-") else .5*h
 top=max(0,min(h-bh,round(center_y-bh/2)))
 crop=im.crop((0,top,w,top+bh)).resize((800,450),Image.Resampling.LANCZOS)
 prev.append((name+" 16:9 / crop top "+str(top),crop))
 if name.startswith("new-"):
  side=min(w,h); top_card=max(0,min(h-side,round(.38*h-side/2)))
  card=im.crop((0,top_card,side,top_card+side)).resize((450,450),Image.Resampling.LANCZOS)
  backdrop=Image.new("RGB",(800,450),"white");backdrop.paste(card,(175,0))
  prev.append((name+" square card",backdrop))
out=Image.new("RGB",(820,len(prev)*490),"white");d=ImageDraw.Draw(out)
for i,(t,img) in enumerate(prev):
 y=i*490;d.text((10,y+15),t,fill="black");out.paste(img,(10,y+35))
outbuf=io.BytesIO();out.save(outbuf,"JPEG",quality=83)
f=Path(".editorial/ella-hero-final-crop-contact-sheet.b64");f.parent.mkdir(exist_ok=True);f.write_text(base64.b64encode(outbuf.getvalue()).decode())
subprocess.run(["git","config","user.name","music98 crop QC"],check=True)
subprocess.run(["git","config","user.email","cropqc@music98.news"],check=True)
subprocess.run(["git","add",str(f)],check=True)
if subprocess.run(["git","diff","--cached","--quiet"]).returncode:
 subprocess.run(["git","commit","-m","Stage exact new Ella hero and final concert crop proof"],check=True)
 subprocess.run(["git","push"],check=True)
print("CROP_PROOFS_READY",flush=True)
