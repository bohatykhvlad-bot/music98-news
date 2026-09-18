#!/usr/bin/env python3
"""Write first-run desk posts and sync them into public/index.html SEED."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NEWS_BODY = """Hartford is seven days away, and the rooms are already too small. Olivia Rodrigo opens the Unraveled Tour on September 25 at PeoplesBank Arena, the first night of a run that began as four Brooklyn dates and then kept multiplying until it looked less like a tour routing and more like a residency map: ten nights at Los Angeles' Intuit Dome, ten at Barclays Center, eleven at London's O2. Live Nation has the routing. The audience has the receipts. More than a million tickets are already gone.

This is the third album cycle, and it does not behave like a victory lap. *you seem pretty sad for a girl so in love* arrived June 12 on Geffen with a first-week haul of 485,000 equivalent units in the United States, the biggest solo week of 2026, then spent a second week on top of the Billboard 200. In early September it walked back to No. 1 on Top Alternative Albums and Top Rock & Alternative Albums. On the latter list it is now her longest-running leader, past *Guts*. The record is three months old and still arguing with the chart.

[apple:song:6779097512:6779097526]

"drop dead" was the door. It is the song that made the tour announcement sound like a dare instead of a press release: a guitar figure that refuses to sit politely, a vocal that treats heartbreak as a contact sport. The rest of the album is not a sequel to *Sour*'s diary or *Guts*' sneer so much as a third temperature. Rodrigo still writes like someone who cannot leave a feeling half-named. The difference is scale. The feelings got bigger rooms.

Support on select dates comes from Wolf Alice, The Last Dinner Party, Devon Again, Die Spitz, and Grace Ives. That bill is not filler. It is a statement about where she wants the nights to live: guitar music that can scrape a ceiling, pop that can take a punch, rooms that do not flatten the band into a click track. The outing was drawn for 65 shows. Demand added twenty-five more, including extra London, Amsterdam, Barcelona, and Paris, plus an October 18 date at Boston's TD Garden. The last listed night is May 10, 2027, back at the O2.

[apple:song:6779097512:6779097756]

"the cure" sits further into the album, and it is the one that explains the title. The writing is still sharp enough to bruise, but the arrangement leaves air around the bruise. You can hear why rock radio and the alternative albums chart have not let go. This is not a pop star borrowing a guitar for a costume change. It is a pop star who built the third record so the guitar would have somewhere to live.

Universal Music Canada's June note on the album also listed the hardware around it: limited vinyl, merch drops, collectibles timed to release week. That is the ordinary machinery of a modern campaign. What is less ordinary is the way the live hold keeps tightening after the first-week spike. Most arena tours cool once the album is no longer new. Unraveled is doing the opposite. The album returned to a summit in September. The tour still had not started.

There is a useful comparison inside her own catalog. *Sour* made her a phenomenon. *Guts* made the phenomenon louder and meaner. *you seem pretty sad for a girl so in love* is the first time the phenomenon has to carry a long itinerary and a long chart life at once. A ten-night Intuit Dome stand is a venue record. A double-digit O2 residency puts her in a short list that already includes Prince, the Spice Girls, One Direction, Ariana Grande, Elton John, and Rihanna. Those names are not press-kit garnish. They are a measurement of how many nights a city will buy from one artist before it is full.

The week ahead is logistics: rehearsals, load-in, the first two Hartford dates on September 25 and 26. After that the map runs through the fall and into a winter of doubled cities, then Europe in the spring. If the album keeps behaving the way it has since June, the set list will not have to chase a fading single. It can play a record that is still moving units while the trucks are on the highway.

That is the story, a week out. The tour is not a victory lap. It is a second argument, made in rooms that keep getting added because the first argument did not finish."""

REL_BODY = """Carly Rae Jepsen has a habit of treating time like a writing partner. *Dedicated* had a Side B. *Emotion* had one too. *The Loneliest Time* found a companion in *The Loveliest Time*. *Day and Night*, out today on Schoolboy and Interscope, is the habit made architectural: twenty-four songs, two discs, one clock. *Day* is twelve tracks of live-band grain and 1970s psychedelic pop. *Night* is twelve more, pulled into synths and the kind of dance music that does not ask permission to stay out. The runtime is just under eighty-five minutes. It does not hurry.

The record was announced on June 22. The first taste was "On Wires," June 26, a daylight song about the impatient early minutes of wanting someone, written with Kyle Shearer and Nate Cyphert. "After All" followed on July 16. "Don't Leave Me on the Dance Floor" arrived August 7. "Motivation" closed the singles run on August 21. Four trailers is a lot for an artist whose cult already knows how to wait. Jepsen used them as weather reports: two for the sun, two for the club.

[apple:album:6781767022]

The official framing is a twenty-four-hour blur. Nights stretch into mornings. Days dissolve into nights. You are supposed to feel suspended inside a single long hour. That is marketing language, and it happens to describe the sequencing. "After All" opens *Day* like a window being lifted. "Habits of Creatures" and "Versailles" keep the light in the room. "On Wires," track four, is the impatient heart of the disc: Shearer's production, a vocal that leans forward as if the chorus might leave without her. By "Just a Little Walk on the Moon," the daylight side has walked itself out to the edge of evening.

