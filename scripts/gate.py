#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""gate.py - the single deterministic pre-publish check for music98 posts.

WHY THIS EXISTS
Checking a longread by re-reading it does not converge: every pass finds a
smaller thing, because each read is done by the same head that wrote the text
and because every fix creates new surface. This script replaces the reading
pass with a machine pass. It is deterministic: the same post either fails or
passes, and it cannot "find something new" on the third run.

USAGE
  python scripts/gate.py                       # every post in the desk, table view
  python scripts/gate.py --post aubp23feat1    # one post, full report, exit 1 on FAIL
  python scripts/gate.py --post aubp23feat1 --json
  python scripts/gate.py --delta --post aubp23feat1   # only paragraphs changed since last run
  python scripts/gate.py --render https://music98.news/news/slug   # check the live page too

WORKFLOW IT BELONGS TO (private editorial rules are stored outside this public repository)
  1. edit freely while the owner is still giving notes
  2. FREEZE - owner says "готово"
  3. run this gate: it must be clean
  4. one human-style read for FACTS only, against a claim list (this script
     cannot know that a fact is true, only that a rule is kept)
  5. publish on the owner's explicit word, then `--render` the live URL
  6. any edit after step 3 means step 3 and step 4 run again, on the delta only

WHAT IT CANNOT DO
Truth. It checks form, structure, credits, publication state and house style.
Facts still need sources, and that check is human.

