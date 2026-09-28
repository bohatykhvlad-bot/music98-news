#!/usr/bin/env python3
from __future__ import annotations

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import post as runner
import draft_vmas_2026_results as assets

PID = "vmas26results"

# A tighter, portrait-oriented official VMAs image for the live hero.
HERO_KEY = "0cb642bd2d"
HERO_NAME = "vmas-2026-madonna-stage-portrait.jpg"
HERO_CREDIT = "Stewart Cook"
HERO_CREDIT_URL = "https://stewartcook.com/"

# Separate in-body Madonna image tied directly to Best Collaboration.
MADONNA_KEY = "bb68f07087"
MADONNA_NAME = "vmas-2026-madonna-sabrina-best-collaboration-stage.jpg"
MADONNA_CREDIT = "Francis Specker"
MADONNA_CREDIT_URL = "https://francisspecker.com/"

EXCERPT = (
    "Madonna led the 2026 MTV VMAs with seven awards, while Taylor Swift won "
    "Video of the Year at the September 27 ceremony in Los Angeles."
)

INTRO = """Madonna led the 2026 MTV VMAs with seven awards, while Taylor Swift won Video of the Year for "The Fate of Ophelia" at the September 27 ceremony in Los Angeles. Hosted by Snoop Dogg at the Peacock Theater, the show gave Madonna the largest award total of the night and recognized Taylor Swift with the inaugural MTV VMA Artist Director Honors.

Madonna entered the final ballot with 13 nominations after MTV added the social categories. Her seven wins included Artist of the Year, the album award for *Confessions II*, Best Collaboration with Sabrina Carpenter for "Bring Your Love," and four awards connected to "Confessions II - The Film."

Taylor Swift also won Best Direction for "Opalite." BTS collected three awards, including Song of the Year and Best Group, while Sienna Spiro was named Best New Artist.

The complete list below includes every competitive category from the final 2026 ballot, followed by the Video Vanguard Award and the MTV VMA Artist Director Honors. Winners are shown in bold on the published page, with the remaining nominees listed underneath each category."""

ENDING = """The 2026 VMAs combined a clear awards leader in Madonna with a Video of the Year win for Taylor Swift and a broad spread of winners across the remaining categories."""

REPLACEMENTS = [
    ('[nominee:Madonna and Sabrina Carpenter — "Bring Your Love"]',
     '[nominee:Madonna & Sabrina Carpenter — "Bring Your Love"]'),
    ('[winner:Madonna and Sabrina Carpenter — "Bring Your Love"]',
     '[winner:Madonna & Sabrina Carpenter — "Bring Your Love"]'),
    ('[nominee:Clipse, Kendrick Lamar, Pusha T and Malice — "Chains & Whips"]',
     '[nominee:Clipse, Kendrick Lamar, Pusha T, Malice — "Chains & Whips"]'),
    ('[nominee:French Montana and Max B — "Ever Since U Left Me"]',
     '[nominee:French Montana x Max B — "Ever Since U Left Me"]'),
    ('[nominee:Shakira and Burna Boy — "Dai Dai"]',
     '[nominee:Shakira & Burna Boy — "Dai Dai"]'),
    ('[nominee:Teyana Taylor and Lucky Daye — "Hard Part"]',
     '[nominee:Teyana Taylor & Lucky Daye — "Hard Part"]'),
    ('[nominee:Dave and Tems — "Raindance"]',
     '[nominee:Dave & Tems — "Raindance"]'),
    ('[nominee:Mariah the Scientist and Kali Uchis — "Is It a Crime"]',
     '[nominee:Mariah the Scientist & Kali Uchis — "Is It a Crime"]'),
    ('[nominee:mgk and Fred Durst — "FIX UR FACE"]',
     '[nominee:mgk & Fred Durst — "FIX UR FACE"]'),
    ('[nominee:Bebe Rexha and Faithless — "New Religion"]',
     '[nominee:Bebe Rexha & Faithless — "New Religion"]'),
    ('[nominee:Lady Gaga and Doechii — "RUNWAY"]',
     '[nominee:Lady Gaga & Doechii — "RUNWAY"]'),
    ('[nominee:Ryan Castro, Kapo and Gangsta — "LA VILLA"]',
     '[nominee:Ryan Castro, Kapo & GANGSTA — "LA VILLA"]'),
    ('[nominee:LE SSERAFIM feat. j-hope of BTS — "SPAGHETTI"]',
     '[nominee:LE SSERAFIM (feat. j-hope of BTS) — "SPAGHETTI"]'),
    ('[nominee:JISOO x ZAYN — "Eyes Closed"]',
     '[nominee:JISOO X ZAYN — "Eyes Closed"]'),
    ('[nominee:Tame Impala and JENNIE — "Dracula"]',
     '[nominee:Tame Impala & JENNIE — "Dracula"]'),
    ('[nominee:Tyler, the Creator — "SUGAR ON MY TONGUE"]',
     '[nominee:Tyler, The Creator — "SUGAR ON MY TONGUE"]'),
    ('[nominee:Twenty One Pilots — "Drag Path"]',
     '[nominee:twenty one pilots — "Drag Path"]'),

    # Long-form video is a video title, so use quotation marks rather than album italics.
    ('[winner:Madonna — *Confessions II - The Film*]',
     '[winner:Madonna — "Confessions II - The Film"]'),
    ('[nominee:Charli xcx — *Music, Fashion, Film*]',
     '[nominee:Charli xcx — "Music, Fashion, Film"]'),
    ("[nominee:Ella Langley — *Choosin' Texas*]",
     "[nominee:Ella Langley — \"Choosin' Texas\"]"),
    ('[nominee:GENER8ION — *STORM starring Yung Lean*]',
     '[nominee:GENER8ION — "STORM starring Yung Lean"]'),

    # Album titles remain italicized.
    ('[nominee:Drake — *ICEMAN*]',
     '[nominee:Drake — *Iceman*]'),
    ('[nominee:Slayyyter — "DANCE..."]',
     '[nominee:Slayyyter — "DANCE…"]'),

    # Follow the official MTV/Paramount capitalization in this category.
    ('[winner:BTS — "Swim"]\n\n[nominee:BLACKPINK — "JUMP"]',
     '[winner:BTS — "SWIM"]\n\n[nominee:BLACKPINK — "JUMP"]'),
]

