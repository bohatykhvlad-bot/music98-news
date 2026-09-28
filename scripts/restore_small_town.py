#!/usr/bin/env python3
from __future__ import annotations

import copy
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import post as runner

PID = "aufike18r1"

EXCERPT = (
    'Dominic Fike has released "Small Town," the second lead single from his forthcoming album, '
    'due October 9 through Columbia Records.'
)

BODY_TEMPLATE = """Dominic Fike has released "Small Town," the second lead single from his forthcoming album, due October 9 through Columbia Records. The track follows "Wallflower" in the rollout and arrives while Fike is still moving through North America on his Comedy Tragedy Parody tour.

The album, *How To Quit Smoking*, is being made in unusually public fashion. Fike's press materials say he has been writing, recording and filming between tour stops, working in hotel rooms, on the tour bus and backstage before shows instead of separating the record-making process from the road. That same setup carries directly into "Small Town," which was released on September 18.

The song and its video were developed across several cities. The visual was shot in Detroit and Seattle, while the release was completed from Dallas. Emma Ogier and Gabriel Jacoby contribute vocals, with Jacoby traveling in to help finish the track between shows. Fike's official tour page also pairs "Small Town" with Detroit and Seattle, making those locations part of the release campaign rather than just stops on the itinerary.

Press materials describe *How To Quit Smoking* as Fike's third studio album. That framing follows *What Could Possibly Go Wrong* and *Sunburn*, while Ticketmaster describes his 2025 project *Rocket* as a mixtape. The distinction explains why the new campaign calls this the third studio record even though Apple Music groups *Rocket* with Fike's albums.

{youtube}

The label-supplied YouTube credits add more detail to the recording. Dominic Fike and Kevin Abstract are listed among the songwriters. Capi is credited as a producer as well as on keyboards and drums, while Devin Workman is credited as a producer and on acoustic guitar and brass. Nick Leonardo contributes acoustic guitar and bass, and Ogier and Jacoby appear in the vocal credits.

Apple Music currently lists *How To Quit Smoking* as a 15-song pre-release scheduled for October 9 and credits the project to Columbia Records, a division of Sony Music Entertainment, under exclusive license. "Small Town" is already listed on Fike's Apple Music artist page as part of the upcoming album alongside "Wallflower."

The road schedule is still running alongside the album campaign. Fike's official site lists two Los Angeles shows at The Wiltern on September 29 and September 30, after a North American run that has taken him through cities including Detroit, Seattle, Dallas, Austin and Albuquerque. The album is due October 9, keeping the tour and release cycle closely linked through the final stretch before release."""

def main():
    runner.load_env()
    before = runner.desk_read()["posts"]
    current = next((p for p in before if p.get("id") == PID), None)
    if current is None:
        raise RuntimeError("Small Town post not found")
    if current.get("status") != "live":
        raise RuntimeError(f"expected live post, got {current.get('status')!r}")

    media = re.findall(r"^\[(?:youtube|apple|tiktok|instagram)[^\]]*\]$", current.get("body") or "", re.M | re.I)
    youtube = next((m for m in media if m.lower().startswith("[youtube:")), None)
    if not youtube:
        raise RuntimeError("existing Small Town YouTube marker not found")

    body = BODY_TEMPLATE.format(youtube=youtube)

    if not body.startswith(EXCERPT):
        raise RuntimeError("excerpt is not a literal prefix")
    if any(ch in body for ch in ("’", "‘")):
        raise RuntimeError("curly apostrophe found")
    if body.count(youtube) != 1:
        raise RuntimeError("YouTube marker count mismatch")
    if runner.words(body) < 340:
        raise RuntimeError(f"restored body too short: {runner.words(body)} words")

    preserved = {
        key: copy.deepcopy(current.get(key))
        for key in ("type", "tag", "rtype", "artist", "title", "date", "pinned", "status", "publishAt", "cover")
    }

    def mutate(posts):
        p = next((x for x in posts if x.get("id") == PID), None)
        if p is None:
            raise RuntimeError("Small Town post vanished before write")
        p["excerpt"] = EXCERPT
        p["body"] = body
        return p

    now = runner.guarded_write(mutate)

    for key, value in preserved.items():
        if now.get(key) != value:
            raise RuntimeError(f"preserved field changed: {key}")

    if runner.words(now.get("body") or "") < 340:
        raise RuntimeError("live post is still too short after write")

    print("SMALL_TOWN_RESTORED", runner.words(now["body"]), "words")
    print("MEDIA_PRESERVED", youtube)
    print("COVER_PRESERVED", now.get("cover") == preserved["cover"])

    ok = runner.cmd_gate(PID)
    if not ok:
        raise RuntimeError("gate failed after restoration")

    runner.cmd_verify(PID)
    runner.cmd_show(PID)

if __name__ == "__main__":
    main()
