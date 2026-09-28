#!/usr/bin/env python3
from __future__ import annotations
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import post as runner

PID="aujlfire28r1"

EXCERPT="""John Legend and Pharrell Williams have released "Fireflies," the latest song from Legend's forthcoming album *Muse*. The 16-track album arrives October 23 through Republic Records."""

BODY='''John Legend and Pharrell Williams have released "Fireflies," the latest song from Legend's forthcoming album *Muse*. The 16-track album arrives October 23 through Republic Records. "Fireflies" puts Legend at the piano while strings, horns, choir and rhythm section widen the arrangement around him. Pharrell is there as a featured vocalist, but the song does not turn into a back-and-forth duet. His presence is folded into the production, which fits an album he produced in full and co-wrote with Legend.

Paul Hunter's video keeps the scale of the recording in view. Legend performs at the piano with the Hollywood Cinematic Orchestra as the film moves through portraits of people living in a housing project. Instead of cutting away to a separate plot, Hunter stays close to the people and the performance. The official release ties those images to the song's themes of inequality, loss and resilience, so the video gives the music a setting without pulling attention away from Legend at the center.

[youtube:fEw6VZq9xg8]

The collaboration behind *Muse* started with Legend's appearance on Clipse's *Let God Sort 'Em Out*. His vocal on "The Birds Don't Sing" caught Pharrell's attention and led him to suggest a full album built around Legend's voice. The two then wrote and recorded at Pharrell's studio inside Louis Vuitton headquarters in Paris. Legend later said the project felt "past due." For two artists who have known each other for more than twenty years, *Muse* is their first album made together from start to finish.

That history matters because Pharrell is not just dropping into a few songs. He produced all 16 tracks and co-wrote the album, while Legend gave him more creative control than he usually hands to another writer or producer. The record moves through gospel, standards, doo-wop, classic soul, Afrobeat and hip-hop, with Nina Simone, Nat King Cole and Marvin Gaye among the reference points the pair cited. "Fireflies" sits inside that mix as a piano-led song with a much larger ensemble built around it.

[apple:song:6808409890:6808409913]

"Fireflies" appears at No. 14 on *Muse*, after "Doing Me" and before "Everything." It follows "Daylight," the album's lead single, and is one of several songs that also feature Pharrell. He appears on the title track, "Her," "Get Back," "Are You OK?" and "Next Time," while Clipse guests on "Bodies On The Floor." That track list makes the scale of the partnership clear, but "Fireflies" is one of the places where the arrangement does more of the talking than the guest credit.

For Legend, that is part of the point of *Muse*. He has spent much of his career being associated with piano-driven ballads, and he said he wanted this album to "shake up the formula." "Fireflies" still starts from the part of his sound listeners know best, his voice and piano, then opens outward through choir, orchestra and Pharrell's production. It is a familiar John Legend setup pushed into a denser, more cinematic frame, without turning the song into a showcase for anyone but Legend.'''

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
