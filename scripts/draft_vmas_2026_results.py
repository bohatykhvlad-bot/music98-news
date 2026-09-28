#!/usr/bin/env python3
# Final gate rerun after structured-awards checklist fix.
from __future__ import annotations

import base64
import io
import json
import sys
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import post as runner

PID = "vmas26results"
TITLE = "2026 MTV VMAs: All the Winners"
EXCERPT = 'Taylor Swift won Video of the Year and Madonna finished with seven awards at the 2026 MTV VMAs on September 27 in Los Angeles.'

HERO_KEY = "69c1ac19ff"
HERO_NAME = "vmas-2026-taylor-swift-artist-director-honors-stage.jpg"
HERO_CREDIT = "Stewart Cook"
HERO_CREDIT_URL = "https://stewartcook.com/"
HERO_SOURCE_URL = "https://www.paramountpressexpress.com/mtv/shows/2026-mtv-video-music-awards-vmas/photos/?view=69c1ac19ff"

NIRVANA_KEY = "2f1e0f8fc4"
NIRVANA_NAME = "vmas-2026-nirvana-video-vanguard-stage.jpg"
NIRVANA_CREDIT = "Francis Specker"
NIRVANA_CREDIT_URL = "https://francisspecker.com/"

LISA_KEY = "932c1f928d"
LISA_NAME = "vmas-2026-lisa.jpg"
LISA_CREDIT = "Christopher Polk"
LISA_CREDIT_URL = "https://www.instagram.com/polkimaging/"

TAYLOR_KEY = "dded7f7e94"
TAYLOR_NAME = "vmas-2026-taylor-video-of-the-year.jpg"
TAYLOR_CREDIT = "Stewart Cook"
TAYLOR_CREDIT_URL = "https://stewartcook.com/"

SIENNA_KEY = "3f54be88ed"
SIENNA_NAME = "vmas-2026-sienna-spiro-best-new-artist-stage.jpg"
SIENNA_CREDIT = "Francis Specker"
SIENNA_CREDIT_URL = "https://francisspecker.com/"

