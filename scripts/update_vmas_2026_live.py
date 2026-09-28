#!/usr/bin/env python3
from __future__ import annotations

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import post as runner
import draft_vmas_2026_results as assets

PID = "vmas26results"

MADONNA_KEY = "bb68f07087"
MADONNA_NAME = "vmas-2026-madonna-sabrina-best-collaboration-stage.jpg"
MADONNA_CREDIT = "Francis Specker"
MADONNA_CREDIT_URL = "https://francisspecker.com/"
MADONNA_CROP = "50% 46%"

EXCERPT = (
    "Madonna led the 2026 MTV VMAs with seven awards, while Taylor Swift won "
    "Video of the Year at the September 27 ceremony in Los Angeles."
)

INTRO = """Madonna led the 2026 MTV VMAs with seven awards, while Taylor Swift won Video of the Year at the September 27 ceremony in Los Angeles. The show took place at the Peacock Theater with Snoop Dogg as host. Madonna's wins included Artist of the Year, Best Album and Best Collaboration, while Taylor Swift also won Best Direction and received the inaugural MTV VMA Artist Director Honors. BTS won Song of the Year, Best K-Pop and Best Group, and Sienna Spiro was named Best New Artist.

Madonna entered the final ballot with 13 nominations after MTV added the social categories. She won Artist of the Year and Best Album for *Confessions II*, shared Best Collaboration with Sabrina Carpenter for "Bring Your Love," and collected four awards for "Confessions II - The Film": Best Dance, Best Cinematography, Best Choreography and Best Long Form Video.

[photo:{madonna_src}|Francis Specker|https://francisspecker.com/|50% 46%|1]

Taylor Swift won Video of the Year for "The Fate of Ophelia" and Best Direction for "Opalite." MTV also presented Taylor Swift with the inaugural Artist Director Honors, a separate recognition for her work as a director.

Several other artists won across the major genre and fan-voted categories. LISA won Best Pop, Cardi B featuring Kehlani won Best Hip-Hop, Bruno Mars won Best R&B, Olivia Rodrigo won Best Alternative, Bad Bunny won Best Latin and Ella Langley won Best Country. Ariana Grande won Song of Summer and Best Visual Effects.

The craft categories produced a separate group of winners. Sabrina Carpenter won Best Editing for "House Tour," PinkPantheress won Best Art Direction for "Stateside + Zara Larsson," and Madonna added Best Cinematography and Best Choreography to her total. Nirvana received the Video Vanguard Award, with Dave Grohl, Krist Novoselic and Pat Smear present for the honor.

The complete list below includes every competitive category from the final 2026 ballot, followed by the Video Vanguard Award and the MTV VMA Artist Director Honors. Winners are shown in bold on the published page, with the remaining nominees listed underneath each category."""

ENDING = """The final results reflected a broad distribution of awards across the 2026 ceremony. Madonna led the night with seven wins across major, genre, social and craft categories. Taylor Swift won Video of the Year and Best Direction in addition to receiving the Artist Director Honors, while BTS, Ariana Grande, Sienna Spiro and the genre-category winners accounted for many of the night's other major results."""

