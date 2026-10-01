#!/usr/bin/env python3
from __future__ import annotations
import copy, sys, time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import post as runner

POST_ID = "auleon930r1"
# Final reviewed revision.

EXCERPT = r'''The band's new live set, released September 25 through Warner Records, captures the São Paulo concert featured in *UNSHATTER*.'''

BODY = r'''The band's new live set, released September 25 through Warner Records, captures the São Paulo concert featured in *UNSHATTER*. Recorded at the *FROM ZERO* album-release show in November 2024, the soundtrack keeps the concert running order and places the newer songs alongside material from earlier LINKIN PARK albums.

The 16 full performances include "Somewhere I Belong," "The Emptiness Machine," "The Catalyst," "Waiting for the End," "Casualty," "Two Faced," "Lost," "What I've Done," "Leave Out All the Rest," "Over Each Other," "Numb," "In the End," "Faint," "Papercut," "Heavy Is the Crown" and "Bleed It Out." The recording follows the set from "Somewhere I Belong" through the closing "Bleed It Out," with the *FROM ZERO* songs spread across the show.

The older selections cover several periods in the band's catalog. "Somewhere I Belong," "Faint" and "Numb" come from *Meteora*. "What I've Done" and "Leave Out All the Rest" represent *Minutes to Midnight*, while "The Catalyst" and "Waiting for the End" come from *A Thousand Suns*. The live version of "Faint" was released ahead of the album with an official video from the same São Paulo performance.

[youtube:zNYsw-cW8v8]

*UNSHATTER* follows LINKIN PARK from private studio sessions in 2022 through the making and release of *FROM ZERO* and the São Paulo concert. The film combines archive footage, performances from sold-out shows and interviews with the band and fans. The soundtrack also includes live recordings that do not appear in the documentary.

The film covers the band's return after a seven-year hiatus and the arrival of Emily Armstrong on vocals and Colin Brittain on drums. Directed by Joe Hahn, *UNSHATTER* opened in theaters worldwide on September 30 for a limited run. The São Paulo recording captures the new lineup onstage with both *FROM ZERO* material and songs from across the band's catalog.

The physical editions use different track configurations. The CD has 20 tracks, including four short pieces placed between the 16 full performances. "Inception" opens the disc, "Creation" follows "The Emptiness Machine," "Break Collapse" comes before "Lost," and "Resolution" appears before "Papercut." The CD comes in a gatefold softpak with a 12-panel accordion booklet. The two-LP edition leaves out those four pieces and carries the 16 complete performances in a gatefold jacket with a 12-by-24-inch insert.'''

AI_STYLE_FLAGS = ("marks a new chapter","comes at a time","not only","rather than simply","serves as a","underscores","showcases","official store says","the band's official store says")

def main():
    runner.load_env()
    def mutate(posts):
        p = next((x for x in posts if str(x.get("id")) == POST_ID), None)
        if not p:
            raise RuntimeError("draft not found")
        if (p.get("status") or "live") != "live":
            raise RuntimeError("post is not live")
        p["excerpt"] = EXCERPT
        p["body"] = BODY
        return copy.deepcopy(p)

    low = BODY.lower()
    bad = [x for x in AI_STYLE_FLAGS if x in low]
    print("AI_STYLE_SCAN", bad)
    if bad:
        raise RuntimeError(f"AI-style phrase(s) remain: {bad}")

    runner.guarded_write(mutate)

    # Wait for the exact revision to propagate, then run the normal editorial gate.
    for attempt in range(12):
        desk = runner.http(runner.DESK_API + "?nocache=" + str(time.time_ns()), runner.desk_key())
        p = next((x for x in desk.get("posts", []) if str(x.get("id")) == POST_ID), None)
        if p and p.get("excerpt") == EXCERPT and p.get("body") == BODY and p.get("status") == "live":
            break
        time.sleep(2)
    else:
        raise RuntimeError("revised draft did not propagate")

    for pass_no in (1, 2, 3):
        ok = False
        lines = []
        for gate_attempt in range(6):
            ok, lines = runner.run_gate(POST_ID, quiet=False)
            print("GATE_PASS", pass_no, "ATTEMPT", gate_attempt + 1, "PASS" if ok else "FAIL")
            for line in lines:
                if "PASS" in line or "FAIL" in line or line.lstrip().startswith(("X ", "! ")):
                    print(line)
            if ok:
                break
            time.sleep(3)
        if not ok:
            raise RuntimeError(f"gate failed on pass {pass_no}")
    runner.cmd_verify(POST_ID)

if __name__ == "__main__":
    main()
