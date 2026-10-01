#!/usr/bin/env python3
from __future__ import annotations
import copy, json, sys, time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import post as runner
import gate
import revise_ella_choosin_texas_full_draft as prev

POST_ID = prev.POST_ID
EXPECTED_BODY = prev.TARGET_BODY
BODY = EXPECTED_BODY.replace(
    'Langley answered with a phrase that immediately sounded like a song, "She\'s from Texas, I can tell."',
    'Langley answered with a phrase the room immediately recognized as a hook, "She\'s from Texas, I can tell."'
)
DUPLICATE_ID = "ellatexas26"
DUPLICATE_TITLE = 'How Ella Langley\'s "Choosin\' Texas" Became a Country Crossover Phenomenon'

def fresh_read():
    return runner.http(runner.DESK_API + "?nocache=" + str(time.time_ns()), runner.desk_key())

def main():
    runner.load_env()
    runner.desk_read = fresh_read
    gate.KEY = runner.desk_key()

    current = runner.find_post(fresh_read()["posts"], POST_ID)
    if current.get("status") != "draft" or current.get("body") != EXPECTED_BODY:
        raise RuntimeError("canonical Ella draft changed; refusing overwrite")

    candidate = copy.deepcopy(current)
    candidate["body"] = BODY
    gate.CHECK_IDS = True
    fails, warns, info = gate.check_post(candidate, strict=True)
    print("PREWRITE_GATE", "FAIL" if fails else "PASS")
    print("PREWRITE_WARNINGS", json.dumps(warns, ensure_ascii=True))
    if fails:
        print("PREWRITE_FAILURES", json.dumps(fails, ensure_ascii=True))
        raise RuntimeError("candidate gate failed")

    protected = {k: copy.deepcopy(v) for k, v in current.items() if k != "body"}

    def mutate(posts):
        p = runner.find_post(posts, POST_ID)
        if p.get("status") != "draft" or p.get("body") != EXPECTED_BODY:
            raise RuntimeError("canonical Ella draft changed during write")
        if {k: v for k, v in p.items() if k != "body"} != protected:
            raise RuntimeError("protected canonical fields changed")
        p["body"] = BODY
        return copy.deepcopy(p)

    runner.guarded_write(mutate)

    final = None
    for _ in range(20):
        time.sleep(2)
        final = next((p for p in fresh_read()["posts"] if str(p.get("id")) == POST_ID), None)
        if final and final.get("status") == "draft" and final.get("body") == BODY:
            break
    if not final or final.get("body") != BODY:
        raise RuntimeError("polished Ella draft did not propagate")

    for n in (1, 2, 3):
        ok, lines = runner.run_gate(POST_ID, quiet=False)
        print("POSTWRITE_GATE_PASS", n, "PASS" if ok else "FAIL")
        if not ok:
            print("\n".join(lines))
            raise RuntimeError("postwrite gate failed")

    # Remove only the accidental draft created by this task. Never touch a
    # different post that happens to share the id.
    before = fresh_read()
    duplicate = next((p for p in before["posts"] if str(p.get("id")) == DUPLICATE_ID), None)
    if duplicate is not None:
        if duplicate.get("status") != "draft" or duplicate.get("title") != DUPLICATE_TITLE or duplicate.get("artist") != "Ella Langley":
            raise RuntimeError("duplicate id is not the accidental Ella draft; refusing delete")
        others_before = {p["id"]: copy.deepcopy(p) for p in before["posts"] if str(p.get("id")) != DUPLICATE_ID}
        posts = [p for p in before["posts"] if str(p.get("id")) != DUPLICATE_ID]
        runner.http(runner.DESK_API, runner.desk_key(), {"posts": posts}, method="POST")
        after = fresh_read()
        if any(str(p.get("id")) == DUPLICATE_ID for p in after["posts"]):
            raise RuntimeError("accidental Ella duplicate did not delete")
        others_after = {p["id"]: p for p in after["posts"]}
        changed = [pid for pid, rec in others_before.items()
                   if json.dumps(rec, sort_keys=True, ensure_ascii=False)
                   != json.dumps(others_after.get(pid), sort_keys=True, ensure_ascii=False)]
        if changed:
            raise RuntimeError("other posts changed while deleting duplicate: " + repr(changed))
        print("ACCIDENTAL_DUPLICATE_REMOVED", True)
    else:
        print("ACCIDENTAL_DUPLICATE_REMOVED", False)

    auth = fresh_read()
    canonical = runner.find_post(auth["posts"], POST_ID)
    if canonical.get("status") != "draft" or canonical.get("body") != BODY:
        raise RuntimeError("canonical Ella draft changed after cleanup")

    public = runner.http(runner.DESK_API + "?nocache=" + str(time.time_ns()))
    if any(str(p.get("id")) in {POST_ID, DUPLICATE_ID} for p in public.get("posts", [])):
        raise RuntimeError("Ella draft leaked into public desk")

    print("WORDS", len(gate.prose_of(BODY).split()))
    print("STATUS", canonical.get("status"))
    print("PUBLIC_VISIBLE", False)
    print("DONE_ELLA_LONGREAD_POLISH")

if __name__ == "__main__":
    main()
