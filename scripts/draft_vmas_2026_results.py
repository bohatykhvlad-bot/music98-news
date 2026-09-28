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
HERO_CREDIT = "Christopher Polk/CBS"
HERO_CREDIT_URL = "https://www.paramountpressexpress.com/mtv/shows/2026-mtv-video-music-awards-vmas/photos/?view=a6d485acfd"

SIENNA_KEY = "16d405d43a"
SIENNA_NAME = "vmas-2026-sienna-spiro.jpg"
SIENNA_CREDIT = "Christopher Polk/CBS"
SIENNA_CREDIT_URL = "https://www.paramountpressexpress.com/mtv/shows/2026-mtv-video-music-awards-vmas/photos/?view=16d405d43a"

BODY_TEMPLATE = r'''Taylor Swift won Video of the Year and Madonna led the 2026 MTV Video Music Awards with seven awards at the September 27 ceremony in Los Angeles. The show returned to the Peacock Theater with Snoop Dogg as host, but the results settled around two clear centers. Madonna dominated the count, while Swift took the night's top video prize and moved ahead on the VMAs' all-time wins list.

Madonna arrived with 13 nominations after MTV added its social categories and converted more than half of them into wins. She took Artist of the Year and Best Album for *Confessions II*, while "Bring Your Love" with Sabrina Carpenter won Best Collaboration. *Confessions II - The Film* added Best Dance, Best Long Form Video, Best Cinematography and Best Choreography. Seven awards made Madonna the most awarded artist of the night by a wide margin.

Swift's night was smaller by count and bigger at the top. "The Fate of Ophelia" won Video of the Year, and "Opalite" earned Best Direction. Those two competitive wins took her career VMA total to 32, moving her past Beyoncé for the most wins in the show's history. MTV also gave Swift the inaugural Artist Director Honors, a separate award recognizing artists whose directing work has pushed music-video storytelling forward.

The rest of the major prizes were spread across a much wider field. BTS won Song of the Year and Best K-Pop for "Swim" and also took Best Group. LISA won Best Pop with "Dream feat. Kentaro Sakaguchi," while Sienna Spiro was named Best New Artist. Cardi B and Kehlani took Best Hip-Hop for "Safe," Bruno Mars won Best R&B for "I Just Might," Olivia Rodrigo took Best Alternative with "the cure," Bad Bunny won Best Latin for "NUEVAYoL," and Ella Langley won Best Country for "Choosin' Texas."

[photo:{sienna_src}|Christopher Polk/CBS|https://www.paramountpressexpress.com/mtv/shows/2026-mtv-video-music-awards-vmas/photos/?view=16d405d43a|50% 42%|1]

The craft categories did not collapse around one video either. Madonna added cinematography and choreography, Taylor Swift won direction, Sabrina Carpenter's "House Tour" took editing, PinkPantheress won art direction for "Stateside + Zara Larsson," and Ariana Grande's "hate that i made you love me" won visual effects. Grande also took Song of Summer, giving her two awards across the final results.

The special honors sat outside the competitive tally. Nirvana received the Video Vanguard Award, with Dave Grohl, Krist Novoselic and Pat Smear present for the honor. Swift received the first Artist Director Honors. The live performances and tributes were a separate story from the awards themselves, so this recap keeps the focus on who actually won and who they beat in each category.

The complete 2026 MTV VMA results are below. Winners are listed first, followed by the other nominees in each category.

**Video of the Year** — **Winner: Taylor Swift — "The Fate of Ophelia."** Other nominees: Ariana Grande — "Hate That I Made You Love Me," Bruno Mars — "I Just Might," GENER8ION — "Storm Starring Yung Lean," Madonna — "Confessions II - The Film," Sabrina Carpenter — "Tears."

**Artist of the Year** — **Winner: Madonna.** Other nominees: Ariana Grande, Bruno Mars, Morgan Wallen, Sabrina Carpenter, Taylor Swift.

**Song of the Year** — **Winner: BTS — "Swim."** Other nominees: Ella Langley — "Choosin' Texas," HUNTR/X with EJAE, Audrey Nuna and REI AMI — "Golden," Madonna and Sabrina Carpenter — "Bring Your Love," Olivia Dean — "Man I Need," PinkPantheress — "Stateside + Zara Larsson," RAYE — "Where Is My Husband!"

**Best New Artist** — **Winner: Sienna Spiro.** Other nominees: Bella Kay, CORTIS, Magnus Ferrell, Malcolm Todd, Myles Smith, Stella Lefty.

**Best Collaboration** — **Winner: Madonna and Sabrina Carpenter — "Bring Your Love."** Other nominees: Clipse, Kendrick Lamar, Pusha T and Malice — "Chains & Whips," French Montana and Max B — "Ever Since U Left Me," PinkPantheress — "Stateside + Zara Larsson," Shakira and Burna Boy — "Dai Dai," Teyana Taylor and Lucky Daye — "Hard Part."

**Best Pop** — **Winner: LISA — "Dream feat. Kentaro Sakaguchi."** Other nominees: Ariana Grande — "Hate That I Made You Love Me," Charli xcx — "SS26," Olivia Rodrigo — "Drop Dead," Sabrina Carpenter — "House Tour," Tate McRae — "Nobody's Girl," Taylor Swift — "The Fate of Ophelia."

**Best Hip-Hop** — **Winner: Cardi B ft. Kehlani — "Safe."** Other nominees: Don Toliver — "E85," Drake — "Janice STFU," Megan Thee Stallion — "Lover Girl," Travis Scott — "Dumbo," Tyler, the Creator — "Sugar on My Tongue."

**Best R&B** — **Winner: Bruno Mars — "I Just Might."** Other nominees: Chris Brown — "It Depends/Obvious," Dave and Tems — "Raindance," Justin Bieber — "Yukon," Kehlani — "Folded," Mariah the Scientist and Kali Uchis — "Is It a Crime."

**Best Alternative** — **Winner: Olivia Rodrigo — "the cure."** Other nominees: Geese — "Taxes," mgk and Fred Durst — "Fix Ur Face," Noah Kahan — "The Great Divide," SOMBR — "Homewrecker," Tame Impala — "Dracula," Twenty One Pilots — "Drag Path."

**Best Dance** — **Winner: Madonna — "Confessions II - The Film."** Other nominees: Bebe Rexha and Faithless — "New Religion," Harry Styles — "Aperture," Lady Gaga and Doechii — "Runaway," PinkPantheress — "Stateside + Zara Larsson," Slayyyter — "Dance...," Tate McRae — "Nobody's Girl."

**Best Latin** — **Winner: Bad Bunny — "NUEVAYoL."** Other nominees: Anitta with Shakira — "Choka Choka," Fuerza Regida — "Tu Sancho," KAROL G — "Papasito," Rosalía ft. Yahritza Y Su Esencia — "La Perla," Ryan Castro, Kapo and Gangsta — "La Villa," Shakira and Burna Boy — "Dai Dai."

**Best K-Pop** — **Winner: BTS — "Swim."** Other nominees: BLACKPINK — "Jump," CORTIS — "RedRed," KATSEYE — "Pinky Up," LE SSERAFIM feat. J-Hope of BTS — "Spaghetti," LISA — "Dream feat. Kentaro Sakaguchi."

**Best Country** — **Winner: Ella Langley — "Choosin' Texas."** Other nominees: Kacey Musgraves — "Dry Spell," Lainey Wilson — "Somewhere Over Laredo," Luke Combs — "Back in the Saddle," Shaboozey — "Cowgirl," Stella Lefty — "Boston," Tucker Wetmore — "Brunette."

**Best Direction** — **Winner: Taylor Swift — "Opalite."** Other nominees: Ariana Grande — "Hate That I Made You Love Me," Bruno Mars — "I Just Might," GENER8ION — "Storm starring Yung Lean," Madonna — "Confessions II - The Film," Sabrina Carpenter — "House Tour."

**Best Art Direction** — **Winner: PinkPantheress — "Stateside + Zara Larsson."** Other nominees: Charli xcx — "SS26," Lady Gaga and Doechii — "Runaway," Madonna — "Confessions II - The Film," SOMBR — "My Body Isn't Ready," Taylor Swift — "The Fate of Ophelia."

**Best Cinematography** — **Winner: Madonna — "Confessions II - The Film."** Other nominees: A$AP Rocky — "Punk Rocky," Ariana Grande — "Hate That I Made You Love Me," LISA — "Dream feat. Kentaro Sakaguchi," Shaboozey — "Cowgirl," Taylor Swift — "The Fate of Ophelia."

**Best Editing** — **Winner: Sabrina Carpenter — "House Tour."** Other nominees: Ariana Grande — "Hate That I Made You Love Me," Bruno Mars — "I Just Might," LISA — "Dream feat. Kentaro Sakaguchi," Madonna — "Confessions II - The Film," Taylor Swift — "The Fate of Ophelia."

**Best Choreography** — **Winner: Madonna — "Confessions II - The Film."** Other nominees: GENER8ION — "Storm starring Yung Lean," Harry Styles — "Dance No More," KATSEYE — "Pinky Up," Tate McRae — "Nobody's Girl," Taylor Swift — "The Fate of Ophelia."

**Best Visual Effects** — **Winner: Ariana Grande — "hate that i made you love me."** Other nominees: JISOO x ZAYN — "Eyes Closed," Madonna — "Confessions II - The Film," PinkPantheress — "Stateside + Zara Larsson," RAYE ft. Hans Zimmer — "Click Clack Symphony.," Taylor Swift — "The Fate of Ophelia."

**Best Group** — **Winner: BTS.** Other nominees: BLACKPINK, CORTIS, FLO, Fuerza Regida, Geese, KATSEYE, Twenty One Pilots.

**Best Long Form Video** — **Winner: Madonna — *Confessions II - The Film*.** Other nominees: Charli xcx — *Music, Fashion, Film*, Ella Langley — *Choosin' Texas*, GENER8ION — *STORM starring Yung Lean*.

**Best Album** — **Winner: Madonna — *Confessions II*.** Other nominees: Drake — *ICEMAN*, Olivia Dean — *The Art of Loving*, Olivia Rodrigo — *you seem pretty sad for a girl so in love*, Sabrina Carpenter — *Man's Best Friend*, Taylor Swift — *The Life of a Showgirl*.

**Song of Summer** — **Winner: Ariana Grande — "hate that i made you love me."** Other nominees: Bruno Mars — "Risk It All," Charli xcx — "Camera," Ella Langley — "Choosin' Texas," KATSEYE — "Hootie Frutti," Latto ft. Doja Cat — "Okayyy," Morgan Wallen — "Been By Now," Olivia Dean — "So Easy (To Fall in Love)," Olivia Rodrigo — "Stupid Song," Sabrina Carpenter — "House Tour," Slayyyter — "brand new chanel$," SOMBR — "Homewrecker," Stella Lefty — "Boston," Tame Impala and JENNIE — "Dracula," Taylor Swift — "I Knew It, I Knew You."

**Video Vanguard Award** — **Nirvana.**

**MTV VMA Artist Director Honors** — **Taylor Swift.**

The final split says more than a single sweep would have. Madonna owned the count across major, social and craft categories, while Swift took Video of the Year, direction and the show's new directing honor. Around them, the genre awards stayed scattered enough for the 2026 results to look like a broad snapshot of the year rather than one campaign swallowing the entire board.'''

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
