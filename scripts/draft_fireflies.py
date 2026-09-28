#!/usr/bin/env python3
from __future__ import annotations
import base64
import sys
import urllib.request
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import post as runner

PID="aujlfire28r1"
COVER_URL="https://johnlegend.com/img/hero-0011.webp"
COVER_NAME="john-legend-muse-official.webp"

EXCERPT="""John Legend has released "Fireflies," featuring Pharrell Williams, as the latest single from his forthcoming album *Muse*. The 16-track album arrives October 23 through Republic Records."""

BODY='''John Legend has released "Fireflies," featuring Pharrell Williams, as the latest single from his forthcoming album *Muse*. The 16-track album arrives October 23 through Republic Records. The song starts with Legend at the piano, then opens into strings, horns, choir and a full rhythm section. Pharrell's vocal sits inside the arrangement as another layer, while Legend carries the melody from the piano.

Paul Hunter directs the video, cutting between Legend with the Hollywood Cinematic Orchestra and portraits of residents in a housing project. The film keeps the performance in view while moving through rooms, streets and faces around it. The orchestra gives the clip scale, while the quieter scenes keep it tied to everyday life. Hunter also directed the earlier "Daylight" video, so the two singles share a simple, performance-led visual approach.

[youtube:fEw6VZq9xg8]

*Muse* started after Legend's guest appearance on Clipse's *Let God Sort 'Em Out*. That vocal led to a full album, much of it written and recorded in Paris. Pharrell produced all 16 songs and co-wrote the project. On "Fireflies," the familiar piano-led core is still there, but the arrangement around it is broader and more orchestral.

For all the styles attached to *Muse*, "Fireflies" itself is fairly direct. Piano and voice lead, the choir and orchestra widen the chorus, and the production leaves enough space for Legend to remain the focus. It is a fuller version of the piano-led sound he is best known for.'''

def ensure_cover():
    req=urllib.request.Request(COVER_URL, headers={"User-Agent": runner.UA})
    with urllib.request.urlopen(req, timeout=90) as r:
        raw=r.read()
    if len(raw) > 3_000_000:
        raise RuntimeError("official cover exceeds photo API limit")
    payload={
        "name": COVER_NAME,
        "data": "data:image/webp;base64," + base64.b64encode(raw).decode("ascii"),
    }
    out=runner.http("https://music98.news/api/photo", runner.desk_key(), payload, method="POST")
    if not out.get("ok"):
        raise RuntimeError("cover upload failed: " + repr(out))
    print("COVER_UPLOAD", out.get("url"), out.get("bytes"))
    return out["url"]

def main():
    runner.load_env()
    cover_src=ensure_cover()
    def mutate(posts):
        p=runner.find_post(posts,PID)
        p["body"]=BODY
        p["excerpt"]=EXCERPT
        p["status"]="draft"
        p["cover"]={
            "kind":"img",
            "src":cover_src,
            "credit":"John Legend",
            "creditUrl":"https://johnlegend.com/",
            "pos":"50% 55%",
            "zoom":1,
            "cardY":0.55,
            "cardZoom":1,
            "lockX":0.50,
            "cardX":0.42,
        }
        return p
    now=runner.guarded_write(mutate)
    print("DRAFT", now["id"], now["status"], runner.words(now["body"]), "words")
    ok=runner.cmd_gate(PID)
    print("GATE_AFTER_DRAFT", "PASS" if ok else "FAIL")
    runner.cmd_show(PID)
if __name__=="__main__":
    main()
