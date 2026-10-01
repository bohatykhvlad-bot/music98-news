#!/usr/bin/env python3
from __future__ import annotations
import copy, json, sys, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import post as runner
import gate

POST_ID="auleon930r1"
EXPECTED_BODY=r'''LINKIN PARK have released *UNSHATTER Film Soundtrack (Live in São Paulo)*, the live album tied to the band's new documentary. Released September 25 through Warner Records, it comes from the *FROM ZERO* album-release concert at Allianz Parque in São Paulo, Brazil. The same show provides most of the live footage in *UNSHATTER*, which cuts between the concert, studio sessions and interviews. The soundtrack takes a different approach, staying with the performance and preserving recordings omitted from the finished film. Together, the two releases split the same night between narrative and performance rather than simply duplicating each other.

The São Paulo set moves back and forth between *FROM ZERO* and earlier LINKIN PARK material. "The Emptiness Machine," "Heavy Is the Crown" and other songs from the new record are heard alongside "Somewhere I Belong," "Numb," "In the End" and "Faint." "Faint" was released ahead of the soundtrack with an official live video from the same night, showing Emily Armstrong and the current lineup performing one of the band's long-standing live staples before the full album arrived. The older catalog is woven through the show rather than saved for a separate nostalgia section.

[youtube:zNYsw-cW8v8]

The soundtrack includes more of the concert than *UNSHATTER*. Several performances omitted from the documentary are preserved on the audio release, giving Armstrong and drummer Colin Brittain a broader live document with the band. It also captures them on songs recorded long before they joined, so the release is not limited to material written for *FROM ZERO*. Those performances run in sequence without the film's regular cuts back to interviews and studio footage.

*UNSHATTER* begins with private studio sessions from 2022 and follows the band through the writing and release of *FROM ZERO* and the return to live shows. Rare archive footage, sold-out performances and interviews with the band and fans cover the years after LINKIN PARK's seven-year hiatus. The film also documents the arrival of Armstrong on vocals and Brittain on drums, tracing how the lineup moved from those early sessions to full-scale concerts and eventually the São Paulo stadium performance.

Directed by Joe Hahn, *UNSHATTER* opened in theaters worldwide on September 30 for a limited run. Its live centerpiece is the São Paulo concert held on the day *FROM ZERO* was released. The documentary reaches that night after tracing the studio sessions and the band's return, while the soundtrack strips away the surrounding narrative and gives the performance room to stand on its own.

The physical editions use slightly different track lists. The 20-track CD includes 16 complete performances plus four short intro or interlude pieces, while the two-LP edition contains only the 16 full songs. Packaging differs too, with a gatefold softpak and 12-panel accordion booklet for the 20-track version, while the vinyl editions use gatefold jackets with a 12-by-24-inch insert. Both formats were released September 25 alongside the digital soundtrack.'''
BODY=r'''LINKIN PARK have released *UNSHATTER Film Soundtrack (Live in São Paulo)*, the live album tied to the band's new documentary. Released September 25 through Warner Records, it comes from the *FROM ZERO* album-release concert at Allianz Parque in São Paulo, Brazil. The same show provides most of the live footage in *UNSHATTER*, which cuts between the concert, studio sessions and interviews. The soundtrack takes a different approach, staying with the performance instead of cutting away to the surrounding story. Together, the two releases split the same night between narrative and performance rather than simply duplicating each other.

The São Paulo set moves back and forth between *FROM ZERO* and earlier LINKIN PARK material. "The Emptiness Machine," "Heavy Is the Crown" and other songs from the new record are heard alongside "Somewhere I Belong," "Numb," "In the End" and "Faint." "Faint" was released ahead of the soundtrack with an official live video from the same night, showing Emily Armstrong and the current lineup performing one of the band's long-standing live staples before the full album arrived. That keeps the set moving between eras without turning the older catalog into a separate nostalgia section.

[youtube:zNYsw-cW8v8]

The soundtrack includes more of the concert than *UNSHATTER*. Several performances omitted from the documentary are preserved on the audio release, giving Armstrong and drummer Colin Brittain a broader live document with the band. It also captures them on songs recorded long before they joined, so the release is not limited to material written for *FROM ZERO*. Those performances run in sequence without the film's regular cuts back to interviews and studio footage.

*UNSHATTER* begins with private studio sessions from 2022 and follows the band through the writing and release of *FROM ZERO* and the return to live shows. Rare archive footage, sold-out performances and interviews with the band and fans cover the years after LINKIN PARK's seven-year hiatus. The film also documents the arrival of Armstrong on vocals and Brittain on drums, tracing how the lineup moved from those early sessions to the São Paulo stadium performance.

Directed by Joe Hahn, *UNSHATTER* opened in theaters worldwide on September 30 for a limited run. Its live centerpiece is the São Paulo concert held on the day *FROM ZERO* was released. The documentary reaches that night after tracing the studio sessions and the band's return, making the concert the endpoint of the story rather than the whole film.

The physical editions use slightly different track lists. The 20-track CD includes 16 complete performances plus four short intro or interlude pieces, while the two-LP edition contains only the 16 full songs. Packaging differs too, with a gatefold softpak and 12-panel accordion booklet for the disc, while the vinyl editions use gatefold jackets with a 12-by-24-inch insert. Both formats were released September 25 alongside the digital soundtrack.'''

