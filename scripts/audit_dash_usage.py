#!/usr/bin/env python3
from __future__ import annotations
import json, re, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import post as runner

ROOT=Path(__file__).resolve().parents[1]
DASHES=("—","–")

def dash_contexts(text: str):
    out=[]
    for m in re.finditer(r".{0,90}[—–].{0,90}", text):
        s=m.group(0).replace("\n","\\n")
        out.append(s)
    return out

def main():
    runner.load_env()
    posts=runner.desk_read()["posts"]
    post_hits=[]
    for p in posts:
        fields=[]
        for k,v in p.items():
            if not isinstance(v,str) or not any(d in v for d in DASHES):
                continue
            fields.append({
                "field":k,
                "counts":{d:v.count(d) for d in DASHES if d in v},
                "contexts":dash_contexts(v)[:50],
            })
        if fields:
            post_hits.append({
                "id":p.get("id"),
                "status":p.get("status"),
                "title":p.get("title"),
                "fields":fields,
            })
    print("POST_HITS_JSON")
    print(json.dumps(post_hits,ensure_ascii=False))
    print("POST_HIT_COUNT",len(post_hits),"OF",len(posts))

    paths=[]
    for base in [ROOT/"public",ROOT/"functions",ROOT/"worker.js",ROOT/"docs"]:
        if base.is_file():
            paths.append(base)
        elif base.exists():
            paths.extend(x for x in base.rglob("*") if x.is_file())
    file_hits=[]
    for p in sorted(set(paths)):
        try:
            txt=p.read_text(encoding="utf-8")
        except Exception:
            continue
        if not any(d in txt for d in DASHES):
            continue
        file_hits.append({
            "path":str(p.relative_to(ROOT)),
            "counts":{d:txt.count(d) for d in DASHES if d in txt},
            "contexts":dash_contexts(txt)[:80],
        })
    print("FILE_HITS_JSON")
    print(json.dumps(file_hits,ensure_ascii=False))
    print("FILE_HIT_COUNT",len(file_hits))

if __name__=="__main__":
    main()
