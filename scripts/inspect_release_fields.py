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
