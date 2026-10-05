#!/usr/bin/env python3
"""Reject new/modified agent automation that writes directly to the music98 desk.

The only agent-authorized post write implementation is scripts/post.py.
Human admin UI and server-side desk code are outside this check.
"""
from __future__ import annotations

import os
import re
import subprocess
import sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
ALLOWED={
    "scripts/post.py",
    "scripts/check_agent_write_path.py",
    ".github/workflows/check.yml",
}
SCOPES=(".github/workflows/",".github/scripts/","scripts/")
EXTS={".py",".yml",".yaml",".js",".mjs",".cjs",".sh"}

def changed_files():
    base=os.environ.get("GITHUB_BASE_SHA","").strip()
    if base and re.fullmatch(r"[0-9a-f]{40}",base) and set(base)!={"0"}:
        cmd=["git","diff","--name-only",base,"HEAD"]
    else:
        probe=subprocess.run(["git","rev-parse","HEAD^"],cwd=ROOT,capture_output=True,text=True)
        if probe.returncode:
            return []
        cmd=["git","diff","--name-only","HEAD^","HEAD"]
    r=subprocess.run(cmd,cwd=ROOT,capture_output=True,text=True,check=True)
    return [x.strip() for x in r.stdout.splitlines() if x.strip()]

def direct_desk_write(text):
    low=text.lower()
    post=bool(re.search(r"""method\s*[:=]\s*['"]post['"]|method\s*=\s*['"]post['"]""",low))
    desk=("/api/desk" in low or "desk_api" in low or re.search(r"\bdesk\b",low))
    auth=("x-admin-key" in low or "admin_password" in low or "music98_key" in low)
    return bool(post and desk and auth)

bad=[]
for rel in changed_files():
    if rel in ALLOWED or not rel.startswith(SCOPES) or Path(rel).suffix.lower() not in EXTS:
        continue
    p=ROOT/rel
    if not p.exists():
        continue
    try:
        txt=p.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        continue
    if direct_desk_write(txt):
        bad.append(rel)

if bad:
    print("AGENT_WRITE_PATH: FAIL")
    for rel in bad:
        print("  direct authenticated POST to desk is forbidden:",rel)
    print("  use scripts/post.py create/set/publish so editorial, gate and preflight cannot be skipped")
    raise SystemExit(1)

print("AGENT_WRITE_PATH: PASS")
