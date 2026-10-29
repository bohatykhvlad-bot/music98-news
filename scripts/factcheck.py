#!/usr/bin/env python3
"""Cross-check a post body against its fact registry.

The registry is a markdown file in `editorial/facts/<post-id>.md`. One claim per
line, so a human can read it and a machine can diff it against the article:

    - <claim> | <source url> | <exact quote from the source>

Why this exists
---------------
`editorial/CANON.md` section 1 already asks for a source-backed registry of every
checkable fact before writing, and section 6 asks for a final check of the facts.
Neither was mechanically enforced: the gate only reads prose, so a fact that never
reached the registry looked exactly like a fact that was verified. This module is
that missing link. It extracts every checkable claim from the body (years,
numbers, quoted titles, multi-word proper names, dates) and requires each one to
be covered by the registry. Anything missing is a FAIL: the article says something
the registry cannot back.

It proves nothing about truth. It proves coverage, which is the part that silently
used to fail.
"""
from __future__ import annotations

import re
from pathlib import Path

MONTHS = ("january february march april may june july august september "
          "october november december")

# Function words that must not be treated as the noun of a quantified claim.
NON_NOUN_AFTER_NUMBER = {
    "of", "and", "or", "but", "to", "in", "on", "at", "for", "with", "by",
    "from", "as", "is", "was", "were", "are", "be", "been", "it", "its", "that",
    "this", "than", "then", "there", "here", "who", "what", "when", "where",
    "which", "while", "after", "before", "over", "under", "again", "still",
    "also", "just", "not", "no", "if", "so", "because", "both", "each", "every",
    "other", "another", "any", "all", "more", "most", "some", "many", "much",
    "own", "same", "very", "into", "out", "up", "down", "off", "about", "i",
    "he", "she", "they", "we", "you", "his", "her", "their", "these", "those",
}

NUMBER_WORDS = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7,
    "eight": 8, "nine": 9, "ten": 10, "eleven": 11, "twelve": 12,
    "thirteen": 13, "fourteen": 14, "fifteen": 15, "sixteen": 16,
    "seventeen": 17, "eighteen": 18, "nineteen": 19, "twenty": 20,
    "thirty": 30, "forty": 40, "fifty": 50, "sixty": 60, "seventy": 70,
    "eighty": 80, "ninety": 90, "hundred": 100, "thousand": 1000,
    "million": 1000000, "billion": 1000000000, "dozen": 12,
}

# Multi-word proper names. Single capitalised words are ignored on purpose:
# "Kesha", "Usher" and "Rihanna" are also ordinary words, and a false FAIL on a
# first name teaches the writer to ignore the checker.
PROPER_NAME_RE = re.compile(
    r"(?<![.!?]\s)(?<!\*)\b[A-Z][a-zÀ-ÖØ-öø-ÿ'’-]+(?:\s+[A-Z][a-zÀ-ÖØ-öø-ÿ'’-]+)+\b"
)
QUOTED_RE = re.compile(r'"([^"]{2,90})"')
YEAR_RE = re.compile(r"\b(?:19|20)\d{2}\b")
DIGIT_RE = re.compile(r"\b\d{1,3}(?:,\d{3})*(?:\.\d+)?\b")
# A compact figure: "400K", "1.2M", "3B". Music journalism writes round
# numbers this way, and on 29.10 the owner pointed out that "400,000" is
# written "400K". Without this the compact form was not extracted at all,
# so a figure that no source supports passed the check in silence.
COMPACT_RE = re.compile(r"\b(\d{1,4}(?:\.\d+)?)\s?([KMB])\b", re.I)

_COMPACT_MULT = {"k": 1000, "m": 1000000, "b": 1000000000}


def _compact_value(digits: str, suffix: str):
    """400K -> 400000, 1.5M -> 1500000. None when the figure is not compact."""
    try:
        value = float(digits) * _COMPACT_MULT[suffix.lower()]
    except (KeyError, ValueError):
        return None
    return int(value)
