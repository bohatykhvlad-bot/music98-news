#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Known debt: findings that already existed when a rule was introduced.

The desk holds posts written under older rules. A new rule that is right for
the next post also fires on old posts. Canon section 6 says existing copy is
not rewritten, so a count of findings that were already there is recorded in
`editorial/known-debt.json`. The first N findings of a recorded code are
reported as warnings. Anything beyond that count still fails.

Writing a new entry is a deliberate act. `record` and `python scripts/post.py
debt` refuse unless `--owner-approved` is set and a `--reason` is given.
Entries without both fields are ignored, so a hand-added count does not
grandfather a post. Posts dated 2026-10-26 and later are not exempt as a
class: jayzsuperbowllxi26, jisoo26addicted, kesha27backstabber,
lanazachlies27r and rodrigoroanexpect26r are not in the file.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
DEBT_FILE = REPO / "editorial" / "known-debt.json"

# These posts were published on or after 2026-10-26 and were removed from the
# debt file so the real checks apply. The writer may still record a later
# entry for one of them, but only with --owner-approved and a reason.
REMOVED_IDS = (
    "jayzsuperbowllxi26",
    "jisoo26addicted",
    "kesha27backstabber",
    "lanazachlies27r",
    "rodrigoroanexpect26r",
)


def _path(path=None):
    return Path(path) if path else DEBT_FILE


def load(path=None):
    file = _path(path)
    try:
        data = json.loads(file.read_text(encoding="utf-8"))
    except Exception:
        return {}
    return data if isinstance(data, dict) else {}


def _write(debt, path=None):
    file = _path(path)
    file.parent.mkdir(parents=True, exist_ok=True)
    file.write_text(json.dumps(debt, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
                    encoding="utf-8")


def _refuse(message):
    print(message, file=sys.stderr)
    raise SystemExit(1)


def approved(entry):
    """An entry counts only when the owner approved it and gave a reason."""
    if not isinstance(entry, dict):
        return False
    if entry.get("_ownerApproved") is not True:
        return False
    return bool(str(entry.get("_reason") or "").strip())


def _entry(post, path=None):
    if not post:
        return {}
    debt = load(path)
    entry = debt.get((post.get("id") or "").strip() or "")
    if not approved(entry):
        return {}
    return entry


def _limit(entry, code):
    if str(code).startswith("_"):
        return 0
    try:
        return int(entry.get(code, 0))
    except (TypeError, ValueError):
        return 0


def allowance(post, code, path=None):
    """How many findings of this rule this post is allowed to keep."""
    return _limit(_entry(post, path), code)


def split(post, findings, path=None):
    """Split findings into (grandfathered, new).

    `findings` is a list of (code, message). The first `allowance` findings
    of each code are the recorded debt and come back as warnings; the rest
    are new defects. An entry the owner did not approve contributes nothing.
    """
    entry = _entry(post, path)
    used = {}
    old, new = [], []
    for code, message in findings:
        limit = _limit(entry, code)
        if used.get(code, 0) < limit:
            used[code] = used.get(code, 0) + 1
            old.append((code, message))
        else:
            new.append((code, message))
    return old, new


def notes(post, findings, path=None):
    """The same split, rendered as gate warnings."""
    old, _new = split(post, findings, path)
    return [(code, "known debt, recorded before this rule: %s" % message)
            for code, message in old]


def record(post_id, codes, reason, owner_approved=False, path=None):
    """Add or replace finding counts for one post.

    Refuses unless the caller passed owner_approved and a non-empty reason.
    Does not touch the file when it refuses.
    """
    if owner_approved is not True:
        _refuse("writing known debt requires --owner-approved")
    reason = str(reason or "").strip()
    if not reason:
        _refuse("writing known debt requires --reason")
    post_id = str(post_id or "").strip()
    if not post_id:
        _refuse("writing known debt requires a post id")
    if not isinstance(codes, dict) or not codes:
        _refuse("writing known debt requires at least one finding code")
    debt = load(path)
    entry = dict(debt.get(post_id) or {})
    for code, count in codes.items():
        code = str(code or "").strip()
        if not code or code.startswith("_"):
            _refuse("debt finding codes cannot be empty or start with _")
        try:
            count = int(count)
        except (TypeError, ValueError):
            _refuse("debt count for %s must be an integer" % code)
        if count < 0:
            _refuse("debt count for %s cannot be negative" % code)
        entry[code] = count
    entry["_ownerApproved"] = True
    entry["_reason"] = reason
    debt[post_id] = entry
    _write(debt, path)
    print("debt      %s recorded (%s)" % (post_id, reason))
    return entry


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="cmd", required=True)
    add = sub.add_parser("add", help="record finding counts for one post")
    add.add_argument("id")
    add.add_argument("--code", required=True)
    add.add_argument("--count", type=int, required=True)
    add.add_argument("--owner-approved", action="store_true")
    add.add_argument("--reason", default="")
    add.add_argument("--file", default="", help="debt file to write (tests)")
    args = parser.parse_args(argv)
    if args.cmd == "add":
        record(args.id, {args.code: args.count}, args.reason, args.owner_approved,
               path=args.file or None)
    return 0


if __name__ == "__main__":
    main()
