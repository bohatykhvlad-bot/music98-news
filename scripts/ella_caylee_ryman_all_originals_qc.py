#!/usr/bin/env python3
"""Photographer-attributed Ryman 2025 primary gallery: fetch actual WordPress uploads and inspect quality."""
import re,html,urllib.request,io,base64,json
from pathlib import Path
from PIL import Image,ImageOps,ImageDraw
PAGE="https://entertaining-options.com/2025/11/12/ella-langleys-two-night-ryman-triumph-in-photos/"
UA={"User-Agent":"Mozilla/5.0"}
raw=urllib.request.urlopen(urllib.request.Request(PAGE,headers=UA),timeout=45).read().decode("utf8","replace")
pats=re.findall(r'https?[^"\\\s<>]+ryman[^"\\\s<>]+(?:jpg|jpeg)',html.unescape(raw),re.I)
urls=sorted(set(re.sub(r'\\\\/','/',u).split("?")[0] for u in pats))
urls=[u for u in urls if 'entertaining-options.com' in u]
print("RYMAN_GALLERY_SOURCE_URLS",repr(urls),flush=True)
# Add known photographer's original acoustic Ryman shot when HTML uses data-srcset escaping.
known="https://entertaining-options.com/wp-content/uploads/2025/11/ryman-night-1_-4.jpg"
if known not in urls:urls.append(known)
out=[];records=[]
for url in urls[:35]:
 try:
  b=urllib.request.urlopen(urllib.request.Request(url,headers=UA),timeout=30).read()
  im=Image.open(io.BytesIO(b));im.load()
  key=url.rsplit("/",1)[-1]
  print("ORIGINAL",key,im.size,len(b),flush=True)
  records.append({"file":key,"url":url,"size":im.size,"bytes":len(b)})
  if im.size[0]<1400 or im.size[1]<1000:continue
  img=ImageOps.exif_transpose(im).convert("RGB")
  thumb=ImageOps.fit(img,(900,506),Image.Resampling.LANCZOS,centering=(.5,.48))
  out.append((key,thumb))
 except Exception as e:print("ERROR",url,str(e)[:160],flush=True)
if not out:raise RuntimeError("No full size files")
canvas=Image.new("RGB",(940,540*len(out)),"white");draw=ImageDraw.Draw(canvas)
for i,(name,img) in enumerate(out):
 draw.text((8,i*540+5),name,fill="black");canvas.paste(img,(8,i*540+26))
buf=io.BytesIO();canvas.save(buf,"JPEG",quality=78)
Path(".editorial").mkdir(exist_ok=True)
Path(".editorial/ella-ryman-caylee-originals-wide-preview.b64").write_text(base64.b64encode(buf.getvalue()).decode())
Path(".editorial/ella-ryman-caylee-originals.json").write_text(json.dumps(records,indent=2))
print("REVIEWABLE",len(out),flush=True)
