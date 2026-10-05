#!/usr/bin/env python3
import json, os, time, urllib.request

API="https://music98.news/api/desk"
IDS=["shakira26amazonmadrid","auvictoriafol26r1"]
key=os.environ["ADMIN_PASSWORD"]
headers={"X-Admin-Key":key,"Accept":"application/json","Content-Type":"application/json","Cache-Control":"no-cache","User-Agent":"Mozilla/5.0"}

def get(n=0):
    req=urllib.request.Request(API+"?finalclean=%d_%d"%(int(time.time()*1000),n),headers=headers)
    with urllib.request.urlopen(req,timeout=30) as r:
        return json.loads(r.read().decode())

before=get(0)
sh=next(p for p in before["posts"] if p.get("id")==IDS[0])
vi=next(p for p in before["posts"] if p.get("id")==IDS[1])
if sh.get("status")!="live" or vi.get("status")!="live":
    raise SystemExit("targets not live")

others=json.dumps([p for p in before["posts"] if p.get("id") not in IDS],sort_keys=True,ensure_ascii=False)
meta={p["id"]:json.dumps({k:v for k,v in p.items() if k!="body"},sort_keys=True,ensure_ascii=False) for p in (sh,vi)}

old='Madrid was the first time Shakira and Dua Lipa performed the song together.'
new='That Bogotá performance happened on the same night Shakira was singing "Antología" in Asunción.'
if old not in sh["body"]:
    raise SystemExit("Shakira duplicate sentence not found")
sh["body"]=sh["body"].replace(old,new)

old='Its first projects include hands-on food education and community gardens. The connection to the album is unusually direct.'
new='Its first projects include hands-on food education and community gardens, while planned workshops connect food with science, gut health, brain function and creativity. The connection to the album is unusually direct.'
if old not in vi["body"]:
    raise SystemExit("Victoria finale target not found")
vi["body"]=vi["body"].replace(old,new)

payload=json.dumps({"posts":before["posts"],"touched":IDS},ensure_ascii=False).encode()
req=urllib.request.Request(API,data=payload,headers=headers,method="POST")
with urllib.request.urlopen(req,timeout=30) as r:
    if r.status>=300: raise SystemExit("save failed")

for i in range(1,21):
    time.sleep(2)
    after=get(i)
    sh2=next(p for p in after["posts"] if p.get("id")==IDS[0])
    vi2=next(p for p in after["posts"] if p.get("id")==IDS[1])
    if sh2.get("body")!=sh.get("body") or vi2.get("body")!=vi.get("body"):
        continue
    if json.dumps([p for p in after["posts"] if p.get("id") not in IDS],sort_keys=True,ensure_ascii=False)!=others:
        raise SystemExit("other posts changed")
    for p in (sh2,vi2):
        m=json.dumps({k:v for k,v in p.items() if k!="body"},sort_keys=True,ensure_ascii=False)
        if m!=meta[p["id"]]:
            raise SystemExit("metadata changed "+p["id"])
    print("FINAL_COPY_FIXES_APPLIED")
    break
else:
    raise SystemExit("KV verify timeout")
