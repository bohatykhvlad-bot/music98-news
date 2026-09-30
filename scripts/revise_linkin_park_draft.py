#!/usr/bin/env python3
from __future__ import annotations
import copy, sys, time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import post as runner

POST_ID = "auleon930r1"
# Final reviewed revision.

EXCERPT = r'''The new live set pairs *FROM ZERO* material with "Numb," "In the End," "Faint" and other catalog staples from the band's São Paulo show.'''

BODY = r'''LINKIN PARK have released a new live album from the São Paulo concert featured in their *UNSHATTER* film. Out September 25 through Warner Records, it mixes songs from *FROM ZERO* with material from across the band's catalog.

The 16 full performances include "Somewhere I Belong," "The Emptiness Machine," "The Catalyst," "Waiting for the End," "Casualty," "Two Faced," "Lost," "What I've Done," "Leave Out All the Rest," "Over Each Other," "Numb," "In the End," "Faint," "Papercut," "Heavy Is the Crown" and "Bleed It Out." The live version of "Faint" was released ahead of the album with an official video from the same concert.

[youtube:zNYsw-cW8v8]

The older selections cover several parts of the band's catalog. "Somewhere I Belong," "Faint" and "Numb" come from *Meteora*, while "What I've Done" and "Leave Out All the Rest" represent *Minutes to Midnight*. "The Catalyst" and "Waiting for the End" come from *A Thousand Suns*. The newer songs are drawn from *FROM ZERO*.

*UNSHATTER* follows LINKIN PARK from private studio sessions in 2022 through the making and release of *FROM ZERO* and the São Paulo show. The band's official store says the film combines archive footage, performances from sold-out concerts and interviews with band members and fans. The soundtrack also contains live recordings that do not appear in the documentary.

The film covers the band's return after a seven-year hiatus and the arrival of Emily Armstrong on vocals and Colin Brittain on drums. The São Paulo set places the new lineup's material beside songs from earlier records instead of separating the two parts of the catalog.

The physical editions use different track configurations. The CD has 20 tracks, including four short intro and interlude pieces placed between the 16 full performances. "Inception" opens the disc, "Creation" follows "The Emptiness Machine," "Break Collapse" comes before "Lost," and "Resolution" appears before "Papercut." The CD comes in a gatefold softpak with a 12-panel accordion booklet.

The two-LP edition removes those four short pieces and keeps the 16 complete performances. It is housed in a gatefold jacket with a 12-by-24-inch insert. Both physical versions end with "Heavy Is the Crown" followed by "Bleed It Out."'''

def main():
    runner.load_env()
    def mutate(posts):
        p = next((x for x in posts if str(x.get("id")) == POST_ID), None)
        if not p:
            raise RuntimeError("draft not found")
        if (p.get("status") or "live") != "draft":
            raise RuntimeError("post is not draft")
        p["excerpt"] = EXCERPT
        p["body"] = BODY
        return copy.deepcopy(p)

    runner.guarded_write(mutate)

    # Wait for the exact revision to propagate, then run the normal editorial gate.
    for attempt in range(12):
        desk = runner.http(runner.DESK_API + "?nocache=" + str(time.time_ns()), runner.desk_key())
        p = next((x for x in desk.get("posts", []) if str(x.get("id")) == POST_ID), None)
        if p and p.get("excerpt") == EXCERPT and p.get("body") == BODY and p.get("status") == "draft":
            break
        time.sleep(2)
    else:
        raise RuntimeError("revised draft did not propagate")

    for pass_no in (1, 2, 3):
        ok, lines = runner.run_gate(POST_ID, quiet=False)
        print("GATE_PASS", pass_no, "PASS" if ok else "FAIL")
        for line in lines:
            if "PASS" in line or "FAIL" in line or line.lstrip().startswith(("X ", "! ")):
                print(line)
        if not ok:
            raise RuntimeError(f"gate failed on pass {pass_no}")

if __name__ == "__main__":
    main()