No third-party dependencies.
"""
import argparse, hashlib, json, os, re, ssl, sys, time
import urllib.error, urllib.parse, urllib.request

PROD = os.environ.get("MUSIC98_PROD", "https://music98.news")
KEY = (os.environ.get("MUSIC98_KEY") or os.environ.get("ADMIN_PASSWORD") or "").strip()
STATE = os.path.join(os.environ.get("TEMP", "/tmp"), "music98-gate-state.json")

LEAD_MIN_WORDS = 100          # hard floor for the paragraph in front of media
ECHO_FAIL = 4                 # a 4-gram this many times is a defect (2-3 is a warning)
NEG_SENT_FAIL = 3             # negations inside one sentence
COLON_FAIL = 5                # colons in prose (house norm is 2-4)
NUM_DENSITY_FAIL = 90         # numeric tokens in a longread body
WALL_RUN_WORDS = 260          # consecutive text paragraphs with no carrier between them
VAGUE_TIME = r"\b(this (?:fall|autumn|spring|summer|winter|month|week)|soon(?!\s+after)|later this year|in the coming (?:weeks|months))\b"
NEG = r"\b(?:no|not|nothing|never|nobody|none|without)\b"
ATTRIB = ("said", "told", "says", "explains", "explained", "recalls", "recalled",
          "wrote", "called it", "put it", "added", "described", "reads", "puts it",
          "sings", "sings the line", "goes")

# A result cannot be reported before the event happens.
# Added 23.09 after a live brief (aunews920k1) said the VMA Song of the Summer "went to"
# Swift and that she "took the fan-voted prize" on 20.09, when the category had a nominee and
# fan voting opened on 26.09. The gate cannot know when a prize is handed out, so instead of
# judging, every sentence that claims a result next to a date is printed for the human pass.
WIN_VERB = re.compile(r"\b(?:won|wins|winner|winners|took the prize|took home|went to|clinched|"
                      r"swept|sweeps|claimed the|takes home)\b", re.I)
# a bare year or a month name, spelled out here so the constant does not depend on MONTHS,
# which is defined further down the file
DATEISH = re.compile(r"\b(?:1[0-9]{3}|20[0-9]{2}|january|february|march|april|may|june|july|"
                     r"august|september|october|november|december)\b", re.I)

# A title in quotes is not speech. Added 23.09 after the gate failed the Taylor draft on
# '"The Fate of Ophelia"' - a song title inside a chart sentence, with nobody to attribute
# it to, because there is nothing to attribute.
_TITLE_WORD = r"(?:[A-Z0-9][\w.\-'’]*|of|the|a|an|and|to|in|on|for|with|at|by|de|la|el|It)"
TITLEISH = re.compile(r"^%s(?:[\s,]+%s)*$" % (_TITLE_WORD, _TITLE_WORD))
# A paragraph talking about songs writes its titles in quotes, and the desk writes titles the
# way the artist spells them - lowercase included. 24.09: the Tove Lo tracklist run failed with
# five "unattributed quotes" that were five song titles.
TITLE_CUES = ("song", "songs", "track", "tracks", "album", "single", "title", "tracklist",
              "ep", "mixtape", "disc")

# --- FOG ----------------------------------------------------------------------
# Owner, 23.09: "мне что надо каждое слово перечитывать чтобы ты косяки нашел?"
# Every defect he caught by hand was a phrase a reader cannot decode in one pass:
# an invented compound ("low hook"), a riddle built on before/after ("on the
# Coachella poster before they were its headliners"), or an abstraction with no
# antecedent ("the middle case"). None of that is grammar, so every check above
# stayed silent and he was doing the machine's job. These patterns are deterministic.
FOG_BANNED = {
    # owner 23.09 (teaser round): idiom that stands in for the action instead of naming it
    "readying": "owner asked 'readying - what word is that' - write 'is working on' / 'has a new album coming'",
    "in the works": "owner asked 'what kind of in the works' - it says something is happening without naming the verb",
    "where it stands": "owner 23.09 ('stands'): the verb reports a state without naming it - name the fact",
    "where things stand": "same: name the fact instead of the state",
    "stands now": "same: name the fact instead of the state",
    "middle case": "refers to options the text never names",
    "likeliest reading": "abstraction with no antecedent",
    "likeliest": "abstraction with no antecedent",
    "low hook": "invented compound, means nothing in English",
    "with no plot": "owner asked what this means - use 'no storyline'",
    "the machine": "vague metaphor, name the thing",
    "says a lot": "owner asked 23.09 what it actually says - name the thing or cut the clause",
    "says everything": "same: the reader cannot see what it says",
    "tells you everything": "same: the reader cannot see what it says",
    "speaks for itself": "same: the reader cannot see what it says",
    "four operations": "owner 23.09: 'operations' is a corporate word for people - name the people",
    "operations running": "same: corporate word for people",
    "come down to": "names what decides without saying how (owner 23.09) - name the mechanism",
    "comes down to": "names what decides without saying how - name the mechanism",
}
FOG_ADJ_NOUN = re.compile(r"\b(?:low|high|wide|thin|deep|flat|soft|tight|sharp|blunt|narrow|broad)"
                          r"\s+(?:hook|lane|mesh|gear|torque|edition|read)\b", re.I)
FOG_ABSTRACT = re.compile(r"\b(?:the|this|that)\s+(?:case|reading|option|scenario|variant)\b", re.I)
# The shape of the Coachella bug is not any "before" - it is a COPULA on both hands:
# "they WERE on the poster before they WERE its headliners". That is the construction a
# reader has to decode. An ordinary clause like "before anyone outside Korea had learned
# the words" is not a riddle and must not end up on the list, or the list stops being short.
FOG_COMPARE = re.compile(r"\b(?:is|are|was|were|be|been|being|become|became|looks|looked|reads)\b"
                         r"[^.;]{0,50}?\b(?:before|after|earlier than|later than|only then)\b", re.I)
# Tautology inside one sentence (owner 23.09): "the tour, built entirely for stadiums, ran
# from a stadium outside Seoul". The 4-gram echo check cannot see it, because one repeated
# word is not a 4-gram. Function words and deliberate callbacks are excluded.
# False irregular-verb forms (owner 23.09: "stuck не stucks?" - "stucks" is not an English word).
# These never occur in correct English in any register, so they are a hard FAIL. Deliberately
# excluded as risky: putted (golf), payed, leaded, singed, ringed, lied, leaved, sawed.
FALSE_FORMS = {"stucks", "runned", "taked", "writed", "speaked", "sended", "buyed", "goed",
               "bringed", "thinked", "teached", "catched", "holded", "keeped", "feeled",
               "sleeped", "fighted", "drinked", "swimmed", "eated", "gived", "knowed", "maked",
               "sitted", "standed", "understanded", "winned", "losed", "breaked", "choosed",
               "forgetted", "getted", "growed", "heared", "hided", "hurted", "meaned", "meeted",
               "readed", "rided", "rised", "selled", "throwed", "weared", "haved", "doed"}
# Time deltas: the arithmetic the gate cannot do itself, printed for a human eyeball.
# This is the check that caught "The album followed a year later" when Mantra 11.10.2024
# and Ruby 07.03.2025 are five months apart, and "soon after" when the gap was 3.5 years.
TIME_DELTA = re.compile(
    r"\b(?:\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+"
    r"(?:days?|weeks?|months?|years?)\s+(?:later|after|before|on|earlier)\b"
    r"|\b(?:soon after|later that|the following|that same|months later|years later|weeks later)\b", re.I)
# Phrases that point at something the text must have named first (the "says a lot" class).
REFERENT = re.compile(
    r"\b(?:the|that|this)\s+(?:answer|question|point|case|version|reason|idea|story|reading|bet|"
    r"conclusion|opposite|middle|lesson|joke)\b", re.I)

# --- date registry -------------------------------------------------------------
# Owner 23.09: every date in the text must be registered here with the fact it stands for.
# The gate then fails on any date it cannot match. The bug this prevents is quiet: a date that
# was true in one draft and silently false in the next ("October 30", "the following March").
VERIFIED_DATES = {
    "october 4": "Amazon Music announced on 04.10.2026 that Shakira's October 3 Madrid concert was its most-viewed livestream by a female artist to date (Pollstar 04.10.2026; Billboard 04.10.2026).",
    "1995": "Shakira's Pies Descalzos, which includes Antología, was released in 1995 (EFE 03.10.2026; official Shakira catalog context).",
    # Ella Langley longread, fact-checked October 3, 2026 against the named sources.
    "1952": "Kitty Wells recorded It Wasn\u0027t God Who Made Honky Tonk Angels in 1952, her pioneering Billboard country No. 1; Country Music Hall of Fame: https://www.countrymusichalloffame.org/hall-of-fame/kitty-wells",
    "june 2026": "Ella Langley performed Choosin' Texas at CMA Fest in June 2026; official CMA performance posted June 25, 2026 (CMA YouTube i1IX4Dusi9k)",
    "august 25": "Dolly Parton died August 25, 2026, aged 80 (Associated Press https://apnews.com/article/87156f3e6a1547b88bf414529b644ad3)",
    "october 2026": "Miranda Lambert AP interview published October 2, 2026, discusses a country scene with a variety of voices (Associated Press https://apnews.com/article/670c88368e68e3f62ede48edf93e5177)",
    "october 9": "Dominic Fike 'How To Quit Smoking' album release date, 09.10.2026 (Apple Music / Columbia Records)",
    "september 29": "Dominic Fike Comedy Tragedy Parody show at The Wiltern, Los Angeles, 29.09.2026 (dominicfike.com / Ticketmaster)",
    "september 30": "Dominic Fike Comedy Tragedy Parody show at The Wiltern, Los Angeles, 30.09.2026 (dominicfike.com / Ticketmaster); LISA added-show general on-sale, 30.09.2026 (Caesars Entertainment 29.09.2026)",
    "september 23": "Taylor Swift announced The Life of a Showgirl: The Encore on 23.09.2026 (Pitchfork/NME)",
    "october 3": "The Life of a Showgirl released on 03.10.2025 (Variety); Ella Langley Choosin Texas reached 24 weeks atop Billboard Hot 100 on chart dated 03.10.2026 (The Atlantic 03.10.2026; Billboard chart)",
    "2016": "debut, SQUARE ONE, 08.08.2016 (YG); first music show win 21.08.2016 (Inkigayo)",
    "2018": "JENNIE 'SOLO', 12.11.2018 (YG/Columbia)",
    "2021": "ROSE 'R' 12.03.2021 and LISA 'LALISA' 10.09.2021; MONEY performance video 24.09.2021",
    "2022": "BORN PINK, 16.09.2022 (last group album before JUMP)",
    "2023": "JISOO 'ME' 31.03.2023; group contract renewal announced Dec 2023; group single 'The Girls' 25.08.2023 "
            "(PUBG collab - THE anchor that makes 'almost three years' before JUMP false: it is 23 months)",
    "2025": "'JUMP' 11.07.2025; DEADLINE tour opened 05.07.2025 (Goyang)",
    "january": "DEADLINE tour final show, 26.01.2026, Kai Tak Stadium, Hong Kong",
    "february 27": "DEADLINE mini-album, 27.02.2026 (YG / Forbes)",
    "september": "LISA 'LALISA' 10.09.2021 (text: that September)",
    "march": "JENNIE 'Ruby', 07.03.2025 (text: the following March)",
    "october 30": "Fallen Angel physical edition with three extra tracks, 30.10.2026",
    "october 23": "LISA EP 'PRESS PLAY', 23.10.2026",
    "october 12": "Always Lalisa worldwide theatrical release begins 12.10.2026 (Sony Music Vision 02.09.2026)",
    "november": "LISA residency at Caesars Palace, November 2026",
    "november 12": "Newly added VIVA LA LISA show at The Colosseum at Caesars Palace, 12.11.2026 (Caesars Entertainment 29.09.2026)",
    "november 13": "Original VIVA LA LISA show at The Colosseum at Caesars Palace, 13.11.2026 (Caesars Entertainment 30.03.2026)",
    "november 27": "Original VIVA LA LISA show at The Colosseum at Caesars Palace, 27.11.2026 (Caesars Entertainment 30.03.2026)",
    "november 29": "Newly added VIVA LA LISA show at The Colosseum at Caesars Palace, 29.11.2026 (Caesars Entertainment 29.09.2026)",
    "september 25": "Taylor Swift 'Patient Zero' single out 25.09.2026 (Republic; AP/Variety/JustJared); "
                     "pre-order open 24h, three collector's edition CDs with double-sided covers (People)",
    "october 13": "Patient Zero collector CD singles ship 13.10.2026 (themusicuniverse)",
    "september 22": "Patient Zero announcement 22.09.2026 (Taylor's Instagram; AP; website countdown two hours prior, Billboard); "
                     "Teddy Swims' Ugly Tour arena run opened 22.09.2026 in Kansas City; Yeat LOVE/LYFE Tour at the "
                     "Coca-Cola Roxy, Atlanta (yeatofficial.com/pages/tour)",
    "september 14": "Taylor Swift in the Law & Order: SVU sketch at the 2026 Emmys, 14.09.2026 (People/Billboard)",
    "september 18": "Bass Persuades album out 18.09.2026 (Atlantic); Yeat COCOON EP out 18.09.2026 (FieldTrip/Capitol); "
                     "CBS/MTV announced the four VMA social categories (Best Group, Best Long Form Video, Best Album, "
                     "Song of Summer) on 18.09.2026 (Billboard), which took Swift to 11 and Madonna to 13 nominations; "
                     "Cardi B spoke to The Breakfast Club that day",
    "october 2025": "Taylor Swift 'The Life of a Showgirl' released 03.10.2025; 12 weeks at No.1 on the "
                    "Billboard 200; 'The Fate of Ophelia' and 'Opalite' both No.1 on the Hot 100 (Billboard/People)",

    "september 19": "Bass Persuades chart week predictions 40-45K (HITSDD/chartdata)",
    "september 3": "'Bass Persuades' title track + Mert Alas video 03.09.2026",
    "september 4": "LISA 'SaWaDiKa' released 04.09.2026 through LLOUD Co. / RCA Records (Sony Music Spain)",
    "september 8": "BbY WOW first hit No.1 on Billboard Global 200 (chart week of 12.09)",
    "august 7": "KAROL G 'NO ME ARREPIENTO DE SENTIR TANTO' album out 07.08.2026 (Bichota)",
    "october 16": "Miley Hollywood Bowl night one, 16.10.2026 (Atlantic announcement)",
    "october": "Bass Persuades Hollywood Bowl 16+18.10.2026; Fallen Angel physical 30.10.2026",
    # CORRECTED 23.09.2026: the earlier entry here read "Taylor Swift wedding, June 2026".
    # That was wrong. People, AP and Bleacher Report all date the wedding to 03.07.2026 at
    # Madison Square Garden; June 13 was a rumoured date the couple were seen away from.
    # Registered under both tokens so the wrong month can never be written again.
    "june": "DEAD TOKEN - was 'Taylor Swift wedding, June 2026', factually wrong. The wedding was 03.07.2026",
    "july 3": "Taylor Swift married Travis Kelce, 03.07.2026, Madison Square Garden, ~1,000 guests "
              "(People/AP/Bleacher Report); 'Patient Zero' is her first release since",
    "july": "Taylor Swift wedding 03.07.2026 (July 3, not June); Madonna 'Confessions II' released in July 2026 "
            "and became her tenth No. 1 on the Billboard 200 (NME 25.09.2026; Billboard chart)",
    "2024": "the Eras Tour closed at the end of December 2024 (text: 'the end of 2024'); "
            "Taylor Swift ft. Post Malone won the VMA Song of the Summer in 2024 with 'Fortnight'",
    "2026": "Yeat's album *ADL* is 2026; COCOON recorded on the tour behind it",
    "1982": "DJ Mark Kamins played Madonna's 'Everybody' demo at Danceteria and then produced it; the record "
            "became her debut single in 1982 (NME 25.09.2026; Wikipedia 'Danceteria (song)')",
    # added 24.09 for the four queued posts: each one is the date the sentence leans on
    "march 19": "Feid 'EL GREEN PRINT: La Saga (Disc 1) - FEID VS FERXXO', 19.03.2026, his first "
                "release on his own label Grabaciones Los Poderosos (Billboard/Genius/Discogs)",
    "april 7": "Feid vs Ferxxo: Falxo Tour opened 07.04.2026 at the House of Blues, Buena Vista, "
               "promoted by Live Nation (Live Nation newsroom/Pollstar)",
    "may 13": "Feid vs Ferxxo: Falxo Tour closed 13.05.2026 in Dallas, fourteen cities "
              "(SeatGeek/Pollstar)",
    "july 17": "Yeat LOVE/LYFE Tour opened 17.07.2026 in Minneapolis (yeatofficial.com/pages/tour, themusicuniverse); "
               "Ella Langley performed at Ottawa Bluesfest 17.07.2026, photography by Miriam Visser (The Charlatan 18.07.2026)",
    "september 24": "Yeat LOVE/LYFE Tour Chicago stop, 24.09.2026, Huntington Bank Pavilion "
                    "(yeatofficial.com/pages/tour); Madonna and Charli xcx 'Danceteria Afterhours' remix "
                    "released 24.09.2026 on Warner (Wikipedia 'Danceteria (song)'; NME 25.09.2026; "
                    "Stereogum 24.09.2026)",
    "september 13": "Judeline interview with Rolling Stone published 13.09.2026",
    "september 16": "Yeat announced COCOON as a surprise EP 16.09.2026 (InMusic)",
    "september 17": "COCOON first advertised as five tracks for 17.09.2026 (InMusic)",
    "september 27": "2026 MTV VMAs air 27.09.2026, CBS, Madonna opening; Song of the Summer fan voting "
                     "closes that day",
    "october 23": "John Legend *Muse* out 23.10.2026 via Republic Records; produced in full and co-written by Pharrell Williams (Universal Music Canada 08.09.2026 and 25.09.2026)",
    "2019": "Feid EP *19*, 2019 - the record EL CLUB DE LAS 19 FLORES reaches back to",
    "july 10": "Feid 'A XON DE QUE' advance track, 10.07.2026",
    "june 5": "Taylor Swift 'I Knew It, I Knew You' (Toy Story 5) out 05.06.2026 "
              "(Disney/Pixar announce + Rolling Stone AU 05.06.2026); a month before the wedding",

    # --- registered 24.09 while closing the audit of the eight live posts left failing ------ 
    # Each line names the fact and the source, so the audit can be run again at any time and the
    # same token cannot be argued twice.
    "june 12": "Olivia Rodrigo 'you seem pretty sad for a girl so in love', 12.06.2026 on Geffen "
               "(Live Nation newsroom / Variety / Ticketmaster); 485,000 first-week units",
    "may 10": "The Unraveled Tour closes 10.05.2027 at the O2, London (Wikipedia / Ticketmaster); "
              "route announced 30.04.2026 with 65 dates, 25 added by demand",
    "october 1": "beabadoobee The Powerlines Tour opens 01.10.2026 at Mohegan Sun Arena, "
                 "Uncasville (beabadoobee.com/live, BroadwayWorld, Mohegan Sun)",
    "october 5": "Powerlines Tour at Madison Square Garden, 05.10.2026 (beabadoobee.com/live, "
                 "stereoboard)",
    "october 29": "Powerlines Tour closes its North American leg 29.10.2026 at Climate Pledge "
                  "Arena, Seattle (stereoboard, beabadoobee.com/live)",
    "march 2027": "Powerlines Tour Australia leg, March 2027 (mido-media / Live Nation 2027 dates)",
    "september 11": "Charli xcx Music, Fashion, Film Tour opened 11.09.2026 at Xfinity Mobile "
                    "Arena, Philadelphia (Ticketmaster, Pollstar 11.09.2026)",
    "july 24": "'Music, Fashion, Film' arrived 24.07.2026 (charlixcx.com, ticketnews 14.09.2026)",
    "february 2027": "Charli xcx six-city UK/EU arena leg, February 2027 with Audrey Hobert; "
                     "Paris Accor Arena 24.02.2027 (ticketnews 14.09.2026, charlixcx.com)",
    "october 2": "Austin City Limits weekend one, 02.10.2026, inside the Music, Fashion, Film "
                 "North American route (Austin City Limits / tour routing)",
    "may": "Drake put out ICEMAN, HABIBTI and MAID OF HONOUR in May 2026 and became the first "
           "artist to hold the top three Billboard 200 slots at once (Variety 24.05.2026, Billboard "
           "03.09.2026); Tove Lo announced ESTRUS and its lead single on 11.05.2026 (Billboard) and "
           "released 'I'm your girl right?' on 13.05.2026 (Wikipedia)",
    "september 15": "Tove Lo ESTRUS World Tour opened its North American run 15.09.2026 "
                    "(amnplify/press release; BroadwayWorld 18.09.2026 on the Brooklyn date)",
    "june 22": "Carly Rae Jepsen announced the double album 'Day and Night' on 22.06.2026 "
               "(Wikipedia/UMG; lead single announced with it)",
    "june 26": "'On Wires', lead single, 26.06.2026 (Wikipedia, carlyraejepsen.wiki.gg, UMG)",
    "july 16": "'After All', 16.07.2026 (Wikipedia, UMG Philippines)",
    "august 7": "'Don't Leave Me on the Dance Floor', 07.08.2026 in the Day and Night rollout "
                "(Wikipedia, Genius); KAROL G's album of the same date is the other entry",
    "august 21": "'Motivation', 21.08.2026, closing the Day and Night singles run "
                 "(uDiscoverMusic 21.08.2026, Wikipedia)",
    "september 9": "Apple and ROSÉ announced the 'new trick' Shot on iPhone partnership 09.09.2026 "
                   "(Billboard 09.09.2026)",
    "2015": "Apple's Shot on iPhone campaign began in 2015 with user photos on billboards "
            "(Apple/press); the music-video branch is its newest form",
    "september 17": "ROSÉ 'new trick' single and video 17.09.2026 (Apple/Shot on iPhone; "
                    "texxandthecity 2 days later); Drake restored FOMO to YouTube 17.09.2026 "
                    "after a two-day takedown",
    "december 2024": "ROSÉ debut studio album 'rosie', 06.12.2024 (Atlantic/Interscope press)",

    # --- registered 23.09.2026 during the audit of the four live posts -----------------
    # Every entry below was the token that failed those posts. Each one carries the fact
    # and the source it was checked against, so the same token cannot be argued twice.
    "january 22": "Teddy Swims 'UGLY', 22.01.2027 (Warner Records); 'Mr. Know It All' was the first "
                  "single of the era (10.04.2026), 'Perfect Man' came with the album news (18.09.2026)",
    "april 10": "Teddy Swims 'Mr. Know It All', 10.04.2026 (Warner Records) - the first single of the "
                "UGLY era, so 'Perfect Man' is the second, not the first (stereoboard/Wikipedia); "
                "Ella Langley Dandelion album released April 10, 2026 (Sony Music Canada press release)",
    "november 2025": "Teddy Swims 'Lose Control' certified Diamond by the RIAA on 21.11.2025 - the "
                     "200th song in US history to reach 10m certified units (RIAA/press)",
    "1984": "the MTV VMAs were first staged in 1984 (Guinness World Records; AP/Paramount)",
    "1998": "Lauryn Hill's 'Doo Wop (That Thing)' topped the Hot 100 in 1998 - the last solo rap "
            "single by a woman before Cardi B's 'Bodak Yellow' (Billboard)",
    "2027": "Cardi B's third album is planned for 2027 (Breakfast Club, 18-19.09.2026); the tour "
            "behind AM I THE DRAMA? runs into 2027",
    "august": "Cardi B 'AH HA' video, end of August 2026 (dir. Arrad); the BZR WKND booking in "
              "Kingston was reported by Billboard in August 2026; Taylor Swift's 'I Knew It, I Knew "
              "You' reached No.1 on Billboard's Radio Songs chart in August 2026",
    "september 2025": "Cardi B 'AM I THE DRAMA?' released 19.09.2025 (Atlantic; BBC/Wikipedia/AP)",
    "february": "Cardi B's Little Miss Drama Tour opened in February 2026",
    "april": "Cardi B's Little Miss Drama Tour ran 35 dates from February to April 2026 "
             "(Billboard Boxscore)",
    "october 18": "Cardi B headlines BZR WKND at the National Stadium, Kingston, 18.10.2026 "
                  "(Billboard)",
    "september 26": "VMA Song of the Summer fan voting runs 26-27.09.2026 on MTV's Instagram "
                    "Stories - so on 20.09 the category had a nominee, not a winner",
    "november 19": "'Grand Theft Auto VI: The Album' and the game both arrive 19.11.2026 "
                   "(Rockstar newswire / Atlantic)",
}
# --- register: the class the owner should never have to catch (23.09) -------------
# Owner: "ПОЧЕМУ Я ДОЛЖЕН ЭТО ЗАМЕЧАТЬ ... Я ДАЛЕКО НЕ АНГЛОЯЗЫЧНЫЙ". He is right: telling a
# corporate noun from an ordinary one needs a native ear, so it must not be his job. My own
# failure mode is compression - when a sentence gets shorter, the verb drops out first and an
# abstract noun takes its place ("operations", "scheduling decision", "milestone"). Two checks
# now stand in front of him: this banned register list, and a nominalisation density count.
REGISTER_BANNED = {
    "operations": "corporate noun for people - name the people",
    "operational": "same",
    "leverage": "use 'use'",
    "leveraging": "use 'using'",
    "ecosystem": "say who and what",
    "vertical": "say the business",
    "pipeline": "say what is coming",
    "portfolio": "say the work",
    "rollout": "say the release",
    "deliverable": "say the thing",
    "stakeholder": "name the person or company",
    "bandwidth": "say time or capacity",
    "alignment": "say agreement",
    "synergy": "say what it is",
    "holistic": "say complete",
    "robust": "say strong",
    "seamless": "say smooth",
    "utilize": "use 'use'",
    "utilization": "say use",
    "facilitate": "say help or let",
    "optimize": "say improve",
    "optimization": "say improvement",
    "impactful": "say what it changed",
    "initiative": "say the plan",
    "roadmap": "say the plan",
    "touchpoint": "say where people meet it",
    "onboarding": "say signing",
    "resourcing": "say staff or budget",
    "throughput": "say how much, how often",
    "best-in-class": "name what it is best at",
    "value-add": "say what it adds",
    "deep dive": "say the long read",
    "circle back": "say return",
    "going forward": "say from now on",
    "at scale": "say how big",
    "cadence": "say rhythm or rate",
    "scheduling": "say when it can happen and who decides",
    "milestone": "say the actual result",
    "metric": "say the number",
    "benchmark": "say what it is measured against",
    "actionable": "say what to do",
    "streamline": "say what gets simpler",
    "incentivize": "say what it rewards",
    "monetize": "say what it sells",
    "learnings": "say what was learned",
    "optics": "say how it looks",
    "overarching": "say main",
    "multifaceted": "say which parts",
    "pivotal": "say important, or better why",
    "paramount": "say most important, or better why",
    "endeavor": "say try",
    "commence": "say start",
    "utilization of": "say use of",
    "prior to": "say before",
    "in order to": "say to",
    "at this juncture": "say now",
    "in the realm of": "say in",
}
# A word can leave this list only by the owner's word; a word is added here the moment one of
# his catches falls into this class, which is the standing rule for every check in this file.
# A sentence carrying several nominalisations at once is the shape that hides the verb.
NOMINAL = re.compile(r"\b\w{5,}(?:tion|sion|ment|ance|ence|ency|ity|ness|ization)s?\b", re.I)
NOMINAL_WARN = 3

MONTHS = ("January|February|March|April|May|June|July|August|September|October|November|December")
# Month + year first, then month + day, then a bare year, then a month on its own.
# The day pattern carries (?!\d) so "October 2025" is read as one token instead of
# "October 20" (a day that does not exist in the text) - that false token failed the
# Taylor draft on 23.09 with "date-unregistered 'October 20'".
DATE_TOKEN = re.compile(
    r"\b(?:(?:" + MONTHS + r")\s+(?:19|20)\d{2}|(?:" + MONTHS + r")\s+\d{1,2}(?!\d)"
    r"|(?:19|20)\d{2}\b|(?:" + MONTHS + r")s?\b)", re.I)

# --- claims that need a source, not a reading ----------------------------------
# 'the first', 'the only' and claims of absence are the shapes that have actually been wrong in
# this text ("the first time one of the four put a whole record out", "they have not performed
# together since January"). They are printed, not judged: a first-claim is checkable, not illegal.
FIRST_CLAIM = re.compile(r"\b(?:the first|the only|first ever|no other|the earliest|the last)\b", re.I)
# Repeats that are deliberate: the anniversary paragraph recaps every member's current status,
# which is the owner's own skeleton point ("10-летие И ЧТО СЕЙЧАС"). Same pattern as
# SUPERLATIVE_ALLOW: a repeat that is accepted is recorded with its reason, so it is never
# re-argued and never silently becomes noise.
CLAIM_DUP_ALLOW = {
    "JISOO has a first album, still without a title or a date":
        "the anniversary recap repeats each member's status on purpose",
    # Added 24.09: the lede states the one-line premise and paragraph 37 is the recap the owner
    # asked for in his own skeleton ("10-летие И ЧТО СЕЙЧАС"), so the same claim appears twice on
    # purpose. Recorded here rather than re-argued on every run.
    "This is the first time all four have been busy with their own releases at once":
        "the closing recap restates the premise the lede opened with - the owner's skeleton asks "
        "for that recap",
    "At the same time, all four are busy with their own releases":
        "the recap sentence in the anniversary paragraph (owner's skeleton: '10-летие И ЧТО СЕЙЧАС')",
}
ABSENCE_CLAIM = re.compile(r"\b(?:no one|nobody|none of|never|no longer|nothing|there is no|there was no)\b"
                           r"[^.]{0,80}\b(?:since|anymore|at all|in years|yet|ever|for \\d+ year)", re.I)

# Owner 23.09: "the one day this year the whole group stood in the same room" was false -
# the tour final was 26.01.2026, same calendar year. Uniqueness over a period the text
# itself contradicts elsewhere. Printed for a human check.
UNIQUE_PERIOD = re.compile(r"\bthe (?:one|only|first|last)\s+(?:day|time|night|show|moment)\s+(?:this year|of the year|in \d{4})\b", re.I)

TAUT_NOUNS = {"stadium", "tour", "stage", "week", "month", "year", "album", "single", "video",
              "song", "record", "release", "chart", "show", "clip", "track", "reason", "group",
              "city", "room", "screen", "era", "career", "contract", "label"}

# superlatives already backed by a checked source. Anything else of this class
# is a FAIL, so the same argument is never re-litigated post by post.
SUPERLATIVE_ALLOW = {
    "first k-pop group with a video past a billion views": "YouTube / press",
    "highest-grossing run any female group has ever had": "Billboard boxscore",
    "first for any girl group": "Billboard, BORN PINK No.1 US+UK same week",
    "first female solo act in korea to sell a million copies": "YG / Korea press",
    "biggest 24-hour debut by a solo artist": "Guinness World Records",
    "biggest song on that chart": "Billboard global year-end",
    "first time a k-pop artist had won there": "Brit Awards",
    "the first by a k-pop artist": "Caesars press release / Variety / People",
    "first blackpink song all four of them are credited on as writers": "Genius / Wikipedia",
    # below: wording the owner has already seen and accepted, each with the fact
    # it leans on, so the gate does not reopen the same sentence every run
    "one of the biggest careers in pop": "owner's lede, framing not a record",
    "the biggest song of her career so far": "APT. - Billboard global year-end No.1",
    "the only one of the four solo debuts built as a set of characters": "structural, four catalogues compared",
    "the biggest video debut of the year": "70.8M first day, verified",
    "the biggest seller of the four": "ME million-copy single, stated in the same paragraph",
    "biggest gross any tour has ever posted": "Pollstar year-end: Eras Tour top grossing tour of all time",
    "the only music she released in those twelve months": "discography check: between Showgirl (Oct 2025) and Patient Zero (Sep 2026) the only release was the Toy Story 5 single, 05.06.2026 (Disney/Wikipedia/Rolling Stone AU)",
    "the most awarded artist in the show's history": "ABC News wire + AP: Swift ties/stands most-awarded in VMA history after the 2026 show",
    "the most the show has ever seen": "MTV VMA all-time wins: Swift and Beyonce level on 30, the "
                                       "highest career total in the show's history (Billboard, Sep 2026)",
    # Added 24.09: four live posts failed on idiomatic "the most / the only / the loudest" that claim
    # no record at all. Recorded here so the same phrase is never re-argued post by post.
    "the album that means the most to her": "MILEY's own framing, attributed in the same sentence",
    "making the most of one summer": "ordinary phrase, no record claimed",
    "the only way to understand": "the artist's own explanation, attributed in the same sentence",
    "the loudest person in the room": "figure of speech, no record claimed",
    "the biggest solo week of 2026": "Billboard 200, week of 27.06.2026: 485,000 units for 'you seem "
                                     "pretty sad for a girl so in love' - the largest first-week total "
                                     "by a solo artist this year (Billboard/chart press)",
}
SUPER_RE = re.compile(r"(?<!one of )\b(?:the (?:most|biggest|best|loudest|highest|fastest|greatest)|the only|first ever)\b", re.I)


# --- credit entity vs credit link ---------------------------------------------------
# Owner, 24.09: "там где Майли фотосессия там вроде один он фоткал и я поэтому указывал
# инсту именно ЭТОГо чела а не их 2 + агенства, уточни". The desk had credited the MILEY
# cover to "Mert Alas" and linked the Mert & Marcus duo page at Art Partner: a caption
# naming one person over a link that belongs to two. Nothing caught it because this file
# only ever read the `[photo:]` markers in the body - the cover credit was never checked
# at all. The rule the desk now enforces is one line: the caption names one entity and the
# link belongs to that entity. A solo credit gets a solo resource, a duo credit gets the
# duo's resource, a label handout gets the label.
DUO_URL_TOKENS = ("mert-alas-marcus-piggott", "mert-and-marcus", "alas-marcus", "mertandmarcus")
# words that make a credit a company rather than a person, so the name-vs-link warning
# does not fire on "Republic Records -> republicrecords.com" or "YG Entertainment -> ygfamily.com"
PERSON_STOP = {"records", "recordings", "entertainment", "music", "games", "studios", "studio",
               "group", "collective", "agency", "media", "films", "inc", "ltd", "llc", "company"}
# pairs where the link deliberately does not carry the credit's name, each with its reason.
# Same idea as SUPERLATIVE_ALLOW: a decision made once is recorded, not re-argued.
CREDIT_LINK_ALLOW = {
    ("Wontae Go", "https://www.lloud.co/"):
        "canon rule 7: he has no resource of his own, so the caption keeps his name and the "
        "link goes to the owner of the frame (LLOUD). The agency is not part of the credit line",
    ("John V. Esparza", "https://cedarcreativestudio.com/"):
        "his own studio rather than a site under his name",
}


def credit_names(credit):
    """The people a credit names: 'Mert Alas & Marcus Piggott' -> ['mert alas', 'marcus piggott']."""
    return [p.strip() for p in re.split(r"\s*(?:&|,|/|\band\b|\bx\b)\s*", credit, flags=re.I) if p.strip()]


def looks_personal(credit):
    """A person's name rather than a company: one to three words, no corporate word, no digits."""
    words = re.findall(r"[A-Za-zÀ-ÿ.'-]+", credit)
    if not 1 <= len(words) <= 3:
        return False
    return not any(w.lower().strip(".") in PERSON_STOP for w in words)


