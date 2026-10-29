#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Known debt: findings that already existed when a rule was introduced.

The problem this solves
-----------------------
The desk holds 43 published posts, written under older rules. A new rule
that is correct for the next post also fires on every old post, and the
first thing that happens is that an unrelated text edit gets blocked by a
defect the owner approved years ago in a different article.

Canon section 6 says existing copy is not rewritten, so the rules must not
punish it either. The repository already had one mechanism for this:
`canon_checks.LEGACY_FINDINGS`, a hand-written list of findings per post.

This file is the mechanical version of that idea. `editorial/known-debt.json`
holds, per post, how many findings of each rule were already there when the
rule was introduced. The rules then behave like this:

* a finding that is inside the recorded debt is reported as a warning and
  does not block;
* a finding that is NOT in the recorded debt fails, so a new defect in an
  old post is still caught;
* the count is compared per rule, not per message, so re-wording a
  paragraph does not reset the debt and re-writing a sentence does not
  smuggle a second defect past the rule.

The file is regenerated deliberately, never silently. `python
scripts/post.py debt` prints the current state, and `scripts/debt.py
--write` records it after a rule change the owner approved.
"""
from __future__ import annotations

import json
import os
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
DEBT_FILE = REPO / "editorial" / "known-debt.json"


def load():
    try:
        return json.loads(DEBT_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {}


def save(debt):
    DEBT_FILE.parent.mkdir(parents=True, exist_ok=True)
    DEBT_FILE.write_text(json.dumps(debt, ensure_ascii=False, indent=2,
                                    sort_keys=True) + "\n", encoding="utf-8")


def allowance(post, code):
    """How many findings of this rule this post is allowed to keep."""
    if not post:
        return 0
    debt = load()
    entry = debt.get((post.get("id") or "").strip() or "")
    if not entry:
        return 0
    try:
        return int(entry.get(code, 0))
    except Exception:
        return 0


def split(post, findings):
    """Split findings into (grandfathered, new).

    `findings` is a list of (code, message). The first `allowance` findings
    of each code are the recorded debt and come back as warnings; the rest
    are new defects.
    """
    debt = load()
    entry = debt.get((post.get("id") or "").strip() or "") or {}
    used = {}
    old, new = [], []
    for code, message in findings:
        try:
            limit = int(entry.get(code, 0))
        except Exception:
            limit = 0
        if used.get(code, 0) < limit:
            used[code] = used.get(code, 0) + 1
            old.append((code, message))
        else:
            new.append((code, message))
    return old, new


def notes(post, findings):
    """The same split, rendered as gate warnings."""
    old, _new = split(post, findings)
    return [(code, "known debt, recorded before this rule: %s" % message)
            for code, message in old]
