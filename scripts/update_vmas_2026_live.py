#!/usr/bin/env python3
from __future__ import annotations

import copy
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import post as runner

PID = "vmas26results"

EXCERPT = (
    "Madonna won seven awards at the 2026 MTV VMAs, the most of any artist, while Taylor Swift took "
    "Video of the Year for \"The Fate of Ophelia\" at the September 27 ceremony in Los Angeles."
)

INTRO_BEFORE_PHOTO = """Madonna won seven awards at the 2026 MTV VMAs, the most of any artist, while Taylor Swift took Video of the Year for "The Fate of Ophelia" at the September 27 ceremony in Los Angeles. Snoop Dogg hosted the show at the Peacock Theater.

Madonna entered the final ballot with 13 nominations after MTV added the social categories, raising her total from 11. Her seven wins included Artist of the Year, Best Album for *CONFESSIONS II* and Best Collaboration with Sabrina Carpenter. "Confessions II - The Film" accounted for four additional awards in dance, cinematography, choreography and long-form video."""

INTRO_AFTER_PHOTO = """Taylor Swift also won Best Direction for "Opalite" and received the inaugural Artist Director Honors, a separate recognition outside the competitive tally. The complete list below includes every competitive category from the final ballot, followed by the Video Vanguard Award and the Artist Director Honors."""

ENDING = ""

def normalize_awards(awards: str) -> str:
    # Billboard-style list separator: en dash, not em dash.
    awards = awards.replace(" — ", " – ")

    # Keep collaborators outside the work title where the title itself is simply "Stateside".
    awards = awards.replace(
        'PinkPantheress – "Stateside + Zara Larsson"',
        'PinkPantheress + Zara Larsson – "Stateside"',
    )

    # "Dream" is the work title; Kentaro Sakaguchi is the credited video collaborator.
    awards = awards.replace(
        'LISA – "Dream feat. Kentaro Sakaguchi"',
        'LISA – "Dream" feat. Kentaro Sakaguchi',
    )

    # Album casing follows Apple Music.
    awards = awards.replace("*Confessions II*", "*CONFESSIONS II*")
    awards = awards.replace("*Iceman*", "*ICEMAN*")
    awards = awards.replace(
        "*You Seem Pretty Sad for a Girl So in Love*",
        "*you seem pretty sad for a girl so in love*",
    )
    return awards

def award_sections(awards: str):
    chunks = re.split(r"(?=\[award:)", awards)
    out = {}
    for chunk in chunks:
        m = re.match(r"\[award:([^\]]+)\]", chunk)
        if m:
            out[m.group(1)] = chunk
    return out

def audit(body: str, original_photo_tags: list[str]) -> None:
    if not body.startswith(EXCERPT):
        raise RuntimeError("excerpt is not the literal opening of body")
    first_para = body.split("\n\n", 1)[0]
    for name in ("BTS", "Sienna Spiro", "Nirvana", "LISA", "Ariana Grande"):
        if name in first_para:
            raise RuntimeError("teaser lists secondary winners: " + name)

    if "Swift's" in body or "Taylor Swift's" in body:
        raise RuntimeError("surname shorthand or possessive Taylor Swift wording remains")
    if "—" in body:
        raise RuntimeError("em dash remains; awards list should use en dash")
    if any(ch in body for ch in ("’", "‘")):
        raise RuntimeError("curly apostrophe remains")

    photos = re.findall(r"\[photo:[^\]]+\]", body)
    if photos != original_photo_tags:
        raise RuntimeError("photo tags/crops changed during text-only update")
    if len(photos) != 5:
        raise RuntimeError(f"expected 5 inline photos, found {len(photos)}")

    a = body.index("[awards]")
    b = body.index("[/awards]") + len("[/awards]")
    awards = body[a:b]
    if awards.count("[award:") != 25 or awards.count("[winner:") != 25:
        raise RuntimeError("award/winner count mismatch")
    if " — " in awards:
        raise RuntimeError("em-dash separator remains in awards")
    if 'PinkPantheress – "Stateside + Zara Larsson"' in awards:
        raise RuntimeError("Stateside collaborator remains inside title")
    if awards.count('PinkPantheress + Zara Larsson – "Stateside"') != 5:
        raise RuntimeError("Stateside credit count mismatch")
    if awards.count('LISA – "Dream" feat. Kentaro Sakaguchi') != 4:
        raise RuntimeError("LISA Dream credit count mismatch")
    if "*CONFESSIONS II*" not in awards or "*ICEMAN*" not in awards:
        raise RuntimeError("Apple Music album casing missing")
    if "*you seem pretty sad for a girl so in love*" not in awards:
        raise RuntimeError("Olivia Rodrigo album casing missing")

    sections = award_sections(awards)
    album_section = sections.get("Best Album", "")
    if not album_section:
        raise RuntimeError("Best Album section missing")
    non_album = awards.replace(album_section, "")
    if "*" in non_album:
        raise RuntimeError("italics found outside Best Album in awards list")
    if '"' in album_section:
        raise RuntimeError("album titles should not be in quotation marks")

    # Songs/videos are quoted and separated from artist credit with an en dash.
    for line in re.findall(r"\[(?:winner|nominee):[^\]]+\]", awards):
        if '"' in line and " – " not in line:
            raise RuntimeError("quoted work missing en-dash separator: " + line)

