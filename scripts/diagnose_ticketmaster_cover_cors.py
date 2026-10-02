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

url="https://music98.news/concerts-app.js?v=20261002-03"
try:
 req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0","Cache-Control":"no-cache"})
 with urllib.request.urlopen(req,timeout=20) as resp:
  script=resp.read().decode("utf-8","replace")
  checks={
   "pop720":'applyConcertArt(img,e.image||e.artistImage||"/logo.png",720)' in script,
   "artist256":'applyConcertArt(img,item.image||"/logo.png",256)' in script,
   "browser_two_pass":'function browserResampleConcertArt(img,side)' in script,
   "no_alternate_cover":"compactSameConcertImage" not in script,
   "no_duplicate_ticket_link":".ticket-alt" not in script,
   "nearby_thirty":".slice(0,30)" in script,
   "nearby_date_notice":"Showing the soonest upcoming concerts in this area." in script
  }
  print("LIVE_JS_OPTIMIZER",resp.status,"cache",resp.headers.get("Cache-Control"),"cf",resp.headers.get("Cf-Cache-Status"),"checks",checks,flush=True)
  assert all(checks.values()),"Deployed JS differs from latest inspected candidate"
except Exception as e:
 print("LIVE_JS_OPTIMIZER_ERROR",type(e).__name__,str(e)[:250],flush=True)
 raise

# This fetch is the site's already-published, KV-cached Popular snapshot.
# It never requests new data from Ticketmaster.
import json,time
popular="https://music98.news/api/concerts?mode=popular&v=popular-v11&contractcheck="+str(int(time.time()*1000))
try:
 req=urllib.request.Request(popular,headers={
  "User-Agent":"music98-popular-contract/1.0","Accept":"application/json",
  "Cache-Control":"no-cache","Pragma":"no-cache"
 })
 with urllib.request.urlopen(req,timeout=26) as r:
  body=r.read();ctype=r.headers.get("Content-Type","")
  print("POPULAR_IMAGE_SOURCE_CHECK",r.status,ctype,len(body),flush=True)
  snapshot=json.loads(body)
 candidates=[str(a.get("image","")) for a in snapshot.get("artists",[]) if str(a.get("image","")).startswith("https://")]
 source=next((x for x in candidates if ".ticketm.net/" in x or ".ticketmaster.com/" in x),"")
 if not source:
  print("TICKETMASTER_EXTERNAL_TRANSFORM","NO_TICKETMASTER_COVER_IN_EXISTING_POPULAR_SNAPSHOT",flush=True)
 else:
  try:
   direct_req=urllib.request.Request(source,method="HEAD",headers={"User-Agent":"Mozilla/5.0"})
   with urllib.request.urlopen(direct_req,timeout=15) as direct:
    print("TICKETMASTER_DIRECT_ORIGIN",direct.status,direct.headers.get("Content-Type"),direct.headers.get("Content-Length"),flush=True)
  except urllib.error.HTTPError as direct:
   print("TICKETMASTER_DIRECT_ORIGIN",direct.code,direct.headers.get("Content-Type"),flush=True)
  except Exception as direct:
   print("TICKETMASTER_DIRECT_ORIGIN","ERROR",type(direct).__name__,str(direct)[:110],flush=True)
  from urllib.parse import quote
  target="https://music98.news/cdn-cgi/image/width=256,height=256,fit=scale-down,quality=85,format=auto/"+source
  try:
   req=urllib.request.Request(target,headers={"User-Agent":"Mozilla/5.0","Accept":"image/webp,image/png,image/jpeg,image/*"})
   with urllib.request.urlopen(req,timeout=28) as r:
    sample=r.read(48)
    print("TICKETMASTER_EXTERNAL_TRANSFORM",r.status,
      "content_type",r.headers.get("Content-Type"),
      "cf_resized",r.headers.get("Cf-Resized"),
      "sample_size",len(sample),flush=True)
  except urllib.error.HTTPError as e:
   detail=e.read(350).decode("utf-8","replace").replace("\\n"," ")
   print("TICKETMASTER_EXTERNAL_TRANSFORM","HTTP_ERROR",e.code,
    "cf_resized",e.headers.get("Cf-Resized"),"error_snippet",detail[:200],flush=True)
except Exception as e:
 print("TICKETMASTER_EXTERNAL_TRANSFORM","PUBLIC_SNAPSHOT_UNAVAILABLE",type(e).__name__,str(e)[:180],flush=True)