def credit_pair(where, name, url, fails, warns):
    """One entity named, the same entity linked. Used for the cover and for every body photo."""
    name = (name or "").strip()
    url = (url or "").strip()
    if not name:
        fails.append(("credit-empty", "%s names no entity" % where))
        return
    if "/" in name:
        fails.append(("credit-slash", "%s caption %r uses the slash the owner banned" % (where, name)))
    if len(name) > 44:
        warns.append(("credit-long", "%s caption %r may wrap" % (where, name)))
    if not url:
        warns.append(("credit-nolink", "%s caption %r has no link" % (where, name)))
        return
    low = url.lower()
    people = credit_names(name)
    duo = len(people) > 1
    ig = re.search(r"instagram\.com/([^/?#]+)", low)
    if any(t in low for t in DUO_URL_TOKENS) and not duo:
        fails.append(("credit-duo-url", "%s credits one person (%s) but links the duo page: %s"
                      % (where, name, url)))
    if duo and ig:
        handle = re.sub(r"[^a-z]", "", ig.group(1).lower())
        missing = [p for p in people
                   if not any(t in handle for t in re.findall(r"[a-z]{3,}", p.lower()))]
        if missing:
            fails.append(("credit-entity-split", "%s names a duo (%s) but the link is one person's account: %s"
                          % (where, name, ig.group(1))))
    if not duo and looks_personal(name) and (name, url) not in CREDIT_LINK_ALLOW:
        flat = re.sub(r"[^a-z]", "", low)
        toks = re.findall(r"[a-z]{4,}", name.lower())
        if toks and not any(t in flat for t in toks):
            warns.append(("credit-url-name", "%s credits %r but the link carries no part of that name: %s "
                          "(rule 7: a photographer's own resource ranks first, their agency page "
                          "second, and only when he has neither does the link go to the frame's owner)"
                          % (where, name, url)))


