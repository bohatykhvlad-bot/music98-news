#!/usr/bin/env python3
from __future__ import annotations
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import post as runner

PID="aujlfire28r1"

EXCERPT="""John Legend and Pharrell Williams have released "Fireflies," the latest song from Legend's forthcoming album *Muse*. The 16-track album arrives October 23 through Republic Records."""

BODY='''John Legend and Pharrell Williams have released "Fireflies," the latest song from Legend's forthcoming album *Muse*. The 16-track album arrives October 23 through Republic Records. It is a large arrangement, but it never feels crowded. Legend stays at the piano while strings, horns, choir and rhythm section build around him, and Pharrell's vocal sits inside the song instead of taking over as a headline feature. That restraint suits the track. The focus stays on Legend, with the extra instrumentation giving him more space rather than more competition.

Paul Hunter's video takes the same approach. Legend performs with the Hollywood Cinematic Orchestra while the camera moves through portraits of people living in a housing project. Hunter avoids turning those scenes into a separate story or a piece of heavy-handed symbolism. The faces, rooms and streets are simply there, giving the song a social setting before the film returns to the performance. It is a straightforward idea, but the lack of spectacle helps. The orchestra gives the clip scale, while the people on screen keep it grounded.

[youtube:fEw6VZq9xg8]

*Muse* started after Legend appeared on Clipse's *Let God Sort 'Em Out*. Pharrell heard his vocal on "The Birds Don't Sing" and suggested building a full album around that side of his voice. Much of the record was then written and recorded at Pharrell's studio inside Louis Vuitton headquarters in Paris. He produced all 16 songs and co-wrote the album. That background explains the consistency of "Fireflies" better than the guest credit does. Nothing about the track feels added on at the end.

The album pulls from gospel, standards, doo-wop, classic soul, Afrobeat and hip-hop, with Nina Simone, Nat King Cole and Marvin Gaye among the reference points the pair cited. "Fireflies" arrives near the end, after "Doing Me" and before "Everything," and follows the earlier single "Daylight." The list of influences is broad, but this song is easy to read. Piano and voice lead, the orchestra fills the edges, and the choir gives the chorus its lift. There is plenty happening, but the melody never gets buried.

For me, that is the strongest thing about "Fireflies." Legend is not trying to reinvent himself here, and the song does not need him to. The familiar piano-led writing is still there, only with a richer frame around it. Pharrell adds movement and detail without pulling the record toward his own sound, and Hunter's video understands the same thing. Both leave Legend in the middle and build outward from him. It is polished, but not sterile, and it gives *Muse* a much clearer personality than another oversized feature would have.'''

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