BODY_TEMPLATE = r'''Taylor Swift won Video of the Year and Madonna finished with seven awards at the 2026 MTV VMAs on September 27 in Los Angeles. The ceremony took place at the Peacock Theater with Snoop Dogg as host, while Swift also won Best Direction.

Madonna entered the final ballot with 13 nominations after MTV added its social categories. Her wins reached across the show rather than clustering in one lane. She took Artist of the Year and Best Album for *Confessions II*, shared Best Collaboration with Sabrina Carpenter for "Bring Your Love," and picked up four more awards tied to *Confessions II - The Film*. The seven-award haul gave the night a clear statistical leader without turning the rest of the results into a one-artist sweep.

Swift's two competitive wins landed in the categories most closely tied to her video work. "The Fate of Ophelia" took Video of the Year, while "Opalite" won Best Direction. MTV also presented Swift with the inaugural Artist Director Honors, a separate recognition for her work behind the camera.


Away from Madonna and Swift, the major awards spread quickly. BTS won Song of the Year with "Swim," took Best K-Pop for the same track and was named Best Group. Sienna Spiro won Best New Artist. LISA won the pop category. Cardi B and Kehlani took hip-hop, Bruno Mars R&B, Olivia Rodrigo alternative, Bad Bunny Latin and Ella Langley country. Ariana Grande finished with Song of Summer and the visual-effects award.

The craft races broke in a different direction. Sabrina Carpenter's "House Tour" won editing, PinkPantheress took art direction for "Stateside + Zara Larsson," and Madonna added cinematography and choreography to her total. Nirvana received the Video Vanguard Award, with Dave Grohl, Krist Novoselic and Pat Smear present for the honor. Those special awards sat outside the main competitive tally.

The performance side of the VMAs deserves its own recap because the show packed in far more than the winners list can hold. This post stays with the results. Every competitive category, winner and nominee from the final 2026 ballot is collected below, followed by the two special honors.

[awards]

[award:Video of the Year]

[winner:Taylor Swift — "The Fate of Ophelia"]

[nominee:Ariana Grande — "hate that i made you love me"]

[nominee:Bruno Mars — "I Just Might"]

[nominee:GENER8ION — "STORM starring Yung Lean"]

[nominee:Madonna — "Confessions II - The Film"]

[nominee:Sabrina Carpenter — "Tears"]

[award:Artist of the Year]

[winner:Madonna]

[nominee:Ariana Grande]

[nominee:Bruno Mars]

[nominee:Morgan Wallen]

[nominee:Sabrina Carpenter]

[nominee:Taylor Swift]

[award:Song of the Year]

[winner:BTS — "Swim"]

[nominee:Ella Langley — "Choosin' Texas"]

[nominee:HUNTR/X: EJAE, Audrey Nuna, REI AMI — "Golden"]

[nominee:Madonna and Sabrina Carpenter — "Bring Your Love"]

[nominee:Olivia Dean — "Man I Need"]

[nominee:PinkPantheress — "Stateside + Zara Larsson"]

[nominee:RAYE — "WHERE IS MY HUSBAND!"]

[award:Best New Artist]

[winner:Sienna Spiro]

[nominee:Bella Kay]

[nominee:CORTIS]

[nominee:Magnus Ferrell]

[nominee:Malcolm Todd]

[nominee:Myles Smith]

[nominee:Stella Lefty]

[award:Best Collaboration]

[winner:Madonna and Sabrina Carpenter — "Bring Your Love"]

[nominee:Clipse, Kendrick Lamar, Pusha T and Malice — "Chains & Whips"]

[nominee:French Montana and Max B — "Ever Since U Left Me"]

[nominee:PinkPantheress — "Stateside + Zara Larsson"]

[nominee:Shakira and Burna Boy — "Dai Dai"]

[nominee:Teyana Taylor and Lucky Daye — "Hard Part"]

[photo:{taylor_src}|Stewart Cook|https://stewartcook.com/|50% 25%|1]

[award:Best Pop]

[winner:LISA — "Dream feat. Kentaro Sakaguchi"]

[nominee:Ariana Grande — "hate that i made you love me"]

[nominee:Charli xcx — "SS26"]

[nominee:Olivia Rodrigo — "drop dead"]

[nominee:Sabrina Carpenter — "House Tour"]

[nominee:Tate McRae — "Nobody's Girl"]

[nominee:Taylor Swift — "The Fate of Ophelia"]

[award:Best Hip-Hop]

[winner:Cardi B ft. Kehlani — "Safe"]

[nominee:Don Toliver — "E85"]

[nominee:Drake — "Janice STFU"]

[nominee:Megan Thee Stallion — "LOVER GIRL"]

[nominee:Travis Scott — "DUMBO"]

[nominee:Tyler, the Creator — "SUGAR ON MY TONGUE"]

[award:Best R&B]

[winner:Bruno Mars — "I Just Might"]

[nominee:Chris Brown — "It Depends/Obvious"]

[nominee:Dave and Tems — "Raindance"]

[nominee:Justin Bieber — "YUKON"]

[nominee:Kehlani — "Folded"]

[nominee:Mariah the Scientist and Kali Uchis — "Is It a Crime"]

[award:Best Alternative]

[winner:Olivia Rodrigo — "the cure"]

[nominee:Geese — "Taxes"]

[nominee:mgk and Fred Durst — "FIX UR FACE"]

[nominee:Noah Kahan — "The Great Divide"]

[nominee:SOMBR — "Homewrecker"]

[nominee:Tame Impala — "Dracula"]

[nominee:Twenty One Pilots — "Drag Path"]

[photo:{sienna_src}|Francis Specker|https://francisspecker.com/|50% 45%|1]

[award:Best Dance]

[winner:Madonna — "Confessions II - The Film"]

[nominee:Bebe Rexha and Faithless — "New Religion"]

[nominee:Harry Styles — "Aperture"]

[nominee:Lady Gaga and Doechii — "RUNWAY"]

[nominee:PinkPantheress — "Stateside + Zara Larsson"]

[nominee:Slayyyter — "DANCE..."]

[nominee:Tate McRae — "Nobody's Girl"]

[award:Best Latin]

[winner:Bad Bunny — "NUEVAYoL"]

[nominee:Anitta with Shakira — "Choka Choka"]

[nominee:Fuerza Regida — "TU SANCHO"]

[nominee:KAROL G — "Papasito"]

[nominee:Rosalía ft. Yahritza Y Su Esencia — "La Perla"]

[nominee:Ryan Castro, Kapo and Gangsta — "LA VILLA"]

[nominee:Shakira and Burna Boy — "Dai Dai"]

[award:Best K-Pop]

[winner:BTS — "Swim"]

[nominee:BLACKPINK — "JUMP"]

[nominee:CORTIS — "REDRED"]

[nominee:KATSEYE — "PINKY UP"]

[nominee:LE SSERAFIM feat. j-hope of BTS — "SPAGHETTI"]

[nominee:LISA — "Dream feat. Kentaro Sakaguchi"]

[photo:{lisa_src}|Christopher Polk|https://www.instagram.com/polkimaging/|50% 54%|1]

[award:Best Country]

[winner:Ella Langley — "Choosin' Texas"]

[nominee:Kacey Musgraves — "Dry Spell"]

[nominee:Lainey Wilson — "Somewhere Over Laredo"]

[nominee:Luke Combs — "Back in the Saddle"]

[nominee:Shaboozey — "Cowgirl"]

[nominee:Stella Lefty — "Boston"]

[nominee:Tucker Wetmore — "Brunette"]

[award:Best Direction]

[winner:Taylor Swift — "Opalite"]

[nominee:Ariana Grande — "hate that i made you love me"]

[nominee:Bruno Mars — "I Just Might"]

[nominee:GENER8ION — "STORM starring Yung Lean"]

[nominee:Madonna — "Confessions II - The Film"]

[nominee:Sabrina Carpenter — "House Tour"]

[award:Best Art Direction]

[winner:PinkPantheress — "Stateside + Zara Larsson"]

[nominee:Charli xcx — "SS26"]

[nominee:Lady Gaga and Doechii — "RUNWAY"]

[nominee:Madonna — "Confessions II - The Film"]

[nominee:SOMBR — "My Body Isn't Ready"]

[nominee:Taylor Swift — "The Fate of Ophelia"]

[award:Best Cinematography]

[winner:Madonna — "Confessions II - The Film"]

[nominee:A$AP Rocky — "PUNK ROCKY"]

[nominee:Ariana Grande — "hate that i made you love me"]

[nominee:LISA — "Dream feat. Kentaro Sakaguchi"]

[nominee:Shaboozey — "Cowgirl"]

[nominee:Taylor Swift — "The Fate of Ophelia"]

[award:Best Editing]

[winner:Sabrina Carpenter — "House Tour"]

[nominee:Ariana Grande — "hate that i made you love me"]

[nominee:Bruno Mars — "I Just Might"]

[nominee:LISA — "Dream feat. Kentaro Sakaguchi"]

[nominee:Madonna — "Confessions II - The Film"]

[nominee:Taylor Swift — "The Fate of Ophelia"]

[award:Best Choreography]

[winner:Madonna — "Confessions II - The Film"]

[nominee:GENER8ION — "STORM starring Yung Lean"]

[nominee:Harry Styles — "Dance No More"]

[nominee:KATSEYE — "PINKY UP"]

[nominee:Tate McRae — "Nobody's Girl"]

[nominee:Taylor Swift — "The Fate of Ophelia"]

[photo:{nirvana_src}|Francis Specker|https://francisspecker.com/|50% 50%|1]

[award:Best Visual Effects]

[winner:Ariana Grande — "hate that i made you love me"]

[nominee:JISOO x ZAYN — "Eyes Closed"]

[nominee:Madonna — "Confessions II - The Film"]

[nominee:PinkPantheress — "Stateside + Zara Larsson"]

[nominee:RAYE ft. Hans Zimmer — "Click Clack Symphony."]

[nominee:Taylor Swift — "The Fate of Ophelia"]

[award:Best Group]

[winner:BTS]

[nominee:BLACKPINK]

[nominee:CORTIS]

[nominee:FLO]

[nominee:Fuerza Regida]

[nominee:Geese]

[nominee:KATSEYE]

[nominee:Twenty One Pilots]

[award:Best Long Form Video]

[winner:Madonna — *Confessions II - The Film*]

[nominee:Charli xcx — *Music, Fashion, Film*]

[nominee:Ella Langley — *Choosin' Texas*]

[nominee:GENER8ION — *STORM starring Yung Lean*]

[award:Best Album]

[winner:Madonna — *Confessions II*]

[nominee:Drake — *ICEMAN*]

[nominee:Olivia Dean — *The Art of Loving*]

[nominee:Olivia Rodrigo — *You Seem Pretty Sad for a Girl So in Love*]

[nominee:Sabrina Carpenter — *Man's Best Friend*]

[nominee:Taylor Swift — *The Life of a Showgirl*]

[award:Song of Summer]

[winner:Ariana Grande — "hate that i made you love me"]

[nominee:Bruno Mars — "Risk It All"]

[nominee:Charli xcx — "Camera"]

[nominee:Ella Langley — "Choosin' Texas"]

[nominee:KATSEYE — "Hootie Frutti"]

[nominee:Latto ft. Doja Cat — "Okayyy"]

[nominee:Morgan Wallen — "Been by Now"]

[nominee:Olivia Dean — "So Easy (To Fall in Love)"]

[nominee:Olivia Rodrigo — "Stupid Song"]

[nominee:Sabrina Carpenter — "House Tour"]

[nominee:Slayyyter — "brand new chanel$"]

[nominee:SOMBR — "Homewrecker"]

[nominee:Stella Lefty — "Boston"]

[nominee:Tame Impala and JENNIE — "Dracula"]

[nominee:Taylor Swift — "I Knew It, I Knew You"]

[award:Video Vanguard Award]

[winner:Nirvana]

[award:MTV VMA Artist Director Honors]

[winner:Taylor Swift]

[/awards]

The final board split the night in two different ways. Madonna's seven awards showed how far *Confessions II* and its film reached across the ballot, from Artist and Album to collaboration and craft. Swift left with fewer competitive trophies, but one was Video of the Year and the other was for her direction. Around them, BTS, Ariana Grande, Sienna Spiro and the genre winners kept the results from narrowing into a two-artist story.'''

