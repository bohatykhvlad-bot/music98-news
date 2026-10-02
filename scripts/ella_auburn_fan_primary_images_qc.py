#!/usr/bin/env python3
"""Read-only 2026 Auburn gallery imaging source discovery. Author credit must be verified."""
import re,requests,html,json
from urllib.parse import urljoin
pages=["https://www.concertarchives.org/concerts/the-dandelion-tour--14338495","https://www.concertarchives.org/concerts/the-dandelion-tour--14338495?page=2"]
for url in pages:
 try:
  x=requests.get(url,headers={"User-Agent":"Mozilla/5.0"},timeout=30);s=html.unescape(x.text)
  print("PAGE",x.status_code,url,"SIZE",len(s),flush=True)
  patterns=[r'https?[^"\\s<>]{5,250}\\.(?:jpe?g|webp|png)',r'https?[^"\\s<>]{5,250}(?:concertarchives|amazonaws|cloudfront)[^"\\s<>]{2,250}',r'src="([^"]{5,350})"',r'srcset="([^"]{5,500})"']
  for i,pat in enumerate(patterns):
   links=list(dict.fromkeys(re.findall(pat,s,re.I)))
   links=[z.replace("&amp;","&") for z in links]
   print("PATTERN",i,"RESULTS",len(links),json.dumps(links[:55])[:13000],flush=True)
  for m in list(re.finditer("Maddison Ponder",s,re.I))[:3]:
   print("CONTEXT",s[max(0,m.start()-600):m.end()+600].replace("\n"," ")[:1250],flush=True)
 except Exception as e:print("FAIL",str(e)[:200],flush=True)
