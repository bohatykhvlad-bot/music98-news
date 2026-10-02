#!/usr/bin/env python3
"""Review official tour photographer's 3648px image full frame and actual landscape crops."""
from pathlib import Path
import urllib.request,io,base64,subprocess
from PIL import Image,ImageOps,ImageDraw
url="https://imgix.bustle.com/uploads/image/2024/7/1/06d98009/2i0a5096-2.jpg"
with urllib.request.urlopen(urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0"}),timeout=40) as r:b=r.read()
im=Image.open(io.BytesIO(b));assert im.size==(3648,5472)
print("LIVE_SOURCE_VERIFIED",im.size,im.mode,"bytes",len(b),flush=True)
base=ImageOps.exif_transpose(im).convert("RGB")
samples=[
 ("Portrait full native aspect", ImageOps.contain(base,(750,760))),
 ("Landscape 16x9 top",ImageOps.fit(base,(750,420),centering=(.5,.3))),
 ("Landscape 16x9 mid",ImageOps.fit(base,(750,420),centering=(.5,.5))),
 ("Landscape 16x9 low",ImageOps.fit(base,(750,420),centering=(.5,.7))),
 ("Landscape 3x2 center",ImageOps.fit(base,(750,500),centering=(.5,.5)))
]
h=sum(x.height+35 for _,x in samples);sheet=Image.new("RGB",(780,h),"white");draw=ImageDraw.Draw(sheet)
y=0
for name,img in samples:
 draw.text((8,y+7),name,fill="black");y+=30;sheet.paste(img,(10,y));y+=img.height+5
out=io.BytesIO();sheet.save(out,"JPEG",quality=79)
p=Path(".editorial/ella-caylee-2024-original-crop-review.b64");p.parent.mkdir(exist_ok=True)
p.write_text(base64.b64encode(out.getvalue()).decode())
subprocess.run(["git","config","user.name","music98 photo QC"],check=True);subprocess.run(["git","config","user.email","qc@music98.news"],check=True)
subprocess.run(["git","add",str(p)],check=True)
if subprocess.run(["git","diff","--cached","--quiet"]).returncode:
 subprocess.run(["git","commit","-m","Inspect Caylee Robillard original CMA Fest guitar crop possibilities"],check=True)
 subprocess.run(["git","push"],check=True)
print("CAYLEE_CROP_SHEET_READY",flush=True)