def fetch(path):
    req = urllib.request.Request(PROD + path, headers={"User-Agent": "Mozilla/5.0", "X-Admin-Key": KEY})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode("utf-8", "replace"))


def paragraphs(body):
    return [p for p in re.split(r"\n{2,}", body or "") if p.strip()]


def is_media(t):
    t = t.strip()
    return bool(re.match(r"^\[(?:photo|youtube|apple|tiktok|ig|tickets):[^\]]*\]$", t, re.I))


def is_awards_marker(t):
    return (t or "").strip().lower() in ("[awards]", "[/awards]")


def prose_of(body):
    """Journalistic prose only.

    [awards]...[/awards] is a structured results appendix. Repeated nominee
    names and song titles are factual list data, not prose style, so they do
    not participate in echo/colon/dash/quote-density checks. Media and credit
    validation still run against the full body.
    """
    out = []
    in_awards = False
    for p in paragraphs(body):
        t = p.strip()
        if t.lower() == "[awards]":
            in_awards = True
            continue
        if t.lower() == "[/awards]":
            in_awards = False
            continue
        if not in_awards and not is_media(t):
            out.append(p)
    return "\n\n".join(out)


def sha(o):
    return hashlib.sha256(json.dumps(o, sort_keys=True, ensure_ascii=True).encode()).hexdigest()


def sentences(text):
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]


def quoted_spans(text):
    """Spans of text between paired double quotes (odd quote -> even quote)."""
    out, open_at = [], None
    for i, ch in enumerate(text):
        if ch != '"':
            continue
        if open_at is None:
            open_at = i + 1
        else:
            out.append(text[open_at:i])
            open_at = None
    return out


def manual_checklist(p, limit=12):
    """What the machine cannot judge: quotes with their attribution, and every
    number, so the human pass is a short targeted read instead of a re-read."""
    body = p.get("body") or ""
    prose = prose_of(body)
    out = ["quotes: verify each against its source"]
    for para in paragraphs(prose):
        for q in quoted_spans(para):
            if len(q) < 18:
                continue
            who = ""
            for a in ATTRIB:
                i = para.lower().find(a)
                if i >= 0:
                    who = para[max(0, i - 40):i + 40].replace("\n", " ")
                    break
            out.append("   \"%s…\"  <- %s" % (q[:60], who.strip() or "NO ATTRIBUTION"))
    # Owner 23.09: the brief for 24.09 said the VMA Song of the Summer "went to" Swift and
    # that she "took the fan-voted prize". On the day it was written the category had a
    # nominee and voting had not opened. A prize is a fact about the calendar, so the line is
    # printed here rather than judged: if the sentence claims a result and names a date, the
    # human checks that the event has already happened.
    res = [s for s in sentences(prose_of(body)) if WIN_VERB.search(s) and DATEISH.search(s)]
    out.append("results: %d sentence(s) claim a win or a placing next to a date - check the event "
               "has happened yet (nothing can be won before its voting opens)" % len(res))
    for s in res[:limit]:
        out.append("   %s" % s.strip()[:150])

    nums = [s for s in sentences(prose_of(body)) if re.search(r"\b\d", s)]
    out.append("numbers: %d sentences carry a figure, verify each and keep only what carries the story" % len(nums))
    for s in nums[:limit]:
        out.append("   %s" % s.strip()[:120])
    deltas = [s for s in sentences(prose_of(body)) if TIME_DELTA.search(s)]
    out.append("time deltas: %d - do the arithmetic against the release dates (Mantra 11.10.2024 -> "
               "Ruby 07.03.2025 is five months, not a year)" % len(deltas))
    for s in deltas:
        out.append("   %s" % s.strip()[:140])
    refs = [s for s in sentences(prose_of(body)) if REFERENT.search(s)
            and not any(a.lower() in s.lower() for a in approved_lines(p))]
    out.append("referents: %d - each 'the …' must be something the text named earlier" % len(refs))
    for s in refs:
        out.append("   %s" % s.strip()[:140])
    return out