def main():
    runner.load_env()
    initial = runner.desk_read()["posts"]
    current = next((p for p in initial if p.get("id") == PID), None)
    if current is None:
        raise RuntimeError("live VMA post not found")
    if current.get("status") != "live":
        raise RuntimeError(f"expected live post, got {current.get('status')!r}")

    original_cover = copy.deepcopy(current.get("cover"))
    original_photos = re.findall(r"\[photo:[^\]]+\]", current.get("body") or "")
    if len(original_photos) != 5:
        raise RuntimeError(f"expected 5 current photo tags, found {len(original_photos)}")

    madonna_photo = next(
        (x for x in original_photos if "vmas-2026-madonna-sabrina-best-collaboration-stage.jpg" in x),
        None,
    )
    if madonna_photo is None:
        raise RuntimeError("current manually-centered Madonna photo tag not found")

    old_body = current.get("body") or ""
    start = old_body.index("[awards]")
    end = old_body.index("[/awards]") + len("[/awards]")
    awards = normalize_awards(old_body[start:end])

    new_body = (
        INTRO_BEFORE_PHOTO
        + "\n\n"
        + madonna_photo
        + "\n\n"
        + INTRO_AFTER_PHOTO
        + "\n\n"
        + awards
    )
    audit(new_body, original_photos)

    preserved = {
        "status": current.get("status"),
        "pinned": current.get("pinned"),
        "publishAt": current.get("publishAt"),
        "date": current.get("date"),
        "title": current.get("title"),
    }

    def mutate(posts):
        p = next((x for x in posts if x.get("id") == PID), None)
        if p is None:
            raise RuntimeError("post vanished before write")
        p["body"] = new_body
        p["excerpt"] = EXCERPT
        # DO NOT touch cover or any crop/position fields.
        return p

    now = runner.guarded_write(mutate)

    for key, value in preserved.items():
        if now.get(key) != value:
            raise RuntimeError(
                f"preserved field changed: {key}: {value!r} -> {now.get(key)!r}"
            )
    if now.get("cover") != original_cover:
        raise RuntimeError("manual cover centering was changed")

    audit(now["body"], original_photos)
    print("VMA_TEXT_ONLY_UPDATED", now["id"], now["status"], runner.words(now["body"]), "words")
    print("COVER_PRESERVED", now.get("cover"))
    print("PHOTO_CROPS_PRESERVED", original_photos)

    ok = runner.cmd_gate(PID)
    if not ok:
        raise RuntimeError("gate failed after text-only update")
    runner.cmd_verify(PID)
    runner.cmd_show(PID)

if __name__ == "__main__":
    main()
