#!/usr/bin/env python3
"""Read-only candidate discovery: extract original image URLs and verify native pixels."""
import urllib.request,re,html,io
from PIL import Image
SOURCES={
"MusicRow CMA official guitar":"https://musicrow.com/2025/11/new-voices-big-moments-define-the-59th-cma-awards/",
"Country Now 2026 CMA guitar":"https://countrynow.com/ella-langley-shines-with-performances-of-be-her-and-choosin-texas-during-cma-fest-broadcast/",
"ABC CMA press":"https://www.detpress.com/abc/shows/cma-fest/photos/",
"CMA website":"https://cmaawards.com/",
"Photographer Amy Harris":"https://www.amyharrisphotos.com/"
}
def get(u):
 req=urllib.request.Request(u,headers={"User-Agent":"Googlebot"})
 with urllib.request.urlopen(req,timeout=25) as r:return r.read(),r.headers.get("Content-Type","")
for name,url in SOURCES.items():
 try:
  raw,ctype=get(url);data=raw.decode("utf8","replace")
  print("PAGE",name,"BYTES",len(data),"TYPE",ctype,flush=True)
  cand=re.findall(r'(?:https?:)?(?:\\/|/){2}[^\\s\\"<>]+?\\.(?:jpg|jpeg|webp|png)(?:\\?[^\\s\\"<>]*)?',data,re.I)
  cand=[html.unescape(x.replace("\\/","/")) for x in cand]
  cand=list(dict.fromkeys(cand))
  print("IMAGES_COUNT",name,len(cand),flush=True)
  good=[c for c in cand if any(k in c.lower() for k in ["ella","langley","cma","2025","2026","performance","award"])]
  print("CANDIDATE_URLS",name,str(good[:42])[:11000],flush=True)
  for item in good[:14]:
   try:
    r,t=get(item);im=Image.open(io.BytesIO(r))
    print("CANDIDATE_IMAGE",name,im.size,im.format,len(r),item,flush=True)
   except Exception as e: print("IMAGE_ERROR",str(e)[:90],item[:135],flush=True)
 except Exception as e:print("PAGE_ERROR",name,str(e)[:150],flush=True)
