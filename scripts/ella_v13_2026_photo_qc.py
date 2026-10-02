#!/usr/bin/env python3
"""Inspect first-party concert photographer V13 2026 Ella Toronto gallery; no post changes."""
import re,requests,html,io,base64,json
from pathlib import Path
from PIL import Image,ImageOps,ImageDraw
URL="https://v13.net/2026/02/eric-church-scotiabank-arena-toronto-photos/"
r=requests.get(URL,headers={"User-Agent":"Mozilla/5.0"},timeout=40);s=html.unescape(r.text)
print("PAGE_STATUS",r.status_code,len(s),flush=True)
from bs4 import BeautifulSoup
soup=BeautifulSoup(s,"html.parser")
candidates=[]
for tag in soup.find_all("img"):
 info={k:tag.get(k,"") for k in ("alt","src","data-src","srcset","data-srcset")}
 if "ella" in str(info).lower() or "ethan" in str(info).lower() or "langley" in str(info).lower():print("RELATED_IMAGE",json.dumps(info)[:1100],flush=True)
 for value in info.values():
  if not value:continue
  for match in re.findall(r'https?[^\\s<>,"\']+\\.(?:jpe?g|webp|png)(?:\\?[^\\s<>,"\']+)?',str(value),re.I):
   if "v13" in match.lower() or "wordpress" in match.lower():candidates.append(match.split("?")[0])
for value in re.findall(r'https?[^\\s<>,"\']+\\.(?:jpe?g|webp|png)',s,re.I):
 if ("ella" in value.lower() or "ethan" in value.lower()) and ("v13" in value.lower()):candidates.append(value)
candidates=list(dict.fromkeys(candidates))
print("IMAGE_URLS",json.dumps(candidates[:80]),flush=True)
records=[];thumbs=[]
for u in candidates[:50]:
 try:
  z=requests.get(u,headers={"User-Agent":"Mozilla/5.0"},timeout=16)
  im=Image.open(io.BytesIO(z.content));im.load()
  key=u.rsplit("/",1)[-1]
  print("IMAGE",key,im.size,len(z.content),flush=True)
  records.append({"url":u,"size":im.size,"bytes":len(z.content)})
  if "ella" in key.lower() and max(im.size)>=1700:
   thumbs.append((key,ImageOps.contain(im.convert("RGB"),(700,420))))
 except Exception as e:print("IMG_FAIL",u,str(e)[:90],flush=True)
p=Path(".editorial");p.mkdir(exist_ok=True)
(p/"ella-v13-2026-gallery-originals.json").write_text(json.dumps(records,indent=2))
if thumbs:
 contact=Image.new("RGB",(740,458*len(thumbs)),"white");d=ImageDraw.Draw(contact)
 for i,(name,img) in enumerate(thumbs):
  d.text((8,i*458+6),name,fill="black");contact.paste(img,(8,i*458+28))
 out=io.BytesIO();contact.save(out,"JPEG",quality=78)
 (p/"ella-v13-2026-originals-contact.b64").write_text(base64.b64encode(out.getvalue()).decode())
print("PROCESSED",len(records),"ELLA_THUMBS",len(thumbs),flush=True)
