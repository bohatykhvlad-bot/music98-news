#!/usr/bin/env python3
"""Build + schedule the Sept 21-23 posts for music98.news.

Posts:
  1. Cardi B news  (Sept 21) - third album planned for 2027
  2. Teddy Swims release (Sept 22) - UGLY announced with "Perfect Man"
  3. BLACKPINK longread feature (Sept 23, pinned) - four solo eras

Covers are relative paths into /photos/ (files already copied into the repo),
NOT data URLs - keeps the desk payload under the ~5 MB limit.
Style checks: excerpt length, curly quotes, semicolons, colons outside
*italics*, markers on their own lines, word counts.
"""
import json, os, re, subprocess, sys, tempfile

PROD = "https://music98.news"
PASSWORD = "RrrUuu181818@"

CARDI_BODY = """Cardi B has a third album on her calendar. Backstage at the iHeartRadio Music Festival in Las Vegas on Friday, she told The Breakfast Club the follow-up to *AM I THE DRAMA?* is already moving, and she plans to release it in 2027.

The plan has a shape. After her birthday in November she steps away from everything else to record. She has two finished songs she likes, a long way to go, and no patience for the old timeline. When Breakfast Club host Charlamagne Tha God asked whether fans should brace for another seven-year wait, her answer was one word. "Nope."

"I am doing a new album. And after November, after my birthday, I'm shifting myself away just to record," she said. "I'm not even playing around," she continued. "I just got this confidence," she added, before singing a line of Patti LaBelle's "New Attitude."

The timing is worth taking seriously. *AM I THE DRAMA?* landed in September 2025, seven years after *Invasion of Privacy*, and opened at No. 1 on the Billboard 200, making her the only female rapper whose first two albums debuted on top. The record has sold millions of units since, and the Little Miss Drama Tour behind it ran 35 dates from February through April, drawing reported crowds of more than 450,000 and a gross around $70 million.

She has not been quiet in between. July brought "AH HA," her latest single, which climbed to No. 3 on Billboard's Hot R&B/Hip-Hop Songs chart.

[apple:song:6796433825:6796433834]

There is one more stage before the studio hibernation. In October she headlines BZR WKND in Jamaica, her first-ever Caribbean stadium concert, fresh off sold-out Canadian dates. After that, the recording begins in earnest, with a target she has now said out loud."""

CARDI_EXC = "Backstage in Las Vegas she said the follow-up to AM I THE DRAMA? is moving, with a recording break after her birthday and a 2027 target."

TEDDY_BODY = """Teddy Swims has a second album on the way. *UGLY* arrives January 22 on Warner Records, and the announcement came with its first single, "Perfect Man," a song that starts as an orchestral piano ballad and grows into a warm full-band soul number.

The single is a confession about impossible standards, and it means two things at once. The hook, "There's no such thing as a perfect man," begins as an excuse and ends as a discovery. By the last verse Swims lands on the line the whole song is built around. She never wanted perfection, just for someone to try harder.

"'Perfect Man' is a song about self forgiveness," he said in the release. "In my life, I've held myself to a standard that is completely unrealistic, I've been too hard on myself as a partner, as a father, and in feeling the responsibility that comes with knowing there are people who rely and look up to me."

The album was written over the last fifteen months, since his son was born, and the press materials frame it as an outlet for self-reflection and growth as both a man and a father. Spotify lists thirteen songs on the tracklist.

The credits reunite him with the crew behind his biggest records, Julian Bunetta, Afterhrs, Matt Zara, Mikky Ekko, Kendrick Nicholls and Alex Izquierdo, plus Edgar Barrera.

[apple:song:6812177122:6812177556]

The performance video keeps the orchestration front and center, filmed live with his band.

[youtube:yL_KN7kBD7A]

The arrival comes on the heels of a career-changing run. His debut made him a Grammy-nominated, Diamond-certified artist, and the arena tour in support of that record has been running all year. *UGLY* lands in the middle of it.

The Ugly Tour launches its next arena leg within days, with Natasha Bedingfield, Avery Anna and Wyatt Flores among the support acts along the route. The schedule runs deep into the fall. January 22 brings the record the whole road trip has been walking toward."""

