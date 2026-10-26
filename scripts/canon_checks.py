#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Mechanically checkable rules from editorial/CANON.md.

Facts, photo judgment, visual QA, the human read, and live read-back cannot
be performed here. manual_not_run() lists those duties. Callers must print
them as NOT RUN. They are never PASS.
"""
from __future__ import annotations

import re
from urllib.parse import urlparse

MEDIA_BLOCK = re.compile(
    r"^\[(?:photo|youtube|apple|instagram|ig|tiktok|tickets):[^\]]*\]$",
    re.I,
)
EDITORIAL_OPEN = re.compile(
    r"^\[(?:photo|youtube|apple|instagram|ig|tiktok):",
    re.I,
)
URL_RE = re.compile(r"https?://[^\s\]\)>\"']+")
SENT_SPLIT = re.compile(r"(?<=[.!?])(?:[\"'’\u201d])?\s+(?=[A-Z0-9\"'“])")
WORD_RE = re.compile(r"\b[\w'’-]+\b")
MONTH = (
    "January|February|March|April|May|June|July|August|"
    "September|October|November|December"
)
ACTION = re.compile(
    r"\b(?:announces?|announced|releases?|released|confirms?|confirmed|"
    r"cancels?|cancelled|canceled|dies|died|opens?|opened|debuts?|debuted|"
    r"premieres?|premiered|shares?|shared|drops?|dropped|unveils?|unveiled|"
    r"launches?|launched|reveals?|revealed|wins?|won|signs?|signed|"
    r"postpones?|postponed|names?|named|sues?|sued|performs?|performed|"
    r"returns?|returned|tops?|topped|earns?|earned|is set|are set|"
    r"will (?:play|release|tour|headline|open)|"
    r"has (?:announced|released|confirmed|died|won|signed|shared|dropped)|"
    r"have (?:announced|released|confirmed|signed)|"
    r"arrives?|arrived|is out)\b",
    re.I,
)
AI_FILLER = (
    (re.compile(r"\b(?:new|next) chapters?\b", re.I), "new chapter"),
    (re.compile(r"\bmoving forward\b", re.I), "moving forward"),
    (re.compile(r"\bthis highlights\b", re.I), "this highlights"),
    (re.compile(r"\b(?:new|next) eras?\b", re.I), "new era"),
    (re.compile(r"\bthe result (?:is|was|becomes?)\b", re.I), "the result is"),
    (re.compile(r"\bwhat (?:comes|happens) next\b", re.I), "what comes next"),
)
FIRST_PERSON = re.compile(
    r"\b(?:I|I'm|I've|I'd|I'll|Me|My|Mine|We|We're|We've|We'd|We'll|"
    r"Our|Ours|Us|me|my|mine|we|we're|we've|we'd|we'll|us|our|ours)\b"
)
RECAP = re.compile(
    r"\b(?:in short|in conclusion|all in all|to sum up|ultimately|"
    r"overall|new chapter|what comes next|this highlights)\b",
    re.I,
)
PURCHASE = re.compile(
    r"\b(?:available now|out now|buy (?:it|tickets|the)|stream(?:\s+it)? now|"
    r"pre-?order(?:\s+now)?|on sale now|get (?:your )?tickets|"
    r"listen now|watch now|tickets are (?:on sale|available)|"
    r"grab (?:it|tickets)|available to stream)\b",
    re.I,
)
UNQUOTED_SONG = re.compile(
    r"\b(?:single|song|track|ballad|titled|called)\s+"
    r"(?![\"“])"
    r"(?!(?:and|or|from|with|on|in|at|for|to|of|the|a|an|that|which|whose|"
    r"is|was|were|are|has|have|had|will|its|it|her|his|their)\b)"
    r"([A-Z][\w'’]*(?:\s+[A-Z0-9][\w'’]*){0,5})",
)
ITALIC_SONG = re.compile(
    r"\b(?:single|song|track|ballad)\s+\*([^*]{1,80})\*",
    re.I,
)
CHART_NEWS = re.compile(
    r"\bbillboard\b.{0,60}\b(?:hot 100|billboard 200|no\.?\s*1|number one|"
    r"charts?|debuts?|peaks?)\b|"
    r"\b(?:hot 100|billboard 200)\b.{0,60}\bbillboard\b",
    re.I,
)
ARTICLE_PATH = re.compile(
    r"/(?:news|article|articles|story|stories)(?:/|$)|"
    r"/\d{4}/\d{2}/\d{2}(?:/|$)",
    re.I,
)
OPEN_STOP = {
    "she", "he", "they", "it", "her", "his", "their", "its", "was", "were",
    "and", "but", "that", "this", "with", "for", "from", "have", "has", "had",
    "will", "would", "been", "also", "then", "when", "after", "before", "into",
    "over", "said", "says", "who", "what", "which", "not", "but", "you", "your",
}
COMPETING_HOSTS = {
    "billboard.com", "pitchfork.com", "rollingstone.com", "nme.com",
    "stereogum.com", "consequence.net", "thefader.com", "complex.com",
    "variety.com", "hollywoodreporter.com", "vulture.com", "spin.com",
    "pastemagazine.com", "uproxx.com", "theguardian.com", "nytimes.com",
    "bbc.com", "bbc.co.uk", "cnn.com", "tmz.com", "people.com", "apnews.com",
    "reuters.com", "washingtonpost.com", "latimes.com", "usatoday.com",
    "ew.com", "vanityfair.com", "gq.com", "vogue.com", "elle.com",
    "musicbusinessworldwide.com", "hitsdailydouble.com", "thatgrapejuice.net",
    "hotnewhiphop.com", "hiphopdx.com", "rap-up.com", "xxlmag.com", "vibe.com",
    "thelineofbestfit.com", "clashmusic.com", "diymag.com", "npr.org",
    "brooklynvegan.com", "jambase.com", "stereogum.com", "papermag.com",
    "dazeddigital.com", "highsnobiety.com", "hypebeast.com", "idolator.com",
    "rapradar.com", "allmusic.com", "metacritic.com", "residentadvisor.net",
    "thefortyfive.com", "floodmagazine.com", "undertheradarmag.com",
}


def manual_not_run():
    """Canon duties this process did not perform. Never label these PASS."""
    return [
        "NOT RUN canon 1: facts, names, dates, quotes, charts, and superlatives are unverified",
        "NOT RUN canon 4: photo search, resolution, sharpness, crop, and permission",
        "NOT RUN canon 5: playback, desktop and mobile crops, and ticket destination",
        "NOT RUN canon 6: full human read of the exact final article",
        "NOT RUN canon 7: saved read-back and live public URL",
    ]


def _normalize(body: str) -> str:
    return (body or "").replace("\r\n", "\n")


def split_blocks(body: str):
    return [p.strip() for p in re.split(r"\n{2,}", _normalize(body)) if p.strip()]


def prose_paragraphs(body: str):
    out = []
    in_awards = False
    for block in split_blocks(body):
        low = block.lower()
        if low == "[awards]":
            in_awards = True
            continue
        if low == "[/awards]":
            in_awards = False
            continue
        if in_awards or MEDIA_BLOCK.fullmatch(block):
            continue
        out.append(block)
    return out


def prose_text(body: str) -> str:
    return "\n\n".join(prose_paragraphs(body))


def first_prose_paragraph(body: str) -> str:
    paras = prose_paragraphs(body)
    return paras[0] if paras else ""


def prose_word_count(body: str) -> int:
    return len(WORD_RE.findall(prose_text(body)))


def sentences(text: str):
    return [part.strip() for part in SENT_SPLIT.split((text or "").strip()) if part.strip()]


def without_quotes(text: str) -> str:
    return re.sub(r"[\"“][^\"”\n]*[\"”]", " ", text or "")


def excerpt_issue(excerpt: str, body: str):
    """Return a problem string, or None when the excerpt matches canon section 2."""
    excerpt = (excerpt or "").strip()
    para = first_prose_paragraph(body)
    if not excerpt:
        return "excerpt is empty"
    if not para.startswith(excerpt):
        return "excerpt is not a verbatim prefix of paragraph one"
    if not re.search(r"[.!?][\"'’\u201d]?$", excerpt):
        return "excerpt does not end on a complete sentence"
    rest = para[len(excerpt):]
    if rest and not rest[0].isspace():
        return "excerpt stops mid-sentence"
    return None


def _host(url: str) -> str:
    try:
        host = (urlparse(url).hostname or "").lower()
    except Exception:
        return ""
    if host.startswith("www."):
        host = host[4:]
    return host


def is_competing_url(url: str) -> bool:
    host = _host(url)
    if not host:
        return False
    return any(host == known or host.endswith("." + known) for known in COMPETING_HOSTS)


def is_article_url(url: str) -> bool:
    if is_competing_url(url):
        return True
    try:
        path = urlparse(url).path or ""
    except Exception:
        return False
    return bool(ARTICLE_PATH.search(path))


def _artist_name(post) -> str:
    artist = (post.get("artist") or "").strip()
    if artist:
        return artist
    words = []
    for word in (post.get("title") or "").split():
        if re.match(r"^[A-Z]", word):
            words.append(word.strip(",:;"))
            if len(words) == 2:
                break
        else:
            break
    return " ".join(words)


def _name_parts(artist: str):
    artist = (artist or "").strip()
    if not artist:
        return "", ""
    bits = artist.split()
    if len(bits) == 1:
        return artist, artist
    return artist, bits[-1]


def _opening_key(text: str) -> str:
    words = re.findall(r"[A-Za-z0-9']+", (text or "").lower())
    while words and words[0] in {"the", "a", "an"}:
        words = words[1:]
    key = words[:3]
    if len(key) < 3 or all(word in OPEN_STOP for word in key):
        return ""
    return " ".join(key)


def _punctuation(text: str, where: str):
    issues = []
    stripped = URL_RE.sub(" ", text or "")
    timed = re.sub(r"\b\d{1,2}:\d{2}\b", " ", stripped)
    if ":" in timed:
        issues.append(("colon", "colon in %s" % where))
    if ";" in stripped:
        issues.append(("semicolon", "semicolon in %s" % where))
    bare = without_quotes(stripped)
    if "—" in bare or "–" in bare:
        issues.append(("em-dash", "em-dash or en-dash in %s" % where))
    return issues


def _first_person(text: str, where: str):
    sample = re.sub(r"\bU\.S\.(?:A\.)?\b", " ", without_quotes(text or ""))
    found = FIRST_PERSON.search(sample)
    if not found:
        return []
    return [("first-person", "first person %r in %s" % (found.group(0), where))]


def _ai_filler(text: str):
    issues = []
    for pattern, label in AI_FILLER:
        if pattern.search(text or ""):
            issues.append(("ai-filler", "AI/PR filler %r" % label))
    return issues


def _repetition(post, paras):
    issues = []
    sentence_keys = []
    for para in paras:
        for sentence in sentences(para):
            key = _opening_key(sentence)
            if key:
                sentence_keys.append(key)
    paragraph_keys = [key for key in (_opening_key(para) for para in paras) if key]
    for label, keys in (("sentence", sentence_keys), ("paragraph", paragraph_keys)):
        counts = {}
        for key in keys:
            counts[key] = counts.get(key, 0) + 1
        repeated = sorted((key for key, count in counts.items() if count >= 2))
        if repeated:
            issues.append((
                "opening-repeat",
                "repeated %s opening across the article: %s" % (label, repeated[0]),
            ))
    full, surname = _name_parts(_artist_name(post))
    if surname and len(surname) >= 3:
        all_sentences = [sentence for para in paras for sentence in sentences(para)]
        pattern = re.compile(r"\b" + re.escape(surname) + r"\b")
        hits = sum(1 for sentence in all_sentences if pattern.search(sentence))
        if len(all_sentences) >= 5 and hits >= 4 and hits / len(all_sentences) >= 0.5:
            issues.append((
                "name-repetition",
                "name %s appears in %d of %d sentences" % (surname, hits, len(all_sentences)),
            ))
        opens = 0
        opener = re.compile(r"^(?:" + re.escape(full) + r"|" + re.escape(surname) + r")\b")
        for para in paras:
            if opener.match(para):
                opens += 1
        if opens >= 3:
            issues.append((
                "name-repetition",
                "%d paragraphs open with the artist name" % opens,
            ))
    return issues


def _list_like(paragraph: str):
    cleaned = re.sub(r"(?<=\d),(?=\d)", "", paragraph)
    chunks = [chunk.strip() for chunk in re.split(r",|\band\b|\bor\b", cleaned) if chunk.strip()]
    if len(chunks) >= 5:
        average = sum(len(chunk.split()) for chunk in chunks) / float(len(chunks))
        if average <= 4:
            return True
    if len(re.findall(r"[\"“][^\"”]{1,80}[\"”]", paragraph)) >= 4:
        return True
    return False


def _ending(paragraph: str):
    issues = []
    last_sentences = sentences(paragraph)
    last = last_sentences[-1] if last_sentences else paragraph.strip()
    if RECAP.search(paragraph):
        issues.append(("ending", "ending reads as a recap or slogan"))
    if PURCHASE.search(paragraph):
        issues.append(("ending", "ending gives purchase or ticket instructions"))
    if re.search(r"\b\d+(?:st|nd|rd|th)?[.!?]?[\"'’\u201d]?$", last.strip()):
        issues.append(("ending", "ending stops on a bare number"))
    bare = re.sub(r"[\"'’\u201d]", "", last).strip()
    if re.fullmatch(r"(?:[Oo]n\s+)?(?:" + MONTH + r")\s+\d{1,2}(?:,\s+\d{4})?\.?", bare) or re.fullmatch(r"(?:19|20)\d{2}\.?", bare):
        issues.append(("ending", "ending is a bare date"))
    return issues


def _song_titles(text: str):
    issues = []
    italic = ITALIC_SONG.search(text or "")
    if italic:
        issues.append(("song-title", "song title %r is not in quotation marks" % italic.group(1).strip()))
    bare = UNQUOTED_SONG.search(text or "")
    if bare:
        issues.append(("song-title", "song title %r is not in quotation marks" % bare.group(1).strip()))
    return issues


def _lede(post, paras):
    ptype = (post.get("type") or "").strip().lower()
    if ptype not in {"news", "release"}:
        return []
    issues = []
    title = post.get("title") or ""
    artist = _artist_name(post)
    first = sentences(paras[0])[0] if paras else ""
    if ptype == "news" and CHART_NEWS.search(title):
        issues.append(("chart-news", "news headline is a Billboard chart post"))
    if ptype == "news":
        if artist and artist.lower() not in title.lower():
            issues.append(("lede", "news headline does not name the artist"))
        if not ACTION.search(title):
            issues.append(("lede", "news headline does not state the action"))
    if artist and artist.lower() not in first.lower():
        issues.append(("lede", "first sentence does not name the artist"))
    if not ACTION.search(first):
        issues.append(("lede", "first sentence does not state the action"))
    if len(WORD_RE.findall(first)) < 8:
        issues.append(("lede", "first sentence does not carry the news"))
    if ptype == "release":
        release = (post.get("title") or "").strip()
        if release and release.lower() not in first.lower():
            issues.append(("lede", "release lede does not name the release"))
    return issues


def _links(text: str):
    for url in URL_RE.findall(text or ""):
        if is_competing_url(url):
            return [("competing-link", "link to a competing outlet")]
    return []


def _media(body: str, ptype: str):
    if ptype not in {"news", "release", "longread"}:
        return []
    blocks = split_blocks(body)
    markers = re.findall(r"\[(?:photo|youtube|apple|instagram|ig|tiktok):[^\]]*\]", body or "", re.I)
    issues = []
    if ptype in {"news", "release"} and not 1 <= len(markers) <= 2:
        issues.append(("media-count", "standard post has %d media item(s); canon expects 1 or 2" % len(markers)))
    if ptype == "longread" and len(markers) < 2:
        issues.append(("media-count", "longread has %d media item(s); canon expects 2 or more" % len(markers)))
    if ptype == "longread" and blocks and EDITORIAL_OPEN.match(blocks[-1]):
        issues.append(("media-end", "longread ends on a media block"))
    for left, right in zip(blocks, blocks[1:]):
        if MEDIA_BLOCK.fullmatch(left) and MEDIA_BLOCK.fullmatch(right):
            issues.append(("media-pair", "media blocks are not separated by prose"))
            break
    return issues


def _one_credit(where: str, raw: str):
    parts = (raw or "").split("|")
    credit = parts[1].strip() if len(parts) > 1 else ""
    url = parts[2].strip() if len(parts) > 2 else ""
    issues = []
    if not credit:
        issues.append(("photo-credit", "%s credit is missing a photographer" % where))
    elif re.search(r"\bcourtesy\b", credit, re.I):
        issues.append(("photo-credit", "%s credit is automatic Courtesy" % where))
    if not url.startswith("https://"):
        issues.append(("photo-credit", "%s credit link is missing or not https" % where))
    elif is_article_url(url):
        issues.append(("photo-credit", "%s credit links to an article or competing outlet" % where))
    return issues


def _credits(post):
    issues = []
    for match in re.finditer(r"\[photo:([^\]]*)\]", post.get("body") or "", re.I):
        issues.extend(_one_credit("photo", match.group(1)))
    cover = post.get("cover") or {}
    if isinstance(cover, dict) and cover.get("src") and (cover.get("kind") or "img") == "img":
        packed = "|".join([
            str(cover.get("src") or ""),
            str(cover.get("credit") or ""),
            str(cover.get("creditUrl") or ""),
        ])
        issues.extend(_one_credit("cover", packed))
    return issues


def _length(post, min_words):
    ptype = (post.get("type") or "").strip().lower()
    floors = {"news": 400, "release": 400, "longread": 1200}
    if ptype not in floors:
        return []
    floor = floors[ptype]
    if min_words is not None:
        floor = max(floor, int(min_words))
    count = prose_word_count(post.get("body") or "")
    if count < floor:
        return [("word-count", "too few prose words for %s: %d < %d" % (ptype, count, floor))]
    return []


def mechanical_issues(post, structural=True, min_words=None):
    """Return (code, message) failures grounded in editorial/CANON.md.

    structural=False skips payload rules (length, excerpt, media, credits) so a
    prose-only read can still judge voice. Typed news, release, and longread
    posts should use structural=True.
    """
    post = post or {}
    body = post.get("body") or ""
    title = post.get("title") or ""
    excerpt = post.get("excerpt") or ""
    ptype = (post.get("type") or "").strip().lower()
    paras = prose_paragraphs(body)
    prose = "\n\n".join(paras)
    issues = []
    issues.extend(_punctuation(title, "the headline"))
    issues.extend(_punctuation(prose, "prose"))
    if excerpt.strip() and excerpt.strip() not in prose:
        issues.extend(_punctuation(excerpt, "the excerpt"))
    issues.extend(_first_person(title + "\n" + prose, "prose"))
    issues.extend(_ai_filler(prose))
    issues.extend(_repetition(post, paras))
    for index, para in enumerate(paras, 1):
        if _list_like(para):
            issues.append(("list-like", "paragraph %d reads like a list" % index))
            break
    if paras:
        issues.extend(_ending(paras[-1]))
    issues.extend(_song_titles(prose))
    issues.extend(_links(title + "\n" + excerpt + "\n" + body))
    issues.extend(_lede(post, paras))
    if structural:
        if ptype in {"news", "release", "longread"}:
            problem = excerpt_issue(excerpt, body)
            if problem:
                issues.append(("excerpt", problem))
            if not (post.get("cover") or {}):
                issues.append(("cover", "cover is missing"))
        issues.extend(_length(post, min_words))
        issues.extend(_media(body, ptype))
        issues.extend(_credits(post))
    return issues