def get_highres(key: str) -> bytes:
    action = (
        "https://www.paramountpressexpress.com/mtv/actions/"
        "?action=asset-download&brand=mtv&type=photo&key="
        + urllib.parse.quote(key)
        + "&rnd=7654321"
    )
    req = urllib.request.Request(
        action,
        headers={
            "User-Agent": runner.UA,
            "Referer": "https://www.paramountpressexpress.com/mtv/shows/2026-mtv-video-music-awards-vmas/photos/",
        },
    )
    with urllib.request.urlopen(req, timeout=90) as r:
        meta = json.loads(r.read().decode("utf-8"))
    if meta.get("result") != "ok" or not meta.get("redirect"):
        raise RuntimeError("Paramount high-res action failed: " + repr(meta))
    url = urllib.parse.urljoin("https://www.paramountpressexpress.com", meta["redirect"])
    req = urllib.request.Request(
        url,
        headers={"User-Agent": runner.UA, "Referer": "https://www.paramountpressexpress.com/"},
    )
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()

def compress_jpeg(raw: bytes, name: str) -> tuple[bytes, tuple[int, int]]:
    im = Image.open(io.BytesIO(raw)).convert("RGB")
    size = im.size
    if max(size) < 1920:
        raise RuntimeError(f"{name} too small: {size}")
    for q in (90, 87, 84, 81, 78, 74):
        buf = io.BytesIO()
        im.save(buf, "JPEG", quality=q, optimize=True, progressive=True)
        data = buf.getvalue()
        if len(data) <= 2_850_000:
            print("PHOTO_READY", name, size, len(data), "quality", q)
            return data, size
    raise RuntimeError(f"{name} cannot fit photo API limit without excessive compression")

