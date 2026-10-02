#!/usr/bin/env python3
"""Non-production photo research. Source-only downloads, geometry and labelled QC sheet."""
from pathlib import Path
import io,base64,urllib.request,re,subprocess
from PIL import Image,ImageOps,ImageDraw
OUT=Path(".editorial")
OUT.mkdir(exist_ok=True)
UA="Mozilla/5.0"
URLS={
"existing-hero":"https://fortworth.culturemap.com/media-library/ella-langley.jpg?coordinates=0%2C0%2C0%2C0&height=1500&id=63691936&width=2000",
"hits-wide-original":"https://res.cloudinary.com/hits-photos-archive/image/upload/v1769533762/MAIN_PRESS_WIDE_USE_IMAGE_1_DIGITAL_RGB_a73yrl.jpg",
"billboard-caylee-raw":"https://media.zenfs.com/en/billboard_547/80f5cb3c59c106a6caf51f7d27dfe52d",
"post-wallen-official":"https://cdn.sanity.io/images/o6uq28nb/production/cf9de2550ea73af087764ff9572973a0e65f33a2-1350x1687.jpg",
"post-wallen-truck":"https://images.squarespace-cdn.com/content/v1/5c6d8645aadd344a28004478/6ab46bba-8353-4276-9dc9-b94ac6b4b2e7/PostMalonenuevo2.jpg?format=original",
}
def get(u):
 req=urllib.request.Request(u,headers={"User-Agent":UA})
 with urllib.request.urlopen(req,timeout=35) as r:return r.read(),r.headers.get("Content-Type")
thumbs=[]
for k,u in URLS.items():
 try:
  b,t=get(u);im=Image.open(io.BytesIO(b));print("CANDIDATE",k,"PIXELS",im.size,"BYTES",len(b),"TYPE",t,"URL",u,flush=True)
  # 16:9 proof, no upsizing for actual asset
  temp=ImageOps.exif_transpose(im).convert("RGB")
  w,h=temp.size
  if w/h>16/9:
   nw=int(h*16/9);temp=temp.crop(((w-nw)//2,0,(w+nw)//2,h))
  else:
   nh=int(w*9/16);temp=temp.crop((0,int(h*.35),w,min(h,int(h*.35)+nh))) if h>=nh+int(h*.35) else ImageOps.fit(temp,(960,540))
  thumbs.append((k,temp.resize((640,360))))
 except Exception as e:print("PHOTO_ERROR",k,str(e)[:300],flush=True)
for p in ["https://morganwallen.com/post-malone-morgan-wallen-release-i-had-some-help/","https://www.sonymusic.ca/press_release/ella-langley-unveils-highly-anticipated-sophomore-album-dandelion"]:
 try:
  b,t=get(p);s=b.decode("utf-8","replace")
  print("HTML",p,"LENGTH",len(s))
  for m in re.findall(r'<img[^>]+>',s,re.I):
   if "Malone" in m or "Wallen" in m or "Ella" in m or "press" in m:print("IMAGE_TAG",m[:450])
 except Exception as e:print("HTML_ERROR",p,e)
if not thumbs:raise RuntimeError("No visuals fetched")
out=Image.new("RGB",(680,408*len(thumbs)),"white");d=ImageDraw.Draw(out)
for idx,(name,im) in enumerate(thumbs):
 y=idx*408;d.text((15,y+7),name,fill="black");out.paste(im,(15,y+35))
buf=io.BytesIO();out.save(buf,format="JPEG",quality=82)
(OUT/"ella-oct02-media-contact-sheet.b64").write_text(base64.b64encode(buf.getvalue()).decode("ascii"))
subprocess.run(["git","config","user.name","music98 QC"],check=True)
subprocess.run(["git","config","user.email","qc@music98.news"],check=True)
subprocess.run(["git","add",".editorial/ella-oct02-media-contact-sheet.b64"],check=True)
q=subprocess.run(["git","diff","--cached","--quiet"])
if q.returncode:subprocess.run(["git","commit","-m","Add Ella 2026 source image QC contact sheet"],check=True);subprocess.run(["git","push"],check=True)
print("CONTACT_SHEET_READY",out.size,flush=True)
