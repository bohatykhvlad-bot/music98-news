#!/usr/bin/env python3
"""Read-only Cloudflare image transformation capability check. No Ticketmaster API."""
import urllib.request,urllib.error
sources=[
 ("site_original","https://music98.news/logo.png"),
 ("site_resize","https://music98.news/cdn-cgi/image/width=96,height=96,fit=scale-down,quality=85,format=auto/https://music98.news/logo.png"),
]
for kind,url in sources:
 try:
  req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0","Accept":"image/webp,image/png,image/jpeg,image/*"})
  with urllib.request.urlopen(req,timeout=22) as r:
   sample=r.read(150)
   print("CLOUDFLARE_IMAGE_PROBE",kind,"status",r.status,"type",r.headers.get("Content-Type"),"cf_resize",r.headers.get("Cf-Resized"),"cache",r.headers.get("Cf-Cache-Status"),"first_bytes",repr(sample[:15]),flush=True)
 except urllib.error.HTTPError as err:
  print("CLOUDFLARE_IMAGE_PROBE",kind,"HTTP",err.code,"cf_resize",err.headers.get("Cf-Resized"),"type",err.headers.get("Content-Type"),flush=True)
 except Exception as e:print("CLOUDFLARE_IMAGE_PROBE",kind,"ERROR",type(e).__name__,str(e)[:150],flush=True)

import re
for url in ["https://music98.news/","https://music98.news/concerts"]:
 try:
  request=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0","Cache-Control":"no-cache"})
  with urllib.request.urlopen(request,timeout=20) as resp:
   text=resp.read().decode("utf-8","replace")
   spot=text.find("concerts-app.js")
   print("LIVE_SHELL_VERSION",url,"http",resp.status,"cache",resp.headers.get("Cache-Control"),"cf",resp.headers.get("Cf-Cache-Status"),"script_fragment",repr(text[max(0,spot-60):spot+70]) if spot>=0 else "not-present",flush=True)
 except Exception as e:print("LIVE_SHELL_ERROR",url,str(e)[:130],flush=True)

url="https://music98.news/concerts-app.js?v=20261002-02"
try:
 req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0","Cache-Control":"no-cache"})
 with urllib.request.urlopen(req,timeout=20) as resp:
  script=resp.read().decode("utf-8","replace")
  checks={
   "pop720":'applyConcertArt(img,e.image||e.artistImage||"/logo.png",720)' in script,
   "artist256":'applyConcertArt(img,item.image||"/logo.png",256)' in script,
   "browser_two_pass":'function browserResampleConcertArt(img,side)' in script,
   "no_alternate_cover":"compactSameConcertImage" not in script,
   "no_duplicate_ticket_link":".ticket-alt" not in script
  }
  print("LIVE_JS_OPTIMIZER",resp.status,"cache",resp.headers.get("Cache-Control"),"cf",resp.headers.get("Cf-Cache-Status"),"checks",checks,flush=True)
  assert all(checks.values()),"Deployed JS differs from latest inspected candidate"
except Exception as e:
 print("LIVE_JS_OPTIMIZER_ERROR",type(e).__name__,str(e)[:250],flush=True)
 raise
