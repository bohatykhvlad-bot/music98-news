#!/usr/bin/env python3
from __future__ import annotations
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import post as runner

PID="aujlfire28r1"

EXCERPT="""John Legend and Pharrell Williams have released "Fireflies," the latest song from Legend's forthcoming album *Muse*. The 16-track album arrives October 23 through Republic Records."""

BODY='''John Legend and Pharrell Williams have released "Fireflies," the latest song from Legend's forthcoming album *Muse*. The 16-track album arrives October 23 through Republic Records. The song is lush without feeling overworked. Legend stays at the piano, surrounded by strings, horns, choir and a full rhythm section, while Pharrell's part is woven into the track instead of pushed forward as a big guest moment. That choice works. "Fireflies" feels more like a John Legend performance that has been given extra room and color than a duet built to advertise two famous names.

Paul Hunter's video follows the same instinct. Legend performs with the Hollywood Cinematic Orchestra while the camera moves through portraits of people living in a housing project. There is no elaborate plot competing with the song, and the clip is stronger for it. The faces, rooms and streets give the music weight without turning the video into a lecture. Hunter keeps returning to Legend and the orchestra, so the scale stays cinematic while the performance still feels personal.

[youtube:fEw6VZq9xg8]

*Muse* began after Legend appeared on Clipse's *Let God Sort 'Em Out*. Pharrell heard what he was doing on "The Birds Don't Sing" and pushed the idea toward a full album, much of it written and recorded at his studio inside Louis Vuitton headquarters in Paris. He produced all 16 tracks and co-wrote the record. That is the useful bit of context here, because "Fireflies" does not sound like a random feature added late in the process. The production, arrangement and guest vocal all come from the same musical world.

The album moves through gospel, standards, doo-wop, classic soul, Afrobeat and hip-hop, with Nina Simone, Nat King Cole and Marvin Gaye among the reference points Legend and Pharrell cited. "Fireflies" lands near the end of the sequence, after "Doing Me" and before "Everything," and follows the earlier single "Daylight." On paper, the list of styles and influences could make *Muse* sound overly busy. This song suggests the opposite. The arrangement is big, but the melody remains easy to follow and Legend never has to fight the production for attention.

That balance is what makes "Fireflies" interesting to me. Legend's most familiar tools are all here, especially the piano and the warm, controlled vocal, but the track is not content to stay in the usual ballad lane. The choir and orchestra give it more lift, while Pharrell adds movement without making the song sound like one of his own records. It is a polished, expensive-sounding piece of soul-pop, but the polish never becomes the point. The performance does.'''

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