def approved_lines(p):
    try:
        spec = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "approved.json"), encoding="utf-8"))
    except Exception:
        return []
    return spec.get(p.get("id")) or []


def fog_scan(p):
    """The class of defect a form check cannot see: phrases a reader cannot decode.

    Returns (fails, warns, info). A banned phrase or an invented compound fails. The
    comparative sentences are not failures - most are ordinary English - they are a
    SHORT LIST so the human pass is six sentences instead of three thousand words.
    Lines the owner already approved are exempt.
    """
    fails, warns, info = [], [], []
    prose = prose_of(p.get("body") or "")
    approved = [a.lower() for a in approved_lines(p)]

    for bad, why in FOG_BANNED.items():
        for m in re.finditer(r"\b" + re.escape(bad) + r"\b", prose, re.I):
            ctx = prose[max(0, m.start() - 70):m.start() + 70].replace("\n", " ").strip()
            if any(bad in a for a in approved):
                continue
            fails.append(("fog-term", "%r - %s: …%s…" % (bad, why, ctx)))

    for m in FOG_ADJ_NOUN.finditer(prose):
        warns.append(("fog-compound", "%r looks like an invented phrase - if it needs explaining, rewrite it: …%s…"
                      % (m.group(0), prose[max(0, m.start() - 60):m.start() + 60].replace("\n", " ").strip())))

    for m in FOG_ABSTRACT.finditer(prose):
        warns.append(("fog-abstract", "%r points at something the text must have named first: …%s…"
                      % (m.group(0), prose[max(0, m.start() - 70):m.start() + 70].replace("\n", " ").strip())))

    riddles = []
    for si in sentences(prose):
        if not FOG_COMPARE.search(si) or re.search(r"\d", si):
            continue
        low = si.lower().strip()
        if any(a in low for a in approved):
            continue
        riddles.append(si.strip())
    for si in riddles:
        warns.append(("fog-riddle", "comparative with no date - read it as a reader, is the order obvious without decoding? %s" % si[:120]))
    info.append(("fog", "%d comparisons without a date to eyeball, nothing else flagged" % len(riddles)))
    return fails, warns, info


def approved_check(p):
    """Approval is sticky: lines the owner liked must survive every later edit."""
    lines = approved_lines(p)
    body = p.get("body") or ""
    fails, info = [], []
    fails, info = [], []
    for line in lines:
        if line not in body:
            fails.append(("approved-lost", "an approved line is gone or was edited: %r" % line[:90]))
    if lines:
        info.append(("approved", "%d approved lines intact" % len(lines)))
    return fails, info


# Resolving every card is off by default (it needs the network and about ten seconds), and on
# in preflight. This is the check that would have caught a wrong clip standing under a paragraph
# about a different song: the card resolved fine, it was just never compared with the text.
CHECK_IDS = False

# Owner 24.09: "https://www.fieldtripinc.com/ НЕ РАБОТАЕТ САЙТ". The domain answered 200, so
# every status check in this file said the link was fine. It was a parked domain whose whole
# body is `window.onload=function(){window.location.href="/lander"}`: the reader who clicks the
# credit lands on a placeholder. A credit link is checked by what the page IS, not by its code.
PARKING_MARKERS = ("/lander", "buy this domain", "this domain is for sale", "domain is for sale",
                   "sedo.com", "afternic", "hugedomains", "dan.com", "parkingcrew")


def credit_url_check(where, url, fails, warns, info):
    """Follow the credit link and refuse a parked or empty placeholder.

    The read is deliberately made without certificate verification, and the reason is not
    laziness: on 24.09 this check FAILed brianziff.com and aidanzamiri.com with "certificate
    has expired" while openssl showed a valid letsencrypt leaf (Sep-Dec 2026) behind the new
    ISRG Root YE. The local Python trust store did not know that root, curl and a browser do.
    What this check judges is whether the page is a parking placeholder, not the TLS state —
    a real certificate problem belongs to the reader's browser and shows up there, not here.
    """
    url = (url or "").strip()
    if not url.startswith("http"):
        return
    ctx = ssl._create_unverified_context()
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=25, context=ctx) as r:
            final = r.geturl()
            raw = r.read(300000).decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        # 403/429/503 is a bot wall, not a dead page: warnerrecords.com answers 403 to this
        # script and opens normally in a browser. Only a 404-shaped answer is a defect.
        if e.code in (403, 401, 429, 503):
            warns.append(("credit-blocked", "%s link %s answers %s to a script (bot wall); "
                          "open it in a browser before trusting it" % (where, url, e.code)))
        else:
            fails.append(("credit-dead", "%s link %s serves %s" % (where, url, e.code)))
        return
    except Exception as e:
        fails.append(("credit-dead", "%s link %s does not load (%s)" % (where, url, e)))
        return
    stripped = re.sub(r"(?is)<(script|style)[^>]*>.*?</\1>", " ", raw)
    text = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", stripped)).strip()
    low = raw.lower() + " " + final.lower()
    hits = [m for m in PARKING_MARKERS if m in low]
    if hits and (len(text) < 400 or "/lander" in final.lower()):
        fails.append(("credit-parked", "%s link %s is a parked or placeholder page (%s) - "
                      "link the owner's real site" % (where, url, final)))
    else:
        info.append(("credit", "%s link %s -> %s (%d chars of page text)"
                     % (where, url, final, len(text))))


def ids_check(p):
    """Every photo/youtube/apple marker must resolve, and the resolved title is printed."""
    fails, warns, info = [], [], []
    body = p.get("body") or ""
    for m in re.finditer(r"\[youtube:([A-Za-z0-9_-]{6,})\]", body):
        vid = m.group(1)
        try:
            req = urllib.request.Request(
                "https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=%s&format=json" % vid,
                headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=25) as r:
                d = json.loads(r.read().decode("utf-8", "replace"))
            info.append(("card", "youtube %s -> %s | %s" % (vid, d.get("author_name"), d.get("title"))))
        except Exception as e:
            fails.append(("card-dead", "youtube %s does not resolve (%s) - a post must never carry a dead embed" % (vid, e)))
    # TikTok-карточка (съёмка очевидца, 23.09): у неё нет oEmbed-html в нашем рендере, но
    # резолв проверяем тем же правилом «мертвый эмбед в пост не едет».
    for m in re.finditer(r"\[tiktok:(\d{6,25})", body):
        tid = m.group(1)
        try:
            req = urllib.request.Request(
                "https://www.tiktok.com/oembed?url=https://www.tiktok.com/@i/video/%s" % tid,
                headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=25) as r:
                d = json.loads(r.read().decode("utf-8", "replace"))
            info.append(("card", "tiktok %s -> %s | %s" % (tid, d.get("author_name"), d.get("title"))))
        except Exception as e:
            fails.append(("card-dead", "tiktok %s does not resolve (%s) - a post must never carry a dead embed" % (tid, e)))
    # Instagram-карточка (24.09): у платформы нет oEmbed на /embed/, зато есть свой api/v1/oembed -
    # он отдаёт автора и 404 на несуществующий код, а это ровно то, что нужно: живой эмбед едет,
    # мёртвый не едет. Оба вида ссылки (p и reel) проверяются одинаково.
    for m in re.finditer(r"\[ig:(p|reel|tv):([A-Za-z0-9_-]{5,20})", body):
        ikind, icode = m.group(1), m.group(2)
        permalink = "https://www.instagram.com/%s/%s/" % ("p" if ikind == "p" else ikind, icode)
        try:
            req = urllib.request.Request(
                "https://www.instagram.com/api/v1/oembed/?url=" + urllib.parse.quote(permalink, safe=""),
                headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=25) as r:
                d = json.loads(r.read().decode("utf-8", "replace"))
            info.append(("card", "instagram %s %s -> %s | %s"
                         % (ikind, icode, d.get("author_name"), (d.get("title") or "")[:60])))
        except Exception as e:
            fails.append(("card-dead", "instagram %s does not resolve (%s) - a post must never "
                          "carry a dead embed" % (icode, e)))
    for m in re.finditer(r"\[apple:song:(\d+)", body):
        sid = m.group(1)
        try:
            req = urllib.request.Request("https://itunes.apple.com/lookup?id=%s&country=us" % sid,
                                         headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=25) as r:
                d = json.loads(r.read().decode("utf-8", "replace"))
            res = (d.get("results") or [{}])[0]
            info.append(("card", "apple %s -> %s | %s" % (sid, res.get("artistName"),
                                                          res.get("collectionName") or res.get("trackName"))))
        except Exception as e:
            fails.append(("card-dead", "apple %s does not resolve (%s)" % (sid, e)))
    # Album cards were never checked until 23.09: the loop above only matched [apple:song:…],
    # so a dead [apple:album:…] would have gone to the desk unverified.
    for m in re.finditer(r"\[apple:album:(\d+)", body):
        aid = m.group(1)
        try:
            req = urllib.request.Request("https://itunes.apple.com/lookup?id=%s&country=us" % aid,
                                         headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=25) as r:
                d = json.loads(r.read().decode("utf-8", "replace"))
            res = (d.get("results") or [{}])[0]
            info.append(("card", "apple album %s -> %s | %s" % (aid, res.get("artistName"),
                                                                res.get("collectionName"))))
        except Exception as e:
            fails.append(("card-dead", "apple album %s does not resolve (%s)" % (aid, e)))
    # The cover image was never fetched until 24.09. Owner: "ты что не поменял обложки как я
    # просил у релизов на фото ЛЮДЕЙ" - both release covers had been swapped, and both were
    # dead: the upload API strips the slash from "photos/name.jpg", so the blob landed at
    # photos/photos-name.jpg while the desk pointed at photos/name.jpg. Every card check below
    # covers body carriers only, so nothing said a word and the site would have served a broken
    # cover. A cover is a card too, and it is the one the reader sees first.
    covsrc = ((p.get("cover") or {}).get("src") or "").strip()
    if covsrc and not covsrc.startswith("data:"):
        url = covsrc if covsrc.startswith("http") else PROD + "/" + covsrc.lstrip("/")
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"}, method="HEAD")
            with urllib.request.urlopen(req, timeout=25) as r:
                if r.status != 200:
                    fails.append(("cover-dead", "cover %s serves %s" % (url, r.status)))
                else:
                    info.append(("card", "cover %s -> 200, %s bytes"
                                 % (covsrc, r.headers.get("Content-Length"))))
        except Exception as e:
            fails.append(("cover-dead", "cover %s does not load (%s) - upload the blob under the "
                          "name the desk points at (the API strips '/', so pass the basename only)"
                          % (url, e)))

    for m in re.finditer(r"\[photo:([^|\]]+)", body):
        src = PROD + "/" + m.group(1).lstrip("/")
        try:
            req = urllib.request.Request(src, headers={"User-Agent": "Mozilla/5.0"}, method="HEAD")
            with urllib.request.urlopen(req, timeout=25) as r:
                if r.status != 200:
                    fails.append(("card-dead", "photo %s serves %s" % (src, r.status)))
                else:
                    info.append(("card", "photo %s -> 200, %s bytes" % (m.group(1), r.headers.get("Content-Length"))))
        except Exception as e:
            fails.append(("card-dead", "photo %s does not load (%s)" % (src, e)))

    # every credit link the reader can click, including the cover's
    cov = p.get("cover") or {}
    credit_url_check("cover", cov.get("creditUrl"), fails, warns, info)
    for m in re.finditer(r"\[photo:([^\]]*)\]", body):
        parts = m.group(1).split("|")
        if len(parts) > 2:
            credit_url_check("photo %s" % parts[0].strip(), parts[2].strip(), fails, warns, info)
    return fails, warns, info