TEDDY_EXC = "The second album arrives January 22 on Warner Records, and its first single is a confession about the standards no one can actually meet."

BP_BODY = """The busiest stretch of BLACKPINK's year happened without a group release. Between August 28 and September 17, all four members put out new music under their own names, each through a different door. JENNIE opened the run with her *Fallen Angel* EP. LISA followed with "SaWaDiKa," then a version of the same song credited to both her and JENNIE. JISOO delivered "CLICK," the first taste of her debut full-length album. ROSÉ closed the window with "new trick," a single whose video was filmed entirely on an iPhone 18 Pro for Apple's Shot on iPhone campaign.

The pattern only reads as a wave because of what came before it. The Deadline World Tour, the group's first all-stadium run, opened at Goyang Stadium in South Korea in July 2025 and closed at Kai Tak Stadium in Hong Kong on January 26. In February the four released *Deadline*, their first project since *Born Pink* in 2022, a five-track EP led by JUMP and GO. JUMP had been premiered at the tour's opening weekend before it was even a single, and its video has since climbed past 430 million views.

[youtube:CgCVZdcKcqY]

The architecture behind all this was set in advance. At the end of 2024 every member renewed her group contract with YG Entertainment while building separate homes for solo work. Jennie runs Odd Atelier, Lisa has LLOUD, Rosé signed with Atlantic, Jisoo founded Blissoo. The group became the shared stadium, the solos the main event. On Spotify the four now pull between eight and fifty million monthly listeners apiece, just under 100 million combined, and no single company owns all of it.

JENNIE went first, and she went big. *Fallen Angel* arrived August 28 through Odd Atelier in partnership with Columbia Records, three tracks called FALLEN ANGEL, HEAVEN and Less than a Lover. It is her first collection since *Ruby*, last year's full-length solo debut, which opened at No. 7 on the Billboard 200 and moved more than a million copies worldwide in its first week. Her lane has been consistent since then, rap-forward pop with a taste for the theatrical, and *Fallen Angel* sharpens it. The title-track video plays like a dark fairytale, all fire and feathers, and Billboard readers voted it the best new music of its release week. The lesson of *Ruby* was that she could carry an album on charisma alone. The lesson of the EP is that the charisma has found a setting.

[youtube:s466YCiHfKw]

[photo:https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0e/Jennie_performs_Like_Jennie_at_SoFi_Stadium_01.png/1280px-Jennie_performs_Like_Jennie_at_SoFi_Stadium_01.png|theCwE / Wikimedia Commons (CC BY 3.0)|https://commons.wikimedia.org/wiki/File:Jennie_performs_Like_Jennie_at_SoFi_Stadium_01.png|50% 25%|1]

ROSÉ closed the window with "new trick," and the song doubles as a technology showcase. Dave Meyers, the director behind some of the most-watched videos of the last decade, shot the whole clip on an iPhone 18 Pro as part of Apple's Shot on iPhone series. The single extends the run she has been on since *rosie*, her 2024 debut album, and since "APT.," her duet with Bruno Mars that turned into the biggest hit any member of the group has touched as a soloist. At the Brit Awards on February 28 she took International Song of the Year for it, the first K-pop artist ever to win at the ceremony. Her lane is the singer-songwriter end of the group, guitars and heartache under the pop polish, and "new trick" stays inside it while playing a new game with the visuals.

[youtube:Lufa9QAFFeY]

[photo:https://thumb.wikimedia.org/wikipedia/commons/thumb/3/31/Ros%C3%A9_performs_3am_at_SoFi_Stadium_01.png/1280px-Ros%C3%A9_performs_3am_at_SoFi_Stadium_01.png|theCwE / Wikimedia Commons (CC BY 3.0)|https://commons.wikimedia.org/wiki/File:Ros%C3%A9_performs_3am_at_SoFi_Stadium_01.png|50% 25%|1]

LISA's story right now lives as much on screens as on speakers. She made her acting debut in the third season of The White Lotus, and Netflix has cast her in TYGO, an action thriller set in the Extraction universe alongside Don Lee and Lee Jin-uk, slated for release later this year. In February she was reported as the lead of a romantic comedy inspired by Notting Hill, with producing duties attached. The music keeps pace. "SaWaDiKa" arrived September 1, and a week later a duet version credited LISA and JENNIE together, the first time two members of the group shared a single during this solo wave. Her lane is the most global of the four, dance-pop built for festivals, and the Thai-language title of the single is its own statement about where her audience lives.

[apple:song:6809951680:6809951681]

[photo:https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ae/LISA_Live_from_The_Deadline_Tour_at_SoFi_Stadium_01.png/1280px-LISA_Live_from_The_Deadline_Tour_at_SoFi_Stadium_01.png|theCwE / Wikimedia Commons (CC BY 3.0)|https://commons.wikimedia.org/wiki/File:LISA_Live_from_The_Deadline_Tour_at_SoFi_Stadium_01.png|50% 25%|1]

JISOO is the patient one, and her rollout says so. After the *AMORTAGE* mini-album in February 2025, she opened September with "CLICK" on the fourth, the first of what she has described as multiple pre-release singles ahead of her debut full-length album. The video drew tens of millions of views in its first two weeks and sat near the top of YouTube's global music chart. Her lane is the warmest of the four, classic pop songwriting with a soft center, closer to a love letter than a mission statement. The acting resume, from the K-drama *Snowdrop* onward, gives her the widest audience overlap outside music, and the singles rollout treats that audience as something to be kept, not spent.

[apple:song:6805983708:6805983713]

[photo:https://thumb.wikimedia.org/wikipedia/commons/thumb/1/11/Jisoo_performs_Earthquake_at_SoFi_Stadium_01.png/1280px-Jisoo_performs_Earthquake_at_SoFi_Stadium_01.png|theCwE / Wikimedia Commons (CC BY 3.0)|https://commons.wikimedia.org/wiki/File:Jisoo_performs_Earthquake_at_SoFi_Stadium_01.png|50% 25%|1]

The group's own formula explains why the solos work. BLACKPINK records duels, rap verses traded like taunts against choruses built to be screamed by 60,000 people, drops where other bands put bridges. The formula made them the biggest girl group of their era and it also split each song between four voices. The solo wave lets each member keep her half of the duel and live in it. Jennie took the theatre, Lisa the dance floor, Rosé the guitars, Jisoo the melody. Heard back to back, the four September releases sound like the group's sound separated into its ingredients.

Even the business scaffolding is quietly being rebuilt. *Deadline* was the first group project distributed by The Orchard, the Sony-owned independent distributor, instead of Interscope, the label that carried *Born Pink*. Four women, four companies, one shared stadium circuit. That structure did not exist for K-pop's last generation of supergroups, and the duet between Lisa and Jennie suggests the companies are not rival camps but flexible alliances.

No next group record has been announced. What exists instead is four solo careers running at full speed, each one feeding the name it came from. The fear in 2024 was that contract season would pull BLACKPINK apart. The last three weeks are the argument against that fear, played out in public, one release at a time."""

