#!/usr/bin/env python3
from __future__ import annotations
import copy
import re
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import post as runner

POST_ID = "lisa26vegas"

EXCERPT = """LISA has expanded VIVA LA LISA at The Colosseum at Caesars Palace to six shows, adding November 12 and 29 after the original four dates sold out in under 10 minutes."""

BODY_TEMPLATE = """LISA has expanded VIVA LA LISA at The Colosseum at Caesars Palace to six shows, adding November 12 and 29 after the original four dates sold out in under 10 minutes. The residency now opens a day earlier than first announced and closes a day later, turning each of the two Las Vegas weekends into a three-night run.

The full schedule is November 12, 13 and 14, followed by November 27, 28 and 29. General sale for the two added performances began September 30 through Ticketmaster, while the four dates announced in March remain in place. Caesars Entertainment says the run makes LISA the first K-pop artist to hold a Las Vegas residency. The Colosseum is a 4,300-seat theater inside Caesars Palace, and the two added dates extend each of the original weekends by one night without changing venues.

[apple:song:6807119565:6807119568]

The Las Vegas dates come just after *PRESS PLAY*, LISA's new EP, due October 23 through LLOUD Co. and RCA Records. "SaWaDiKa" is the first single. Thom Bridges and Ojivolta produced the track, while Bang Jae Yeob directed the video, filmed around Bangkok. Caesars says the video drew 70.8 million views in its first 24 hours.

[youtube:FMX98ROVRCE]

LISA first performed "SaWaDiKa" on television at the 2026 MTV Video Music Awards, where "Dream feat. Kentaro Sakaguchi" won Best Pop. By the time the Las Vegas run begins, *PRESS PLAY* will have been out for almost three weeks.

[tickets:__TICKET__]

Her fall schedule also includes *Always Lalisa*, a documentary directed by Sue Kim that premiered at the Toronto International Film Festival. Sony Music Vision says the film follows LISA through a year of solo work, acting and building her own company before returning to BLACKPINK. It will play in cinemas worldwide, with some screenings in IMAX, before streaming globally on YouTube Premium."""

AI_STYLE_FLAGS = (
    "marks a new chapter",
    "comes at a time",
    "not only",
    "rather than simply",
    "serves as a",
    "underscores",
    "showcases",
    "the announcement lands",
    "in a move that",
    "signals a",
    "cementing",
    "further solidifies",
    "setting the stage",
    "against the backdrop",
    "in the wake of",
    "at a time when",
    "a testament to",
    "pivotal year",
    "beyond the residency",
)

def style_scan(text: str):
    low = text.lower()
    flags = [x for x in AI_STYLE_FLAGS if x in low]
    # Also catch a few common synthetic-news constructions without scoring prose.
    patterns = {
        "summary_throat_clear": r"(?i)\b(?:overall|ultimately|all in all),",
        "double_transition": r"(?i)\b(?:meanwhile|additionally|furthermore),\s+(?:meanwhile|additionally|furthermore),",
        "generic_significance": r"(?i)\b(?:highlights|reflects|demonstrates)\s+(?:the|a)\s+(?:growing|broader|continued)\b",
    }
    flags.extend(name for name, pat in patterns.items() if re.search(pat, text))
    return flags

def main():
    runner.load_env()
    before = runner.desk_read()["posts"]
    current = runner.find_post(before, POST_ID)
    if (current.get("status") or "live") != "live":
        raise RuntimeError(f"{POST_ID} is not live; refusing to change publication state")

    preserved = {
        "status": current.get("status"),
        "publishAt": current.get("publishAt"),
        "date": current.get("date"),
        "cover": copy.deepcopy(current.get("cover")),
        "title": current.get("title"),
    }

    m = re.search(r"(?im)^\s*\[tickets:(https?://[^\]]+)\]\s*$", str(current.get("body") or ""))
    if not m:
        raise RuntimeError("existing affiliate ticket CTA not found")
    ticket = m.group(1)
    body = BODY_TEMPLATE.replace("__TICKET__", ticket)

    bad = style_scan(body)
    print("AI_STYLE_SCAN", bad)
    if bad:
        raise RuntimeError(f"AI-style phrase(s) remain: {bad}")

    if "[apple:song:6807119565:6807119568]" not in body:
        raise RuntimeError("SaWaDiKa Apple Music block missing")
    second_para = body.split("\n\n")[1]
    apple_pos = body.index("[apple:song:6807119565:6807119568]")
    second_end = body.index(second_para) + len(second_para)
    third_start = body.index("The Las Vegas dates come just after")
    if not (second_end < apple_pos < third_start):
        raise RuntimeError("Apple Music block is not between paragraphs 2 and 3")

    def mutate(posts):
        p = runner.find_post(posts, POST_ID)
        if (p.get("status") or "live") != "live":
            raise RuntimeError("LISA status changed during guarded write")
        p["excerpt"] = EXCERPT
        p["body"] = body
        # Deliberately do not touch title, cover, date, publishAt or status.
        return copy.deepcopy(p)

    runner.guarded_write(mutate)

    for attempt in range(12):
        desk = runner.http(runner.DESK_API + "?nocache=" + str(time.time_ns()), runner.desk_key())
        p = next((x for x in desk.get("posts", []) if str(x.get("id")) == POST_ID), None)
        if p and p.get("body") == body and p.get("excerpt") == EXCERPT:
            break
        time.sleep(2)
    else:
        raise RuntimeError("LISA live revision did not propagate")

    for key, old in preserved.items():
        if p.get(key) != old:
            raise RuntimeError(f"protected field changed: {key}")
    print("PRESERVED", {k: True for k in preserved})

    media = {
        "apple": len(re.findall(r"(?im)^\s*\[apple:", body)),
        "youtube": len(re.findall(r"(?im)^\s*\[youtube:", body)),
        "tickets": len(re.findall(r"(?im)^\s*\[tickets:", body)),
    }
    print("MEDIA_COUNTS", media)
    if media != {"apple": 1, "youtube": 1, "tickets": 1}:
        raise RuntimeError(f"unexpected media counts: {media}")

    for pass_no in (1, 2, 3):
        ok = False
        lines = []
        for gate_attempt in range(8):
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

    public = runner.http(runner.DESK_API)["posts"]
    live = next((x for x in public if str(x.get("id")) == POST_ID), None)
    if not live or (live.get("status") or "live") != "live":
        raise RuntimeError("LISA post is not public after revision")
    if live.get("body") != body:
        raise RuntimeError("public LISA body does not match revised body")

    print("FINAL_STATUS", live.get("status"), live.get("publishAt"), live.get("date"))
    print("FINAL_COVER", (live.get("cover") or {}).get("src"), (live.get("cover") or {}).get("credit"))
    print("FINAL_IMAX_LINE", "It will play in cinemas worldwide, with some screenings in IMAX, before streaming globally on YouTube Premium.")
    print("DONE_LIVE_REVISION")

if __name__ == "__main__":
    main()
