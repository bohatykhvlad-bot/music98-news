#!/usr/bin/env python3
"""One-time, draft-only Tate McRae typography/crop repair using canonical post.py."""
import copy
import json
import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import post

PID = "tate-housewife-20261020"
SOURCE = Path("editorial/staged/tate-housewife-20261020.json")
STAGED = Path("/tmp/tate-housewife-20261020-final.json")
MEDIA = re.compile(r"\[(?:youtube|apple|instagram|ig|tiktok|photo):[^\]]+\]")

def normalized(value):
    return str(value or "").translate(str.maketrans({"“": '"', "”": '"', "„": '"', "‟": '"', "«": '"', "»": '"'}))

def main():
    desired = json.loads(SOURCE.read_text(encoding="utf-8"))
    before = post.find_post(post.desk_read()["posts"], PID)
    assert before["status"] == desired["status"] == "draft", "Refusing to modify a live article"
    assert desired["id"] == PID
    for field in ("title","excerpt","body"):
        assert normalized(before[field]) == desired[field], f"Unexpected additional {field} change"
        assert not any(ch in desired[field] for ch in "“”„‟«»")
    assert before["body"].startswith(before["excerpt"])
    assert desired["body"].startswith(desired["excerpt"])
    assert MEDIA.findall(before["body"]) == MEDIA.findall(desired["body"]), "Media changed"
    prev_cover = before["cover"]
    cover = desired["cover"]
    for key in ("kind","src","credit","creditUrl"):
        assert prev_cover.get(key) == cover.get(key), f"Unexpected cover change: {key}"
    assert cover["pos"] == "50% 35%"
    assert cover["zoom"] == 1.25
    assert cover["cardZoom"] == 1.65
    assert cover["cardY"] == 0.36
    # Explicit full source and final read stamps. These hashes are not
    # substitutes for human editing; text was reviewed before staging.
    post.cmd_editorial(PID, phase="pre-edit")
    STAGED.write_text(json.dumps(desired, ensure_ascii=False, indent=2),encoding="utf-8")
    subprocess.run([sys.executable, "scripts/editorial_readthrough.py",
                    "--post", PID, "--file", str(STAGED),
                    "--phase", "post-edit", "--confirm-full-read"],
                   check=True)
    if not post._local_gate(desired) or not post._local_preflight(desired):
        raise RuntimeError("Mechanical QA failed before mutation")
    saved = post.cmd_replace_draft(PID, str(STAGED))
    assert saved["status"] == "draft"
    for field in ("title","excerpt","body","cover","status"):
        assert saved[field] == desired[field], "Post-save mismatch "+field
    assert MEDIA.findall(saved["body"]) == MEDIA.findall(before["body"])
    # Fresh remote readback and mechanical checks on the REAL saved draft.
    fresh = post.find_post(post.desk_read()["posts"], PID)
    for field in ("title","excerpt","body","cover","status"):
        assert fresh[field] == desired[field], "Remote readback mismatch "+field
    post.cmd_preflight(PID)
    assert post.cmd_gate(PID)
    print("TATE_DRAFT_REPAIR_VERIFIED",json.dumps({
        "id":PID,"status":fresh["status"],
        "curlyQuotes":sum(fresh[k].count(c) for k in ("title","excerpt","body") for c in "“”„‟«»"),
        "title":fresh["title"],"cover":fresh["cover"],
        "video":MEDIA.findall(fresh["body"])
    },ensure_ascii=False))

if __name__ == "__main__":
    main()
