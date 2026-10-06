#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Human-quality barrier for music98 editorial work.

This script is deliberately narrower than gate.py and preflight.py.
It blocks reader-facing defects that can survive factual and payload checks:
AI/PR phrasing, research-note leakage, list-like prose, recap endings,
administrative endings, and mechanical name rhythm.

Existing edits require two content-hashed stamps:
PRE_EDIT proves the exact source was read before editing.
POST_EDIT proves the exact final body was reread after the last edit.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

PROD = "https://music98.news"
STATE = Path(os.environ.get(
    "MUSIC98_EDITORIAL_STATE",
    os.path.join(os.environ.get("TEMP", "/tmp"), "music98-editorial-readthrough.json"),
))

MEDIA = re.compile(r"^\[(?:photo|youtube|apple|instagram|ig|tiktok|tickets):[^\]]+\]$", re.I)
SENT_SPLIT = re.compile(r"(?<=[.!?])(?:[\"'’”])?\s+(?=[A-Z0-9\"'“])")
MONTH = r"(?:January|February|March|April|May|June|July|August|September|October|November|December)"
MONTH_DATE = re.compile(rf"\b{MONTH}\s+\d{{1,2}}\b", re.I)
SCHEDULE_RUN = re.compile(
    rf"\b{MONTH}\s+\d{{1,2}}\s*,\s*\d{{1,2}}(?:\s*,\s*\d{{1,2}}|\s+and\s+\d{{1,2}})+",
    re.I,
)
TECH_CREDIT = re.compile(
    r"\b(?:produced|co-produced|engineered|mixed|mastered)\s+by\b|"
    r"\b(?:producer|engineer|mixer|mastering engineer)\b",
    re.I,
)
PHYSICAL = re.compile(
    r"\b(?:CD|vinyl|cassette|LP|2LP|pressing|physical edition|physical copy|"
    r"poster|insert|color variant|colou?r variant|gatefold)\b",
    re.I,
)
SOURCE_PROOF = re.compile(
    r"\b(?:Apple Music|Spotify|Sony|RCA|Warner|official store|official website|release material)\s+"
    r"(?:lists?|shows?|states?|describes?|says?)\b",
    re.I,
)
VENUE_WORD = re.compile(
    r"\b(?:Hall|Theatre|Theater|Arena|Stadium|Auditorium|Pavilion|Amphitheatre|"
    r"Amphitheater|Ballroom|Forum|Bowl|Centre|Center)\b",
)
HTML_GARBAGE = re.compile(r"(?:&#(?:x[0-9a-f]+|\d+);|&nbsp;|&amp;\s*$)", re.I)
LITERAL_ESCAPE = re.compile(r"\\[nrt]")

GUEST_SHORT_FORMS = {
    "Dua Lipa": ("Dua", "Lipa"),
    "Bruno Mars": ("Bruno", "Mars"),
    "Taylor Swift": ("Taylor", "Swift"),
    "Ella Langley": ("Ella", "Langley"),
}

OBVIOUS_EXPLAINER = re.compile(
    r"^(?:Therefore|Thus|This means|That means|In other words|Anyone buying|"
    r"That gives|This gives|It matters because|The point is)\b",
    re.I,
)

# These are not merely banned words. They are recurring sentence shapes that
# explain the copy, summarize it, or reproduce PR language instead of reporting.
AI_PR_PATTERNS = (
    (re.compile(r"\bthe result (?:is|was|becomes?)\b", re.I),
     "generic 'the result is' bridge"),
    (re.compile(r"\b(?:this|that|those) (?:makes?|made) (?:the |that |this )?"
                r"(?:change|range|shift|point|difference|connection|jump) clear\b", re.I),
     "sentence explains what the previous facts supposedly make clear"),
    (re.compile(r"\b(?:already )?(?:tells?|shows?) (?:the|that|this) story\b", re.I),
     "sentence tells the reader that the prose already tells the story"),
    (re.compile(r"\bdoes not need\b.{0,80}\bspelled out\b", re.I),
     "meta sentence explains why details were omitted"),
    (re.compile(r"\b(?:natural|clear) bridge\b", re.I),
     "generic bridge metaphor"),
    (re.compile(r"\bremains part of the context\b", re.I),
     "generic recap language"),
    (re.compile(r"\b(?:new|next) (?:chapter|phase|era|direction)\b", re.I),
     "generic PR abstraction"),
    (re.compile(r"\bmoving forward\b", re.I),
     "generic PR abstraction"),
    (re.compile(r"\b(?:broader|more expansive|polished) (?:sound|version|direction|approach)\b", re.I),
     "generic PR description"),
    (re.compile(r"\bstandout bookings?\b", re.I),
     "press-release/ticketing language"),
    (re.compile(r"\bofficial (?:tour|ticket|sale) channels?\b", re.I),
     "administrative ticketing language"),
    (re.compile(r"\bartist presales?\b", re.I),
     "platform ticketing jargon"),
    (re.compile(r"\bannounced (?:run|dates|shows)\b", re.I),
     "press-release routing language"),
    (re.compile(r"\b(?:works?|serves?) as (?:one )?part of\b", re.I),
     "generic explanatory bridge"),
    (re.compile(r"\bcatches?\b.{0,90}\bat a point where\b", re.I),
     "canned retrospective closer"),
    (re.compile(r"\badds? another layer\b", re.I),
     "canned transition"),
    (re.compile(r"\bthe idea (?:also )?sits behind\b", re.I),
     "canned transition"),
)

