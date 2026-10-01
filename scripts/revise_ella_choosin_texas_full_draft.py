#!/usr/bin/env python3
from __future__ import annotations
import base64, copy, json, sys, time, urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import post as runner
import gate
import draft_ella_choosin_texas_longread as source

POST_ID = source.POST_ID
TITLE = source.TITLE
EXPECTED_BODY = source.BODY

EXCERPT = 'According to Billboard, Ella Langley\'s "Choosin\' Texas" is now the longest-running No. 1 in Hot 100 history, a country heartbreak song that reached the center of American pop without changing its sound.'

BODY_PHOTO_NAME = "ella-choosin-texas-caylee-robillard.webp"
BODY_PHOTO_PATH = "photos/" + BODY_PHOTO_NAME
BODY_PHOTO_SOURCE = "https://s.yimg.com/ny/api/res/1.2/vv6wCykCtkKa.TuJsVnAVQ--/YXBwaWQ9aGlnaGxhbmRlcjt3PTEyNDI7aD04MjI7Y2Y9d2VicA--/https%3A/media.zenfs.com/en/billboard_547/80f5cb3c59c106a6caf51f7d27dfe52d"

COVER_NAME = "ella-choosin-texas-cover.jpg"
COVER_PATH = "photos/" + COVER_NAME
COVER_SOURCE = "https://fortworth.culturemap.com/media-library/ella-langley.jpg?coordinates=0%2C0%2C0%2C0&height=1500&id=63691936&width=2000"
COVER = {
    "kind": "img",
    "src": COVER_PATH,
    "credit": "Ella Langley",
    "creditUrl": "https://www.ellalangley.com/",
    "pos": "50% 43%",
}

def fresh_read():
    return runner.http(runner.DESK_API + "?nocache=" + str(time.time_ns()), runner.desk_key())