def fix_award_text(awards: str) -> str:
    replacements = {
        '[nominee:Madonna and Sabrina Carpenter — "Bring Your Love"]':
            '[nominee:Madonna & Sabrina Carpenter — "Bring Your Love"]',
        '[winner:Madonna and Sabrina Carpenter — "Bring Your Love"]':
            '[winner:Madonna & Sabrina Carpenter — "Bring Your Love"]',
        '[nominee:Clipse, Kendrick Lamar, Pusha T and Malice — "Chains & Whips"]':
            '[nominee:Clipse, Kendrick Lamar, Pusha T, Malice — "Chains & Whips"]',
        '[nominee:French Montana and Max B — "Ever Since U Left Me"]':
            '[nominee:French Montana x Max B — "Ever Since U Left Me"]',
        '[nominee:Shakira and Burna Boy — "Dai Dai"]':
            '[nominee:Shakira & Burna Boy — "Dai Dai"]',
        '[nominee:Teyana Taylor and Lucky Daye — "Hard Part"]':
            '[nominee:Teyana Taylor & Lucky Daye — "Hard Part"]',
        '[nominee:Dave and Tems — "Raindance"]':
            '[nominee:Dave & Tems — "Raindance"]',
        '[nominee:Mariah the Scientist and Kali Uchis — "Is It a Crime"]':
            '[nominee:Mariah the Scientist & Kali Uchis — "Is It a Crime"]',
        '[nominee:mgk and Fred Durst — "FIX UR FACE"]':
            '[nominee:mgk & Fred Durst — "FIX UR FACE"]',
        '[nominee:Bebe Rexha and Faithless — "New Religion"]':
            '[nominee:Bebe Rexha & Faithless — "New Religion"]',
        '[nominee:Lady Gaga and Doechii — "RUNWAY"]':
            '[nominee:Lady Gaga & Doechii — "RUNWAY"]',
        '[nominee:Ryan Castro, Kapo and Gangsta — "LA VILLA"]':
            '[nominee:Ryan Castro, Kapo & GANGSTA — "LA VILLA"]',
        '[nominee:LE SSERAFIM feat. j-hope of BTS — "SPAGHETTI"]':
            '[nominee:LE SSERAFIM (feat. j-hope of BTS) — "SPAGHETTI"]',
        '[nominee:JISOO x ZAYN — "Eyes Closed"]':
            '[nominee:JISOO X ZAYN — "Eyes Closed"]',
        '[nominee:Tame Impala and JENNIE — "Dracula"]':
            '[nominee:Tame Impala & JENNIE — "Dracula"]',
        '[nominee:Tyler, the Creator — "SUGAR ON MY TONGUE"]':
            '[nominee:Tyler, The Creator — "SUGAR ON MY TONGUE"]',
        '[nominee:Twenty One Pilots — "Drag Path"]':
            '[nominee:twenty one pilots — "Drag Path"]',
        '[winner:BTS — "Swim"]\n\n[nominee:BLACKPINK — "JUMP"]':
            '[winner:BTS — "SWIM"]\n\n[nominee:BLACKPINK — "JUMP"]',
        '[winner:Madonna — *Confessions II - The Film*]':
            '[winner:Madonna — "Confessions II - The Film"]',
        '[nominee:Charli xcx — *Music, Fashion, Film*]':
            '[nominee:Charli xcx — "Music, Fashion, Film"]',
        '[nominee:Ella Langley — *Choosin\\' Texas*]':
            '[nominee:Ella Langley — "Choosin\\' Texas"]',
        '[nominee:GENER8ION — *STORM starring Yung Lean*]':
            '[nominee:GENER8ION — "STORM starring Yung Lean"]',
        '[nominee:Drake — *ICEMAN*]':
            '[nominee:Drake — *Iceman*]',
    }
    for old, new in replacements.items():
        if old in awards:
            awards = awards.replace(old, new)
            print("FIX", old, "=>", new)
        elif new not in awards:
            print("WARN missing expected variant:", old)

    # Song/video titles use quotation marks; album titles alone use italics.
    long_form = re.search(
        r'(\[award:Best Long Form Video\][\s\S]*?)(?=\n\n\[award:Best Album\])',
        awards,
    )
    if not long_form:
        raise RuntimeError("Best Long Form Video section not found")
    if "*" in long_form.group(1):
        raise RuntimeError("italic markup remains in Best Long Form Video")

    return awards

def audit(body: str) -> None:
    if not body.startswith(EXCERPT):
        raise RuntimeError("excerpt is not the literal beginning of body")
    if "Swift's" in body:
        raise RuntimeError("shorthand 'Swift\\'s' remains")
    if "Taylor Swift's" in body:
        raise RuntimeError("possessive Taylor Swift wording remains; use formal sentence")
    if "Madonna and Sabrina Carpenter" in body:
        raise RuntimeError("non-official collaboration separator remains")
    if re.search(r'\[award:Best Long Form Video\][\s\S]*?\*[^\\n]+\*', body):
        raise RuntimeError("italics remain in Best Long Form Video")
    if "[award:Best Album]" not in body or "*Confessions II*" not in body:
        raise RuntimeError("album italics missing")
    if body.count("[photo:") != 5:
        raise RuntimeError(f"expected 5 inline photos, found {body.count('[photo:')}")
    if "vmas-2026-madonna-sabrina-best-collaboration-stage.jpg" not in body:
        raise RuntimeError("Madonna photo missing")
    if any(ch in body for ch in ("’", "‘")):
        raise RuntimeError("curly apostrophe found")
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

    madonna_src, madonna_size = assets.upload_photo(MADONNA_KEY, MADONNA_NAME)

    body = current.get("body") or ""
    if "[awards]" not in body or "[/awards]" not in body:
        raise RuntimeError("structured awards block missing")
    start = body.index("[awards]")
    end = body.index("[/awards]") + len("[/awards]")
    awards = fix_award_text(body[start:end])

    new_body = INTRO.format(madonna_src=madonna_src) + "\n\n" + awards + "\n\n" + ENDING
    audit(new_body)

    preserve = {
        "status": current.get("status"),
        "pinned": current.get("pinned"),
        "publishAt": current.get("publishAt"),
        "date": current.get("date"),
        "cover": current.get("cover"),
        "title": current.get("title"),
    }

    def mutate(posts):
        p = next((x for x in posts if x.get("id") == PID), None)
        if p is None:
            raise RuntimeError("post vanished before write")
        p["body"] = new_body
        p["excerpt"] = EXCERPT
        return p

    now = runner.guarded_write(mutate)

    for k, v in preserve.items():
        if now.get(k) != v:
            raise RuntimeError(f"preserved field changed: {k}: {v!r} -> {now.get(k)!r}")

    print("VMA_LIVE_UPDATED", now["id"], now["status"], runner.words(now["body"]), "words")
    print("MADONNA_PHOTO", madonna_size, madonna_src, MADONNA_CREDIT, MADONNA_CROP)
    audit(now["body"])
    ok = runner.cmd_gate(PID)
    if not ok:
        raise RuntimeError("gate failed after live update")
    runner.cmd_verify(PID)
    runner.cmd_show(PID)

if __name__ == "__main__":
    main()
