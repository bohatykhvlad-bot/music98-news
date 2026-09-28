#!/usr/bin/env python3
from __future__ import annotations
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import post as runner

PID="aujlfire28r1"

EXCERPT="""John Legend and Pharrell Williams have released "Fireflies," the latest song from Legend's forthcoming album *Muse*. The 16-track album arrives October 23 through Republic Records."""

BODY='''John Legend and Pharrell Williams have released "Fireflies," the latest song from Legend's forthcoming album *Muse*. The 16-track album arrives October 23 through Republic Records. It is a big arrangement that rarely feels busy. Legend stays at the piano while strings, horns, choir and rhythm section gather around him, and Pharrell's vocal remains part of the texture instead of becoming the main event. The song works because nobody is fighting for space. Legend keeps the center, and everything else adds weight around him.

Paul Hunter's video understands that balance. Legend performs with the Hollywood Cinematic Orchestra while the camera moves through portraits of people living in a housing project. Hunter does not force a plot onto the song. The faces, rooms and streets give it a social setting, then the film returns to the performance. That simplicity helps. A more elaborate concept could have overwhelmed the track; here, the orchestra gives the clip scale and the people on screen keep it human.

[youtube:fEw6VZq9xg8]

*Muse* grew out of Legend's appearance on Clipse's *Let God Sort 'Em Out*. Pharrell heard his vocal on "The Birds Don't Sing" and suggested a full album, much of it later written and recorded at his studio inside Louis Vuitton headquarters in Paris. He produced all 16 songs and co-wrote the record. That is enough context to explain why "Fireflies" feels cohesive rather than assembled around a feature.

The album draws from gospel, standards, doo-wop, classic soul, Afrobeat and hip-hop, with Nina Simone, Nat King Cole and Marvin Gaye among the reference points the pair cited. "Fireflies" comes late in the sequence, after "Doing Me" and before "Everything," and follows the earlier single "Daylight." Despite the wide list of influences, the song itself is easy to follow. Piano and voice lead. The orchestra fills the edges, and the choir gives the chorus its lift.

The production leaves Legend's familiar strengths intact, especially the piano-led writing and controlled vocal, while giving them a richer frame. Pharrell adds movement without stamping his own sound over the track. "Fireflies" stays polished and expansive without letting the production bury the song.'''

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
