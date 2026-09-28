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

BODY='''John Legend has released "Fireflies," featuring Pharrell Williams, as the latest single from his forthcoming album *Muse*. The 16-track album arrives October 23 through Republic Records. The song opens with Legend at the piano, then expands into strings, horns, choir and a full rhythm section. Pharrell remains in the background, leaving Legend to carry the melody through the track.

Paul Hunter directs the video, cutting between Legend with the Hollywood Cinematic Orchestra and portraits of residents in a housing project. The film moves through rooms, streets and faces, returning regularly to the performance. The ensemble gives the clip a larger frame, while the quieter scenes keep it close to everyday life. The camera lingers on faces long enough for them to register, then returns to Legend and the players around him. Hunter directed "Daylight" too, and both videos favor performance over spectacle from start to finish.

[youtube:fEw6VZq9xg8]

*Muse* started after Legend's guest appearance on Clipse's *Let God Sort 'Em Out*. His vocal there prompted Pharrell to suggest a full album, much of it later written and recorded in Paris. Pharrell produced all 16 songs and co-wrote the project, while Legend gave him more room than usual to shape the material. That origin gives the album a clear frame while "Fireflies" stays centered on Legend rather than the collaboration around him.

The song itself stays compact. Piano and voice lead the verses, then the choir and strings widen the chorus while the arrangement remains measured. The production adds weight without burying the melody, and Legend's restrained delivery keeps the track grounded as more instruments gather around him. The result feels fuller than a standard piano ballad, but the writing never loses its directness.

The album moves through gospel, standards, doo-wop, classic soul, Afrobeat and hip-hop, and "Fireflies" draws most directly from the piano-led side of Legend's catalog. It does not try to preview every corner of *Muse*. Instead, it shows how the album can stretch a familiar part of his sound into something broader without turning the song into a showcase for production.

After "Daylight," "Fireflies" makes the direction of *Muse* easier to read. The first two singles suggest an album built around Legend's established strengths, but with Pharrell pushing the scale, texture and setting further than usual. Rather than announcing a reinvention, "Fireflies" points to a record interested in widening the frame around a voice that already knows exactly where it belongs.'''

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
    print("COVER_CROP", "pos="+str(now.get("cover",{}).get("pos")), "cardX="+str(now.get("cover",{}).get("cardX")), "cardY="+str(now.get("cover",{}).get("cardY")), "cardZoom="+str(now.get("cover",{}).get("cardZoom")))
    ok=runner.cmd_gate(PID)
    print("GATE_AFTER_DRAFT", "PASS" if ok else "FAIL")
    runner.cmd_show(PID)
if __name__=="__main__":
    main()
