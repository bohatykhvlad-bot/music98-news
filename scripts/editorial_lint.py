#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Whole-article prose lint: the checks a sentence-level rule cannot make.

Why this file exists
--------------------
The desk had rules for names, dates, punctuation, credits and ledes, and one
rule for pronouns. It had no rule for the four defects an owner actually keeps
finding by hand:

1. **Tautology** - a sentence that says its own meaning twice ("not just X, it
   is Y", "the very thing that").
2. **The same thought twice** - two paragraphs that carry the same fact in
   different words, so the second paragraph adds nothing.
3. **Repeated wording** - the same phrase in two places, far apart, so the
   article sounds like it is circling.
4. **Fact mixing** - a figure or a name attached to the wrong subject, or a
   name from another story dropped into this one.

None of these can be caught by looking at one sentence at a time, so they are
computed over the whole body here.

Design rules for this module
----------------------------
* Every rule returns a message that names the exact place in the article, so
  the writer can find it and fix it without guessing.
* A rule fires only on a pattern that is unambiguously a defect. A rule that
  cries wolf teaches the writer to ignore the checker, which is worse than no
  rule at all.
* Rules are additive to `canon_checks.py`. Nothing here replaces a rule that
  already exists; the canon file lists the single source of each duty.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

# Words that carry no subject. They are removed before any overlap is
# measured, otherwise two paragraphs about different subjects share
# "the" and "and" and look like the same paragraph.
STOPWORDS = {
    "a", "an", "the", "and", "or", "but", "if", "then", "than", "so", "because",
    "as", "at", "by", "for", "from", "in", "into", "of", "on", "to", "with",
    "was", "were", "is", "are", "be", "been", "being", "am", "do", "does",
    "did", "has", "have", "had", "will", "would", "can", "could", "may",
    "might", "must", "shall", "should", "that", "this", "these", "those",
    "there", "here", "it", "its", "he", "she", "they", "them", "their",
    "his", "her", "him", "who", "whom", "which", "what", "when", "where",
    "while", "who's", "not", "no", "nor", "so", "yet", "still", "also",
    "just", "only", "very", "more", "most", "much", "many", "some", "any",
    "each", "every", "both", "one", "two", "three", "own", "same", "other",
    "another", "after", "before", "over", "under", "again", "about", "over",
    "up", "down", "out", "off", "through", "between", "during", "since",
    "until", "per", "via", "we", "our", "us", "i", "my", "me", "you", "your",
}

# Verbs and nouns that legitimately repeat inside one sentence (a deliberate
# parallel echo). The gate already treats these as allowed.
ECHO_ALLOWED = {
    "first", "last", "new", "old", "big", "small", "long", "short", "high",
    "low", "great", "little", "own", "same", "next", "best", "worst", "full",
    "real", "good", "bad", "right", "wrong", "true", "free", "live", "hot",
    "single", "one", "double", "half", "one-time", "record", "record-breaking",
}

# Tautology shapes that cannot be defended as a deliberate echo.
TAUTOLOGY_PATTERNS = (
    (re.compile(r"\bnot (?:just|only|merely|simply)\b[^.;]{0,60}\bbut\b", re.I),
     "not just X but Y"),
    (re.compile(r"\bnot (?:just|only|merely|simply)\b[^.;]{0,60}, "
                r"(?:it|this|that|they|he|she) (?:is|are|was|were)\b", re.I),
     "not just X, it is Y"),
    (re.compile(r"\bisn'?t (?:just|only|merely|simply)\b[^.;]{0,60}\bbut\b", re.I),
     "isn't just X but Y"),
    (re.compile(r"\bmore than just\b", re.I),
     "more than just"),
    (re.compile(r"\bthe very thing that\b", re.I),
     "the very thing that"),
    (re.compile(r"\bexactly what\b[^.;]{0,40}\bis\b", re.I),
     "exactly what ... is"),
    (re.compile(r"\bin other words\b", re.I),
     "in other words"),
    (re.compile(r"\bwhat (?:this|that) means is\b", re.I),
     "what this means is"),
    (re.compile(r"\bthe point is (?:that )?\b", re.I),
     "the point is"),
    (re.compile(r"\bwhen all is said and done\b", re.I),
     "when all is said and done"),
    (re.compile(r"\bfor what it'?s worth\b", re.I),
     "for what it's worth"),
)

# A phrase of three content words repeated in two different paragraphs is a
# repeated formulation. Two words is too easy to hit by accident.
PHRASE_LEN = 3

# Words that appear in almost every music article. A phrase built only from
# these is a collocation ("songwriter hall of fame"), not a repeated
# formulation, and flagging it teaches the writer to ignore the rule.
COMMON_WORDS = {
    "song", "album", "single", "track", "record", "release", "tour", "show",
    "stage", "music", "artist", "fans", "fan", "city", "night", "year", "new",
    "first", "last", "name", "songwriter", "hall", "fame", "award", "honor",
    "announce", "announcement", "world", "american", "american", "career",
    "work", "time", "way", "part", "live", "debut", "cover", "video",
}


def paragraphs(body: str):
    """Prose paragraphs, media blocks removed."""
    out = []
    for block in re.split(r"\n{2,}", (body or "").replace("\r\n", "\n")):
        block = block.strip()
        if not block:
            continue
        if re.fullmatch(r"\[(?:photo|youtube|apple|instagram|ig|tiktok|tickets):[^\]]*\]",
                         block, re.I):
            continue
        # A bracketed list line is a roll call of names or tracks, not prose.
        # Repeating a name inside one is the point of the list.
        if LIST_BLOCK.match(block):
            continue
        out.append(block)
    return out


def sentences(text: str):
    return [s.strip() for s in re.split(r"(?<=[.!?])(?:[\"'’”])?\s+(?=[A-Z0-9\"'“])",
                                        (text or "").strip()) if s.strip()]


# Music journalism has a small set of words for the same thing. A writer who
# restates a sentence swaps these, so the lexicon rules have to fold them
# together before they can see the repetition.
SYNONYMS = {
    "pic": "image", "pics": "image", "photo": "image", "photos": "image",
    "photograph": "image", "photographs": "image", "picture": "image",
    "pictures": "image", "shot": "image", "shots": "image", "frame": "image",
    "frames": "image", "snapshot": "image", "portrait": "image",
    "mic": "microphone", "mics": "microphone", "vocal": "microphone",
    "lit": "light", "lights": "light", "lighting": "light", "glow": "light",
    "glows": "light", "bright": "light", "brightness": "light",
    "wash": "wash", "washed": "wash", "soaked": "wash", "floodlight": "light",
    "floodlights": "light", "spotlight": "light", "spotlights": "light",
    "standing": "stand", "stands": "stand", "stood": "stand",
    "performing": "perform", "performs": "perform", "performed": "perform",
    "singing": "sing", "sings": "sing", "sung": "sing",
    "captured": "catch", "catches": "catch", "caught": "catch",
    "showing": "show", "shows": "show", "showed": "show",
    "shown": "show", "reveal": "show", "reveals": "show", "revealed": "show",
    "lights": "light", "lit": "light",
    "concert": "live", "concerts": "live", "gig": "live", "gigs": "live",
    "touring": "tour", "tours": "tour", "toured": "tour",
    "record": "album", "records": "album", "recording": "album",
    "songwriter": "writer", "songwriters": "writer", "songwriting": "writer",
    "songwriters": "writer", "writes": "write", "wrote": "write",
    "written": "write", "writing": "write",
    "released": "release", "releases": "release", "dropped": "release",
    "drops": "release", "drop": "release",
    "honored": "honour", "honoured": "honour", "honors": "honour",
    "honours": "honour", "award": "honour", "awards": "honour",
    "young": "youth", "younger": "youth", "youngest": "youth",
    "biggest": "large", "larger": "large", "largest": "large",
    "big": "large", "huge": "large",
}


PROPER_SEQUENCE = re.compile(r"\b(?:[A-Z][\w'\u2019&-]+)(?:\s+(?:of|the|and|de|la|van|von)?\s*[A-Z][\w'\u2019&-]+)+\b")
LIST_BLOCK = re.compile(r"^\s*\[")


def proper_nouns(text: str):
    """Words that belong to a proper name.

    A venue, an award or a title has to be written the same way every time,
    so its repetition is correct English and not a repeated formulation.
    """
    out = set()
    for match in PROPER_SEQUENCE.finditer(text or ""):
        for word in re.findall(r"[A-Za-z\u00C0-\u024F][\w'\u2019-]*", match.group(0)):
            out.add(word.lower())
    return out


def stems(text: str, skip=()):
    """Content stems: lowercased, stopwords, short words and proper names removed."""
    out = []
    # The names to skip arrive as raw words ("Texas"), but the comparison
    # below happens on the stem ("texa"). Without this second form a proper
    # name was never excluded, and a title repeated in two paragraphs read
    # as a repeated formulation.
    skip_stems = set()
    for name in skip or ():
        word = re.sub(r"[^a-z]", "", str(name).lower())
        if not word:
            continue
        skip_stems.add(word)
        for suffix in ("ings", "ing", "ies", "ied", "ed", "es", "s"):
            if word.endswith(suffix) and len(word) - len(suffix) >= 3:
                word = word[: -len(suffix)]
                break
        skip_stems.add(word)
    for word in re.findall(r"[A-Za-z][A-Za-z'\u2019-]*", (text or "").lower()):
        if len(word) < 3 or word in STOPWORDS:
            continue
        stem = word.rstrip("'s")
        for suffix in ("ings", "ing", "ies", "ied", "ed", "es", "s"):
            if stem.endswith(suffix) and len(stem) - len(suffix) >= 3:
                stem = stem[: -len(suffix)]
                break
        if len(stem) >= 3 and stem not in STOPWORDS and stem not in skip and stem not in skip_stems:
            out.append(SYNONYMS.get(stem, stem))
    return out


def _jaccard(a, b):
    if not a or not b:
        return 0.0
    sa, sb = set(a), set(b)
    return len(sa & sb) / float(len(sa | sb))


def _containment(a, b):
    """How much of the smaller set sits inside the larger one.

    Jaccard punishes two paragraphs of different length. Containment does
    not: a short paragraph that is fully contained in a longer one is a
    restatement, whatever the length difference.
    """
    if not a or not b:
        return 0.0
    sa, sb = set(a), set(b)
    return len(sa & sb) / float(min(len(sa), len(sb)))


def _fact_signatures(text: str):
    """The checkable facts a paragraph states: dates, counted figures, titles.

    Two paragraphs that state the same date or the same counted figure are
    repeating a fact, whatever words they use around it. This catches the
    repetition that pure word overlap misses, because the writer paraphrases
    the sentence but keeps the number.
    """
    sig = set()
    for m in re.finditer(
        r"\b(?:January|February|March|April|May|June|July|August|September|"
        r"October|November|December)\s+\d{1,2}(?:,?\s+\d{4})?\b", text):
        sig.add("date:" + re.sub(r"\s+", " ", m.group(0)).lower())
    for m in re.finditer(r"\b(\d{1,4}(?:,\d{3})*)\b(?=\s+[A-Za-z][A-Za-z'\-]{2,})", text):
        value = m.group(1)
        if value in {"1970", "2024", "2025", "2026", "2027"}:
            continue
        unit = re.match(r"\s+([A-Za-z][A-Za-z'\-]{2,})", text[m.end():])
        if unit:
            sig.add("number:%s %s" % (value, unit.group(1).lower()))
    # An ordinal carries a fact of its own: "his fourth full-length" and "the
    # fourth full-length" are the same statement, and a writer who repeats it
    # in other words has not added anything. Without this the tautology of
    # two short paragraphs slipped through the word-overlap rule, because the
    # restatement shares only three content words.
    for m in re.finditer(
        r"\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|"
        r"last|latest|newest)\s+([A-Za-z][A-Za-z'\-]{2,})", text, re.I):
        sig.add("ordinal:%s %s" % (m.group(1).lower(), m.group(2).lower()))
    return sig


def sentence_repetition(paras):
    """The same sentence twice, or a sentence restated word for word.

    This is the purest form of repetition: two paragraphs that carry the
    same sentence. A restatement that changes every word is a different
    defect, and the lexicon rules below catch it only when a distinctive
    phrase or a fact survives the rewrite.
    """
    issues = []
    seen = {}
    for index, para in enumerate(paras, 1):
        for sentence in sentences(para):
            key = " ".join(stems(sentence))
            if len(key) < 20:
                continue
            if key in seen and seen[key] != index:
                issues.append((
                    "sentence-repeat",
                    "paragraph %d repeats a sentence from paragraph %d: %s"
                    % (index, seen[key], sentence[:120].strip()),
                ))
                break
            seen.setdefault(key, index)
    return issues


def idea_repetition(paras):
    """Two paragraphs that carry the same thought.

    Two independent signals:

    * they state the same date, counted figure or quoted title, which is a
      repeated fact no matter how the sentence around it is worded;
    * they share more than half of their content words, which is the same
      sentence restated.

    The threshold on the second signal is deliberately high: two paragraphs
    about one subject legitimately share vocabulary, and only a paragraph that
    repeats the other's *specific* content is a defect.
    """
    issues = []
    names = [proper_nouns(p) for p in paras]
    vectors = [set(stems(p, names[i])) for i, p in enumerate(paras)]
    facts = [_fact_signatures(p) for p in paras]
    for i in range(len(paras)):
        for j in range(i + 1, len(paras)):
            shared_facts = facts[i] & facts[j]
            vi, vj = vectors[i], vectors[j]
            overlap = max(_jaccard(vi, vj), _containment(vi, vj))
            if shared_facts and overlap >= 0.50:
                issues.append((
                    "idea-repeat",
                    "paragraph %d and paragraph %d state the same fact (%s); "
                    "keep it in one of them and let the other add something new"
                    % (i + 1, j + 1, ", ".join(sorted(shared_facts)[:3])),
                ))
                continue
            shared = vi & vj
            if len(shared) < 4 or len(vi) < 5 or len(vj) < 5:
                continue
            if overlap >= 0.70:
                issues.append((
                    "idea-repeat",
                    "paragraph %d and paragraph %d carry the same idea (%d%% of the "
                    "shorter paragraph's content is repeated: %s); one of them must "
                    "add something new"
                    % (i + 1, j + 1, round(overlap * 100), ", ".join(sorted(shared)[:6])),
                ))
    return issues


def phrase_repetition(paras):
    """The same three-word formulation in two different paragraphs."""
    issues = []
    seen = {}
    for index, para in enumerate(paras, 1):
        words = stems(para, proper_nouns(para))
        for start in range(len(words) - PHRASE_LEN + 1):
            phrase = " ".join(words[start:start + PHRASE_LEN])
            if not (set(words[start:start + PHRASE_LEN]) - COMMON_WORDS):
                continue
            if phrase in seen and seen[phrase][0] != index:
                issues.append((
                    "phrase-repeat",
                    "the phrase '%s' appears in paragraph %d and paragraph %d; "
                    "reword one of them" % (phrase, seen[phrase][0], index),
                ))
                break
            if phrase not in seen:
                seen[phrase] = (index,)
    return issues


def _inside_quotes(sentence: str, pos: int) -> bool:
    """True when the position sits inside a quoted title or a quotation.

    The site writes titles in straight double quotes, so a word inside them
    is part of a name and not a typing slip: "Vroom Vroom".
    """
    before = sentence[:pos]
    return before.count('"') % 2 == 1


# A claim word carries the point of a sentence. Saying the same one twice in
# one paragraph means the point was made twice, which is how the Swift post
# came to say "youngest" in its opening sentence and then again two sentences
# later. The list is short on purpose: these are the words that make a
# sentence a claim rather than a description.
CLAIM_WORDS = {
    "youngest", "oldest", "biggest", "largest", "smallest", "highest",
    "lowest", "longest", "shortest", "newest", "earliest", "fastest",
}


def repeated_claim(paras):
    """The same claim word twice inside one paragraph.

    "The youngest person ever to receive the honor ... the youngest
    inductee in the hall's history" - one point, made twice, in a paragraph
    that has no room for it. The rule is deliberately narrow: the word has
    to be a claim word, and it has to be in the same paragraph. A post that
    says "first" once in the lede and once at the end is fine.
    """
    issues = []
    for index, para in enumerate(paras, 1):
        words = re.findall(r"[A-Za-z]+", para.lower())
        seen = {}
        for word in words:
            if word not in CLAIM_WORDS:
                continue
            if word in seen:
                issues.append((
                    "claim-repeat",
                    "the word %r appears twice in paragraph %d; the point is made "
                    "twice and the second one has to go"
                    % (word, index),
                ))
                break
            seen[word] = True
    return issues


def duplicate_word(paras):
    """The same word standing right next to itself, as a typing slip.

    "the the", "album album" - a slip no reader forgives. The owner's rule
    on 29.10 covers this literally: одинаковые слова подряд.

    Two kinds of repetition are not slips and stay silent: a title or a
    quoted phrase that is written twice on purpose ("DDU-DU DDU-DU"), and a
    word that ends one clause and starts the next ("JAŸ-Z in 8, in which").
    Both are caught by looking at what stands between the two words: a
    comma, a quotation mark or a hyphen means the writer meant it.
    """
    issues = []
    for index, para in enumerate(paras, 1):
        for sentence in sentences(para):
            # The words are found with their positions, so two neighbours
            # are compared even when the first one also started a pair with
            # the word before it ("the the" was missed by a pattern that
            # consumed its own matches).
            words = [(m.group(0), m.start(), m.end())
                     for m in re.finditer(r"[A-Za-z][A-Za-z'\u2019-]*", sentence)]
            for (first, f_start, _), (second, s_start, _) in zip(words, words[1:]):
                if first.lower() != second.lower():
                    continue
                if len(first) < 3:
                    continue
                between = sentence[f_start:s_start]
                # A comma, a quote or a hyphen separates them on purpose.
                if re.search(r"[,;:\u2019\"')\]\-]", between):
                    continue
                # A title inside quotation marks repeats itself on purpose:
                # the track is called "Vroom Vroom".
                if _inside_quotes(sentence, f_start):
                    continue
                issues.append((
                    "duplicate-word",
                    "the word %r stands right next to itself in paragraph %d: %s"
                    % (first.lower(), index, sentence[:110].strip()),
                ))
                break
    return issues


def repeated_run(paras):
    """The same two content words standing next to each other, twice, in
    paragraphs that say the same thing.

    This is the general form of the rule the owner asked for on 29.10:
    "проверка одинаковых слов подряд", written as a rule instead of a
    hand-written exception list.

    Two conditions, both needed:

    * the same pair of neighbouring content words appears in two paragraphs;
    * the two paragraphs are near-duplicates, so the second one adds nothing.
      The measure is containment: how much of the shorter paragraph's content
      is already in the longer one.

    The second condition is what separates a tautology from a fact that is
    simply mentioned twice. "His fourth full-length studio record" and "his
    fourth full-length release" repeat the pair "fourth full-length" and the
    shorter paragraph is three-quarters contained in the longer one: the
    second paragraph restates the first. "Thirty-seven minute" and
    "thirty-two minute" in different paragraphs of a long piece say nothing
    of the sort, and stay silent.
    """
    issues = []
    names = [proper_nouns(p) for p in paras]
    vectors = [set(stems(p, names[i])) for i, p in enumerate(paras)]
    seen = {}
    for index, para in enumerate(paras, 1):
        words = stems(para, names[index - 1])
        for start in range(len(words) - 1):
            pair = (words[start], words[start + 1])
            # A pair made only of the site's stock vocabulary ("the album",
            # "new single") is furniture, not a repeated idea.
            if not (set(pair) - COMMON_WORDS):
                continue
            if pair not in seen:
                seen[pair] = index
                continue
            first = seen[pair]
            if first == index:
                continue
            overlap = _containment(vectors[first - 1], vectors[index - 1])
            if overlap < 0.50:
                continue
            issues.append((
                "word-run-repeat",
                "the words '%s %s' stand next to each other in paragraph %d and "
                "paragraph %d, and %d%% of the shorter paragraph is already said in "
                "the other one; the second paragraph has to add something new"
                % (pair[0], pair[1], first, index, round(overlap * 100)),
            ))
            break
    return issues


def tautology(paras):
    issues = []
    for index, para in enumerate(paras, 1):
        for sentence in sentences(para):
            for pattern, label in TAUTOLOGY_PATTERNS:
                if pattern.search(sentence):
                    issues.append((
                        "tautology",
                        "paragraph %d repeats itself (%s): %s"
                        % (index, label, sentence[:140].strip()),
                    ))
                    break
    return issues


def _canonical_spelling(registry_text: str, text: str):
    """The registry's own spelling of a phrase, when it differs only in case.

    The registry keeps the source's words, so when the body spells a title
    its own way ("That'll Be The Day" against the registry's "That'll Be the
    Day") the right form can be read off the registry instead of guessed at.
    Returns an empty string when the body already matches the registry.
    """
    flat_registry = re.sub(r"\s+", " ", registry_text or "")
    flat_text = re.sub(r"\s+", " ", (text or "").strip())
    if not flat_text:
        return ""
    found = ""
    # The match has to stand on word boundaries: "ONE" must not be found
    # inside "alone".
    pattern = r"(?<![0-9a-z])%s(?![0-9a-z])" % re.escape(flat_text)
    for m in re.finditer(pattern, flat_registry, re.I):
        if m.group(0) == flat_text:
            return ""
        if not found:
            found = m.group(0)
    return found


def quote_fidelity(body: str, registry_text: str):
    """Every quoted string in the body must exist in a registry quote.

    A quotation is the one place where a writer can put words in someone's
    mouth. The registry is the only place a source's own words are recorded,
    so the body may only quote what the registry quotes.
    """
    issues = []
    if not registry_text:
        return issues
    quoted = re.findall(r"\"([^\"]{2,200})\"", body or "")
    if not quoted:
        return issues
    registry = (registry_text or "").lower()
    registry = re.sub(r"\s+", " ", registry)
    seen = set()
    for text in quoted:
        flat = re.sub(r"\s+", " ", text.strip().lower())
        if not flat:
            continue
        # The spelling of a title has to be the source's spelling. A title
        # that reads right but capitalises its words differently is still a
        # different title to the reader.
        canonical = _canonical_spelling(registry_text, text.strip())
        if canonical and canonical.lower() not in seen:
            seen.add(canonical.lower())
            issues.append((
                "quote-capitalization",
                "the quotation %r is written %r in the fact registry; use the "
                "source's own spelling" % (text.strip()[:80], canonical[:80]),
            ))
            continue
        if flat in registry:
            continue
        # A title that ends a clause carries the comma inside the quotes
        # ("BELIEVE,"), and the registry writes the title without it. That is
        # the same title, so the punctuation is compared away.
        bare = flat.rstrip(".,!?;:")
        if bare and bare in registry:
            continue
        # A long quotation may be quoted in the body with different internal
        # punctuation. Fall back to a word-run comparison.
        words = [w for w in re.findall(r"[a-z0-9']+", flat) if len(w) > 2]
        if len(words) >= 6:
            run = " ".join(words[:6])
            if run in registry:
                continue
        issues.append((
            "quote-unverified",
            "the quotation %r does not appear in the fact registry; a quoted "
            "sentence has to be the source's own words" % text.strip()[:100],
        ))
    return issues


def registry_usage(body: str, registry_text: str):
    """Registry lines the body never uses, and body claims no line covers.

    * An unused line usually means the registry was copied from another story
      * or was written before the angle changed. Both are how facts get mixed.
    * A body fact no line covers is already reported by `factcheck.py`. This
      rule adds the reverse direction, which is what catches mixing.
    """
    issues = []
    if not registry_text:
        return issues
    body_flat = re.sub(r"\s+", " ", (body or "").lower())
    for raw in registry_text.splitlines():
        line = raw.strip()
        if not line.startswith("- "):
            continue
        parts = [p.strip() for p in line[2:].split("|")]
        if len(parts) < 3:
            continue
        claim, quote = parts[0], parts[2]
        claim_words = [w for w in re.findall(r"[a-z0-9']+", claim.lower()) if len(w) > 3]
        if not claim_words:
            continue
        # The line counts as used when a distinctive part of it is in the body.
        distinctive = [w for w in claim_words if w not in STOPWORDS]
        if not distinctive:
            continue
        hit = any(w in body_flat for w in distinctive)
        if not hit:
            # Numbers and names are the distinctive part of most lines.
            hit = any(w in body_flat for w in re.findall(r"\d+", claim))
        if not hit:
            issues.append((
                "registry-unused",
                "the registry line %r is not used in the article; a line the "
                "article never uses is usually a line carried over from "
                "another story" % claim[:90],
            ))
    return issues


def cross_post_contamination(body: str, other_artists, registry_text: str = ""):
    """A name that belongs to another artist in the desk must be accounted for.

    The desk holds one post per artist. A name that is the artist of another
    live post is not proof of an error, because collaborations are normal and
    the Jay-Z post names Shakira on purpose. The rule therefore fires only
    when the post's own fact registry never mentions that artist: an
    unregistered name of another artist is how a fact from another story
    walks into this one.
    """
    issues = []
    registry = (registry_text or "").lower()
    for artist in other_artists:
        if not artist or len(artist) < 4:
            continue
        low = (body or "").lower()
        if artist.lower() not in low:
            continue
        if artist.lower() in registry:
            continue
        issues.append((
            "cross-post-name",
            "the article mentions %r, which is the artist of another live "
            "post, and the fact registry does not mention them; if that is a "
            "collaboration, the registry has to name it" % artist,
        ))
    return issues


def _sentences(text: str):
    """Split a text into sentences, keeping abbreviations intact.

    "at 7 p.m. ET on Thursday" is one sentence. Splitting after the period in
    "p.m." would cut the date away from the weekday it belongs to and turn a
    dated announcement into a bare weekday.
    """
    protected = re.sub(r"\b([A-Za-z])\.([A-Za-z])\.", r"\1<DOT>\2<DOT>", text or "")
    parts = re.split(r"(?<=[.!?])\s+", protected)
    return [part.replace("<DOT>", ".") for part in parts]


def bare_weekday(body: str):
    """A weekday used as a date, with no date next to it (29.10.2026).

    "on Monday" tells the reader nothing: they cannot put it on a calendar.
    The owner calls this a hard rule. A weekday next to a date ("on Monday,
    Oct. 26", "on Friday, October 30") is fine, and so is the proper noun
    "Monday Night Football".
    """
    issues = []
    body = body or ""
    for sent in _sentences(body):
        low = sent.lower()
        if "night football" in low:
            continue
        for m in _WEEKDAY_RE.finditer(sent):
            # The date has to be in the same sentence as the weekday, and
            # close enough to be the same event: "on Friday, October 30" is
            # dated, "on Monday" is not, even when the sentence mentions a
            # date somewhere else. The window is wide enough for a sentence
            # that states the event and the weekday in one breath ("The
            # single lands on October 30, and in the United States it
            # arrives the evening before, at 7 p.m. ET on Thursday").
            after = sent[m.end():m.end() + 120]
            before = sent[max(0, m.start() - 120):m.start()]
            if _DATE_NEAR_RE.search(after) or _DATE_NEAR_RE.search(before):
                continue
            issues.append((
                "bare-weekday",
                "the weekday %r stands in for a date the reader cannot place: %s"
                % (m.group("day"), sent.strip()[:110]),
            ))
    return issues


# A weekday standing in for a date, and the date that would fix it.
_WEEKDAY_RE = re.compile(
    r"\b(?:on|this|last|next|every|coming)\s+(?P<day>Monday|Tuesday|Wednesday|"
    r"Thursday|Friday|Saturday|Sunday)\b", re.I)
_DATE_NEAR_RE = re.compile(
    r"\b(?:January|February|March|April|May|June|July|August|September|October|"
    r"November|December)\s+\d{1,2}|\b(?:19|20)\d{2}\b|\b\d{1,2}\s+(?:st|nd|rd|th)\b")


def lint(post, registry_text="", other_artists=()):
    """Return (code, message) findings for one post.

    `registry_text` is the post's fact registry; `other_artists` is the list of
    artists that have their own live post. Both are optional, and a rule that
    needs data it was not given stays silent instead of guessing.
    """
    post = post or {}
    paras = paragraphs(post.get("body") or "")
    issues = []
    if paras:
        issues.extend(sentence_repetition(paras))
        issues.extend(idea_repetition(paras))
        issues.extend(phrase_repetition(paras))
        issues.extend(repeated_run(paras))
        issues.extend(duplicate_word(paras))
        issues.extend(repeated_claim(paras))
        issues.extend(tautology(paras))
    issues.extend(bare_weekday(post.get("body") or ""))
    if registry_text:
        issues.extend(quote_fidelity(post.get("body") or "", registry_text))
        issues.extend(registry_usage(post.get("body") or "", registry_text))
    if other_artists:
        issues.extend(cross_post_contamination(post.get("body") or "", other_artists,
                                               registry_text))
    return issues


# --- owner checks (2026-10-29) ------------------------------------------------
# These run in the gate and in preflight, on the same save/publish path.
# They are not passed through known_debt: a recorded count cannot waive them.

_REPO = Path(__file__).resolve().parent.parent
_FACTS = _REPO / "editorial" / "facts"
_DATA = _REPO / "public" / "data"

# Collaborator separators the owner named, plus the comma Apple uses in a
# credit ("A, B & C"). "and the" and ", the" stay inside a band name.
_ARTIST_SPLIT = re.compile(
    r"\s*(?:&|\+|/(?=\s)|,|\bfeat\.?\b|\bfeaturing\b|\bft\.?\b|\bwith\b|\bx\b|\band\b)\s*",
    re.I,
)
_APPLE_EMB = re.compile(r"\[apple:(?:album|song):(\d+)(?::(\d+))?\]", re.I)
_SPOT_EMB = re.compile(r"\[spotify:(?:album|track):([A-Za-z0-9]+)\]", re.I)
_SPOT_URL = re.compile(
    r"https?://open\.spotify\.com/(?:embed/)?(?:album|track)/([A-Za-z0-9]+)",
    re.I,
)
_APPLE_URL = re.compile(r"album/(?P<album>\d+)(?:\?[^#]*\bi=(?P<track>\d+))?")
_PLAYER_BLOCK = re.compile(
    r"^\[(?:youtube|apple|spotify|tiktok|ig|instagram):[^\]]*\]$",
    re.I,
)
_CLOCK = (
    re.compile(r"\b\d{1,2}:\d{2}\b"),
    # The lookbehind keeps "1:45 p.m." from also matching the slice "45 p.m.".
    re.compile(r"(?<![:\d])\b\d{1,2}\s*(?:a\.?m\.?|p\.?m\.?)\b", re.I),
    re.compile(r"\b(?:ET|EST|EDT|PT|PST|PDT|BST|GMT)\b"),
    re.compile(r"\bEastern\b"),
    re.compile(r"\bmidnight\b", re.I),
    re.compile(r"\brelease timetable\b", re.I),
)
_TECH = re.compile(
    r"\bplays the piano\b|\barranged the strings\b|\bengineered\b|"
    r"\bmixed by\b|\bmastered\b|\bco-produced\b|\bproduced by\b",
    re.I,
)
_PERSON = r"([A-Z][\w'’.-]+(?:\s+(?:de|da|van|von|la|del|the|[A-Z][\w'’.-]+))*)"
_CREDIT_NAME = (
    re.compile(r"(?i:\b(?:co-produced|produced|engineered|mixed|mastered)\s+by\s+)" + _PERSON),
    re.compile(r"\b" + _PERSON + r"\s+plays the piano\b"),
    re.compile(r"\b" + _PERSON + r"\s+arranged the strings\b"),
    re.compile(r"(?i:\barranged the strings with )" + _PERSON),
)
_CATALOG = None


def split_artists(value):
    """Names in a joint credit. One name comes back as a one-item list."""
    text = (value or "").strip()
    if not text:
        return []
    text = re.sub(r"\band\s+the\b", " and_the ", text, flags=re.I)
    text = re.sub(r",\s+the\b", ",_the ", text, flags=re.I)
    parts = []
    for part in _ARTIST_SPLIT.split(text):
        part = part.strip(" ,.;:'\"")
        part = part.replace("and_the", "and the").replace(",_the", ", the")
        part = re.sub(r"\s+", " ", part).strip()
        if part:
            parts.append(part)
    return parts


def _richer(old, new):
    if not old:
        return new
    if not new:
        return old
    if len(split_artists(new)) > len(split_artists(old)):
        return new
    if len(split_artists(new)) == len(split_artists(old)) and len(new) > len(old):
        return new
    return old


def _put(index, key, artist):
    key = str(key or "").strip()
    artist = str(artist or "").strip()
    if len(key) < 6 or not artist:
        return
    index[key] = _richer(index.get(key), artist)


def _walk_catalog(node, index):
    if isinstance(node, dict):
        artist = node.get("artistName") or node.get("artist") or node.get("matchedArtist")
        if isinstance(artist, str) and artist.strip():
            url = node.get("url") if isinstance(node.get("url"), str) else ""
            for match in _APPLE_URL.finditer(url):
                _put(index, match.group("album"), artist)
                if match.group("track"):
                    _put(index, match.group("track"), artist)
            for key in ("id", "collectionId", "trackId"):
                value = node.get(key)
                if isinstance(value, int) or (isinstance(value, str) and value.isdigit()):
                    _put(index, value, artist)
            sid = node.get("spotifyId")
            if isinstance(sid, str):
                _put(index, sid, node.get("matchedArtist") or artist)
        for value in node.values():
            if isinstance(value, (dict, list)):
                _walk_catalog(value, index)
    elif isinstance(node, list):
        for value in node:
            if isinstance(value, (dict, list)):
                _walk_catalog(value, index)


def player_catalog():
    """Apple and Spotify ids mapped to the artist credit stored in this repo.

    The gate does not call Apple or Spotify. If an id is not in this catalog,
    the collab check cannot see who the player lists.
    """
    global _CATALOG
    if _CATALOG is not None:
        return _CATALOG
    index = {}
    if _DATA.is_dir():
        for path in _DATA.rglob("*.json"):
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
            except Exception:
                continue
            _walk_catalog(data, index)
    _CATALOG = index
    return index


def _registry_text(post, context=None):
    if context and context.get("registry"):
        return context.get("registry")
    pid = str((post or {}).get("id") or "").strip()
    if not pid:
        return None
    path = _FACTS / ("%s.md" % pid)
    if not path.is_file():
        return None
    try:
        return path.read_text(encoding="utf-8")
    except Exception:
        return None


def _names_in(text, name):
    return name.casefold() in (text or "").casefold()


def _rendered_headline(post):
    title = (post.get("title") or "").strip()
    artist = (post.get("artist") or "").strip()
    if (post.get("type") or "").strip().lower() == "release" and artist and title:
        return "%s - %s" % (artist, title)
    return title


def _player_ids(body):
    """(label, catalog key) for every Apple or Spotify player in the body."""
    found = []
    for match in _APPLE_EMB.finditer(body or ""):
        album, track = match.group(1), match.group(2)
        found.append(("apple", track or album, (track, album)))
    for match in _SPOT_EMB.finditer(body or ""):
        found.append(("spotify", match.group(1), (match.group(1),)))
    for match in _SPOT_URL.finditer(body or ""):
        found.append(("spotify", match.group(1), (match.group(1),)))
    return found


def _resolve_player(keys, catalog):
    best = None
    for key in keys:
        if key and catalog.get(key):
            best = _richer(best, catalog[key])
    return best


def collab_issues(post, context=None):
    """Release collabs: every billed artist in the headline/deck and sentence one.

    The artist field and any Apple or Spotify player are the billing. A player
    whose credit is not in the local catalog fails, because the check cannot
    compare that credit to the fact registry offline.
    """
    post = post or {}
    if (post.get("type") or "").strip().lower() != "release":
        return []
    import canon_checks

    body = post.get("body") or ""
    required = []
    issues = []
    field = split_artists(post.get("artist") or "")
    if len(field) >= 2:
        required.extend(field)
    catalog = player_catalog()
    for label, shown, keys in _player_ids(body):
        credit = _resolve_player(keys, catalog)
        if not credit:
            issues.append((
                "collab",
                "%s player %s could not be read offline, so its artists cannot "
                "be compared to the registry" % (label, shown),
            ))
            continue
        parts = split_artists(credit)
        if len(parts) >= 2:
            required.extend(parts)
    seen = set()
    names = []
    for name in required:
        key = name.casefold()
        if key in seen:
            continue
        seen.add(key)
        names.append(name)
    if not names and not issues:
        return []
    headline = _rendered_headline(post)
    deck = post.get("excerpt") or ""
    header = headline + "\n" + deck
    first = ""
    paras = canon_checks.prose_paragraphs(body)
    if paras:
        bits = canon_checks.sentences(paras[0])
        first = bits[0] if bits else paras[0]
    for name in names:
        if not _names_in(header, name):
            issues.append((
                "collab",
                "collaborator %r is missing from the headline/deck" % name,
            ))
        if not _names_in(first, name):
            issues.append((
                "collab",
                "collaborator %r is missing from the first sentence" % name,
            ))
    if names:
        registry = _registry_text(post, context)
        if registry is None:
            issues.append((
                "collab",
                "collab artists cannot be compared to a fact registry offline",
            ))
        else:
            for name in names:
                if not _names_in(registry, name):
                    issues.append((
                        "collab",
                        "collaborator %r is not in the fact registry" % name,
                    ))
    return issues


def media_position_issues(post):
    """The first video or player sits mid-text, not under the opening paragraph."""
    import canon_checks

    body = (post or {}).get("body") or ""
    blocks = canon_checks.split_blocks(body)
    total = canon_checks.prose_word_count(body)
    prose_n = len(canon_checks.prose_paragraphs(body))
    words_before = 0
    paras_before = 0
    found = False
    in_awards = False
    for block in blocks:
        low = block.lower()
        if low == "[awards]":
            in_awards = True
            continue
        if low == "[/awards]":
            in_awards = False
            continue
        if in_awards:
            continue
        if _PLAYER_BLOCK.fullmatch(block):
            found = True
            break
        if canon_checks.MEDIA_BLOCK.fullmatch(block):
            continue
        paras_before += 1
        words_before += len(canon_checks.WORD_RE.findall(block))
    if not found:
        return []
    ratio = (words_before / float(total)) if total else 0.0
    middle = prose_n > 0 and abs(paras_before - (prose_n / 2.0)) <= 0.5
    in_band = total > 0 and 0.35 <= ratio <= 0.70
    if paras_before >= 2 and (in_band or middle):
        return []
    return [(
        "media-position",
        "first video/player follows paragraph %d of %d (%.0f%% of prose words); "
        "it must not follow paragraph 1 and must sit mid-text "
        "(35-70%% of prose words, or the middle by paragraph count)"
        % (paras_before, prose_n, ratio * 100),
    )]


def release_time_issues(post):
    """No clock time, time zone, midnight, or release timetable in the copy."""
    import canon_checks

    post = post or {}
    prose = canon_checks.prose_text(post.get("body") or "")
    sample = "\n".join([
        post.get("title") or "",
        post.get("excerpt") or "",
        prose,
    ])
    sample = canon_checks.URL_RE.sub(" ", sample)
    found = []
    for pattern in _CLOCK:
        for match in pattern.finditer(sample):
            token = re.sub(r"\s+", " ", match.group(0)).strip()
            if token and token not in found:
                found.append(token)
    if not found:
        return []
    shown = ", ".join(found[:8])
    return [(
        "release-time",
        "release or premiere time in the copy: %s" % shown,
    )]


def card_src_issues(post):
    """cardSrc is the square crop of a diptych, which has a second credit."""
    cover = (post or {}).get("cover") or {}
    if not isinstance(cover, dict):
        return []
    if str(cover.get("cardSrc") or "").strip() and not str(cover.get("credit2") or "").strip():
        return [(
            "card-src",
            "cover.cardSrc is set without credit2; a square card image is only for a diptych",
        )]
    return []


def owner_failures(post, context=None):
    """FAIL checks the owner added on 2026-10-29. Not waived by known debt."""
    post = post or {}
    issues = []
    issues.extend(collab_issues(post, context))
    issues.extend(media_position_issues(post))
    issues.extend(release_time_issues(post))
    issues.extend(card_src_issues(post))
    return issues


def _credit_names(sentence):
    names = []
    for pattern in _CREDIT_NAME:
        for match in pattern.finditer(sentence or ""):
            name = re.sub(r"\s+", " ", match.group(1)).strip(" ,.;:")
            if name and name not in names:
                names.append(name)
    return names


def credit_padding_warnings(post):
    """A technical credit whose person never appears anywhere else."""
    import canon_checks

    post = post or {}
    body = post.get("body") or ""
    sentences = []
    for para in canon_checks.prose_paragraphs(body):
        sentences.extend(canon_checks.sentences(para) or [para])
    warnings = []
    seen = set()
    header = "\n".join([post.get("title") or "", post.get("excerpt") or ""])
    for index, sentence in enumerate(sentences):
        if not _TECH.search(sentence):
            continue
        names = _credit_names(sentence)
        elsewhere = "\n".join(sentences[:index] + sentences[index + 1:])
        blob = header + "\n" + elsewhere
        if not names:
            key = ("bare", sentence[:80])
            if key not in seen:
                seen.add(key)
                warnings.append((
                    "credit-padding",
                    "technical credit names nobody who appears elsewhere: %s"
                    % sentence.strip()[:140],
                ))
            continue
        for name in names:
            if _names_in(blob, name):
                continue
            if name.casefold() in seen:
                continue
            seen.add(name.casefold())
            warnings.append((
                "credit-padding",
                "%s is only in a technical credit, not elsewhere in the post" % name,
            ))
    return warnings


def short_paragraph_warnings(post):
    """A prose paragraph under 60 words. A warning, not a failure."""
    import canon_checks

    warnings = []
    for index, para in enumerate(canon_checks.prose_paragraphs((post or {}).get("body") or ""), 1):
        count = len(canon_checks.WORD_RE.findall(para))
        if count < 60:
            warnings.append((
                "short-paragraph",
                "paragraph %d is %d prose words, under 60" % (index, count),
            ))
    return warnings


def owner_warnings(post):
    """WARN checks the owner added on 2026-10-29. They do not block a save."""
    post = post or {}
    warnings = []
    warnings.extend(credit_padding_warnings(post))
    warnings.extend(short_paragraph_warnings(post))
    return warnings
