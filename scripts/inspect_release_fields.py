#!/usr/bin/env python3
from __future__ import annotations
import json, sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import post as runner

runner.load_env()
posts=runner.desk_read()["posts"]
rows=[]
for p in posts:
    if p.get("type")=="release":
        rows.append({
            "id":p.get("id"),
            "status":p.get("status"),
            "artist":p.get("artist"),
            "title":p.get("title"),
            "rtype":p.get("rtype"),
            "excerpt":p.get("excerpt"),
        })
print("RELEASE_FIELDS_JSON")
print(json.dumps(rows,ensure_ascii=False,indent=2))


import urllib.request
req=urllib.request.Request("https://music98.news/",headers={"User-Agent":runner.UA})
html=urllib.request.urlopen(req,timeout=90).read().decode("utf-8","replace")
print("SITE_RENDERER_SHORT_HYPHEN", 'esc(p.artist)+" - "+t' in html)
print("SITE_RENDERER_EM_DASH", 'esc(p.artist)+" — "+t' in html)
print("SITE_RENDERER_EN_DASH", 'esc(p.artist)+" – "+t' in html)


target=next((p for p in posts if p.get("id")=="aufike18r1"),None)
print("FIKE_FULL_JSON")
print(json.dumps(target,ensure_ascii=False,indent=2))


# One-shot Small Town editorial rewrite; removed after verification.
import restore_small_town
restore_small_town.main()
