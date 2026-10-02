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
