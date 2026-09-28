#!/usr/bin/env python3
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
TITLE = "Taylor Swift Takes Video of the Year as Madonna Leads the 2026 MTV VMAs With Seven Wins"
EXCERPT = 'Taylor Swift won Video of the Year and Madonna led the 2026 MTV Video Music Awards with seven awards at the September 27 ceremony in Los Angeles.'

HERO_KEY = "a6d485acfd"
HERO_NAME = "vmas-2026-taylor-swift-madonna.jpg"
HERO_CREDIT = "Christopher Polk"
HERO_CREDIT_URL = "https://www.paramountpressexpress.com/mtv/shows/2026-mtv-video-music-awards-vmas/photos/?view=a6d485acfd"

SIENNA_KEY = "16d405d43a"
SIENNA_NAME = "vmas-2026-sienna-spiro.jpg"
SIENNA_CREDIT = "Christopher Polk"
SIENNA_CREDIT_URL = "https://www.paramountpressexpress.com/mtv/shows/2026-mtv-video-music-awards-vmas/photos/?view=16d405d43a"

BODY_TEMPLATE = r'''Taylor Swift won Video of the Year and Madonna finished with seven awards at the 2026 MTV Video Music Awards on September 27 in Los Angeles. The ceremony returned to the Peacock Theater with Snoop Dogg as host. By the end of the night, Madonna had the largest trophy count, while Swift had taken the top video prize and added another directing win to a career total that now stands at 32 VMAs.

Madonna entered the final ballot with 13 nominations after MTV added its social categories. Her wins reached across the show rather than clustering in one lane. She took Artist of the Year and Best Album for *Confessions II*, shared Best Collaboration with Sabrina Carpenter for "Bring Your Love," and picked up four more awards tied to *Confessions II - The Film*. The seven-award haul gave the night a clear statistical leader without turning the rest of the results into a one-artist sweep.

Swift's two competitive wins landed in the categories most closely tied to her video work. "The Fate of Ophelia" took Video of the Year, while "Opalite" won Best Direction. Those awards moved her career tally from 30 to 32 and ahead of Beyoncé's previous total. MTV also gave Swift the inaugural Artist Director Honors, a separate recognition for her directing work rather than another competitive category.

[photo:{sienna_src}|Christopher Polk|https://www.paramountpressexpress.com/mtv/shows/2026-mtv-video-music-awards-vmas/photos/?view=16d405d43a|50% 42%|1]

Away from Madonna and Swift, the major awards spread quickly. BTS won Song of the Year with "Swim," took Best K-Pop for the same track and was named Best Group. Sienna Spiro won Best New Artist. LISA took Best Pop, Cardi B and Kehlani won in hip-hop, Bruno Mars won R&B, Olivia Rodrigo took alternative, Bad Bunny won Latin and Ella Langley took country. Ariana Grande finished with Song of Summer and the visual-effects award.

The craft categories gave the board another layer. Sabrina Carpenter's "House Tour" won editing, PinkPantheress took art direction for "Stateside + Zara Larsson," and Madonna added cinematography and choreography to her total. Nirvana received the Video Vanguard Award, with Dave Grohl, Krist Novoselic and Pat Smear present for the honor. Those special awards sat outside the main competitive tally.

The performance side of the VMAs deserves its own recap because the show packed in far more than the winners list can hold. This post stays with the results. Every competitive category, winner and nominee from the final 2026 ballot is collected below, followed by the two special honors.

[awards]

**Video of the Year.** **Winner** Taylor Swift with "The Fate of Ophelia." **Nominees** Ariana Grande with "Hate That I Made You Love Me," Bruno Mars with "I Just Might," GENER8ION with "Storm Starring Yung Lean," Madonna with "Confessions II - The Film," and Sabrina Carpenter with "Tears."

**Artist of the Year.** **Winner** Madonna. **Nominees** Ariana Grande, Bruno Mars, Morgan Wallen, Sabrina Carpenter and Taylor Swift.

**Song of the Year.** **Winner** BTS with "Swim." **Nominees** Ella Langley with "Choosin' Texas," HUNTR/X with EJAE, Audrey Nuna and REI AMI with "Golden," Madonna and Sabrina Carpenter with "Bring Your Love," Olivia Dean with "Man I Need," PinkPantheress with "Stateside + Zara Larsson," and RAYE with "Where Is My Husband!"

**Best New Artist.** **Winner** Sienna Spiro. **Nominees** Bella Kay, CORTIS, Magnus Ferrell, Malcolm Todd, Myles Smith and Stella Lefty.

**Best Collaboration.** **Winner** Madonna and Sabrina Carpenter with "Bring Your Love." **Nominees** Clipse, Kendrick Lamar, Pusha T and Malice with "Chains & Whips," French Montana and Max B with "Ever Since U Left Me," PinkPantheress with "Stateside + Zara Larsson," Shakira and Burna Boy with "Dai Dai," and Teyana Taylor and Lucky Daye with "Hard Part."

**Best Pop.** **Winner** LISA with "Dream feat. Kentaro Sakaguchi." **Nominees** Ariana Grande with "Hate That I Made You Love Me," Charli xcx with "SS26," Olivia Rodrigo with "Drop Dead," Sabrina Carpenter with "House Tour," Tate McRae with "Nobody's Girl," and Taylor Swift with "The Fate of Ophelia."

**Best Hip-Hop.** **Winner** Cardi B ft. Kehlani with "Safe." **Nominees** Don Toliver with "E85," Drake with "Janice STFU," Megan Thee Stallion with "Lover Girl," Travis Scott with "Dumbo," and Tyler, the Creator with "Sugar on My Tongue."

**Best R&B.** **Winner** Bruno Mars with "I Just Might." **Nominees** Chris Brown with "It Depends/Obvious," Dave and Tems with "Raindance," Justin Bieber with "Yukon," Kehlani with "Folded," and Mariah the Scientist and Kali Uchis with "Is It a Crime."

**Best Alternative.** **Winner** Olivia Rodrigo with "the cure." **Nominees** Geese with "Taxes," mgk and Fred Durst with "Fix Ur Face," Noah Kahan with "The Great Divide," SOMBR with "Homewrecker," Tame Impala with "Dracula," and Twenty One Pilots with "Drag Path."

**Best Dance.** **Winner** Madonna with "Confessions II - The Film." **Nominees** Bebe Rexha and Faithless with "New Religion," Harry Styles with "Aperture," Lady Gaga and Doechii with "Runaway," PinkPantheress with "Stateside + Zara Larsson," Slayyyter with "Dance...," and Tate McRae with "Nobody's Girl."

**Best Latin.** **Winner** Bad Bunny with "NUEVAYoL." **Nominees** Anitta with Shakira on "Choka Choka," Fuerza Regida with "Tu Sancho," KAROL G with "Papasito," Rosalía ft. Yahritza Y Su Esencia with "La Perla," Ryan Castro, Kapo and Gangsta with "La Villa," and Shakira and Burna Boy with "Dai Dai."

**Best K-Pop.** **Winner** BTS with "Swim." **Nominees** BLACKPINK with "Jump," CORTIS with "RedRed," KATSEYE with "Pinky Up," LE SSERAFIM feat. J-Hope of BTS with "Spaghetti," and LISA with "Dream feat. Kentaro Sakaguchi."

**Best Country.** **Winner** Ella Langley with "Choosin' Texas." **Nominees** Kacey Musgraves with "Dry Spell," Lainey Wilson with "Somewhere Over Laredo," Luke Combs with "Back in the Saddle," Shaboozey with "Cowgirl," Stella Lefty with "Boston," and Tucker Wetmore with "Brunette."

**Best Direction.** **Winner** Taylor Swift with "Opalite." **Nominees** Ariana Grande with "Hate That I Made You Love Me," Bruno Mars with "I Just Might," GENER8ION with "Storm starring Yung Lean," Madonna with "Confessions II - The Film," and Sabrina Carpenter with "House Tour."

**Best Art Direction.** **Winner** PinkPantheress with "Stateside + Zara Larsson." **Nominees** Charli xcx with "SS26," Lady Gaga and Doechii with "Runaway," Madonna with "Confessions II - The Film," SOMBR with "My Body Isn't Ready," and Taylor Swift with "The Fate of Ophelia."

**Best Cinematography.** **Winner** Madonna with "Confessions II - The Film." **Nominees** A$AP Rocky with "Punk Rocky," Ariana Grande with "Hate That I Made You Love Me," LISA with "Dream feat. Kentaro Sakaguchi," Shaboozey with "Cowgirl," and Taylor Swift with "The Fate of Ophelia."

**Best Editing.** **Winner** Sabrina Carpenter with "House Tour." **Nominees** Ariana Grande with "Hate That I Made You Love Me," Bruno Mars with "I Just Might," LISA with "Dream feat. Kentaro Sakaguchi," Madonna with "Confessions II - The Film," and Taylor Swift with "The Fate of Ophelia."

**Best Choreography.** **Winner** Madonna with "Confessions II - The Film." **Nominees** GENER8ION with "Storm starring Yung Lean," Harry Styles with "Dance No More," KATSEYE with "Pinky Up," Tate McRae with "Nobody's Girl," and Taylor Swift with "The Fate of Ophelia."

**Best Visual Effects.** **Winner** Ariana Grande with "hate that i made you love me." **Nominees** JISOO x ZAYN with "Eyes Closed," Madonna with "Confessions II - The Film," PinkPantheress with "Stateside + Zara Larsson," RAYE ft. Hans Zimmer with "Click Clack Symphony.," and Taylor Swift with "The Fate of Ophelia."

**Best Group.** **Winner** BTS. **Nominees** BLACKPINK, CORTIS, FLO, Fuerza Regida, Geese, KATSEYE and Twenty One Pilots.

**Best Long Form Video.** **Winner** Madonna with *Confessions II - The Film*. **Nominees** Charli xcx with *Music, Fashion, Film*, Ella Langley with *Choosin' Texas*, and GENER8ION with *STORM starring Yung Lean*.

**Best Album.** **Winner** Madonna with *Confessions II*. **Nominees** Drake with *ICEMAN*, Olivia Dean with *The Art of Loving*, Olivia Rodrigo with *you seem pretty sad for a girl so in love*, Sabrina Carpenter with *Man's Best Friend*, and Taylor Swift with *The Life of a Showgirl*.

**Song of Summer.** **Winner** Ariana Grande with "hate that i made you love me." **Nominees** Bruno Mars with "Risk It All," Charli xcx with "Camera," Ella Langley with "Choosin' Texas," KATSEYE with "Hootie Frutti," Latto ft. Doja Cat with "Okayyy," Morgan Wallen with "Been By Now," Olivia Dean with "So Easy (To Fall in Love)," Olivia Rodrigo with "Stupid Song," Sabrina Carpenter with "House Tour," Slayyyter with "brand new chanel$," SOMBR with "Homewrecker," Stella Lefty with "Boston," Tame Impala and JENNIE with "Dracula," and Taylor Swift with "I Knew It, I Knew You."

**Video Vanguard Award.** Nirvana.

**MTV VMA Artist Director Honors.** Taylor Swift.

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
    sienna_src, sienna_size = upload_photo(SIENNA_KEY, SIENNA_NAME)
    body = BODY_TEMPLATE.format(sienna_src=sienna_src)

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
                "cardY": 0.48,
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
    print("BODY_PHOTO", sienna_size, sienna_src, SIENNA_CREDIT)
    print("NO_DUPLICATE_VMA_POSTS", True)
    ok = runner.cmd_gate(PID)
    print("VMA_GATE", "PASS" if ok else "FAIL")
    runner.cmd_show(PID)

if __name__ == "__main__":
    main()
