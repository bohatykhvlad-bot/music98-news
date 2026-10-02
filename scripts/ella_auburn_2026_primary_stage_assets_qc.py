#!/usr/bin/env python3
"""Read-only source inventory for Auburn University's primary 2026 Ella tour coverage."""
import re,urllib.request,html,json
URLS=[
"https://auburntigers.com/news/2026/08/28/welcome-home-ella-langley",
"https://cfwe.auburn.edu/former-forestry-major-ella-langley-returns-to-auburn-for-two-sold-out-shows/",
"https://auburntigers.com/photo-galleries"
]
for u in URLS:
 try:
  req=urllib.request.Request(u,headers={"User-Agent":"Mozilla/5.0"})
  with urllib.request.urlopen(req,timeout=40) as r:data=r.read().decode("utf8","replace")
  urls=sorted(set(html.unescape(v.replace("\\/","/")) for v in re.findall(r'https?[^"<>\\s]{8,300}',data) if any(q in v for q in ['.jpg','.jpeg','.png','image','cdn','asset','gallery'])))
  matches=sorted(set(re.findall(r'[^"<>\\s]{0,120}(?:jpg|jpeg|png|webp)[^"<>\\s]{0,60}',data,re.I)))
  print("PAGE",u,"CHARS",len(data),"ALL_IMAGE_URLS",json.dumps(urls[:80])[:13000],flush=True)
  print("IMAGE_MATCHES",json.dumps(matches[:25])[:4000],flush=True)
 except Exception as e:print("FAILED",u,str(e)[:150],flush=True)
