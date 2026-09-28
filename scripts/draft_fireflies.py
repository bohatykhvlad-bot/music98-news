#!/usr/bin/env python3
from __future__ import annotations
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import post as runner

PID="aujlfire28r1"

EXCERPT="""John Legend has released "Fireflies," featuring Pharrell Williams, as the latest single from his forthcoming album *Muse*. The 16-track album arrives October 23 through Republic Records."""

BODY='''John Legend has released "Fireflies," featuring Pharrell Williams, as the latest single from his forthcoming album *Muse*. The 16-track album arrives October 23 through Republic Records. The song starts with Legend at the piano and gradually opens into strings, horns, choir and a full rhythm section. Pharrell wrote the track and appears on the recording, but the arrangement keeps Legend's voice at the center. "Fireflies" grows by adding players around the piano instead of building toward a conventional back-and-forth duet.

Paul Hunter directed the video, which pairs Legend's performance with the Hollywood Cinematic Orchestra and portraits of people living in a housing project. The film moves between the orchestra and quieter scenes of everyday life without turning them into a separate storyline. Its themes of inequality, loss and resilience are already present in the song, so the video gives those ideas a setting instead of explaining them again. Hunter also directed the earlier "Daylight" video, giving the first two singles from *Muse* a shared visual hand.

[youtube:fEw6VZq9xg8]

The recording itself is built as an ensemble piece. Voices of Fire joins the choir, while Larry Gold and Matt Jones conduct the orchestral players and Terrace Martin is among the arrangers. Those details matter more here than a long list of features. The piano stays exposed enough to keep the song recognizably Legend, while the choir and orchestra give the chorus a broader scale.

*Muse* took shape after Legend appeared on Clipse's *Let God Sort 'Em Out*. His vocal on "The Birds Don't Sing" led Pharrell to suggest a full album built around Legend's voice. Much of the record was written and recorded at Pharrell's studio inside Louis Vuitton headquarters in Paris. Pharrell produced all 16 songs and co-wrote the album. Legend has said he also recorded material Pharrell wrote entirely on his own, something he rarely does on his records.

The album pulls from gospel, standards, doo-wop, classic soul, Afrobeat and hip-hop, with Nina Simone, Nat King Cole and Marvin Gaye among the references Legend and Pharrell have cited. "Fireflies" sits at No. 14 on the tracklist, between "Doing Me" and "Everything," and follows the earlier single "Daylight." Clipse also appears on the album with "Bodies On The Floor." The full record is due October 23.'''

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