BP_EXC = "All four members released new music of their own within three weeks, while the stadium tour that just ended remains the biggest thing they have done."


def prose(body):
    return "\n".join(l for l in body.splitlines() if not l.strip().startswith("["))


def check(name, body, excerpt, artist):
    errs = []
    p = prose(body)
    no_titles = re.sub(r"\*[^*]+\*", "", p)
    if ":" in no_titles:
        errs.append(f"{name}: colon in prose")
    if ";" in p:
        errs.append(f"{name}: semicolon found")
    for bad in ("\u201c", "\u201d", "\u2018", "\u2019"):
        if bad in p or bad in excerpt:
            errs.append(f"{name}: curly quote {bad!r}")
    L = len(excerpt)
    if not (100 <= L <= 160):
        errs.append(f"{name}: excerpt {L} chars (need 100-160)")
    if artist and artist.lower() in excerpt.lower():
        errs.append(f"{name}: artist name inside excerpt")
    for l in body.splitlines():
        s = l.strip()
        if s.startswith("[") and not (s.startswith("[apple:") or s.startswith("[youtube:") or s.startswith("[photo:")):
            errs.append(f"{name}: odd marker {s[:40]}")
        if s.startswith("[") and s != l:
            errs.append(f"{name}: marker not alone on line -> {s[:40]}")
    if p.count("*") % 2:
        errs.append(f"{name}: unbalanced italics")
    words = len(p.split())
    print(f"[check] {name}: excerpt {L} chars, body {words} words")
    return errs