*Night* starts with "Never Let a Good Thing Die," the longest cut on the album, and then the temperature changes. "Amalfi Coast," "Patience Power Passion," "Don't Leave Me on the Dance Floor," "Motivation." The second disc is not a remix of the first. It is the same writer staying up. Collaborators include Tavish Crowe, Shearer, Cyphert, and Cole M.G.N., Jepsen's husband, alongside Noonie Bao, Patrik Berger, Markus Krunegard, and Pontus Winnberg. The credits read like a map of the last decade of smart pop: Stockholm, Los Angeles, the *Emotion* brain trust, the people who know how to make a chorus feel expensive without making it cheap.

Critics got the album a few days early, and the early scores have been generally favorable: Metacritic sitting near 80. *The Line of Best Fit* called it her most far-reaching work. *Rolling Stone* heard a dissertation on love, which is a grand way of saying Jepsen is still writing about the same subject she has always written about, only with more rooms in the house. *Paste* liked the textures. *Slant Magazine*, less convinced, found it sonically adventurous and a little unwieldy, which is a fair warning about a double album. *NME* said it grows. *The Times* wondered if the length was a mistake. None of that is a consensus. It is a split that a twenty-four-track pop record should expect.

What is not in dispute is the shape. Jepsen has spent a decade proving that pop can be meticulous without being cold. *Emotion*'s tenth anniversary show at the Troubadour last August was a reminder of that contract: play the album in order, take the choruses seriously, do not wink so hard the songs collapse. *Day and Night* is the first new full-length since that night, and it sounds like someone who heard the crowd sing the old precision and decided the new precision could be longer.

She launches the album onstage September 27, headlining New York's All Things Go Festival, her first billed performance of 2026, on a bill that also includes Zara Larsson, Lola Young, Brandi Carlile, and MUNA. A festival slot is a strange place to debut a double album. It is also the right kind of strange. You cannot play twenty-four songs. You can play the argument: a *Day* song, a *Night* song, proof that the two halves talk to each other.

Physical editions and the digital album went out this morning. The Japanese CD adds "Reaching for a Star" and "Yes." Everyone else gets the twenty-four. If you only have time for a first pass, start at "After All," stay through "On Wires," then skip to "Don't Leave Me on the Dance Floor" and let *Night* finish the hour. If you have the whole evening, play it in order. That is what the title is for.

Jepsen has never been in a hurry to be the loudest person in the room. *Day and Night* does not change that. It just gives the room two lighting states and asks you to stay until both of them have had their say."""

POSTS = [
    {
        "id": "n1",
        "type": "news",
        "pinned": True,
        "tag": "News",
        "title": "Olivia Rodrigo's Unraveled Tour Starts Next Week With a Record That Won't Sit Down",
        "excerpt": "Hartford is seven days away. *you seem pretty sad for a girl so in love* is still rewriting her own chart records, and the rooms keep getting bigger.",
        "body": NEWS_BODY,
        "date": "2026-09-18",
        "artist": "Olivia Rodrigo",
        "cover": {
            "kind": "img",
            "src": "photos/olivia-rodrigo-glastonbury-2025-banner.jpg",
            "pos": "center center",
            "credit": "Raph_PH / Wikimedia Commons (CC BY 4.0)",
            "creditUrl": "https://commons.wikimedia.org/wiki/File:Olivia_Rodrigo_2.jpeg",
        },
    },
    {
        "id": "r1",
        "type": "release",
        "tag": "Album",
        "rtype": "Album",
        "artist": "Carly Rae Jepsen",
        "title": "Day and Night",
        "excerpt": "A 24-song double album, split between live-band daylight pop and after-hours synths, is out today on Schoolboy and Interscope.",
        "body": REL_BODY,
        "date": "2026-09-18",
        "cover": {
            "kind": "img",
            "src": "photos/carly-rae-jepsen-troubadour-2025-banner.jpg",
            "pos": "center center",
            "credit": "Justin Higuchi / Wikimedia Commons (CC BY 4.0)",
            "creditUrl": "https://commons.wikimedia.org/wiki/File:Carly_Rae_Jepsen_@_Troubadour_08_19_2025_(54850009238).jpg",
        },
    },
]


def main() -> None:
    desk_path = ROOT / "public" / "data" / "desk.json"
    desk = {"posts": POSTS, "subscribers": []}
    if desk_path.exists():
        try:
            old = json.loads(desk_path.read_text(encoding="utf-8"))
            if isinstance(old.get("subscribers"), list):
                desk["subscribers"] = old["subscribers"]
        except Exception:
            pass
    desk_path.write_text(json.dumps(desk, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    html_path = ROOT / "public" / "index.html"
    html = html_path.read_text(encoding="utf-8")
    posts_js = json.dumps(POSTS, ensure_ascii=False)
    def repl(m: re.Match[str]) -> str:
        return m.group(1) + posts_js + m.group(2)
    html, n = re.subn(
        r"(const SEED = \{\s*posts:\s*)\[.*?\](\s*,\s*chart:)",
        repl,
        html,
        count=1,
        flags=re.S,
    )
    if n != 1:
        raise SystemExit(f"SEED posts replace failed ({n})")
    html_path.write_text(html, encoding="utf-8")
    print("wrote", len(POSTS), "posts")


if __name__ == "__main__":
    main()
