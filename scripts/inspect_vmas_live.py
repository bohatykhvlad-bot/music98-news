#!/usr/bin/env python3
from __future__ import annotations
import json
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
import post as runner

PID="vmas26results"
runner.load_env()
posts=runner.desk_read()["posts"]
p=next((x for x in posts if x.get("id")==PID),None)
if not p:
    raise SystemExit("VMA post not found")
print("VMA_CURRENT_JSON")
print(json.dumps(p, ensure_ascii=False, indent=2))

import re, html, urllib.request
UA="Mozilla/5.0"
for label,url in [
    ("GENERAL","https://www.paramountpressexpress.com/mtv/shows/2026-mtv-video-music-awards-vmas/releases/?view=113133-nominations-revealed-for-2026-mtv-video-music-awards-vmas-airing-live-from-los-angeles-sunday-sept-27-on-cbs"),
    ("SOCIAL","https://www.paramountpressexpress.com/mtv/shows/2026-mtv-video-music-awards-vmas/releases/?view=113265-social-categories-revealed-for-the-2026-mtv-video-music-awards-vmas-sunday-sept-27-on-cbs"),
    ("WINNERS","https://www.paramountpressexpress.com/mtv/shows/2026-mtv-video-music-awards-vmas/releases/?view=113315-winners-revealed-for-the-2026-mtv-video-music-awards-vmas-on-cbs"),
]:
    req=urllib.request.Request(url,headers={"User-Agent":UA})
    raw=urllib.request.urlopen(req,timeout=90).read().decode("utf-8","replace")
    txt=re.sub(r"<script[\s\S]*?</script>"," ",raw,flags=re.I)
    txt=re.sub(r"<style[\s\S]*?</style>"," ",txt,flags=re.I)
    txt=re.sub(r"<[^>]+>","\n",txt)
    txt=html.unescape(txt)
    txt=re.sub(r"\r","",txt)
    txt=re.sub(r"\n[ \t]*\n+","\n",txt)
    start=0
    for needle in ("2026 “VMAs” Nominees:","Best Group","WINNERS IN EACH CATEGORY BELOW:"):
        q=txt.find(needle)
        if q>=0:
            start=q
            break
    print("OFFICIAL_"+label)
    print(txt[start:start+35000])
