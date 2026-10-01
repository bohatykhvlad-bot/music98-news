#!/usr/bin/env python3
from __future__ import annotations
import copy, json, re, sys, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import post as runner
import gate

POST_ID="lisa26vegas"
EXPECTED_TEMPLATE=r'''LISA has expanded VIVA LA LISA at The Colosseum at Caesars Palace to six shows after the original four dates sold out in under 10 minutes. The new performances are November 12 and 29, joining the previously announced November 13, 14, 27 and 28 dates. That gives each of the two Las Vegas weekends three shows instead of two.

The residency was announced in March. Tickets for the added dates went on sale September 30 through Ticketmaster. VIVA LA LISA is the first Las Vegas residency by a K-pop artist, and all six shows will take place at the 4,300-seat Colosseum inside Caesars Palace.

[apple:song:6807119565:6807119568]

The residency begins less than three weeks after *PRESS PLAY*, LISA's new six-track EP, arrives on October 23. "SaWaDiKa," released September 4, introduced the project. The official tracklist includes five more songs, but their titles have not yet been revealed. The song's title comes from the Thai greeting for "hello," and the video takes LISA back to Bangkok, with references to Thai culture in the sets, styling and choreography. It drew 70.8 million views in its first 24 hours.

LISA performed "SaWaDiKa" at the 2026 MTV Video Music Awards, with a tuk-tuk worked into the staging as another nod to Thailand. At the same ceremony, "Dream" won Best Pop, making LISA the first K-pop artist to win the category. It was also nominated for Best K-Pop, with separate nominations for cinematography and editing.

[youtube:FMX98ROVRCE]

"Dream" appeared on LISA's debut full-length album, *Alter Ego*, and was later accompanied by an official short film. LISA stars opposite Japanese actor Kentaro Sakaguchi in a story about two people looking back on a relationship that has ended. Written and directed by OJun Kwon, the film moves through fragments of their past instead of using a conventional performance setup. It was released through LISA's LLOUD channel several months after *Alter Ego*.

[tickets:__TICKET__]

LISA's fall schedule also includes *Always Lalisa*, the feature documentary directed by Sue Kim that premiered at the Toronto International Film Festival in September. The film covers a year of solo work, including the release of *Alter Ego*, her acting debut in *The White Lotus*, the development of LLOUD and her 2025 Coachella solo set, while also following her return to BLACKPINK. Beginning October 12, *Always Lalisa* will play in IMAX and cinemas worldwide for a limited engagement before streaming globally and exclusively on YouTube Premium later in 2026.'''
BODY_TEMPLATE=r'''LISA has expanded VIVA LA LISA at The Colosseum at Caesars Palace to six shows after the original four dates sold out in under 10 minutes. The new performances are November 12 and 29, joining the previously announced November 13, 14, 27 and 28 dates. That gives each of the two Las Vegas weekends three shows instead of two.

The residency was announced in March. Tickets for the added dates went on sale September 30 through Ticketmaster. VIVA LA LISA is the first Las Vegas residency by a K-pop artist, and all six shows will take place at the 4,300-seat Colosseum inside Caesars Palace.

[apple:song:6807119565:6807119568]

The six-show run begins less than three weeks after *PRESS PLAY*, LISA's new six-track EP, arrives on October 23. "SaWaDiKa," released September 4, introduced the project. The official tracklist includes five more songs, but their titles have not yet been revealed. The song's title comes from the Thai greeting for "hello," and the video takes LISA back to Bangkok, with references to Thai culture in the sets, styling and choreography. It drew 70.8 million views in its first 24 hours.

LISA performed "SaWaDiKa" at the 2026 MTV Video Music Awards, with a tuk-tuk worked into the staging as another nod to Thailand. At the same ceremony, "Dream" won Best Pop, making LISA the first K-pop artist to win the category. It was also nominated for Best K-Pop, with separate nominations for cinematography and editing.

[youtube:FMX98ROVRCE]

"Dream" appeared on LISA's debut full-length album, *Alter Ego*, and was later accompanied by an official short film. LISA stars opposite Japanese actor Kentaro Sakaguchi in a story about two people looking back on a relationship that has ended. Written and directed by OJun Kwon, the film moves through fragments of their past instead of using a conventional performance setup. It was released through LISA's LLOUD channel several months after *Alter Ego*.

[tickets:__TICKET__]

LISA's fall schedule also includes *Always Lalisa*, the feature documentary directed by Sue Kim that premiered at the Toronto International Film Festival in September. The film covers a year of solo work, including the release of *Alter Ego*, her acting debut in *The White Lotus*, the development of LLOUD and her 2025 Coachella solo set, while also following her return to BLACKPINK. Beginning October 12, *Always Lalisa* will play in IMAX and cinemas worldwide for a limited engagement before streaming globally and exclusively on YouTube Premium later in 2026.'''

def fresh_read():
    return runner.http(runner.DESK_API+"?nocache="+str(time.time_ns()), runner.desk_key())
def ticket_from(body):
    m=re.search(r"(?im)^\s*\[tickets:(https?://[^\]]+)\]\s*$",body or "")
    if not m: raise RuntimeError("ticket CTA missing")
    return m.group(1)
def media_layout(body):
    return [(i,q) for i,q in enumerate(gate.paragraphs(body)) if gate.is_media(q)]

def main():
    runner.load_env(); runner.desk_read=fresh_read; gate.KEY=runner.desk_key()
    current=runner.find_post(fresh_read()["posts"],POST_ID)
    ticket=ticket_from(current.get("body") or "")
    expected=EXPECTED_TEMPLATE.replace("__TICKET__",ticket)
    body=BODY_TEMPLATE.replace("__TICKET__",ticket)
    if current.get("status")!="live" or current.get("body")!=expected:
        raise RuntimeError("live LISA changed; refusing overwrite")
    protected={k:copy.deepcopy(v) for k,v in current.items() if k!="body"}
    if len(gate.paragraphs(body))!=len(gate.paragraphs(expected)) or media_layout(body)!=media_layout(expected):
        raise RuntimeError("layout changed")
    candidate=copy.deepcopy(current); candidate["body"]=body
    gate.CHECK_IDS=True
    fails,warns,info=gate.check_post(candidate,strict=True)
    print("PREWRITE_GATE","FAIL" if fails else "PASS")
    print("PREWRITE_WARNINGS",json.dumps(warns,ensure_ascii=True))
    if fails:
        print("PREWRITE_FAILURES",json.dumps(fails,ensure_ascii=True)); raise RuntimeError("gate failed")
    def mutate(posts):
        p=runner.find_post(posts,POST_ID)
        if p.get("body")!=expected or {k:v for k,v in p.items() if k!="body"}!=protected:
            raise RuntimeError("LISA changed during write")
        p["body"]=body; return copy.deepcopy(p)
    saved=runner.guarded_write(mutate)
    for _ in range(20):
        if saved.get("body")==body: break
        time.sleep(2); saved=runner.find_post(fresh_read()["posts"],POST_ID)
    if saved.get("body")!=body: raise RuntimeError("LISA did not propagate")
    for n in (1,2,3):
        ok,lines=runner.run_gate(POST_ID,quiet=False); print("POSTWRITE_GATE_PASS",n,"PASS" if ok else "FAIL")
        if not ok: raise RuntimeError("postwrite failed")
    runner.cmd_verify(POST_ID)
    print("WORDS",len(gate.prose_of(expected).split()),"->",len(gate.prose_of(body).split()))
    print("LAYOUT_PRESERVED",len(gate.paragraphs(body)),media_layout(body))
    print("DONE_LISA_FINAL_PROOF")

if __name__=="__main__": main()
