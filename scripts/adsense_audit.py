#!/usr/bin/env python3
from __future__ import annotations
import json, re, sys, urllib.request, urllib.error
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import post as runner

BASE="https://music98.news"
ADS_ID="ca-pub-9555543001162953"

def fetch(path):
    url=BASE+path
    req=urllib.request.Request(url,headers={"User-Agent":runner.UA})
    try:
        with urllib.request.urlopen(req,timeout=60) as r:
            raw=r.read()
            return {"url":url,"status":r.status,"ctype":r.headers.get("Content-Type",""),"body":raw}
    except urllib.error.HTTPError as e:
        return {"url":url,"status":e.code,"ctype":e.headers.get("Content-Type",""),"body":e.read()}
    except Exception as e:
        return {"url":url,"status":"ERR","error":repr(e),"ctype":"","body":b""}

def text_body(raw):
    s=raw.decode("utf-8","replace")
    s=re.sub(r"<script[\s\S]*?</script>"," ",s,flags=re.I)
    s=re.sub(r"<style[\s\S]*?</style>"," ",s,flags=re.I)
    s=re.sub(r"<[^>]+>"," ",s)
    return re.sub(r"\s+"," ",s).strip()

def main():
    runner.load_env()
    posts=runner.desk_read()["posts"]
    live=[p for p in posts if p.get("status")=="live"]
    print("LIVE_POSTS",len(live))
    for p in sorted(live,key=lambda x:runner.words(x.get("body") or "")):
        print("POST_WORDS",runner.words(p.get("body") or ""),p.get("id"),p.get("type"),p.get("title"))

    print("COVER_AUDIT")
    for p in live:
        src=(p.get("cover") or {}).get("src")
        if not src:
            print("COVER","MISSING",p.get("id"),p.get("title"))
            continue
        rr=fetch("/"+str(src).lstrip("/"))
        ok=rr["status"]==200 and (rr["ctype"].startswith("image/"))
        print("COVER","PASS" if ok else "FAIL",rr["status"],rr["ctype"],p.get("id"),src)

    print("PAGE_AUDIT")
    for path in ["/","/about","/contacts","/privacy","/terms","/robots.txt","/sitemap.xml","/news-sitemap.xml","/ads.txt"]:
        rr=fetch(path)
        s=rr["body"].decode("utf-8","replace")
        print("PAGE",path,rr["status"],rr["ctype"],"bytes",len(rr["body"]),
              "adsense",ADS_ID in s,
              "noindex",bool(re.search(r'<meta[^>]+name=["\\']robots["\\'][^>]+noindex',s,re.I)))
        if path=="/sitemap.xml" and rr["status"]==200:
            print("SITEMAP_URLS",s.count("<url>"))
        if path=="/privacy" and rr["status"]==200:
            t=text_body(rr["body"]).lower()
            for needle in ["google","cookies","personalised advertising","consent","third-party vendors"]:
                print("PRIVACY_MARKER",needle,needle in t)

    home=fetch("/")
    hs=home["body"].decode("utf-8","replace")
    for link in ["/about","/contacts","/privacy","/terms"]:
        print("HOME_LINK",link, link in hs)

if __name__=="__main__":
    main()