def fresh_read():
    return runner.http(runner.DESK_API+"?nocache="+str(time.time_ns()),runner.desk_key())
def media_layout(body):
    return [(i,q) for i,q in enumerate(gate.paragraphs(body)) if gate.is_media(q)]

def main():
    runner.load_env(); runner.desk_read=fresh_read; gate.KEY=runner.desk_key()
    current=runner.find_post(fresh_read()["posts"],POST_ID)
    if current.get("status")!="live" or current.get("rtype")!="Album" or current.get("body")!=EXPECTED_BODY:
        raise RuntimeError("live LINKIN PARK changed; refusing overwrite")
    protected={k:copy.deepcopy(v) for k,v in current.items() if k!="body"}
    if len(gate.paragraphs(BODY))!=len(gate.paragraphs(EXPECTED_BODY)) or media_layout(BODY)!=media_layout(EXPECTED_BODY):
        raise RuntimeError("layout changed")
    candidate=copy.deepcopy(current); candidate["body"]=BODY
    gate.CHECK_IDS=True
    fails,warns,info=gate.check_post(candidate,strict=True)
    print("PREWRITE_GATE","FAIL" if fails else "PASS")
    print("PREWRITE_WARNINGS",json.dumps(warns,ensure_ascii=True))
    if fails:
        print("PREWRITE_FAILURES",json.dumps(fails,ensure_ascii=True)); raise RuntimeError("gate failed")
    def mutate(posts):
        p=runner.find_post(posts,POST_ID)
        if p.get("body")!=EXPECTED_BODY or {k:v for k,v in p.items() if k!="body"}!=protected:
            raise RuntimeError("LINKIN PARK changed during write")
        p["body"]=BODY; return copy.deepcopy(p)
    saved=runner.guarded_write(mutate)
    for _ in range(20):
        if saved.get("body")==BODY: break
        time.sleep(2); saved=runner.find_post(fresh_read()["posts"],POST_ID)
    if saved.get("body")!=BODY: raise RuntimeError("LINKIN PARK did not propagate")
    for n in (1,2,3):
        ok,lines=runner.run_gate(POST_ID,quiet=False); print("POSTWRITE_GATE_PASS",n,"PASS" if ok else "FAIL")
        if not ok: raise RuntimeError("postwrite failed")
    runner.cmd_verify(POST_ID)
    print("WORDS",len(gate.prose_of(EXPECTED_BODY).split()),"->",len(gate.prose_of(BODY).split()))
    print("RELEASE_TYPE",current.get("rtype"))
    print("LAYOUT_PRESERVED",len(gate.paragraphs(BODY)),media_layout(BODY))
    print("DONE_LINKIN_PARK_FINAL_PROOF")

if __name__=="__main__": main()
