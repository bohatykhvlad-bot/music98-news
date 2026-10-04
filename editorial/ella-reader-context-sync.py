#!/usr/bin/env python3
"""Apply the owner-requested Ella reader-context rewrite only to the existing Draft.

The existing article's cover, photographer credits, inline photo crop settings,
status, date, publishAt, and every other post must remain untouched.
"""
import copy
import hashlib
import json
import os
import re
import sys
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from gate import check_post
from preflight import check as preflight_check

URL = "https://music98.news/api/desk"
POST_ID = "ella26choosintexas"
TITLE = "The Ella Langley Phenomenon and Country's New Boom"
SOURCE = Path(__file__).with_name("ella-selected-full-review-20261004.md")
MEDIA = re.compile(r"\[(?:photo|youtube|apple|instagram|tiktok):[^\]]+\]")
SHA = lambda text: hashlib.sha256(text.encode("utf-8")).hexdigest()
secret = os.environ.get("ADMIN_PASSWORD")
if not secret:
    raise SystemExit("ERROR: editor credential not configured")

headers = {
    "X-Admin-Key": secret, "User-Agent": "music98-gh-action-editorial",
    "Cache-Control": "no-cache", "Accept": "application/json",
}
def get_desk():
    req = urllib.request.Request(URL, headers=headers)
    with urllib.request.urlopen(req, timeout=30) as response:
        payload = json.load(response)
    posts = payload.get("posts")
    if not isinstance(posts, list):
        raise ValueError("DESK_POSTS_INVALID")
    return posts

def get_target(posts):
    found = [p for p in posts if p.get("id") == POST_ID]
    if len(found) != 1 or found[0].get("status") != "draft":
        raise ValueError("TARGET_MISSING_OR_NOT_DRAFT")
    if found[0].get("title") != TITLE:
        raise ValueError("TARGET_TITLE_MISMATCH")
    return found[0]

def media_key(token):
    kind, rest = token[1:-1].split(":", 1)
    # Photo's crop position and zoom are OWNER DATA, not editorial copy.
    return kind, rest.split("|", 1)[0] if kind == "photo" else rest

raw_bytes = SOURCE.read_bytes()
git_blob = hashlib.sha1(b"blob " + str(len(raw_bytes)).encode("ascii") + b"\0" + raw_bytes).hexdigest()
if git_blob != "2405c7a0e910738fa660056b8e8eb148e146083b":
    raise ValueError("EDITORIAL_SOURCE_CHANGED_ABORT")
markdown = raw_bytes.decode("utf-8").strip()
heading, proposed = markdown.split("\n\n", 1)
if heading != "# " + TITLE:
    raise ValueError("SOURCE_TITLE_CHANGED")
new_media = MEDIA.findall(proposed)
if len(new_media) != 10 or len([x for x in new_media if x.startswith("[photo:")]) != 2:
    raise ValueError("SOURCE_MEDIA_CHANGED")

before = get_desk()
orig = get_target(before)
old_body = orig.get("body") or ""
old_media = MEDIA.findall(old_body)
if len(old_media) != 10 or [media_key(x) for x in old_media] != [media_key(x) for x in new_media]:
    raise ValueError("CURRENT_MEDIA_IDENTITY_DIFFERS_REFUSE_OVERWRITE")
# Retain EXACT saved photo tokens. This includes the owner's focal point, zoom,
# dimensions, source path, photographer credit, and all existing media metadata.
current_photos = iter(x for x in old_media if x.startswith("[photo:"))
body = MEDIA.sub(lambda m: next(current_photos) if m.group(0).startswith("[photo:") else m.group(0), proposed)
if [media_key(x) for x in MEDIA.findall(body)] != [media_key(x) for x in old_media]:
    raise ValueError("MEDIA_ASSETS_CHANGED")
if [x for x in MEDIA.findall(body)] != old_media:
    raise ValueError("MEDIA_TOKENS_NOT_PRESERVED")
first = body.split("\n\n", 1)[0]
excerpt = first.split(". ", 1)[0] + "."
if not (85 <= len(excerpt) <= 170) or not body.startswith(excerpt):
    raise ValueError("EXCERPT_INVALID")

candidate = copy.deepcopy(orig)
candidate["body"] = body
candidate["excerpt"] = excerpt
fails, warns, _ = check_post(candidate, strict=True)
print("EDITORIAL_GATE_FAIL_CODES=" + ",".join(code for code, _ in fails))
print("EDITORIAL_GATE_WARN_CODES=" + ",".join(sorted(set(code for code, _ in warns))))
if fails:
    for code, detail in fails:
        print("EDITORIAL_GATE_DETAIL=" + str(code) + ": " + str(detail))
    raise ValueError("EDITORIAL_GATE_FAIL")
if not preflight_check(candidate, orig, expected_media=10, min_words=1300):
    raise ValueError("EDITORIAL_PREFLIGHT_FAIL")

# Re-read immediately before writing so an intervening owner edit cannot be
# overwritten. Preserve the fresh full post list and only replace two fields.
fresh = get_desk()
target = get_target(fresh)
if SHA(json.dumps(fresh, ensure_ascii=True, sort_keys=True)) != SHA(json.dumps(before, ensure_ascii=True, sort_keys=True)):
    raise ValueError("DESK_CHANGED_DURING_VALIDATION_ABORT")
old_other_posts = json.dumps([p for p in fresh if p.get("id") != POST_ID], ensure_ascii=True)
old_other_fields = {k:v for k,v in target.items() if k not in ("body", "excerpt")}
if old_body == body and orig.get("excerpt") == excerpt:
    print("ELLA_ALREADY_UP_TO_DATE draft=true other_fields_unchanged=true")
    sys.exit(0)
target["body"] = body
target["excerpt"] = excerpt
payload = json.dumps({"posts": fresh}, ensure_ascii=True).encode("ascii")
req = urllib.request.Request(
    URL, data=payload, method="POST",
    headers={**headers, "Content-Type": "application/json"}
)
with urllib.request.urlopen(req, timeout=45) as response:
    if response.status < 200 or response.status >= 300:
        raise ValueError("SAVE_HTTP_" + str(response.status))

after = get_desk()
saved = get_target(after)
if saved["body"] != body or saved.get("excerpt") != excerpt or saved.get("status") != "draft":
    raise ValueError("POST_SAVE_TARGET_VERIFY_FAILED")
if {k:v for k,v in saved.items() if k not in ("body","excerpt")} != old_other_fields:
    raise ValueError("TARGET_OTHER_FIELD_CHANGED")
if json.dumps([p for p in after if p.get("id") != POST_ID], ensure_ascii=True) != old_other_posts:
    raise ValueError("UNRELATED_POST_MODIFIED")
print("ELLA_DRAFT_SAVE_VERIFIED status=draft words=" + str(len(re.findall(r"\b[\w'-]+\b", MEDIA.sub("", body)))) +
      " media=10 photo_framing_unchanged=true unrelated_posts_unchanged=true body_sha=" + SHA(body))