ENDING_ADMIN = re.compile(
    r"\b(?:presales?|general sale|tickets?|track(?:s|list)?|deluxe|extended|expanded|"
    r"bonus tracks?|vinyl|CD|cassette|physical edition|shipping|pre-?order)\b",
    re.I,
)
ENDING_RECAP = (
    re.compile(r"\bdoes not (?:try|attempt) to\b", re.I),
    re.compile(r"\bthe past (?:remains|is still) visible\b", re.I),
    re.compile(r"\bthe interruption remains\b", re.I),
    re.compile(r"\bat a point where\b", re.I),
    re.compile(r"\b(?:new|next) (?:chapter|phase|era|direction)\b", re.I),
    re.compile(r"\bmoving forward\b", re.I),
    re.compile(r"\bwhat (?:comes|happens) next\b", re.I),
    re.compile(r"\bwhat (?:he|she|they) (?:is|are) doing next\b", re.I),
)

WAIVER_CHOICES = {"technical-credit", "physical-format", "source-attribution", "single-sentence"}


def body_hash(body: str) -> str:
    return hashlib.sha256(body.encode("utf-8")).hexdigest()


def words(s: str) -> int:
    return len(re.findall(r"\b[\w'’-]+\b", s))


def prose_paragraphs(body: str):
    return [p.strip() for p in body.split("\n\n") if p.strip() and not MEDIA.fullmatch(p.strip())]


def sentences(p: str):
    return [x.strip() for x in SENT_SPLIT.split(p.strip()) if x.strip()]


def quoted_titles(s: str):
    return re.findall(r'[\"“]([^\"”]{2,80})[\"”]', s)


def load_remote(pid: str):
    key = (os.environ.get("MUSIC98_KEY") or os.environ.get("ADMIN_PASSWORD") or "").strip()
    headers = {"Accept": "application/json", "User-Agent": "Mozilla/5.0", "Cache-Control": "no-cache"}
    if key:
        headers["X-Admin-Key"] = key
    req = Request(PROD + "/api/desk", headers=headers)
    with urlopen(req, timeout=30) as r:
        data = json.loads(r.read().decode("utf-8"))
    matches = [p for p in data.get("posts", []) if str(p.get("id")) == pid]
    if len(matches) != 1:
        raise ValueError("post not unique")
    return matches[0]


def load_state():
    if not STATE.exists():
        return {}
    try:
        return json.loads(STATE.read_text(encoding="utf-8"))
    except Exception:
        return {}


def save_state(state):
    STATE.parent.mkdir(parents=True, exist_ok=True)
    STATE.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")


