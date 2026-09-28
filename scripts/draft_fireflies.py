#!/usr/bin/env python3
from __future__ import annotations
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import post as runner

PID="aujlfire28r1"

EXCERPT="""John Legend and Pharrell Williams have released "Fireflies," the latest preview of Legend's forthcoming album *Muse*. The 16-track record arrives October 23 through Republic Records."""

BODY='''John Legend and Pharrell Williams have released "Fireflies," the latest preview of Legend's forthcoming album *Muse*. The 16-track record arrives October 23 through Republic Records.

"Fireflies" keeps the arrangement large without losing sight of Legend at the piano. Strings, horns, choir and rhythm section build around him, while Pharrell stays mostly in the background, shaping the track rather than turning it into a conventional duet. It plays like a full-band soul performance, with Legend carrying the melody and the ensemble widening the song around him.

The video, directed by Paul Hunter, follows the same idea. Legend performs at the piano with the Hollywood Cinematic Orchestra as the film moves through portraits of people living in a housing project. The images do not compete with the performance. They give the song a social frame, tying its themes of inequality, grief and resilience to faces and places rather than building a separate storyline.

[youtube:fEw6VZq9xg8]

The track also shows how closely Legend and Pharrell are working on *Muse*. Pharrell produced the album in full and co-wrote the project, and the sessions grew out of Legend's appearance on Clipse's *Let God Sort 'Em Out*. After hearing that collaboration, Pharrell pushed for a larger record built around Legend's voice. Much of the album was then written and recorded at Pharrell's studio inside Louis Vuitton headquarters in Paris.

[apple:song:6808409890:6808409913]

That partnership gives *Muse* a different shape from a one-off producer pairing. Legend and Pharrell have known each other for more than two decades, but this is their first full album together. The record draws from gospel, standards, doo-wop, classic soul, Afrobeat and hip-hop, with Legend's voice staying at the center while Pharrell handles the production across all 16 tracks.

"Fireflies" lands late in the sequence, at track 14, after the earlier single "Daylight." Pharrell also appears as a featured artist elsewhere on the album, including the title track, "Her," "Get Back," "Are You OK?" and "Next Time," while Clipse guests on "Bodies On The Floor." His role is bigger than those features, though. He is the producer across the record, and "Fireflies" makes that collaboration feel most visible in the way the song is built around Legend rather than around Pharrell himself.

[apple:album:6808409890]

Hunter also directed the "Daylight" video, so "Fireflies" continues the same visual partnership into the next stage of the album rollout. This time the scale is wider, but the focus stays simple: Legend at the piano, a live ensemble around him, and a video that keeps returning to the people the song is meant to speak about.'''

def main():
    runner.load_env()
    def mutate(posts):
        p=runner.find_post(posts,PID)
        p["body"]=BODY
        p["excerpt"]=EXCERPT
        p["status"]="draft"
        return p
    now=runner.guarded_write(mutate)
    print("DRAFT", now["id"], now["status"], runner.words(now["body"]), "words")
    ok=runner.cmd_gate(PID)
    print("GATE_AFTER_DRAFT", "PASS" if ok else "FAIL")
    runner.cmd_show(PID)
if __name__=="__main__":
    main()
