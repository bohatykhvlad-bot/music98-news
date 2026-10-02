#!/usr/bin/env python3
"""Read-only inventory of first-person 2026 SXSW concert photographer's source gallery."""
import requests,re,html,json,io,base64
from bs4 import BeautifulSoup
from PIL import Image,ImageOps,ImageDraw
from pathlib import Path
url="https://offrecord.blog/sxsw-2026-spotify-house-at-stubbs-amphitheater/"
x=requests.get(url,timeout=40,headers={"User-Agent":"Mozilla/5.0"})
s=html.unescape(x.text);soup=BeautifulSoup(s,"html.parser")
sources=[]
for u in re.findall(r'https?[^"\x27<>\\s,]{5,250}\\.(?:jpe?g|png|webp)',s,re.I):
 u=u.replace("\\/","/").split("?")[0]
 if "offrecordmedia-bucket" in u and ("Ella" in u or "Langley" in u):sources.append(u)
print("ALL_IMAGE_DEBUG",json.dumps([(z.get("alt"),z.get("src")) for z in soup.find_all("img")][:45])[:12500],flush=True)
print("ELLA_PHOTO_URLS",json.dumps(sorted(set(sources))[:50]),flush=True)
out=[];meta=[]
for i,url in enumerate(sorted(set(sources))[:20]):
 try:
  r=requests.get(url,headers={"User-Agent":"Mozilla/5.0"},timeout=25)
  im=Image.open(io.BytesIO(r.content));im.load()
  print("ELLA_PRIMARY_ORIGINAL",url.rsplit("/",1)[-1],im.size,len(r.content),flush=True)
  meta.append({"url":url,"size":list(im.size),"bytes":len(r.content)})
  out.append((url.rsplit("/",1)[-1],ImageOps.contain(im.convert("RGB"),(700,420))))
 except Exception as ex:print("BAD_ORIGINAL",str(ex)[:110],flush=True)
folder=Path(".editorial");folder.mkdir(exist_ok=True)
(folder/"ella-offrecord-primary-originals.json").write_text(json.dumps(meta,indent=2))
if out:
 sheet=Image.new("RGB",(720,len(out)*460),"white");draw=ImageDraw.Draw(sheet)
 for i,(name,img) in enumerate(out):
  draw.text((8,i*460+4),name,fill="black");sheet.paste(img,(8,i*460+28))
 buf=io.BytesIO();sheet.save(buf,"JPEG",quality=78)
 (folder/"ella-offrecord-primary-originals.b64").write_text(base64.b64encode(buf.getvalue()).decode())
print("OFFRECORD_COUNT",len(out),flush=True)