DATE_RE = re.compile(
    r"\b(%s)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?\b" % "|".join(MONTHS.split()),
    re.I,
)

# Names that are part of the site's own furniture, not of the story.
KNOWN_NON_FACTS = {"super bowl", "monday night football"}


def _norm(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").replace("’", "'")).strip().lower()


# Units that make a number mean something specific: "43 regions" is not the
# same claim as "43 songs". The word right after the number is the unit.
_UNIT_STOP = {
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "of", "for", "to",
    "from", "with", "by", "as", "is", "was", "were", "are", "be", "been",
    "that", "which", "who", "when", "where", "while", "after", "before",
    "it", "its", "he", "she", "they", "them", "his", "her", "their", "you",
    "not", "no", "if", "than", "then", "so", "up", "out", "over", "into",
}


def _date_owns(text: str, pos: int) -> bool:
    """True when the number at pos belongs to a date ("September 4")."""
    for m in DATE_RE.finditer(text or ""):
        if m.start(2) == pos:
            return True
    return False


def _definite_before(text: str, pos: int) -> bool:
    """True when a number word is preceded by "the" - a back-reference."""
    before = (text or "")[:pos].rstrip().lower()
    return before.endswith("the") or before.endswith("these") or before.endswith("those")


def _unit_of(text: str) -> str:
    """The word a number counts, so "43 regions" binds to "43 regions"."""
    m = re.match(r"\s*(?:[0-9][0-9,]*|(?:%s))\s+([A-Za-z][A-Za-z'’-]*)" % "|".join(NUMBER_WORDS),
                 (text or "").strip(), re.I)
    if not m:
        return ""
    unit = m.group(1).lower()
    if unit in _UNIT_STOP or unit.endswith("ing") or unit.endswith("ed"):
        return ""
    return unit


def _unit_after(text: str, pos: int) -> str:
    """The unit word right after a number in the body, if it is a real unit.

    A clock time ("7 p.m.") and a date ("the September 4 single") carry no
    unit: the number is bound by the date, not by the next noun.
    """
    tail = (text or "")[pos:pos + 40].lstrip()
    # "7 p.m." / "7 pm" / "7 a.m." - a clock time, not a counted thing.
    if re.match(r"(?:p|a)\.?\s?m\.?", tail, re.I):
        return ""
    m = re.match(r"([A-Za-z][A-Za-z'’-]*)", tail)
    if not m:
        return ""
    unit = m.group(1)
    low = unit.lower()
    if low in _UNIT_STOP or low in NON_NOUN_AFTER_NUMBER:
        return ""
    if low.endswith("ing") or low.endswith("ed"):
        return ""
    return low


def _needles(kind: str, text: str):
    """Acceptable ways for the registry to mention this claim."""
    norm = _norm(text)
    out = [norm]
    if kind == "number":
        # A number may be written as a digit or a word in the registry.
        value = NUMBER_WORDS.get(norm.split(" ")[0])
        if value is None:
            raw = norm.split(" ")[0].replace(",", "")
            try:
                value = int(raw)
            except ValueError:
                value = None
        if value is not None:
            out.append(str(value))
            out.append("{:,}".format(value))
            for suffix, mult in _COMPACT_MULT.items():
                if value % mult == 0 and value // mult >= 1:
                    out.append("%d%s" % (value // mult, suffix.upper()))
                exact = value / float(mult)
                if exact >= 1:
                    out.append("%g%s" % (exact, suffix.upper()))
            # A bare digit proves nothing: "43 regions" must not be covered by
            # any "30" that happens to sit in the registry (a release date, a
            # clock time). Bind the number to the unit it counts, so the
            # registry has to say "43 regions" to cover "43 regions".
            unit = _unit_of(text)
            if unit:
                out.append("%s %s" % (str(value), unit))
    if kind == "name":
        # A surname alone identifies the person. Only a trailing possessive is
        # dropped: strip("'s") would also eat the first letter of a surname
        # that starts with s ("September" -> "eptember").
        parts = norm.split(" ")
        if len(parts) > 1:
            out.append(re.sub(r"'s$", "", parts[-1]))
    if kind == "title":
        out.append(norm.rstrip("."))
        out.append(norm.rstrip(".,"))
        out.append(norm.rstrip(".,!?"))
    return [n for n in out if n]


def _covered(kind: str, text: str, searchable: str) -> bool:
    # A number with a unit must be found together with that unit. A bare
    # digit match is not enough: "30 regions" was covered by any "30" in the
    # registry, which is how a wrong figure slipped past the check.
    if kind == "number":
        unit = _unit_of(text)
        if unit:
            needles = [n for n in _needles(kind, text) if n.strip() != str(_norm(text).split(" ")[0])]
            value = NUMBER_WORDS.get(_norm(text).split(" ")[0])
            if value is None:
                try:
                    value = int(_norm(text).split(" ")[0].replace(",", ""))
                except ValueError:
                    value = None
            if value is not None:
                # The pair may be written with a hyphen ("an eight-song EP"),
                # and the number may be a word there ("eight" for 8).
                spellings = {str(value)}
                # The registry may write a round figure the way music
                # journalism does ("400K") while the body writes it out, or the
                # other way round. "400K copies" and "400,000 copies" are one
                # claim, so both spellings have to be accepted.
                for suffix, mult in _COMPACT_MULT.items():
                    if value % mult == 0 and value // mult >= 1:
                        whole = value // mult
                        spellings.add("%d%s" % (whole, suffix.upper()))
                        spellings.add("%d,%s" % (whole, suffix.upper()))
                    # A figure that is not a whole multiple keeps its decimal:
                    # "1.2M copies" is not "1M copies".
                    exact = value / float(mult)
                    if exact >= 1:
                        spellings.add("%g%s" % (exact, suffix.upper()))
                spellings.add("{:,}".format(value))
                # The registry may spell the number out ("an eight-song EP").
                for word, num in NUMBER_WORDS.items():
                    if num == value:
                        spellings.add(word)
                for spelling in spellings:
                    # The unit may be singular in the registry where the body
                    # has the plural ("an eight-song EP" vs "eight songs").
                    unit_pat = re.escape(unit)
                    if unit.endswith("s") and len(unit) > 3:
                        unit_pat = r"(?:%s|%s)" % (unit_pat, re.escape(unit[:-1]))
                    # The registry is searched in lower case, so the spelling of
                    # the figure has to be matched without regard to case:
                    # "400K" in the registry has to cover "400K" in the body.
                    pair = re.compile(
                        r"(?<![0-9a-z])%s[\s-]+%s(?![0-9a-z])" % (re.escape(spelling), unit_pat),
                        re.IGNORECASE)
                    if pair.search(searchable):
                        return True
            for needle in needles:
                if re.search(r"(?<![0-9a-z])%s(?![0-9a-z])" % re.escape(needle),
                             searchable, re.IGNORECASE):
                    return True
            return False
    for needle in _needles(kind, text):
        if re.search(r"(?<![0-9a-z])%s(?![0-9a-z])" % re.escape(needle),
                     searchable, re.IGNORECASE):
            return True
    return False


def extract_claims(body: str):
    """Return the checkable claims in a post body.

    Each claim is a dict with `kind` and `text`. The list is de-duplicated, so
    two runs over the same body produce the same report.
    """
    claims = []
    seen = set()

    def add(kind, text):
        text = (text or "").strip()
        key = (kind, _norm(text))
        if not text or key in seen:
            return
        seen.add(key)
        claims.append({"kind": kind, "text": text})

    text = body or ""
    # A photo token carries layout parameters after the credit: the crop
    # position ("50% 30%") and the zoom. They are not prose claims, so they
    # are not facts to back in the registry. The credit itself stays.
    text = re.sub(r"\[photo:([^\]|]*)\|([^\]|]*)\|([^\]|]*)\|[^\]]*\]",
                  r"[photo:\1|\2|\3]", text)

    for m in DATE_RE.finditer(text):
        month, day, year = m.group(1), m.group(2), m.group(3)
        label = "%s %s" % (month.title(), day)
        if year:
            label += ", %s" % year
        add("date", label)
        if year:
            add("year", year)

    for m in YEAR_RE.finditer(text):
        add("year", m.group(0))

    for m in QUOTED_RE.finditer(text):
        q = m.group(1).strip()
        if q and not q.startswith("http"):
            add("title", q)

    for m in PROPER_NAME_RE.finditer(text):
        name = m.group(0).strip()
        if "*" in name or "http" in name:
            continue
        # "The September 4 single" is a date, not a name. A phrase whose last
        # word is a month is read as a date and covered by the date claim.
        if name.split()[-1].lower() in MONTHS.split():
            continue
        if _norm(name) in KNOWN_NON_FACTS:
            continue
        add("name", name)

    # Compact figures first: "400K copies" is one claim. The plain-digit
    # pattern would see "400" and then read "K" as a unit, which is not the
    # claim the writer made.
    for m in COMPACT_RE.finditer(text):
        value = _compact_value(m.group(1), m.group(2))
        if value is None:
            continue
        unit = _unit_after(text, m.end())
        if unit:
            add("number", "%d %s" % (value, unit))
        else:
            add("number", str(value))

    for m in DIGIT_RE.finditer(text):
        raw = m.group(0)
        # Skip the digits of a compact figure: "400K" was already handled.
        if m.end() < len(text) and text[m.end():m.end() + 2].strip()[:1].upper() in "KMB" \
                and not text[m.end():m.end() + 2].strip()[1:2].isalpha():
            continue
        if YEAR_RE.fullmatch(raw):
            continue
        # Keep the unit with the number: "43 regions" is one claim, and the
        # registry has to back that pair, not any 43 in the file. A number that
        # belongs to a date ("the September 4 single") keeps no unit.
        if _date_owns(text, m.start()):
            add("number", raw)
            continue
        unit = _unit_after(text, m.end())
        if unit:
            add("number", "%s %s" % (raw, unit))
        else:
            add("number", raw)

    # Number words used as a quantity ("eight albums", "two days").
    for m in re.finditer(r"\b(%s)\b" % "|".join(NUMBER_WORDS), text, re.I):
        word = m.group(1).lower()
        unit = _unit_after(text, m.end())
        if not unit:
            continue
        # "the two close the song" is a back-reference to two people already
        # named, not a quantity to verify. "an EP of eight songs" is.
        if _definite_before(text, m.start()):
            continue
        # Bind the word to its unit too, so "six nights" cannot be covered by
        # any "six" in the registry.
        add("number", "%s %s" % (word, unit))

    return claims


# --- registry hygiene and claim support ---------------------------------------
#
# The owner's order of work (29.10.2026): write the facts down first, each one
# with its source, then write the article only from those facts, then check the
# article against the registry. The checks below make that order mechanical.
#
# Two directions are checked:
#   registry -> text : every line of the registry must be a usable, sourced,
#                      quoted fact (hygiene), and every figure or date a claim
#                      states must be carried by that claim's own quote.
#   text -> registry : every checkable claim in the body must be covered by the
#                      registry (the existing coverage check).

MONTH_RE = re.compile(
    r"(?<![0-9a-z])(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|"
    r"jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|"
    r"dec(?:ember)?)\.?(?![0-9a-z])", re.I)

MONTH_NUMBER = {"jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
                "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12}

# A registry line that still holds a placeholder is not a fact yet. Only the
# claim is inspected: a source URL is allowed to look like anything.
PLACEHOLDERS = ("todo", "tbd", "fixme", "lorem ipsum", "to be confirmed")

# Wording that puts two events in a stated order. A claim that uses one of
# these is describing a sequence, and a sequence needs two sources: one
# outlet can report the order wrong (29.10.2026, BigX).
SEQUENCE_MARKERS = ("started with", "began with", "followed by", "preceded by",
                    "and then", "then came", "went on to", "before that",
                    "after that", "first, then", "then, in")

# A photo-manifest line: it belongs to the `## Photos` section, not to the
# list of claims.
PHOTO_LINE = re.compile(r"^-\s*(cover|photo)\s+photos/\S+?\s*\|")

# Units a spelled-out number can count. Without this, "the announcement
# trailer for this one went up" would read as "one went", and a number word
# followed by a verb would be treated as a quantity to verify.
COUNTABLE_UNITS = {
    "track", "tracks", "song", "songs", "single", "singles", "album", "albums",
    "ep", "eps", "date", "dates", "show", "shows", "tour", "tours", "day", "days",
    "night", "nights", "week", "weeks", "month", "months", "year", "years",
    "minute", "minutes", "hour", "hours", "guest", "guests", "artist", "artists",
    "person", "people", "time", "times", "time", "million", "thousand", "billion",
    "copy", "copies", "viewer", "viewers", "follower", "followers", "point",
    "points", "seat", "seats", "city", "cities", "state", "states", "country",
    "countries", "part", "parts", "chapter", "chapters", "episode", "episodes",
    "piece", "pieces", "time", "member", "members", "nomination", "nominations",
    "award", "awards", "record", "records", "appearance", "appearances",
    "collaboration", "collaborations", "label", "labels", "venue", "venues",
    "stadium", "stadium", "arena", "arena", "cover", "covers", "mixtape",
    "mixtapes", "candidate", "candidates", "season", "seasons", "series",
    "festival", "festivals", "release", "releases", "stream", "streams",
}


def _number_value(label: str):
    """The integer a number claim states, whatever way it is written."""
    first = (label or "").split(" ")[0].strip().lower().replace(",", "")
    if first in NUMBER_WORDS:
        return NUMBER_WORDS[first]
    try:
        return int(first)
    except ValueError:
        return None


def _number_spellings(value: int):
    forms = {str(value), "{:,}".format(value)}
    for word, num in NUMBER_WORDS.items():
        if num == value:
            forms.add(word)
    for suffix, mult in _COMPACT_MULT.items():
        if value % mult == 0 and value // mult >= 1:
            forms.add("%d%s" % (value // mult, suffix.upper()))
            forms.add("{:,}".format(value // mult) + suffix.upper())
        exact = value / float(mult)
        if exact >= 1:
            forms.add("%g%s" % (exact, suffix.upper()))
    return forms


def _number_in_quote(value: int, quote: str) -> bool:
    # A figure in a source is often written with its unit attached ("7PM EDT",
    # "18th", "18 songs"), so a letter may follow the digits.
    return any(re.search(r"(?<![0-9a-z])%s(?![0-9])" % re.escape(f), quote, re.I)
               for f in _number_spellings(value))


def _date_in_quote(label: str, quote: str):
    """True when the quote carries the date, 'day' when the days disagree.

    A quote that omits the year is accepted (the article prints "Oct. 26"),
    and a claim without a year is matched on month and day. A date written in
    ISO form ("2026-10-09") is read as a full date.
    """
    m = re.match(r"([A-Za-z]+)\s+(\d{1,2})(?:,)?(?:\s*(\d{4}))?$", (label or "").strip())
    if not m:
        return None
    month, day, year = m.group(1), m.group(2), m.group(3)
    for iso in re.finditer(r"(?<![0-9])(\d{4})-(\d{2})-(\d{2})(?![0-9])", quote):
        if int(iso.group(2)) != MONTH_NUMBER.get(month.lower()[:3], 0):
            continue
        if int(iso.group(3)) != int(day):
            return "day"
        if year and iso.group(1) != year:
            continue
        return True
    for mm in MONTH_RE.finditer(quote):
        if mm.group(1).lower()[:3] != month.lower()[:3]:
            continue
        tail = quote[mm.end():mm.end() + 40]
        dm = re.match(r"\.?\s*,?\s*(\d{1,2})(?:st|nd|rd|th)?(?:\s*,?\s*(\d{4}))?",
                      tail)
        if not dm:
            continue
        qday, qyear = dm.group(1), dm.group(2)
        if year and qyear and qyear != year:
            continue
        if qday != day:
            return "day"
        return True
    return False


def claim_figures(claim: str):
    """The figures and dates a claim states.

    Names and titles are left out on purpose: a source often says "he" where
    the registry says "Hamish Hamilton", and a title may be spelled out in the
    source. A number or a date cannot be paraphrased away, so those are the
    load-bearing parts of a claim.

    A spelled-out number ("eighteen tracks") is often the writer's own count
    of what the source lists, so it is reported as a warning; a number written
    in digits is expected to be in the quote and is reported as a failure.
    """
    text = re.sub(r"\*[^*]{2,90}\*", " ", claim or "")
    text = re.sub(r"\"[^\"]{2,90}\"", " ", text)
    out = []
    dates = []
    for c in extract_claims(text):
        if c["kind"] == "date":
            dates.append(c["text"])
    # The digits inside a date belong to that date; they are checked with it.
    bare = text
    for d in dates:
        bare = bare.replace(d, " ")
    for c in extract_claims(bare):
        if c["kind"] == "number":
            parts = c["text"].split(" ")
            first = parts[0].lower()
            spelled = not first.isdigit()
            if spelled:
                unit = parts[1].lower() if len(parts) > 1 else ""
                if unit not in COUNTABLE_UNITS:
                    continue
            out.append(("number", c["text"], "warn" if spelled else "fail"))
        elif c["kind"] == "year":
            out.append(("number", c["text"], "fail"))
    for d in dates:
        out.append(("date", d, "fail"))
    return out


def quote_supports_claim(claim: str, quote: str):
    """Does the quote carry the figures and dates the claim states?

    Returns (missing, mismatched), each item a (label, severity) pair. A claim
    that packs two facts from two sources into one line shows up here: the
    quote of that line cannot carry both. That is the defect that produced
    "his own label" and the wrong producer credit in the Jay-Z post.
    """
    q = " ; ".join(part.strip() for part in (quote or "").split(" / "))
    missing, mismatched = [], []
    for kind, label, severity in claim_figures(claim):
        if kind == "number":
            value = _number_value(label)
            if value is None:
                continue
            if not _number_in_quote(value, q):
                missing.append((label, severity))
        else:
            state = _date_in_quote(label, q)
            if state is False:
                missing.append((label, severity))
            elif state == "day":
                mismatched.append((label, severity))
    return missing, mismatched


def registry_findings(ledger_text: str):
    """Findings about the registry itself.

    Returns a list of (severity, code, message). Severity is "fail" or "warn".
    """
    out = []
    for entry in ledger_claims(ledger_text):
        claim = entry["claim"]
        source = entry["source"]
        quote = entry["quote"]
        if not claim or len(claim) < 8:
            out.append(("fail", "registry-empty-claim",
                        "registry line has no usable claim: %r" % claim[:60]))
        low = claim.lower()
        for placeholder in PLACEHOLDERS:
            if placeholder in low:
                out.append(("fail", "registry-placeholder",
                            "registry line is still a placeholder: %s" % claim[:70]))
                break
        if not source:
            out.append(("fail", "registry-no-source",
                        "registry line without a source: %s" % claim[:70]))
        elif not re.match(r"^https?://", source.strip()):
            out.append(("fail", "registry-bad-source",
                        "registry source is not an http(s) URL: %s" % claim[:70]))
        if not quote:
            out.append(("fail", "registry-no-quote",
                        "registry line without the source's own words: %s" % claim[:70]))
            continue
        missing, mismatched = quote_supports_claim(claim, quote)
        for item, severity in missing:
            out.append((severity, "registry-claim-unsupported",
                        "the claim states %s but its own quote does not carry it: %s"
                        % (item, claim[:70])))
        for item, severity in mismatched:
            out.append(("warn", "registry-claim-date-mismatch",
                        "the claim and its quote disagree on the day (%s): %s"
                        % (item, claim[:70])))
        # A claim that puts two events in a stated order is the one kind of
        # line where a single source is not enough. The order IS the fact, and
        # one article can report it the wrong way round: on 29.10.2026 the
        # BigX campaign sequence was written from a single outlet that had
        # the order backwards, and the registry repeated it. Two independent
        # sources have to agree before a sequence goes into the text.
        if claim:
            sources = set(re.findall(r"https?://\S+", entry.get("line", "")))
            low_claim = claim.lower()
            if len(sources) < 2 and any(marker in low_claim for marker in SEQUENCE_MARKERS):
                out.append(("fail", "registry-order-single-source",
                            "the claim states a sequence of events but cites only one source, "
                            "so the order can be wrong: %s" % claim[:70]))
    return out


def read_ledger(path) -> str:
    p = Path(path)
    if not p.exists():
        return ""
    return p.read_text(encoding="utf-8", errors="replace")


def ledger_claims(ledger_text: str):
    """Parse the registry into claims.

    A line looks like `- <claim> | <source url> | <quote> / <url> / <quote> ...`.
    The third field is a chain of quotes and their links, and a quote may hold
    a table row with pipes inside it, so the line is split at most twice and
    everything after the second separator stays with the quote.

    The photo section (`## Photos`) is not a list of claims and is skipped.
    """
    out = []
    for raw in (ledger_text or "").splitlines():
        line = raw.strip()
        if line.startswith("##"):
            break
        if not line.startswith("- "):
            continue
        parts = [p.strip() for p in line[2:].split("|", 2)]
        if not parts:
            continue
        claim = parts[0]
        # "- cover photos/x.jpg | ..." belongs to the photo section.
        if PHOTO_LINE.match(line):
            continue
        source = parts[1] if len(parts) > 1 else ""
        quote = parts[2] if len(parts) > 2 else ""
        out.append({
            "claim": claim,
            "source": source,
            "quote": quote,
            "line": line,
            "has_source": bool(source),
            "has_quote": bool(quote),
        })
    return out


def check(body: str, ledger_text: str, coverage_only: bool = False):
    """Return (fails, warns, info) for one body against one registry.

    With `coverage_only` the registry's own hygiene is left out and only the
    text-to-registry direction is reported; the gate uses that mode because it
    checks the registry separately and with severities.
    """
    entries = ledger_claims(ledger_text)
    searchable = _norm(ledger_text)
    fails, warns, info = [], [], []

    if not entries:
        fails.append("registry is empty: no '- <claim> | <source> | <quote>' lines")

    if not coverage_only:
        for severity, code, message in registry_findings(ledger_text):
            if severity == "fail":
                fails.append("%s: %s" % (code, message))
            else:
                warns.append("%s: %s" % (code, message))
    else:
        for entry in entries:
            if not entry["has_source"]:
                fails.append("registry-no-source: registry line without a source: %s"
                             % entry["claim"][:70])
            if not entry["has_quote"]:
                fails.append("registry-no-quote: registry line without the source's own "
                             "words: %s" % entry["claim"][:70])

    for claim in extract_claims(body):
        if _covered(claim["kind"], claim["text"], searchable):
            info.append("%-6s %s" % (claim["kind"], claim["text"]))
        else:
            fails.append("fact-uncovered: %-6s %s" % (claim["kind"], claim["text"]))

    return fails, warns, info


def render(fails, warns, info) -> str:
    lines = []
    for f in fails:
        lines.append("  X %s" % f)
    for w in warns:
        lines.append("  ! %s" % w)
    lines.append("  registry covers %d claim(s)" % len(info))
    return "\n".join(lines)