def check_post(p, strict):
    """Returns (fails, warns, info). Each item is (code, message)."""
    fails, warns, info = [], [], []
    body = p.get("body") or ""
    paras = paragraphs(body)
    media = [t.strip() for t in paras if is_media(t)]

    # --- structure -----------------------------------------------------------
    pairs = [(i, paras[i][:28], paras[i + 1][:28]) for i in range(len(paras) - 1)
             if is_media(paras[i]) and is_media(paras[i + 1])]
    for i, a, b in pairs:
        fails.append(("media-pair", "paragraphs %d+%d are two carriers in a row (%s / %s)" % (i, i + 1, a, b)))

    for i in range(len(paras) - 1):
        if is_media(paras[i + 1]) and not is_media(paras[i]):
            w = len(paras[i].split())
            # Two carriers of the same kind around one statement is not a defect by itself, but the
            # owner's 24.09 note ("достаточно одной песни, нахера тут альбом целый") is the ruling:
            # one song card beats an album card unless the post is about the album, so the pair is
            # printed with the markers it found.
            if i + 2 < len(paras) and is_media(paras[i + 2]) and not is_media(paras[i + 1]):
                pair = []
                for q in (paras[i], paras[i + 2]):
                    pair.append(" ".join(re.findall(r"\[[a-z]+:[^\]]+\]", q)) or "text")
                info.append(("carriers-around", "carriers %d and %d come from one statement: %s"
                             % (i + 1, i + 3, " / ".join(pair))))
            if w < LEAD_MIN_WORDS:
                # Owner, 23.09: "какая разница 96 или 100 слов? ты же топчешься на месте". He is
                # right - the floor is a house guideline for how much text sits before an image,
                # not a reader problem, and as a FAIL it caused a loop of pointless edits.
                warns.append(("thin-leadin", "%d words in paragraph %d before the carrier at %d "
                              "(guideline %d, not a defect)" % (w, i, i + 1, LEAD_MIN_WORDS)))
    info.append(("carriers", "%d total, %d photo, %d youtube, %d apple, %d tiktok, %d instagram"
                 % (len(media), sum(m.lower().startswith("[photo") for m in media),
                    sum(m.lower().startswith("[youtube") for m in media),
                    sum(m.lower().startswith("[apple") for m in media),
                    sum(m.lower().startswith("[tiktok") for m in media),
                    sum(m.lower().startswith("[ig") for m in media))))

    # Owner 24.09, twice in one pass: "МЕДИА СЛИШКОМ БЛИЗКО К КОНЦУ" (Taylor) and "альбом
    # надо ВСУНУТЬ на абзац выше" (Feid). A carrier with one paragraph after it is a picture
    # dropped next to the end; the post is supposed to close on text. Two paragraphs is the
    # floor, and on the long read a late carrier can still be deliberate, so it warns there.
    for i, q in enumerate(paras):
        if not is_media(q):
            continue
        # A ticket CTA is intentionally allowed immediately before the closing
        # paragraph. It is an action after the story has made its case, not
        # editorial media that needs two paragraphs of prose beneath it.
        if q.strip().lower().startswith("[tickets:"):
            continue
        after = len(paras) - 1 - i
        if after < 2:
            (warns if len(prose_of(body).split()) > 900 else fails).append(
                ("media-late", "carrier in paragraph %d has %d text paragraph(s) after it - "
                 "move it up so the post closes on text" % (i, after)))

    # --- paragraph blocks (owner 23.09: a paragraph is a block, never a fragment) --
    # The 80-word floor, the wall run and the finale floor were all measured on the longread.
    # News and release posts are the short formats on purpose (owner: "упор на новости короткие,
    # релизы чуть длиннее"), so on them the floor is the fragment line, not the longread band.
    long_form = len(prose_of(body).split()) > 900
    floor = 80 if long_form else 40
    awards_depth = False
    for i, q in enumerate(paras):
        if q.strip().lower() == "[awards]":
            awards_depth = True
            continue
        if q.strip().lower() == "[/awards]":
            awards_depth = False
            continue
        if is_media(q) or awards_depth:
            continue
        w = len(q.split())
        sents = len(sentences(q))
        if w < floor:
            warns.append(("short-paragraph", "paragraph %d is %d words - a fragment, merge it or grow it: %r"
                          % (i, w, q[:60])))
        if w > 200:
            warns.append(("slab-paragraph", "paragraph %d is %d words - a slab, consider splitting it evenly: %r"
                          % (i, w, q[:60])))
        if sents <= 1:
            warns.append(("one-sentence-paragraph", "paragraph %d is a single sentence: %r" % (i, q[:60])))
    # The real editorial defect is not an individual long paragraph: it is a RUN of long
    # paragraphs with no carrier between them, which reads as a wall before the reader has
    # committed. A single 190-word paragraph that ends by handing off to its own photo or
    # clip is working, not bloated.
    run, run_start = 0, 0
    awards_depth = False
    for i, q in enumerate(paras):
        if q.strip().lower() == "[awards]":
            awards_depth = True
            if run > WALL_RUN_WORDS and long_form:
                warns.append(("text-wall", "paragraphs %d-%d total %d words with no carrier between them"
                              % (run_start, i - 1, run)))
            run = 0
            continue
        if q.strip().lower() == "[/awards]":
            awards_depth = False
            continue
        if awards_depth:
            continue
        if is_media(q):
            if run > WALL_RUN_WORDS and long_form:
                warns.append(("text-wall", "paragraphs %d-%d total %d words with no carrier between them"
                              % (run_start, i - 1, run)))
            run = 0
        else:
            if run == 0:
                run_start = i
            run += len(q.split())
    if run > WALL_RUN_WORDS and long_form:
        warns.append(("text-wall", "paragraphs %d-%d total %d words to the end with no carrier"
                      % (run_start, len(paras) - 1, run)))

    # the finale only has to avoid being a dangling fragment; two even paragraphs are fine
    if long_form and len(paras) > 1 and not is_media(paras[-1]) and len(paras[-1].split()) < 80:
        warns.append(("thin-finale", "the closing paragraph is %d words - too thin to end on"
                      % len(paras[-1].split())))

    # --- credits -------------------------------------------------------------
    for m in re.finditer(r"\[photo:([^\]]*)\]", body):
        parts = m.group(1).split("|")
        cap = parts[1].strip() if len(parts) > 1 else ""
        url = parts[2].strip() if len(parts) > 2 else ""
        credit_pair("photo %s" % parts[0].strip(), cap, url, fails, warns)
    # the cover is a credit too, and it is the one the reader sees first
    cov = p.get("cover") or {}
    if cov and (cov.get("kind") or "img") == "img":
        credit_pair("cover", cov.get("credit"), cov.get("creditUrl"), fails, warns)

    # --- teaser / lede -------------------------------------------------------
    ex = (p.get("excerpt") or "").strip()
    if ex and ex not in body:
        fails.append(("teaser", "excerpt is not a literal substring of the body"))
    if ex and paras and not paras[0].startswith(ex.split(".")[0][:40]):
        warns.append(("teaser-place", "excerpt does not look like the opening of paragraph 0"))
    # Owner 24.09, both ends of one defect, both on the same batch:
    #   "почему тут у нас ТАКОЙ длинный тизер?"  (the Feid card carried 63 words)
    #   "это СЛИШКОМ коротко, мы же так не делаем..."  (the KAROL G card carried 9)
    # The card teaser is the first thing a reader sees on the feed, so it gets a band:
    # hard at the absurd ends, a nudge outside the house band. Every other post in the
    # desk sits between 18 and 36 words, so the floor of the nudge is set at 18.
    if ex:
        ew = len(ex.split())
        if ew < 15 or ew > 55:
            fails.append(("teaser-length", "the card teaser is %d words long (15-55 is workable, "
                          "22-40 is the house band)" % ew))
        elif ew < 18 or ew > 45:
            warns.append(("teaser-length", "the card teaser is %d words long (house band 22-40)" % ew))

    # --- house style, prose only --------------------------------------------
    prose = prose_of(body)
    proselow = prose.lower()

    # owner note 23.09: the semicolon is not a hard ban. It irritates him, so it is
    # a warning to look at, not something that blocks a post or forces an edit.
    semi = prose.count(";")
    if semi:
        warns.append(("semicolon", "%d semicolon(s) in prose - usually a packed list, splitting reads better, but it is allowed when it really helps" % semi))

    colons = prose.count(":")
    if colons > COLON_FAIL:
        fails.append(("colons", "%d colons in prose (norm 2-4, ceiling %d)" % (colons, COLON_FAIL)))
    elif colons > 4:
        warns.append(("colons", "%d colons in prose, at the top of the norm" % colons))

    for dash in ("—", "–"):
        for m in re.finditer(re.escape(dash), prose):
            around = prose[max(0, m.start() - 60):m.start() + 60].replace("\n", " ")
            quoted = around.count('"') % 2 == 1
            (warns if quoted else fails).append(
                ("dash", ("inside a quote: " if quoted else "") + "…%s…" % around.strip()))

    for m in re.finditer(VAGUE_TIME, proselow):
        fails.append(("vague-time", "vague time expression %r - use the exact date or drop it" % m.group(0)))
    for m in re.finditer(r"\bjust\b", proselow):
        warns.append(("just", "…%s…" % prose[max(0, m.start() - 50):m.start() + 50].replace("\n", " ").strip()))

    for si in sentences(prose):
        n = len(re.findall(NEG, si, re.I))
        if n >= NEG_SENT_FAIL:
            fails.append(("negation-cluster", "%d negations in one sentence: %s" % (n, si[:110])))
    total_neg = len(re.findall(NEG, proselow))
    if total_neg > len(prose.split()) * 0.02:
        warns.append(("negation-rate", "%d negation words, %.1f%% of the body"
                      % (total_neg, 100.0 * total_neg / max(1, len(prose.split())))))

    # --- superlatives --------------------------------------------------------
    for si in sentences(prose):
        m = SUPER_RE.search(si)
        if not m:
            continue
        low = si.lower()
        if any(k in low for k in SUPERLATIVE_ALLOW):
            continue
        fails.append(("superlative", "unsourced superlative %r in: %s" % (m.group(0), si[:120])))

    # --- fog: can a reader decode every phrase in one pass? ------------------
    ff, fw, fi = fog_scan(p)
    fails += ff
    warns += fw
    info += fi

    # --- false irregular forms ----------------------------------------------
    for si in sentences(prose):
        for w in re.findall(r"[A-Za-z']+", si):
            if w.lower() in FALSE_FORMS:
                fails.append(("false-form", "%r is not an English word form: %s" % (w, si[:110])))

    # --- decoration: similes and personified objects (owner 23.09) ----------
    # Owner: "Пиши текст проще без передумываний ... без сложных метафор и твоих переплетений".
    # Beauty in this house style is precision, not ornament. Every "like a …", "as if …" and
    # "reads/sounds/behaves like …" is printed for a plain rewrite; the figure is only kept when
    # it says something the plain words cannot.
    similes = []
    for s in sentences(prose):
        # "sounds like" is dropped from the list on purpose (calibrated 23.09): in music writing it
        # is almost always literal ("what she sounds like", "nothing on it sounds like a member
        # filling in"), so it produced two false positives out of five. A check that cries wolf
        # gets ignored, and that is worse than not having it.
        m = re.search(r"\b(?:like (?:a|an|the|someone|somebody)|as if|as though|behaves like|behaved like|reads like|looked like|felt like)\b", s, re.I)
        if m:
            similes.append((m.group(0), s.strip()))
    # Balance, not a ban (owner 23.09): "Нужен баланс во всем, где можно то можно закрутить игру
    # слов, но не перебарщивать". So a figure is allowed where it works - the check only reports
    # the density against a budget of roughly one in every 800 words, worst offenders first.
    budget = max(1, len(prose.split()) // 800)
    info.append(("similes", "%d similes in %d words (budget about %d) - keep the ones that carry a fact, "
                 "plain-rewrite the decoration" % (len(similes), len(prose.split()), budget)))
    if len(similes) > budget:
        warns.append(("simile-budget", "%d similes against a budget of about %d "
                      "- this is the 'перебарщивать' line" % (len(similes), budget)))
    for tok, s in similes[:6]:
        warns.append(("simile", "%r: %s" % (tok, s[:130])))

    # --- register: banned corporate words and nominalisation density --------
    prose_low = prose.lower()
    for term, why in REGISTER_BANNED.items():
        for m in re.finditer(r"\b" + re.escape(term) + r"\b", prose_low):
            ctx = prose[max(0, m.start() - 60):m.start() + 60].replace("\n", " ").strip()
            fails.append(("register-term", "%r - %s: …%s…" % (m.group(0), why, ctx)))
    # several abstract nouns in one sentence is how the verb disappears; worst first, capped, so
    # the check stays a short list instead of a wall
    dense = []
    for s in sentences(prose):
        hits = [h.lower() for h in NOMINAL.findall(s)]
        if len(hits) >= NOMINAL_WARN:
            dense.append((len(hits), s.strip(), sorted(set(hits))))
    dense.sort(key=lambda x: -x[0])
    info.append(("nominal", "%d sentences carry %d+ abstract nouns - each one is where a verb went missing"
                 % (len(dense), NOMINAL_WARN)))
    for n, s, hits in dense[:6]:
        warns.append(("abstract-density", "%d abstract nouns (%s): %s" % (n, ", ".join(hits), s[:120])))

    # --- every date must be registered with its fact ------------------------
    # A bare year inside quotes is part of a title, not a date: the GTA live post failed on
    # 23.09 with date-unregistered '2000' because of the song "Macacoa 2000". Titles are
    # skipped, real dates are not ("since 1998" stays a date).
    qspans = [(m.start(), m.end()) for m in re.finditer(r'"[^"]*"', prose)]
    date_toks, date_pos = [], []
    for m in DATE_TOKEN.finditer(prose):
        tok = re.sub(r"\s+", " ", m.group(0)).strip()
        # Bare lowercase "may" is usually a modal verb, not the month of May.
        # Month names in house style are capitalized. Keep May 7 / May 2026 intact.
        if m.group(0) == "may":
            continue
        if re.fullmatch(r"(?:19|20)\d{2}", tok) and any(m.start() >= a and m.end() <= b for a, b in qspans):
            continue
        date_toks.append(tok)
        date_pos.append(m.start())
    kept = []
    for t, pos in zip(date_toks, date_pos):
        if re.fullmatch(r"(?:19|20)\d{2}", t) and re.search(r"\bthe\s+$", prose[max(0, pos - 6):pos], re.I):
            continue   # "The 1975" is a band, not a date
        kept.append(t)
    skips = len(date_toks) - len(kept)
    date_toks = kept
    unreg = [t for t in date_toks if t.lower() not in VERIFIED_DATES and t.lower().rstrip("s") not in VERIFIED_DATES]
    for t in unreg:
        around = prose[max(0, prose.find(t) - 60):prose.find(t) + 60].replace("\n", " ").strip()
        fails.append(("date-unregistered", "%r is not in VERIFIED_DATES - register it with the fact it stands for, "
                      "or drop it: …%s…" % (t, around)))
    info.append(("dates", "%d/%d date tokens registered in VERIFIED_DATES%s (%d name-like years skipped)"
                 % (len(date_toks) - len(unreg), len(date_toks),
                    " (" + ", ".join(sorted(set(date_toks))) + ")", skips)))

    # --- official capitalization (owner 23.09: "у них КАПСОМ ИМЕНА ПИШУТСЯ") --------------
    # Official spelling of the four BLACKPINK members is all caps: JISOO, JENNIE, ROSÉ, LISA.
    # Only enforced on posts that mention the group, so ordinary words cannot trip it.
    if "blackpink" in prose.lower() or "blackpink" in (p.get("artist") or "").lower():
        for wrong, right in (("Jennie", "JENNIE"), ("Lisa", "LISA"), ("Jisoo", "JISOO"), ("Rosé", "ROSÉ")):
            if re.search(r"\b%s\b" % re.escape(wrong), body):
                fails.append(("official-caps", "write %s, not %s (official BLACKPINK spelling)"
                              % (right, wrong)))

    # --- missing qualifier (owner 23.09: "all 4 are busy at once? а когда они были
    # группой они не были заняты??") ---------------------------------------------
    # "all four are busy at once" reads as false unless it says with WHAT: as a group they
    # were always busy together. The claim only makes sense with 'their own' / 'solo'.
    for s in sentences(prose):
        if re.search(r"\ball four\b[^.]*\bbusy\b", s) and not re.search(r"\b(own|solo|separate|respective)\b", s, re.I):
            fails.append(("missing-qualifier", "'all four are busy' needs 'with their own' / 'solo' "
                          "- otherwise it reads as false: %r" % s[:110]))

    # --- first-claims and absence-claims: printed for a source check --------
    firsts = [s for s in sentences(prose) if FIRST_CLAIM.search(s)
              and not any(a.lower() in s.lower() for a in approved_lines(p))]
    absences = [s for s in sentences(prose) if ABSENCE_CLAIM.search(s)]
    info.append(("claims", "%d 'first/only' claims and %d claims of absence - each needs a source, not a reading"
                 % (len(firsts), len(absences))))
    for s in firsts[:8]:
        info.append(("first-claim", s.strip()[:150]))
    for s in absences[:8]:
        info.append(("absence-claim", s.strip()[:150]))
    uniques = [s for s in sentences(prose) if UNIQUE_PERIOD.search(s)]
    if uniques:
        info.append(("unique-period", "uniqueness over a calendar period - verify against every same-period event:"))
        for s in uniques:
            info.append(("unique-period", s.strip()[:150]))

    # --- the same assertion twice in different paragraphs --------------------
    def bag(s):
        w = [x for x in re.findall(r"[a-z']+", s.lower())
             if len(x) > 3 and x not in ("that", "this", "with", "they", "their", "hers", "were", "been",
                                         "have", "into", "from", "than", "then", "over", "when", "what")]
        return set(w)
    sents = [(i, s) for i, q in enumerate(paragraphs(prose))
             for s in sentences(q) if len(s.split()) >= 8]
    for a in range(len(sents)):
        for b in range(a + 1, len(sents)):
            if sents[a][0] == sents[b][0]:
                continue
            ba, bb = bag(sents[a][1]), bag(sents[b][1])
            if not ba or not bb:
                continue
            inter = len(ba & bb)
            j = inter / float(len(ba | bb))
            # Calibrated on this text (23.09): at 0.55 the check was silent, at 0.30 with four
            # shared content words it finds the real duplicate and nothing else. Thresholds are
            # tuned against a known case, not guessed.
            if j >= 0.30 and inter >= 4:
                if any(k in sents[b][1] for k in CLAIM_DUP_ALLOW):
                    continue
                warns.append(("claim-dup", "the same assertion appears in paragraphs %d and %d (%d shared words): %s"
                              % (sents[a][0], sents[b][0], inter, sents[a][1].strip()[:90])))

    # --- time deltas and referents: printed, not judged ----------------------
    deltas = [s.strip() for s in sentences(prose) if TIME_DELTA.search(s)]
    refs = [s.strip() for s in sentences(prose) if REFERENT.search(s)
            and not any(a.lower() in s.lower() for a in approved_lines(p))]
    for s in deltas:
        info.append(("time-delta", "check the arithmetic against the release dates: %s" % s[:150]))
    for s in refs:
        info.append(("referent", "'the …' points at something - make sure it is named earlier: %s" % s[:150]))
    info.append(("eyeball", "%d time deltas + %d referents + the quote/number list below are the manual pass; "
                 "everything above it is machine" % (len(deltas), len(refs))))

    # --- tautology inside one sentence --------------------------------------
    # Owner 23.09: "the tour, built entirely for stadiums, ran from a stadium outside Seoul".
    # One repeated word is not a 4-gram, so the echo check never saw it. Parallelism is not a
    # defect ("the first to play it, the first to headline it"), so only 3+ repeats of any word
    # fail, and a repeat of two fails only for nouns where it is never a deliberate echo.
    appr_low = [a.lower() for a in approved_lines(p)]
    for si in sentences(prose):
        # an approved line is quoted verbatim and cannot be rewritten (a quote repeated a word
        # because that is what the person said)
        if any(a in si.lower() for a in appr_low):
            continue
        words = re.findall(r"[A-Za-z][A-Za-z'\u2019-]*", si.lower())
        seen = {}
        for w in words:
            if len(w) < 4:
                continue
            stem = re.sub(r"(?:ies|es|s)$", "", w)
            if len(stem) < 4:
                stem = w
            seen.setdefault(stem, []).append(w)
        for stem, forms in seen.items():
            n = len(forms)
            if n < 2:
                continue
            if n < 3 and stem not in TAUT_NOUNS:
                continue
            msg = "%r repeats %d times in one sentence: %s" % (stem, n, si[:130])
            (fails if n > 2 else warns).append(("tautology", msg))

    # --- quotes need attribution -------------------------------------------
    # Structured [awards] data contains song titles, not attributed speech.
    # Only journalistic prose participates in quote-attribution checks.
    for para in paragraphs(prose):
        for q in quoted_spans(para):
            if len(q) < 18:
                continue
            # A quoted song or album title is not a quote (owner's own words: every title is
            # written the way the artist spells it, so titles sit in quotes all over this desk).
            # Title case, no terminal punctuation and no speech verb -> title, not speech.
            if any(c in para.lower() for c in TITLE_CUES) and len(q.split()) <= 9:
                warns.append(("quote-title", "short quote next to a title cue: %r" % q[:70]))
                continue
            qt = q.strip().rstrip(",")
            if TITLEISH.match(qt) and not qt.endswith((".", "!", "?")):
                warns.append(("quote-title", "looks like a title, not a quote: %r" % q[:70]))
                continue
            if not any(a in para.lower() for a in ATTRIB):
                fails.append(("quote-unattributed", "quoted text with no attribution: %r" % q[:70]))

    # --- echo ---------------------------------------------------------------
    twins = []
    low = re.sub(r"[^a-z0-9' ]", " ", proselow)
    ws = low.split()
    grams = {}
    for i in range(len(ws) - 3):
        grams.setdefault(" ".join(ws[i:i + 4]), []).append(i)
    for g, pos in sorted(grams.items(), key=lambda kv: -len(kv[1])):
        if len(pos) >= ECHO_FAIL:
            fails.append(("echo", "4-gram %r repeats %d times" % (g, len(pos))))
        elif len(pos) == 2:
            twins.append(g)
    if twins:
        warns.append(("echo", "%d 4-grams repeat twice (callbacks are fine, check the list): %s"
                      % (len(twins), "; ".join(twins[:6]) + (" …" if len(twins) > 6 else ""))))

    for a, b in zip(paragraphs(body), paragraphs(body)[1:]):
        if len(a.split()) > 6 and a[:40].lower() == b[:40].lower():
            warns.append(("dup-open", "two paragraphs open the same way: %r" % a[:40]))

    # --- numbers ------------------------------------------------------------
    nums = re.findall(r"\b\d[\d.,]*\s?(?:%|bn|m|k|million|billion|thousand)?\b", prose)
    if len(nums) > NUM_DENSITY_FAIL:
        fails.append(("numbers", "%d numeric tokens in the body (ceiling %d)" % (len(nums), NUM_DENSITY_FAIL)))
    info.append(("numbers", "%d numeric tokens" % len(nums)))
    # two numbers on purpose: publishing scripts count every word of the body, this line counts
    # prose only (markers, urls and captions stripped). They differ by about 30 and the mismatch
    # used to look like a lost paragraph.
    info.append(("length", "%d words in the body (%d in prose), %d paragraphs"
                 % (len(body.split()), len(prose.split()), len(paras))))

    # --- publication state --------------------------------------------------
    st = p.get("status") or "live"
    at = p.get("publishAt")
    at_ts = None
    if at:
        try:
            at_ts = time.mktime(time.strptime(at[:19], "%Y-%m-%dT%H:%M:%S")) - time.timezone
        except Exception:
            at_ts = None
    if st == "scheduled" and at_ts is not None and at_ts <= time.time() + 6 * 3600:
        fails.append(("auto-publish", "status scheduled and publishAt %s is within 6h - the desk promotes it to live by itself; "
                                      "either publish deliberately or move the date" % at))
    if st == "live" and at_ts is not None and at_ts > time.time() + 600:
        warns.append(("future-publishAt", "live post with publishAt %s in the future (sorting only)" % at))
    info.append(("state", "status=%s publishAt=%s date=%s pinned=%s" % (st, at, p.get("date"), p.get("pinned"))))

    if CHECK_IDS:
        cf, cw, ci = ids_check(p)
        fails += cf
        warns += cw
        info += ci

    af, ai = approved_check(p)
    fails += af
    info += ai
    return fails, warns, info


def render_check(url):
    """Live page: does it actually serve the article, photos, credits, embeds."""
    fails, warns, info = [], [], []
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=45) as r:
            html = r.read().decode("utf-8", "replace")
            code = r.status
    except Exception as e:
        return [("render", "page did not load: %s" % e)], [], []
    if code != 200:
        fails.append(("render", "HTTP %s" % code))
    if "<title>" not in html:
        fails.append(("render", "no title tag"))
    arrow = re.search(r'"id"\s*:\s*"[^"]+"', html)
    info.append(("render", "%d bytes served, title present=%s" % (len(html), "<title>" in html)))
    return fails, warns, info


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--post", help="post id to report in full")
    ap.add_argument("--all", action="store_true", help="scan every post")
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--delta", action="store_true", help="only paragraphs changed since the last run")
    ap.add_argument("--render", help="live article URL to verify after publishing")
    ap.add_argument("--ids", action="store_true", help="resolve every photo/youtube/apple card (network)")
    args = ap.parse_args()
    global CHECK_IDS
    CHECK_IDS = bool(args.ids)

    desk = fetch("/api/desk?nocache=%d" % time.time())
    posts = desk["posts"]
    state = {}
    if os.path.exists(STATE):
        try:
            state = json.load(open(STATE, encoding="utf-8"))
        except Exception:
            state = {}

    prev_posts = state.get("posts", {})
    changed_other = [p["id"] for p in posts
                     if p["id"] in prev_posts and prev_posts[p["id"]] != sha(p)]

    targets = posts if args.all or not args.post else [p for p in posts if p.get("id") == args.post]
    if not targets:
        print("no such post: %s" % args.post)
        return 2

    worst = 0
    report = []
    for p in targets:
        pid = p.get("id")
        fails, warns, info = check_post(p, strict=bool(args.post))

        if args.delta and pid in prev_posts:
            old = json.loads(prev_posts[pid]) if prev_posts[pid].startswith("{") else None  # legacy
        paras = paragraphs(p.get("body") or "")
        hashes = {str(i): sha(q) for i, q in enumerate(paras)}
        old_hashes = state.get("paragraphs", {}).get(pid)
        if args.delta:
            if old_hashes is None:
                warns.append(("delta", "no previous gate run recorded, this is the baseline"))
            elif old_hashes == hashes:
                info.append(("delta", "no paragraph changed since the last gate run (text is frozen)"))
            else:
                moved = [i for i in hashes if old_hashes.get(i) != hashes[i]]
                warns.append(("delta", "paragraphs changed since the last run: %s" % ", ".join(moved[:20])))
        state.setdefault("paragraphs", {})[pid] = hashes

        if not (args.all or args.post):
            pass
        report.append({"id": pid, "title": (p.get("title") or "")[:60], "fails": fails,
                       "warns": warns, "info": info, "status": p.get("status")})
        worst = max(worst, 1 if fails else 0)

    if args.render:
        f, w, i = render_check(args.render)
        target = report[0] if report else {"id": "-", "title": "-", "fails": [], "warns": [], "info": []}
        target["fails"] += f
        target["warns"] += w
        target["info"] += i
        if f and not args.post and not args.all:
            worst = 1
        if f:
            worst = 1

    state["posts"] = {p["id"]: sha(p) for p in posts}
    try:
        json.dump(state, open(STATE, "w", encoding="utf-8"))
    except Exception:
        pass

    if changed_other and (args.post or args.all):
        print("NOTE other posts changed since the last gate run: %s" % ", ".join(changed_other))

    if args.json:
        print(json.dumps({"report": report, "changed_other": changed_other}, ensure_ascii=False, indent=2))
        return worst

    for r in report:
        head = "%-14s %s" % (r["id"], r["title"])
        if args.post or args.all or r["fails"]:
            print(head)
            for c, m in r["info"]:
                print("   --  %-16s %s" % (c, m))
            for c, m in r["warns"]:
                print("   !   %-16s %s" % (c, m))
            for c, m in r["fails"]:
                print("   X   %-16s %s" % (c, m))
            if not r["fails"]:
                print("   ok  gate clean")
            if args.post:
                print("   ==  manual pass (facts only, one read)")
                for line in manual_checklist(next(p for p in posts if p["id"] == r["id"])):
                    print("       " + line)
    print("\n%s" % ("FAIL - fix the X lines, then run again" if worst else "PASS - gate clean"))
    return worst


if __name__ == "__main__":
    sys.exit(main())
