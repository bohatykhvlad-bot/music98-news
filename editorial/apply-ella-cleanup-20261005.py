#!/usr/bin/env python3
import copy, hashlib, json, os, re, subprocess, sys, time, urllib.request
from pathlib import Path

POST_ID = "ella26choosintexas"
PROD = "https://music98.news"
ROOT = Path(__file__).resolve().parents[1]
KEY = (os.environ.get("ADMIN_PASSWORD") or os.environ.get("MUSIC98_KEY") or "").strip()
if not KEY:
    raise SystemExit("MISSING_ADMIN_PASSWORD")

EXCERPT = "On the Billboard Hot 100 dated October 3, 2026, Ella Langley's \"Choosin' Texas\" had spent a record 24 weeks at No. 1, the longest run in the chart's history."

REPLACEMENTS = {
    'By the Billboard Hot 100 dated October 3, Ella Langley\'s "Choosin\' Texas" had spent 24 weeks at No. 1': '''On the Billboard Hot 100 dated October 3, 2026, Ella Langley's "Choosin' Texas" had spent a record 24 weeks at No. 1, the longest run in the chart's history. That record is unusual because the song never disguises where it comes from. Country radio embraced it first, then pop radio and broader streaming playlists followed. The same steel-guitar breakup song that fit naturally on a dance floor ended up at the top of an all-genre chart. Its path says as much about Langley's direct storytelling as it does about country music's wider reach in American pop.''',
    'The story in "Choosin\' Texas" is easy to follow even without knowing the places it names.': '''The song earns that scale through a story that is easy to follow even without knowing the places it names. The narrator believes she has convinced her boyfriend to love Tennessee until she takes him back to his old home in Abilene, Texas. Hearing George Strait's "Amarillo by Morning" brings him to life, but so does the sight of another woman. As everyone around them keeps dancing, she realizes where his feelings have been all along. By the bridge, she is imagining an eastbound drive on Interstate 40 and admitting that she cannot change his mind. The recording stays with that realization rather than showing whether she makes the trip. The details are specific to country, but the emotional turn needs no translation.''',
    'The arrangement makes the bad news surprisingly pleasant company.': '''The music helps explain how the story could travel beyond country radio without being rewritten for pop. Drums and bass settle into an easy midtempo groove while electric guitar and pedal steel keep the record rooted in country. The chorus is broad and immediate enough for a dance hall, but the lyric takes longer to reveal its sting. Langley has wondered whether the song's popularity comes from its honest point of view, groove, memorable guitar phrases or nostalgic feel. She did not offer a formula. The record gives a casual listener an easy way in, then changes slightly once the breakup story comes into focus.''',
    'The official video takes that private disappointment into a crowded country dance hall.': '''The official video takes that private disappointment into a crowded country dance hall. Langley co-directed it with Wales Toney and photographer Caylee Robillard at the Stagecoach Ballroom in Fort Worth, Texas. Actor and singer Luke Grimes plays her boyfriend, while actress Ava Phillippe plays the woman who attracts his attention. Grammy-winning country singer-songwriter Miranda Lambert performs onstage. The room keeps dancing as Langley's character watches her relationship fall apart, and at the end she leaves in a car with Lambert. Its license plate reads "ICLYA," which Langley later confirmed was a clue to "I Can't Love You Anymore," her duet with country singer Morgan Wallen.''',
    "The song's beginning was less dramatic than the story it tells.": '''The song's beginning was less dramatic than the story it tells. At a songwriting retreat, Langley asked Lambert about a kangaroo she had once kept as a pet. Lambert remembered getting pulled over with the animal in the passenger seat and a dog in the back. When she mentioned that the car had Texas plates, Langley heard the beginning of a lyric. Lambert suggested that the woman from Texas could be the one a man chose over his girlfriend. With fellow writers Luke Dick and Joybeth Taylor, they finished "Choosin' Texas" in roughly 45 minutes, Langley later recalled at Billboard Women in Music. The kangaroo disappeared from the finished song, but the Texas detail became the image that set its story in motion.''',
    'Lambert was more than an established name in that writing room.': '''Lambert was more than an established name in that writing room. Long before the two women met, her song "The House That Built Me" had become personal to Langley. Her family went through serious financial trouble and lost their house to the bank the day after her 14th birthday. Around that time, Langley heard Lambert singing about the memories held by a childhood home and recognized something of her own experience. She later began performing cover sets in bars at 18 and moved from Alabama to Nashville in 2019 to pursue music. Years after turning to Lambert's song during a painful period at home, Langley was writing with her and asking for advice about a career that was beginning to accelerate.''',
    'Lambert went on to co-produce "Choosin\' Texas" with Langley and Ben West, contribute backing vocals and work on Langley\'s second album, Dandelion.': '''Lambert went on to co-produce "Choosin' Texas" with Langley and Ben West, contribute backing vocals and work on Langley's second album, *Dandelion*. By then, Langley had already introduced herself to a larger country audience through a different barroom story. Her 2024 duet with country singer Riley Green, "you look like you love me," is built around two strangers who grow bolder as they talk to each other. Much of Langley's part is spoken rather than sung. The pauses and slightly awkward approaches give the record its humor, although the people responsible for releasing it were not immediately convinced.''',
    'Speaking on This Past Weekend, the podcast hosted by American comedian Theo Von, Langley recalled being asked by her label to return to the studio and sing the spoken verses after the track had already been recorded.': '''Speaking on *This Past Weekend*, the podcast hosted by American comedian Theo Von, Langley recalled being asked by her label to return to the studio and sing the spoken verses after the track had already been recorded. She refused. The label feared it would be her album's worst-performing track. Instead, the duet became a breakthrough and won Song of the Year at the 2025 Country Music Association Awards. Langley did not claim to have predicted its success. She said only that the song felt different and that she enjoyed singing it. What mattered was not predicting a hit. She had decided that the spoken delivery belonged to the song and resisted changing it.''',
    'The duet\'s spoken verses also reveal something about the writing that later made "Choosin\' Texas" so approachable.': '''The duet's spoken verses also show why "Choosin' Texas" could feel so direct to listeners. Neither song needs an elaborate declaration. In "you look like you love me," two strangers make their intentions clear by talking their way toward each other. In "Choosin' Texas," the narrator understands her boyfriend by watching what he does around another woman. Langley's conversational delivery can carry the comedy of an awkward approach in one song and the unease of an unwanted discovery in the other. The settings differ, but both songs let ordinary behavior do most of the storytelling.''',
    '"Choosin\' Texas" first built its following among country listeners.': '''Country listeners gave the single its first major radio base. "Choosin' Texas" topped Billboard's Country Airplay chart before Langley brought it to CMA Fest in June 2026. In the official footage, she steps aside vocally as the audience takes over the chorus, then resumes the next verse while the band keeps playing. The scene gives the chart figures some human scale. A story built around one woman's private realization had become something thousands of people knew well enough to sing back. The performance also shows that the quieter verses survived the jump from radio and playlists into a festival crowd.''',
    'Country radio gave "Choosin\' Texas" its early foothold, but the record kept traveling.': '''The record kept traveling after that country-radio success. It eventually entered the top 10 of Billboard's Pop Airplay chart without being remade as a pop single. Its 24 weeks at No. 1 on the all-genre Hot 100 accumulated across several runs rather than consecutively. Mariah Carey's previous record of 22 weeks for "All I Want for Christmas Is You" had built up over several holiday seasons. The comparison puts Langley's achievement in perspective, but the route matters as much as the total. Country radio supplied an early audience, then mainstream stations and streaming playlists gave the same recording more ways to reach people outside that format.''',
    'Country had been making inroads into the broader US singles market before Langley\'s record took off.': '''Langley did not arrive at that crossover in isolation. In one week in 2023, country recordings occupied the top three positions on the Billboard Hot 100 for the first time, with Morgan Wallen's "Last Night," Luke Combs' version of Tracy Chapman's "Fast Car" and Jason Aldean's controversial "Try That in a Small Town." The three records sounded different and reached listeners for different reasons. Their simultaneous success mattered less as proof of one dominant country sound than as evidence that the genre's audience had become harder to contain inside its own charts and radio format.''',
    'The picture widened again in 2024.': '''That widening audience looked even less uniform in 2024. Beyoncé's *COWBOY CARTER* drew attention to country's Black musical roots and its boundaries, while Shaboozey blended country and hip-hop on "A Bar Song (Tipsy)," which spent 19 weeks at No. 1 on the Hot 100. Neither route closely resembles Langley's. What they share is a market in which country, and music adjacent to it, could reach listeners through far more than a single radio format. By the time "Choosin' Texas" began its own crossover, the wider audience was already accustomed to encountering country from several directions. Langley's success did not depend on abandoning the sound that first placed her inside the genre.''',
    'Langley\'s crossover developed from within that expanding country audience.': '''Langley's crossover grew from inside that changing landscape. Spotify editor Claire Heinichen told the Associated Press that "Choosin' Texas" moved from the service's Hot Country playlist into Today's Top Hits and collections for driving, relaxing and other everyday listening. A country fan could encounter the song in a genre playlist while someone else met the same recording on a general driving mix. The Hot 100 combines that activity with radio and sales even when those audiences barely overlap. *The Atlantic* documented commenters who said they had never heard the record-breaking song. Their surprise does not measure the song's recognition, but it shows how a hit can become enormous without every listener finding it in the same place.''',
    'Post Malone followed another route.': '''Post Malone illustrates the opposite direction of travel. Already a major star with hits spanning hip-hop, pop and rock, he joined country singer Morgan Wallen at California's Stagecoach festival in 2024 to perform their duet "I Had Some Help." He then released *F-1 Trillion*, an album featuring established country collaborators. His existing audience could follow him into country. Langley's route ran the other way. She had spent years building an audience inside the genre before the same kind of songwriting began reaching mainstream playlists. Both benefited from country's wider presence in pop, but they arrived there from opposite sides. For Langley, the crossover came after country listeners had already made the song their own.''',
    'The broader crossover story is only part of Langley\'s year.': '''The crossover story is only part of Langley's year. Her second album, *Dandelion*, released in April and made with Lambert and West, offers a fuller picture of her musical interests. "Be Her" considers the woman she hopes to become, while "Butterfly Season" reunites her with Lambert as a duet partner. Elsewhere, Langley reaches toward songs she knew long before her own records entered the charts. Those choices connect the album to an older country tradition, including women who challenged the stories men were accustomed to telling about them. *Dandelion* arrived during her biggest commercial year without treating the hit single as its only musical reference point.''',
    'Kitty Wells became one of country\'s defining early female voices with "It Wasn\'t God Who Made Honky Tonk Angels" in 1952.': '''Kitty Wells became one of country's defining early female voices with "It Wasn't God Who Made Honky Tonk Angels" in 1952. It answered Hank Thompson's "The Wild Side of Life," a hit that had placed much of the blame for failed relationships on women. Wells turned the accusation back toward the men involved and became the first solo woman to top Billboard's country chart. The record was an important moment for female performers in a business that had often given men the louder voice. Langley has said that she likes Wells' original enough to use it as the alarm on her smart speaker, and she recorded her own version for *Dandelion*.''',
    'Dolly Parton\'s "Jolene" approaches jealousy from another direction.': '''Dolly Parton's "Jolene" approaches jealousy from another direction. Its narrator pleads directly with another woman not to take away the man she loves. The song's suspense comes from the fact that she cannot control the answer. Alongside Wells' defiant response to a male accusation, Parton's plea shows how varied the female point of view has always been in country songwriting. The songs belong to different eras and different circumstances, but neither treats heartbreak as a story that only men get to explain. Heard next to those earlier records, the restraint in "Choosin' Texas" becomes another possible way of telling a familiar story. There is no need to claim a direct Parton influence to hear the comparison.''',
    'The history of those songs sits beside another, less celebratory history.': '''That lineage sits beside a less celebratory part of country's history. Female singers have repeatedly had to fight for sustained space on country radio. Lambert has welcomed the wider range of women's voices now reaching listeners compared with earlier periods of her career, and Langley's rise supplies one concrete sign of change. In April, "Be Her" joined "Choosin' Texas" in the top 10 of Billboard's Country Airplay chart. She became the first woman in the ranking's history to place two solo recordings there at the same time. It was a notable achievement for an artist who had already crossed into the pop market, although one breakthrough cannot tell us how evenly radio opportunities are distributed across the industry.''',
    'The visibility has not been entirely comfortable.': '''That visibility has also brought a kind of scrutiny Langley did not encounter on smaller stages. During a September concert in Columbus, Ohio, she addressed criticism of her appearance, voice and performances. She admitted that some of it had made her question whether she could handle the attention. She remembered traveling between small venues in a van and a Honda Accord, eating bar food and relying on money left in tip jars. Speaking to an audience that had come to see her headline, she said she was proud of the younger woman who had kept taking those shows. The speech returned the story to the years before the record-breaking single, when persistence mattered more than chart position.''',
    'The Columbus speech brought her early career back into view at a moment when the charts could easily overshadow it.': '''The Columbus speech brought her early career back into view at a moment when the charts could easily overshadow it. Long before the festival crowds and radio records, she learned the traditional song "Froggy Went A Courtin'" beside her grandfather at his piano. Langley remembers family reunions when relatives gathered around the instrument and sang together. She carried that music into *Dandelion*, placing fragments of the tune at the beginning and end of the album. The closing recording strips the arrangement back to her voice and Charlie Worsham's acoustic guitar. She ends the album with a song her family was singing together years before she had a record deal.''',
}
REMOVE_START = 'The circumstances explain how so many people could encounter Langley\'s music.'
MEDIA_RE = re.compile(r'^\[(?:photo|youtube|apple|instagram|tiktok):[^\n]+\]$', re.I)