def ensure_photo(name, source_url):
    url = "https://music98.news/photos/" + name
    try:
        req = urllib.request.Request(url + "?check=" + str(time.time_ns()),
                                     headers={"User-Agent": runner.UA})
        with urllib.request.urlopen(req, timeout=45) as r:
            blob = r.read(32)
            if r.status == 200 and blob:
                print("PHOTO_READY", name, "existing")
                return
    except Exception:
        pass

    req = urllib.request.Request(source_url, headers={"User-Agent": runner.UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        raw = r.read()
        ctype = (r.headers.get("Content-Type") or "image/jpeg").split(";", 1)[0].lower()
    if ctype not in {"image/jpeg", "image/png", "image/webp"}:
        raise RuntimeError("unexpected photo type for %s: %s" % (name, ctype))
    if len(raw) > 3_000_000:
        raise RuntimeError("photo exceeds upload limit: %s" % name)
    data = "data:" + ctype + ";base64," + base64.b64encode(raw).decode("ascii")
    uploaded = runner.http("https://music98.news/api/photo", runner.desk_key(),
                           {"name": name, "data": data}, method="POST")
    if not uploaded.get("ok"):
        raise RuntimeError("photo upload failed: " + json.dumps(uploaded))
    print("PHOTO_READY", name, uploaded.get("bytes"))

def build_body():
    p = [x.strip() for x in EXPECTED_BODY.split("\n\n") if x.strip()]
    if len(p) != 13:
        raise RuntimeError("unexpected Ella source paragraph count: %d" % len(p))

    lead = p[0]
    lead = lead.replace(
        "Country singer-songwriter Ella Langley's \"Choosin' Texas\" began as a straightforward heartbreak song and became the longest-running No. 1 in Billboard Hot 100 history.",
        EXCERPT
    )
    lead = lead.replace(
        "The audience kept expanding far beyond Nashville anyway.",
        "The audience expanded beyond Nashville anyway."
    )
    lead = lead.replace(
        "By the time \"Choosin' Texas\" broke the Hot 100 record, a song built from familiar country language had become the biggest record in America without changing its accent.",
        "A song built from familiar country language became an all-format pop hit without changing its accent."
    )

    origin = p[1]

    writing = p[2]
    writing = writing.replace(
        'Langley answered with a phrase that immediately sounded like a song, "She\'s from Texas, I can tell."',
        'Langley answered with a phrase the room immediately recognized as a hook, "She\'s from Texas, I can tell."'
    )
    writing = writing.replace(
        "They make the breakup feel physical, as if the relationship is being measured in roads, rooms and state lines.",
        "They make the breakup feel physical, measuring the relationship in roads, rooms and state lines."
    )
    writing = writing.replace(
        "The central idea is specific enough to be unmistakably country, but the feeling underneath it is broader.",
        "The country details are specific, but the feeling underneath them is broader."
    )
    writing = writing.replace(
        "Langley told Rolling Stone that people can relate to wanting something that does not want them back, whether that is a relationship, a job or something else.",
        "Langley told Rolling Stone the feeling can apply to wanting something that does not want you back, whether it is a relationship, a job or something else."
    )

    roots = p[3].replace(
        "There is also a reason the song feels connected to older country writing without sounding like a period piece.",
        "There is also a reason the song feels connected to older country writing without turning into a period piece."
    )
    roots = roots.replace(
        ' On *Dandelion*, that confidence is even clearer. The album opens and closes with "Froggy Went A Courtin\'," one of the first songs she remembers singing with her grandfather, then moves into modern country that is comfortable with pop melody while keeping its older roots in view.',
        ""
    )

    miranda = p[4].replace(
        'She helped write "Choosin\' Texas," sings background vocals on the recording and later co-produced *Dandelion* with Langley and Ben West.',
        'She helped write "Choosin\' Texas," sings background vocals on the recording and later co-produced *Dandelion* with Langley.'
    )

    video = p[5].replace(
        "The setting matters as much as the casting. Couples two-step beneath the lights, rodeo figures and Texas musicians fill the room, and the bar feels busy enough to make the jealousy believable.",
        "The setting matters too. Couples two-step beneath the lights, rodeo figures and Texas musicians fill the room, and the crowd makes the jealousy believable."
    )

    live = p[6]
    live = live.replace(
        "At Billboard Women in Music, Langley performed it in a more stripped-down setting and the writing still carried the room. ",
        ""
    )
    live = live.replace(
        "At CMA Fest, it arrives as a full-scale country singalong, with the crowd answering the hook as if the song has been around for years.",
        "At CMA Fest, it arrives as a full-scale country singalong, with the crowd answering the hook without hesitation."
    )

    chart = p[7]
    chart = chart.replace(
        '"Choosin\' Texas" has spent 23 weeks at No. 1 on the Hot 100, the longest reign in the chart\'s history, and it was named Billboard\'s Song of the Summer. Earlier in the year, Langley became the first woman to lead the Hot 100, Hot Country Songs and Country Airplay at the same time. Then country songs filled the entire Hot 100 top five for the first time, with Langley appearing twice. Together, those milestones show how far the song moved beyond one format.',
        '"Choosin\' Texas" has spent 23 weeks at No. 1 on the Hot 100, the longest reign in the chart\'s history. Earlier in the run, Langley became the first woman to lead the Hot 100, Hot Country Songs and Country Airplay at the same time. Those milestones show how far the record moved beyond one format.'
    )
    chart = chart.replace("the biggest pop, rap and R&B releases", "major pop, rap and R&B releases")
    chart = chart.replace("and week after week listeners kept it there.", "and listeners kept it there.")

    country = p[8]
    country = country.replace("for several years", "for years")
    country = country.replace(
        'Shaboozey\'s "A Bar Song (Tipsy)" turned a country-rap blend into one of the defining pop hits of 2024,',
        'Shaboozey\'s "A Bar Song (Tipsy)" turned a country-rap blend into a huge pop hit,'
    )

    post = p[9].replace(
        "That kind of crossover once looked like two separate radio worlds briefly sharing a record.",
        "That kind of crossover once meant two separate radio worlds briefly sharing a record."
    )

    culture = p[10]
    culture = culture.replace(
        "Western boots and hats have moved through mainstream fashion, line-dance nights have spread well beyond Nashville, and major festivals have made rodeo and honky-tonk imagery familiar to audiences who may not follow country radio.",
        "Western boots and hats now move through mainstream fashion, while line-dance nights have spread well beyond Nashville. Major festivals also make rodeo and honky-tonk imagery familiar to audiences who may not follow country radio."
    )

    lineage = p[11]

    close = p[12].replace(
        "The more revealing achievement is that one of America's biggest pop songs still sounds completely at home in a Texas dance hall.",
        "The more revealing achievement is that a dominant American pop song still sounds completely at home in a Texas dance hall."
    )

    parts = [
        lead,
        origin,
        "[apple:song:1844932149:1844932150]",
        writing,
        video,
        "[youtube:nUsrYVxrDwI]",
        live,
        "[youtube:i1IX4Dusi9k]",
        chart,
        "[photo:%s|Caylee Robillard|https://www.cayleerobillard.com|50%% 45%%|1]" % BODY_PHOTO_PATH,
        roots,
        miranda,
        "[youtube:Dm2TSMerGPQ]",
        country,
        post,
        "[youtube:4QIZE708gJ4]",
        culture,
        "[apple:album:1869436835]",
        lineage,
        close,
    ]
    return "\n\n".join(parts)

TARGET_BODY = build_body()

def media_layout(body):
    return [(i, p) for i, p in enumerate(gate.paragraphs(body)) if gate.is_media(p)]

def main():
    runner.load_env()
    runner.desk_read = fresh_read
    gate.KEY = runner.desk_key()

    ensure_photo(BODY_PHOTO_NAME, BODY_PHOTO_SOURCE)
    ensure_photo(COVER_NAME, COVER_SOURCE)

    current = runner.find_post(fresh_read()["posts"], POST_ID)
    if current.get("status") != "draft":
        raise RuntimeError("Ella longread is not a draft; refusing")
    if current.get("body") != EXPECTED_BODY:
        raise RuntimeError("Ella longread text changed; refusing overwrite")

    candidate = copy.deepcopy(current)
    candidate["body"] = TARGET_BODY
    candidate["excerpt"] = EXCERPT
    candidate["cover"] = copy.deepcopy(COVER)

    if not TARGET_BODY.startswith(EXCERPT):
        raise RuntimeError("excerpt is not a literal lead prefix")

    gate.CHECK_IDS = True
    fails, warns, info = gate.check_post(candidate, strict=True)
    print("PREWRITE_GATE", "FAIL" if fails else "PASS")
    print("PREWRITE_WARNINGS", json.dumps(warns, ensure_ascii=True))
    if fails:
        print("PREWRITE_FAILURES", json.dumps(fails, ensure_ascii=True))
        raise RuntimeError("candidate gate failed")

    protected = {k: copy.deepcopy(v) for k, v in current.items()
                 if k not in {"body", "excerpt", "cover"}}

    def mutate(posts):
        p = runner.find_post(posts, POST_ID)
        if p.get("status") != "draft" or p.get("body") != EXPECTED_BODY:
            raise RuntimeError("Ella longread changed during write")
        if {k: v for k, v in p.items() if k not in {"body", "excerpt", "cover"}} != protected:
            raise RuntimeError("protected Ella longread fields changed")
        p["body"] = TARGET_BODY
        p["excerpt"] = EXCERPT
        p["cover"] = copy.deepcopy(COVER)
        return copy.deepcopy(p)

    runner.guarded_write(mutate)

    final = None
    for _ in range(20):
        time.sleep(2)
        posts = fresh_read()["posts"]
        final = next((p for p in posts if str(p.get("id")) == POST_ID), None)
        if final and final.get("body") == TARGET_BODY and final.get("status") == "draft":
            break
    if not final or final.get("body") != TARGET_BODY:
        raise RuntimeError("Ella full draft did not propagate")

    for n in (1, 2, 3):
        ok, lines = runner.run_gate(POST_ID, quiet=False)
        print("POSTWRITE_GATE_PASS", n, "PASS" if ok else "FAIL")
        if not ok:
            print("\n".join(lines))
            raise RuntimeError("postwrite gate failed")

    public = runner.http(runner.DESK_API + "?nocache=" + str(time.time_ns()))
    if any(str(p.get("id")) == POST_ID for p in public.get("posts", [])):
        raise RuntimeError("draft leaked into public desk")

    duplicate = next((p for p in fresh_read()["posts"] if str(p.get("id")) == "ellatexas26"), None)
    print("WORDS", len(gate.prose_of(TARGET_BODY).split()))
    print("PARAGRAPHS", len(gate.paragraphs(TARGET_BODY)))
    print("MEDIA_LAYOUT", media_layout(TARGET_BODY))
    print("STATUS", final.get("status"))
    print("PUBLIC_VISIBLE", False)
    print("DUPLICATE_ELLATEXAS26_PRESENT", bool(duplicate))
    print("DONE_ELLA_LONGREAD_FULL_DRAFT")

if __name__ == "__main__":
    main()
