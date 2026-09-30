#!/usr/bin/env python3
from __future__ import annotations
import copy, sys, time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import post as runner

POST_ID = "auleon930r1"

EXCERPT = """The new live set pairs FROM ZERO material with "Numb," "In the End," "Faint" and other catalog staples from the band's São Paulo show."""

BODY = """LINKIN PARK have released a new live album drawn from the São Paulo concert featured in their *UNSHATTER* film. Released September 25 through Warner Records, the set puts songs from *FROM ZERO* alongside material from across the band's catalog.

The performance sequence includes "Somewhere I Belong," "The Catalyst," "Waiting for the End," "What I've Done," "Numb," "In the End," "Faint" and "Papercut." Newer material appears throughout the same show, including "The Emptiness Machine," "Casualty," "Two Faced," "Over Each Other" and "Heavy Is the Crown." "Bleed It Out" closes the set.

[youtube:zNYsw-cW8v8]

*UNSHATTER* follows the band from private studio sessions in 2022 through the making and release of *FROM ZERO* and the São Paulo concert. According to LINKIN PARK's official store, the film combines archive footage, performances from sold-out shows and interviews with band members and fans. The accompanying live album also includes recordings that are not heard in the documentary.

The project documents the period in which Emily Armstrong and Colin Brittain joined LINKIN PARK as the band returned after a seven-year hiatus. Rather than separating the new lineup from the older catalog, the São Paulo set places songs from *FROM ZERO* directly beside material from albums including *Meteora*, *Minutes to Midnight* and *A Thousand Suns*. The live version of "Faint," released ahead of the album with an official concert video, comes from the same performance.

The physical editions use different track configurations. The CD contains 20 tracks, including four short pieces titled "Inception," "Creation," "Break Collapse" and "Resolution." Its packaging is a gatefold softpak with a 12-panel accordion booklet. The two-LP edition leaves out those four pieces and carries the 16 full performances on vinyl, with a gatefold jacket and a 12-by-24-inch insert.

That distinction is the main difference between the two physical versions. The concert itself remains the same recording, with the 16 complete performances preserved in the same running order from "Somewhere I Belong" through "Bleed It Out." """

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