def plain(s):
    return s.replace('*', '').replace('_', '').replace('’', "'").replace('‘', "'").replace('“', '"').replace('”', '"')

def get_desk():
    req = urllib.request.Request(
        PROD + '/api/desk?nocache=' + str(time.time()),
        headers={'X-Admin-Key': KEY, 'Cache-Control': 'no-cache', 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0'},
    )
    with urllib.request.urlopen(req, timeout=45) as r:
        return json.loads(r.read())

def post_desk(posts):
    data = json.dumps({'posts': posts}, ensure_ascii=True, separators=(',', ':')).encode('ascii')
    req = urllib.request.Request(
        PROD + '/api/desk', data=data, method='POST',
        headers={'X-Admin-Key': KEY, 'Content-Type': 'application/json', 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0'},
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.status, r.read().decode('utf-8', 'replace')

def stable(obj):
    return hashlib.sha256(json.dumps(obj, sort_keys=True, ensure_ascii=True, separators=(',', ':')).encode('ascii')).hexdigest()

desk = get_desk()
posts = desk.get('posts')
if not isinstance(posts, list):
    raise SystemExit('DESK_POSTS_MISSING')
all_matches = [(i, p.get('status'), p.get('title')) for i,p in enumerate(posts) if p.get('id') == POST_ID]
print('TARGET_MATCHES=' + json.dumps(all_matches, ensure_ascii=False))
matches = [i for i,p in enumerate(posts) if p.get('id') == POST_ID and p.get('status') == 'draft']
if len(matches) != 1:
    raise SystemExit('DRAFT_TARGET_NOT_UNIQUE')
idx = matches[0]
old_posts = copy.deepcopy(posts)
old = copy.deepcopy(posts[idx])
if old.get('status') != 'draft':
    raise SystemExit('TARGET_NOT_DRAFT')
old_body = old.get('body') or ''
media_before = re.findall(r'\[(?:photo|youtube|apple|instagram|tiktok):[^\]]+\]', old_body, re.I)
cover_before = copy.deepcopy(old.get('cover'))
blocks = old_body.split('\n\n')
seen = {k:0 for k in REPLACEMENTS}
removed = 0
new_blocks = []
for block in blocks:
    b = block.strip()
    pb = plain(b)
    if pb.startswith(REMOVE_START):
        removed += 1
        continue
    hit = None
    for start,new in REPLACEMENTS.items():
        if pb.startswith(start):
            if hit is not None:
                raise SystemExit('AMBIGUOUS_REPLACEMENT')
            hit = (start,new)
    if hit:
        start,new = hit
        seen[start] += 1
        new_blocks.append(new)
    else:
        if MEDIA_RE.fullmatch(b):
            new_blocks.append(b)
        else:
            new_blocks.append(b.replace('’', "'").replace('‘', "'").replace('“', '"').replace('”', '"'))

missing = [k for k,n in seen.items() if n != 1]
if missing or removed != 1:
    print('REPLACEMENT_COUNTS', json.dumps(seen, ensure_ascii=False))
    print('REMOVED', removed)
    raise SystemExit('CURRENT_DRAFT_DOES_NOT_MATCH_REVIEWED_TEXT')

new_body = '\n\n'.join(new_blocks).strip()
media_after = re.findall(r'\[(?:photo|youtube|apple|instagram|tiktok):[^\]]+\]', new_body, re.I)
if media_before != media_after:
    raise SystemExit('MEDIA_CHANGED')
if any(ch in new_body for ch in ('’','‘','“','”')):
    raise SystemExit('TYPOGRAPHIC_QUOTES_REMAIN_IN_BODY')
if any(ch in EXCERPT for ch in ('’','‘','“','”')):
    raise SystemExit('TYPOGRAPHIC_QUOTES_REMAIN_IN_EXCERPT')
if not new_body.startswith(EXCERPT):
    raise SystemExit('EXCERPT_NOT_BODY_PREFIX')
prose = '\n'.join(x for x in new_blocks if not MEDIA_RE.fullmatch(x.strip()))
if ';' in prose:
    raise SystemExit('SEMICOLON_IN_PROSE')
if '—' in prose:
    raise SystemExit('EM_DASH_IN_PROSE')
for banned in (
    'The circumstances explain how so many people could encounter Langley',
    'Crossover no longer requires everyone to encounter a hit in the same place.',
    'That distinction matters when looking back at a decision that now appears obvious.',
    'The kangaroo stayed out of the finished song. The observation about a man returning to Texas stayed.',
):
    if banned in new_body:
        raise SystemExit('OLD_EDITORIAL_DEFECT_REMAINS: ' + banned[:60])

candidate = copy.deepcopy(old)
candidate['body'] = new_body
candidate['excerpt'] = EXCERPT
if candidate.get('cover') != cover_before:
    raise SystemExit('COVER_CHANGED_BEFORE_SAVE')

sys.path.insert(0, str(ROOT / 'scripts'))
import gate, preflight
gate.CHECK_IDS = False
fails, warns, infos = gate.check_post(candidate, True)
print('LOCAL_GATE_FAILS=' + json.dumps(fails, ensure_ascii=False))
print('LOCAL_GATE_WARNS=' + json.dumps(warns, ensure_ascii=False))
if fails:
    raise SystemExit('LOCAL_GATE_FAILED')
if not preflight.check(candidate, old, len(media_before), 1300):
    raise SystemExit('LOCAL_PREFLIGHT_FAILED')

posts[idx] = candidate
status, response = post_desk(posts)
print('DESK_POST_STATUS', status)
print('DESK_POST_RESPONSE', response[:500])

saved_desk = get_desk()
saved_posts = saved_desk.get('posts') or []
saved_matches = [p for p in saved_posts if p.get('id') == POST_ID and p.get('status') == 'draft']
if len(saved_matches) != 1:
    raise SystemExit('SAVED_DRAFT_TARGET_NOT_UNIQUE')
saved = saved_matches[0]
if saved.get('status') != 'draft':
    raise SystemExit('SAVED_STATUS_NOT_DRAFT')
if saved.get('body') != new_body or saved.get('excerpt') != EXCERPT:
    raise SystemExit('SAVED_TEXT_MISMATCH')
if saved.get('cover') != cover_before:
    raise SystemExit('SAVED_COVER_CHANGED')
if re.findall(r'\[(?:photo|youtube|apple|instagram|tiktok):[^\]]+\]', saved.get('body') or '', re.I) != media_before:
    raise SystemExit('SAVED_MEDIA_CHANGED')

old_non_target = [stable(p) for j,p in enumerate(old_posts) if j != idx]
saved_draft_idx = next(i for i,p in enumerate(saved_posts) if p.get('id') == POST_ID and p.get('status') == 'draft')
saved_non_target = [stable(p) for j,p in enumerate(saved_posts) if j != saved_draft_idx]
if old_non_target != saved_non_target:
    raise SystemExit('NON_TARGET_POST_CHANGED')

env = os.environ.copy()
env['MUSIC98_KEY'] = KEY
print('RUN_GATE_REMOTE')
g = subprocess.run([sys.executable, str(ROOT/'scripts'/'gate.py'), '--post', POST_ID, '--ids'], cwd=ROOT, env=env, text=True, capture_output=True)
print(g.stdout)
if g.stderr:
    print(g.stderr)
if g.returncode != 0:
    raise SystemExit('REMOTE_GATE_FAILED')

print('RUN_PREFLIGHT_REMOTE')
pf = subprocess.run([sys.executable, str(ROOT/'scripts'/'preflight.py'), '--post', POST_ID, '--expected-media', str(len(media_before)), '--min-words', '1300'], cwd=ROOT, env=env, text=True, capture_output=True)
print(pf.stdout)
if pf.stderr:
    print(pf.stderr)
if pf.returncode != 0:
    raise SystemExit('REMOTE_PREFLIGHT_FAILED')

print('ELLA_CLEANUP_VERIFIED')
print('STATUS=draft')
print('MEDIA_COUNT=' + str(len(media_before)))
print('BODY_SHA=' + hashlib.sha256(new_body.encode('utf-8')).hexdigest())
print('EXCERPT=' + EXCERPT)
print('NON_TARGET_POSTS_STABLE=true')
print('PHOTO_FRAMING_UNCHANGED=true')