def upload_photo(key: str, name: str) -> tuple[str, tuple[int, int]]:
    raw = get_highres(key)
    data, size = compress_jpeg(raw, name)
    payload = {
        "name": name,
        "data": "data:image/jpeg;base64," + base64.b64encode(data).decode("ascii"),
    }
    out = runner.http("https://music98.news/api/photo", runner.desk_key(), payload, method="POST")
    if not out.get("ok"):
        raise RuntimeError("photo upload failed: " + repr(out))
    print("PHOTO_UPLOAD", name, out.get("url"), out.get("bytes"))
    return out["url"], size

def find_existing(posts):
    return next((p for p in posts if p.get("id") == PID), None)

def main():
    runner.load_env()

    initial = runner.desk_read()["posts"]
    existing = find_existing(initial)
    possible = []
    related = []
    for p in initial:
        if p.get("id") == PID:
            continue
        title = str(p.get("title", ""))
        low = title.lower()
        if "vma" in low or "video music awards" in low:
            related.append((p.get("id"), p.get("status"), title))
            if any(term in low for term in ("winner", "winners", "result", "results", "video of the year")):
                possible.append(p)
    print("RELATED_VMA_POSTS", related)
    if possible:
        raise RuntimeError("possible existing VMA post(s): " + repr([(p.get("id"), p.get("status"), p.get("title")) for p in possible]))
    if existing and existing.get("status") != "draft":
        raise RuntimeError("refusing to modify non-draft VMA post: " + repr(existing.get("status")))

    hero_src, hero_size = upload_photo(HERO_KEY, HERO_NAME)
    taylor_src, taylor_size = upload_photo(TAYLOR_KEY, TAYLOR_NAME)
    sienna_src, sienna_size = upload_photo(SIENNA_KEY, SIENNA_NAME)
    lisa_src, lisa_size = upload_photo(LISA_KEY, LISA_NAME)
    nirvana_src, nirvana_size = upload_photo(NIRVANA_KEY, NIRVANA_NAME)
    body = BODY_TEMPLATE.format(
        taylor_src=taylor_src,
        sienna_src=sienna_src,
        lisa_src=lisa_src,
        nirvana_src=nirvana_src,
    )

    def mutate(posts):
        p = find_existing(posts)
        rec = {
            "id": PID,
            "type": "news",
            "tag": "News",
            "title": TITLE,
            "excerpt": EXCERPT,
            "body": body,
            "date": "2026-09-28",
            "status": "draft",
            "pinned": False,
            "cover": {
                "kind": "img",
                "src": hero_src,
                "credit": HERO_CREDIT,
                "creditUrl": HERO_CREDIT_URL,
                "pos": "50% 45%",
                "zoom": 1,
                "lockX": 0.50,
                "cardX": 0.50,
                "cardY": 0.45,
                "cardZoom": 1,
            },
        }
        if p is None:
            posts.insert(0, rec)
            return posts[0]
        p.clear()
        p.update(rec)
        return p

    now = runner.guarded_write(mutate)
    print("VMA_DRAFT", now["id"], now["status"], runner.words(now["body"]), "words")
    print("HERO", hero_size, now["cover"]["src"], now["cover"]["credit"])
    print("BODY_PHOTO", taylor_size, taylor_src, TAYLOR_CREDIT)
    print("BODY_PHOTO", sienna_size, sienna_src, SIENNA_CREDIT)
    print("BODY_PHOTO", lisa_size, lisa_src, LISA_CREDIT)
    print("BODY_PHOTO", nirvana_size, nirvana_src, NIRVANA_CREDIT)
    print("AWARD_MARKUP", "technical-render-tags", "award/winner/nominee")
    print("NO_DUPLICATE_VMA_POSTS", True)
    import time
    time.sleep(3)
    ok = runner.cmd_gate(PID)
    if not ok:
        time.sleep(3)
        ok = runner.cmd_gate(PID)
    print("VMA_GATE", "PASS" if ok else "FAIL")
    runner.cmd_show(PID)

if __name__ == "__main__":
    main()