def fix_award_text(awards: str) -> str:
    for old, new in REPLACEMENTS:
        if old in awards:
            awards = awards.replace(old, new)
            print("FIX", old, "=>", new)

    return awards

def audit(body: str) -> None:
    if not body.lstrip().startswith(EXCERPT):
        raise RuntimeError("excerpt is not the opening sentence of body")

    # Formal naming in narrative copy.
    if "Swift's" in body or "Taylor Swift's" in body:
        raise RuntimeError("abbreviated or possessive Taylor Swift reference remains")

    # Style: songs/videos in quotes, albums in italics, em dash between artist and work.
    awards_start = body.index("[awards]")
    awards_end = body.index("[/awards]") + len("[/awards]")
    awards = body[awards_start:awards_end]

    lf = re.search(
        r'\[award:Best Long Form Video\]([\s\S]*?)(?=\n\n\[award:Best Album\])',
        awards,
    )
    if not lf:
        raise RuntimeError("Best Long Form Video section not found")
    if "*" in lf.group(1):
        raise RuntimeError("italic markup remains in Best Long Form Video")

    album = re.search(
        r'\[award:Best Album\]([\s\S]*?)(?=\n\n\[award:Song of Summer\])',
        awards,
    )
    if not album or "*" not in album.group(1):
        raise RuntimeError("album italics missing")

    # All song/video entries should use an em dash separator before quoted title.
    for line in re.findall(r'\[(?:winner|nominee):[^\]]+\]', awards):
        if '"' in line and " — " not in line:
            raise RuntimeError("quoted work is missing em dash separator: " + line)

    if body.count("[photo:") != 5:
        raise RuntimeError(f"expected 5 inline photos, found {body.count('[photo:')}")
    if MADONNA_NAME not in body:
        raise RuntimeError("Madonna in-body photo missing")
    if any(ch in body for ch in ("’", "‘")):
        raise RuntimeError("curly apostrophe found")
    if "DANCE..." in body:
        raise RuntimeError("Slayyyter title needs official ellipsis styling")
    if body.count("[award:") != 25 or body.count("[winner:") != 25:
        raise RuntimeError("award/winner count mismatch")

def main():
    runner.load_env()
    before = runner.desk_read()["posts"]
    current = next((p for p in before if p.get("id") == PID), None)
    if current is None:
        raise RuntimeError("live VMA post not found")
    if current.get("status") != "live":
        raise RuntimeError(f"expected live post, got {current.get('status')!r}")

    body = current.get("body") or ""
    madonna_match = re.search(
        r'\[photo:(photos/vmas-2026-madonna-sabrina-best-collaboration-stage\.jpg)\|',
        body,
    )
    if not madonna_match:
        raise RuntimeError("current centered Madonna photo not found")
    madonna_src = madonna_match.group(1)
    if "[awards]" not in body or "[/awards]" not in body:
        raise RuntimeError("structured awards block missing")

    start = body.index("[awards]")
    end = body.index("[/awards]") + len("[/awards]")
    awards = fix_award_text(body[start:end])
    new_body = INTRO.format(madonna_src=madonna_src) + "\n\n" + awards + "\n\n" + ENDING
    audit(new_body)

    preserved = {
        "status": current.get("status"),
        "pinned": current.get("pinned"),
        "publishAt": current.get("publishAt"),
        "date": current.get("date"),
        "title": current.get("title"),
        "cover": current.get("cover"),
    }

    def mutate(posts):
        p = next((x for x in posts if x.get("id") == PID), None)
        if p is None:
            raise RuntimeError("post vanished before write")
        p["body"] = new_body
        p["excerpt"] = EXCERPT
        return p

    now = runner.guarded_write(mutate)

    for key, value in preserved.items():
        if now.get(key) != value:
            raise RuntimeError(
                f"preserved field changed: {key}: {value!r} -> {now.get(key)!r}"
            )

    audit(now["body"])
    print("VMA_LIVE_UPDATED", now["id"], now["status"], runner.words(now["body"]), "words")
    print("TEXT_ONLY_UPDATE", "all existing image positions preserved")
    print("MADONNA_PHOTO", madonna_src, "current centered placement preserved")

    ok = runner.cmd_gate(PID)
    if not ok:
        raise RuntimeError("gate failed after live update")

    runner.cmd_verify(PID)
    runner.cmd_show(PID)

if __name__ == "__main__":
    main()
