#!/usr/bin/env python3
"""Read-only public snapshot CDN header check. Never scans Ticketmaster API."""
import json,urllib.request,urllib.error
base="https://music98.news/api/concerts?mode=popular&v=popular-v11"
def req(url,method="GET",extra=None):
 headers={"User-Agent":"music98 image diagnostics/1.0","Origin":"https://music98.news"}
 if extra:headers.update(extra)
 with urllib.request.urlopen(urllib.request.Request(url,headers=headers,method=method),timeout=20) as response:
  return response.status,dict(response.headers),response
status,h,r=req(base)
data=json.load(r)
artists=[a for a in data.get("artists",[]) if str(a.get("image","")).startswith("https://")]
assert artists,"Public complete snapshot has no CDN image; don't generate fresh Ticketmaster requests"
samples=artists[:3]
for a in samples:
 print("PHOTO_SOURCE",str(a.get("name"))[:35],str(a.get("image"))[:160],flush=True)
 try:
  s,head,r=req(a["image"],"HEAD")
  print("HEAD",s,"origin",r.url.split("/")[2],"cors",head.get("Access-Control-Allow-Origin"),"size",head.get("Content-Length"),"type",head.get("Content-Type"),"cache",head.get("Cache-Control"),flush=True)
 except Exception as e:print("HEAD_ERROR",str(e)[:130],flush=True)
 try:
  s,head,r=req(a["image"],"GET",{"Range":"bytes=0-8191"})
  small=r.read(128)
  print("GET",s,"cors",head.get("Access-Control-Allow-Origin"),"type",head.get("Content-Type"),"range",head.get("Content-Range"),"sample",len(small),flush=True)
 except Exception as e:print("GET_ERROR",str(e)[:130],flush=True)
