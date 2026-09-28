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

BODY='''John Legend has released "Fireflies," featuring Pharrell Williams, as the latest single from his forthcoming album *Muse*. The 16-track album arrives October 23 through Republic Records. The song starts with Legend at the piano, then opens into strings, horns, choir and a full rhythm section. Pharrell appears more as a supporting voice than a duet partner, while Legend carries the melody from the piano.

Paul Hunter directs the video, cutting between Legend with the Hollywood Cinematic Orchestra and portraits of residents in a housing project. The film moves through rooms, streets and faces without losing sight of the performance. The orchestra gives the clip scale, while the quieter scenes keep it close to everyday life. Hunter directed "Daylight" too, and both videos put the performance ahead of spectacle.

[youtube:fEw6VZq9xg8]

*Muse* started after Legend's guest appearance on Clipse's *Let God Sort 'Em Out*. His vocal there prompted Pharrell to suggest a full album, much of it later written and recorded in Paris. Pharrell produced all 16 songs and co-wrote the project, while Legend gave him more room than usual to shape the material. That origin explains the album without turning "Fireflies" into a story about the producer.

The song itself stays compact. Piano and voice lead the verses, then the choir and orchestra widen the chorus without pushing the arrangement into a showpiece. That balance is where "Fireflies" works best. The production adds scale, but the melody remains easy to follow and the track never loses the quiet pull of Legend's delivery.

The album moves through gospel, standards, doo-wop, classic soul, Afrobeat and hip-hop, but "Fireflies" does not try to carry all of that at once. It sits closer to the piano-led side of Legend's catalog and uses the larger ensemble to change the texture rather than the basic shape of the song. Coming after "Daylight," it also gives a clearer sense of how broad *Muse* can be without making the singles feel disconnected.

There is enough detail in the arrangement to make the song feel bigger than a standard ballad, but the writing stays direct. "Fireflies" is not built around a dramatic switch or a guest verse taking over the track. The choir, orchestra and Pharrell's vocal all serve the same center, which keeps the single focused even as the sound opens up.

"Fireflies" does not reinvent John Legend, and it does not need to. It takes the voice-and-piano foundation that has defined much of his work and gives it a broader setting ahead of *Muse*.'''

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