def _name_checks(post, body, paras, fails):
    primary = (post.get("artist") or "").strip()
    if " " in primary and primary in body:
        first, surname = primary.split(" ", 1)
        tail = body.split(primary, 1)[1]
        if re.search(r"\b" + re.escape(first) + r"\b(?!\s+" + re.escape(surname) + r")", tail):
            fails.append(f"name style: do not use the main artist's first name alone ('{first}')")

        starts = sum(
            1 for p in paras
            if re.match(r"^(?:" + re.escape(primary) + r"|" + re.escape(surname) + r")\b", p)
        )
        if starts >= 3:
            fails.append(
                f"name rhythm: {starts} paragraphs open with the artist's name/surname; "
                "rewrite with pronouns or sentence restructuring"
            )

        # Once the full name is established, conjunction-led surname subjects
        # are a common AI/wire-copy tic: "and Young performed", "while Swift
        # said", "where Eilish appeared". Prefer a pronoun or recast the clause.
        bridge = re.compile(
            r"\b(?:and|but|while|where|as)\s+" + re.escape(surname) + r"\s+[a-z]",
            re.I,
        )
        if bridge.search(tail):
            fails.append(
                f"name rhythm: mechanical surname bridge after first mention ('{surname}'); "
                "use a pronoun or restructure the clause"
            )

    for full in GUEST_SHORT_FORMS:
        if full == primary or full not in body:
            continue
        tail = body.split(full, 1)[1]
        first, surname = full.split(" ", 1)
        if re.search(r"\b" + re.escape(first) + r"\b(?!\s+" + re.escape(surname) + r")", tail):
            fails.append(f"name style: guest artist '{full}' is shortened to '{first}'")
        if re.search(r"(?<!" + re.escape(first) + r"\s)\b" + re.escape(surname) + r"\b", tail):
            fails.append(f"name style: guest artist '{full}' is shortened to '{surname}'")


