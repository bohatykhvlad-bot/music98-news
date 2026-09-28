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