def main():
    send = "--send" in sys.argv

    cardi = {
        "id": "auncardi21k1", "type": "news", "tag": "News", "rtype": "",
        "artist": "Cardi B",
        "title": "Cardi B Is Planning a Third Album for 2027, and Says the Gap Won't Be Seven Years Again",
        "excerpt": CARDI_EXC, "body": CARDI_BODY,
        "date": "2026-09-21", "pinned": False, "status": "scheduled",
        "publishAt": "2026-09-21T17:00:00.000Z",
        "cover": {"kind": "img", "src": "photos/cardi-b-press-2025.jpg",
                  "credit": "Brian Ziff",
                  "creditUrl": "https://www.brianziff.com",
                  "pos": "50% 42%", "zoom": 1.0, "cardY": 0.42, "cardZoom": 1.31},
    }
    teddy = {
        "id": "aurts21r1", "type": "release", "tag": "Album", "rtype": "Album",
        "artist": "Teddy Swims",
        "title": "Teddy Swims Announces UGLY, Out January 22, With the Confessional \"Perfect Man\"",
        "excerpt": TEDDY_EXC, "body": TEDDY_BODY,
        "date": "2026-09-22", "pinned": False, "status": "scheduled",
        "publishAt": "2026-09-22T17:00:00.000Z",
        "cover": {"kind": "img", "src": "photos/teddy-swims-ugly-press-2026.jpg",
                  "credit": "Jimmy Fontaine",
                  "creditUrl": "https://www.jimmyfontaine.com",
                  "pos": "47% 28%", "zoom": 1.28, "cardY": 0.28, "cardZoom": 2.28},
    }
    feature = {
        "id": "aubp23feat1", "type": "news", "tag": "Feature", "rtype": "",
        "artist": "",
        "title": "Inside BLACKPINK's Solo Wave, Where Each Member Is Heading While the Group Rests",
        "excerpt": BP_EXC, "body": BP_BODY,
        "date": "2026-09-23", "pinned": True, "status": "scheduled",
        "publishAt": "2026-09-23T17:00:00.000Z",
        "cover": {"kind": "img", "src": "photos/blackpink-deadline-tour-milan.jpg",
                  "credit": "Yeagvr / Wikimedia Commons (CC BY-SA 4.0)",
                  "creditUrl": "https://commons.wikimedia.org/wiki/File:Blackpink_World_Tour_Milan.jpg",
                  "pos": "50% 50%", "zoom": 1.0, "cardY": 0.5, "cardZoom": 1.0},
    }

    errs = check("cardi", CARDI_BODY, CARDI_EXC, "Cardi B")
    errs += check("teddy", TEDDY_BODY, TEDDY_EXC, "Teddy Swims")
    errs += check("feature", BP_BODY, BP_EXC, "BLACKPINK")
    if errs:
        print("STYLE PROBLEMS:")
        for e in errs:
            print(" -", e)
        sys.exit(2)

    if not send:
        print("DRY RUN ok. Add --send to publish.")
        return

    r = subprocess.run(["curl", "-s", "-H", "X-Admin-Key: " + PASSWORD, PROD + "/api/desk"],
                       capture_output=True)
    desk = json.loads(r.stdout.decode("utf-8"))
    existing = desk["posts"]
    ids = {p["id"] for p in existing}
    for p in (cardi, teddy, feature):
        if p["id"] in ids:
            existing = [x for x in existing if x["id"] != p["id"]]
    for p in existing:
        p["pinned"] = False
    payload = {"posts": [feature, teddy, cardi] + existing}
    dump = os.path.join(tempfile.gettempdir(), "desk-payload-921.json")
    with open(dump, "w", encoding="ascii") as f:
        json.dump(payload, f, ensure_ascii=True)
    print("payload bytes:", os.path.getsize(dump))
    out = subprocess.run(["curl", "-s", "-X", "POST", "-H", "X-Admin-Key: " + PASSWORD,
                          "-H", "Content-Type: application/json",
                          "--data", "@" + dump, PROD + "/api/desk"],
                         capture_output=True, text=True)
    print("POST ->", out.stdout[:300])


if __name__ == "__main__":
    main()
