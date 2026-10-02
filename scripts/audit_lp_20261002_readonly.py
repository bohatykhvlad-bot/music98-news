#!/usr/bin/env python3
import sys,json,time
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import post
post.load_env()
data=post.http(post.DESK_API+"?nocache="+str(time.time_ns()),post.desk_key())
matches=[p for p in data["posts"] if "LINKIN PARK" in str(p.get("artist","")).upper()]
for p in matches:
 print("LP_ID",p.get("id"),"STATUS",p.get("status"),"TITLE",p.get("title"),"COVER",json.dumps(p.get("cover")),flush=True)
 print("EXCERPT",p.get("excerpt"),flush=True)
 print("BODY_BEGIN",flush=True)
 print(p.get("body"),flush=True)
 print("BODY_END",flush=True)