def inspect(post, allows):
    body = post.get("body") or ""
    title = post.get("title") or ""
    ptype = (post.get("type") or "").lower()
    fails, notes = [], []

    if HTML_GARBAGE.search(body):
        fails.append("encoding residue: HTML entity leaked into reader-facing copy")
    if LITERAL_ESCAPE.search(body):
        fails.append("format residue: literal escape sequence leaked into body")

    paras = prose_paragraphs(body)
    if not paras:
        return ["no prose paragraphs"], []

    # Article rhythm: a body can be factually clean and still read like AI if it
    # is assembled from 2-3 line patch paragraphs. Conversely, one giant block
    # is not a substitute for developed paragraphs. Apply this only to article-
    # length bodies so briefs and special formats are not forced into padding.
    total_prose_words = sum(words(p) for p in paras)
    if len(paras) >= 4 and total_prose_words >= 300:
        short_paras = [(i, words(p)) for i, p in enumerate(paras, 1) if words(p) < 55]
        for i, wc in short_paras:
            fails.append(
                f"paragraph {i}: choppy article paragraph is only {wc} words; "
                "merge it or develop the idea instead of leaving a 2-3 line patch"
            )
        under_70 = [(i, words(p)) for i, p in enumerate(paras, 1) if words(p) < 70]
        if len(under_70) >= 2:
            detail = ", ".join(f"{i}:{wc}w" for i, wc in under_70)
            fails.append(
                f"paragraph rhythm: multiple underdeveloped paragraphs ({detail}); "
                "the article reads chopped up rather than continuous"
            )
        for i, p in enumerate(paras, 1):
            wc = words(p)
            if wc > 180:
                fails.append(
                    f"paragraph {i}: wall-of-text paragraph is {wc} words; "
                    "split it at a real change of idea"
                )

    _name_checks(post, body, paras, fails)

    # Mechanical artist-name rhythm can survive paragraph-level checks. Three
    # consecutive sentences naming the same artist is almost always synthetic.
    primary = (post.get("artist") or "").strip()
    if primary:
        token = primary if " " not in primary else primary.split(" ", 1)[1]
        mention = re.compile(r"\b" + re.escape(token) + r"\b", re.I)
        all_sentences = [sentence for para in paras for sentence in sentences(para)]
        for i in range(len(all_sentences) - 2):
            if all(mention.search(x) for x in all_sentences[i:i + 3]):
                fails.append(
                    "name rhythm: main artist is named in three consecutive sentences; "
                    "use pronouns or restructure instead of repeating the name/surname"
                )
                break

    awards_mode = "[awards]" in body.lower()

    for idx, p in enumerate(paras, 1):
        ss = sentences(p)
        wc = words(p)

        if len(ss) == 1 and wc < 45 and "single-sentence" not in allows:
            fails.append(f"paragraph {idx}: one-sentence paragraph is only {wc} words")

        if SCHEDULE_RUN.search(p):
            fails.append(f"paragraph {idx}: schedule-style date list belongs out of prose")
        date_hits = MONTH_DATE.findall(p)
        if len(date_hits) >= 3:
            fails.append(f"paragraph {idx}: date/calendar overload ({len(date_hits)} explicit dates)")

        # Research residue: proper names, venues and quoted titles are useful only
        # when the sentence actually discusses them.
        name_hits = re.findall(
            r"(?<![.!?]\s)\b[A-Z][a-zÀ-ÖØ-öø-ÿ'’-]+(?:\s+[A-Z][a-zÀ-ÖØ-öø-ÿ'’-]+)+\b",
            p,
        )
        unique_names = list(dict.fromkeys(name_hits))
        if len(unique_names) >= 5:
            fails.append(
                f"paragraph {idx}: name overload ({len(unique_names)} multi-word proper names); "
                "rewrite as narrative, not research notes"
            )
        elif len(unique_names) == 4:
            notes.append(f"paragraph {idx}: dense name payload; confirm every name earns its place")

        venue_hits = VENUE_WORD.findall(p)
        if ptype == "news" and len(venue_hits) >= 3:
            fails.append(
                f"paragraph {idx}: venue roll call ({len(venue_hits)} venue names/cues); "
                "use one or two illustrative stops, not a route list"
            )

        if TECH_CREDIT.search(p) and "technical-credit" not in allows:
            fails.append(f"paragraph {idx}: technical production credit needs an explicit editorial reason")
        if PHYSICAL.search(p) and "physical-format" not in allows:
            fails.append(f"paragraph {idx}: physical-format/store metadata needs an explicit editorial reason")

        m = SOURCE_PROOF.search(p)
        if m and "source-attribution" not in allows:
            brand = m.group(0).split()[0].lower()
            if brand not in title.lower():
                fails.append(f"paragraph {idx}: source/checking language leaked into prose")

        for sentence in ss:
            if OBVIOUS_EXPLAINER.search(sentence):
                fails.append(
                    f"paragraph {idx}: sentence explains an obvious consequence instead of adding information"
                )
            for pattern, message in AI_PR_PATTERNS:
                if pattern.search(sentence):
                    fails.append(f"paragraph {idx}: AI/PR pattern — {message}: {sentence[:120]!r}")

            if not awards_mode and len(quoted_titles(sentence)) >= 3:
                fails.append(
                    f"paragraph {idx}: track/title roll call ({len(quoted_titles(sentence))} quoted titles in one sentence)"
                )

        # If several adjacent sentences start with abstract demonstratives, the
        # paragraph is usually explaining itself instead of reporting.
        abstract_starts = sum(
            1 for sentence in ss
            if re.match(r"^(?:This|That|Those|These|It)\b", sentence)
        )
        if abstract_starts >= 3:
            fails.append(
                f"paragraph {idx}: {abstract_starts} sentences start with abstract pronouns; "
                "rewrite with concrete subjects"
            )

    last = paras[-1]
    last_s = sentences(last)

    if len(last_s) == 1 and words(last) < 55 and "single-sentence" not in allows:
        fails.append(f"final paragraph: single-sentence ending is only {words(last)} words")
    ending_floor = 70 if sum(words(p) for p in paras) >= 300 and len(paras) >= 4 else 45
    if words(last) < ending_floor:
        fails.append(f"ending: final paragraph is too thin ({words(last)} words; floor {ending_floor})")
    if re.search(r"\b\d+(?:st|nd|rd|th)?[.!?]?[\"'’”]?$", last.strip()):
        fails.append("ending: article ends on a bare number/ordinal")

    title_low = title.lower()
    admin_is_story = any(x in title_low for x in ("deluxe", "extended", "tickets", "presale", "vinyl"))
    if ENDING_ADMIN.search(last) and not admin_is_story:
        fails.append(
            "ending: closes on administrative/release-format metadata instead of the story; move or remove it"
        )

    for pattern in ENDING_RECAP:
        if pattern.search(last):
            fails.append(
                "ending: canned recap construction detected; the final paragraph must add meaning, not summarize the body"
            )
            break

    # Repeating the same explicit date in the last two paragraphs is almost
    # always a patch rather than a real ending.
    if len(paras) >= 2:
        a = set(x.lower() for x in MONTH_DATE.findall(paras[-2]))
        b = set(x.lower() for x in MONTH_DATE.findall(paras[-1]))
        if a & b:
            fails.append("ending: same explicit date repeats across the final two paragraphs")

    return fails, notes


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--post", required=True)
    ap.add_argument("--file", type=Path, help="JSON post or {posts:[...]} payload")
    ap.add_argument("--body-file", type=Path)
    ap.add_argument("--title", default="")
    ap.add_argument("--confirm-full-read", action="store_true")
    ap.add_argument("--check-stamp", action="store_true")
    ap.add_argument("--phase", choices=("pre-edit", "post-edit"), default="post-edit")
    ap.add_argument("--allow", action="append", default=[], choices=sorted(WAIVER_CHOICES))
    ap.add_argument("--reason", default="")
    a = ap.parse_args()

    if a.file and a.body_file:
        raise SystemExit("choose --file or --body-file, not both")

    if a.body_file:
        post = {"id": a.post, "title": a.title, "body": a.body_file.read_text(encoding="utf-8")}
        source = str(a.body_file)
    elif a.file:
        data = json.loads(a.file.read_text(encoding="utf-8"))
        if isinstance(data, dict) and isinstance(data.get("posts"), list):
            matches = [p for p in data["posts"] if str(p.get("id")) == a.post]
            if len(matches) != 1:
                raise SystemExit("post not unique in file")
            post = matches[0]
        else:
            post = data
        source = str(a.file)
    else:
        post = load_remote(a.post)
        source = "desk"

    body = post.get("body") or ""
    sha = body_hash(body)
    state = load_state()
    phase_key = a.phase.replace("-", "_")

    if a.check_stamp:
        post_state = state.get(a.post) or {}
        rec = post_state.get(phase_key) or {}
        ok = rec.get("sha256") == sha and rec.get("confirmed") is True
        pre = post_state.get("pre_edit") or {}
        pre_ok = pre.get("confirmed") is True

        if a.phase == "post-edit" and (a.body_file or a.file) and pre_ok:
            try:
                source_body = load_remote(a.post).get("body") or ""
                pre_ok = pre.get("sha256") == body_hash(source_body)
            except Exception as exc:
                print("FAIL cannot verify current desk source for pre-edit stamp:", type(exc).__name__, str(exc)[:120])
                raise SystemExit(1)

        if a.phase == "post-edit":
            ok = ok and pre_ok

        print(f"EDITORIAL_{a.phase.upper().replace('-', '_')}_STAMP: {'PASS' if ok else 'FAIL'} sha={sha[:12]}")
        if not ok:
            if a.phase == "post-edit" and not pre_ok:
                print("FAIL pre-edit full-read stamp is missing or stale for the current desk source")
            else:
                print(f"FAIL {a.phase} full-read stamp is missing or stale for this exact body")
        raise SystemExit(0 if ok else 1)

    allows = set(a.allow)
    if allows and not a.reason.strip():
        print("FAIL waivers require --reason")
        raise SystemExit(1)

    fails, notes = inspect(post, allows)
    print(f"POST={a.post} PHASE={a.phase} WORDS={words(body)} SHA={sha[:12]}")
    for note in notes:
        print("REVIEW", note)
    for finding in fails:
        print(("FINDING" if a.phase == "pre-edit" else "FAIL"), finding)

    # PRE_EDIT may discover defects. POST_EDIT may not.
    if a.phase == "post-edit" and fails:
        print("EDITORIAL_READTHROUGH: FAIL")
        raise SystemExit(1)

    if not a.confirm_full_read:
        print("FAIL full uninterrupted top-to-bottom read not attested")
        print("READ CHECK: read the complete body in order; never review only the requested paragraph or diff.")
        print("EDITORIAL_READTHROUGH: FAIL")
        raise SystemExit(1)

    post_state = state.setdefault(a.post, {})
    post_state[phase_key] = {
        "sha256": sha,
        "confirmed": True,
        "confirmedAt": datetime.now(timezone.utc).isoformat(),
        "source": source,
        "allows": sorted(allows),
        "reason": a.reason.strip(),
        "findings": len(fails),
        "reviewNotes": len(notes),
    }
    save_state(state)

    print(f"EDITORIAL_READTHROUGH: PASS ({a.phase})")
    if a.phase == "pre-edit":
        print("STAMP: source hash locked as read-before-edit; any source change requires another full read")
        if fails:
            print(f"ISSUE_MAP: {len(fails)} reader-facing defect(s) detected before editing")
    else:
        print("STAMP: final body hash locked as fully reread; any body edit invalidates it")


if __name__ == "__main__":
    main()
