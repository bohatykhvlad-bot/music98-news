#!/usr/bin/env python3
from __future__ import annotations
import copy, sys, time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import post as runner

POST_ID = "auleon930r1"

EXCERPT = """The new live set pairs FROM ZERO material with "Numb," "In the End," "Faint" and other catalog staples from the band's São Paulo show."""

BODY = """LINKIN PARK have released a new live album drawn from the São Paulo concert featured in their *UNSHATTER* film. Out September 25 through Warner Records, the set brings songs from *FROM ZERO* into the same running order as material from across the band's catalog.

The 16 full performances include "Somewhere I Belong," "The Emptiness Machine," "The Catalyst," "Waiting for the End," "Casualty," "Two Faced," "Lost," "What I've Done," "Leave Out All the Rest," "Over Each Other," "Numb," "In the End," "Faint," "Papercut," "Heavy Is the Crown" and "Bleed It Out." The live version of "Faint" was released ahead of the album with an official video from the same concert.

[youtube:zNYsw-cW8v8]

*UNSHATTER* follows LINKIN PARK from private studio sessions in 2022 through the making and release of *FROM ZERO* and the São Paulo show. The band's official store says the film combines archive footage, performances from sold-out concerts and interviews with band members and fans. It also says the soundtrack contains live recordings that do not appear in the documentary.

The film covers the period after the band's seven-year hiatus and the arrival of Emily Armstrong on vocals and Colin Brittain on drums. The São Paulo set captures that lineup during the *FROM ZERO* era and reflects the transition directly. Songs from *FROM ZERO* sit alongside material from *Meteora*, *Minutes to Midnight* and *A Thousand Suns*, rather than being presented as a separate section of the show.

The physical editions use different track configurations. The CD has 20 entries, with four short pieces titled "Inception," "Creation," "Break Collapse" and "Resolution" placed between the 16 full performances. It comes in a gatefold softpak with a 12-panel accordion booklet. The two-LP edition omits those four pieces and keeps the 16 complete songs, housed in a gatefold jacket with a 12-by-24-inch insert.

The album preserves the concert sequence from "Somewhere I Belong" through "Bleed It Out," with the newer material distributed across the set instead of grouped together. That same São Paulo performance is the concert portion at the center of *UNSHATTER*, while the soundtrack carries additional live material beyond what is heard in the film."""

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
