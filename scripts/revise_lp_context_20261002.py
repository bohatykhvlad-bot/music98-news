#!/usr/bin/env python3
"""Scoped live LINKIN PARK text revision, with guarded desk writes and verification."""
from __future__ import annotations
import copy,hashlib,json,sys,time
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import post as runner
import gate
import revise_linkin_park_draft as prior
ID="auleon930r1"
EXPECTED=prior.BODY
BODY="""LINKIN PARK have released *UNSHATTER Film Soundtrack (Live in São Paulo)*, the live album tied to the band's new documentary. The album arrived September 25 through Warner Records and draws from the *FROM ZERO* album-release concert at Allianz Parque in São Paulo, Brazil. The same show provides most of the live footage in *UNSHATTER*, which moves between the concert, studio sessions and interviews. The soundtrack takes a different approach, staying with the performance rather than following the film's broader narrative.

The São Paulo set moves back and forth between *FROM ZERO* and earlier LINKIN PARK material. "The Emptiness Machine," "Heavy Is the Crown" and other songs from the new record are heard alongside "Somewhere I Belong," "Numb," "In the End" and "Faint." The band released a performance video for "Faint" ahead of the soundtrack, drawing directly from that night. It offers a close look at how Emily Armstrong and the current lineup approach one of the band's long-standing staples. Their performance gives the film a clear example of earlier material being played by the current lineup.

[youtube:zNYsw-cW8v8]

The album offers a fuller account of the Brazilian concert than the documentary itself. Several performances that did not make the film are preserved on the soundtrack, alongside short introductions and interludes in its digital and CD editions. Those four additional pieces are absent from the two-LP tracklist, which concentrates on the full songs. The difference extends to the packaging. The CD is presented in a gatefold softpak with a 12-panel accordion booklet, while the two-LP edition spreads the set across four sides in a gatefold jacket with a 12-by-24-inch insert. Both physical editions arrived September 25 alongside the digital release.

The concert also captures an important change in the band's history. LINKIN PARK first reached a worldwide audience with *Hybrid Theory* and *Meteora*, records that brought together heavy guitars, electronics and the contrasting voices of Mike Shinoda and Chester Bennington. Following Bennington's death, the group stepped away from performing and spent years uncertain about what might come next. When the remaining members began making music together again, they connected with Emily Armstrong, previously the singer of Dead Sara, and drummer Colin Brittain. Rather than recruiting someone to reproduce Bennington's performances, the band developed new material with Armstrong, whose voice and stage presence became central to *FROM ZERO* and their return to touring.

*UNSHATTER* follows that process from private studio sessions in 2022 through the writing of *FROM ZERO* and the band's renewed relationship with audiences. Rare archive footage, rehearsals, concert performances and interviews with musicians and fans give the film material beyond its central live show. The Allianz Parque concert took place on the day *FROM ZERO* was released, placing the new lineup's songs alongside a catalog that audiences had been carrying with them for decades. That contrast is part of the film's subject. The studio footage shows the musicians finding a way to work together, while the concert documents how that work sounded when the band finally brought it to a large crowd.

Directed by band member Joe Hahn, *UNSHATTER* opened in theaters worldwide on September 30 for a limited run. What began as an opportunity to film the band's Brazilian performance grew into a documentary about the rehearsals, decisions and relationships that made the show possible. Hahn follows the band through the period when Armstrong and Brittain joined, giving the concert a context that a conventional live film could not provide. By the time the group reaches the stage in Brazil, viewers have seen the earlier sessions and the people involved in bringing LINKIN PARK back together. The soundtrack preserves the concert, while the film documents the years that led to it."""
REGISTRY={
 "Hybrid Theory and Meteora album chronology":"https://linkinpark.com/about",
 "Chester death and 7-year break":"https://linkinpark.com/about",
 "Emily Armstrong Dead Sara, Colin Brittain":"https://people.com/linkin-park-didn-t-look-for-chester-bennington-sound-alike-after-he-died-exclusive-12142814",
 "No sound-alike decision":"https://people.com/linkin-park-didn-t-look-for-chester-bennington-sound-alike-after-he-died-exclusive-12142814",
 "2022 sessions, film, São Paulo":"https://unshattermovie.com/home/",
 "CD 20 tracks and packaging":"https://store.linkinpark.com/products/unshatter-cd",
 "2LP presentation":"https://eu-store.linkinpark.com/products/unshatter-2lp-citrus-vinyl",
 "Joe Hahn documentary evolved from concert footage":"https://ew.com/linkin-park-mike-shinoda-joe-hahn-unpack-the-band-s-bold-doc-unshatter-were-on-the-right-path-12145622"
}
def get():
 return runner.http(runner.DESK_API+"?nocache="+str(time.time_ns()),runner.desk_key())
def canonical(x):
 return json.dumps(x,sort_keys=True,ensure_ascii=False,separators=(",",":"))
def fingerprint(x):
 return hashlib.sha256(canonical(x).encode()).hexdigest()
def validate(candidate):
 prose=[x.strip() for x in BODY.split("\n\n") if x.strip() and not x.strip().startswith("[")]
 media=[x.strip() for x in BODY.split("\n\n") if x.strip().startswith("[")]
 print("CONTENT",len(BODY.split()),"WORDS",len(prose),"PROSE_PARAGRAPHS","PROSE_LENGTHS",[len(x.split()) for x in prose],"MEDIA",media,flush=True)
 assert len(prose)==6 and len(media)==1 and media==["[youtube:zNYsw-cW8v8]"]
 assert all(len(p.split())>=65 for p in prose),"Short body paragraph"
 assert BODY.startswith(candidate["excerpt"]),"Lede/excerpt mismatch"
 assert BODY.count("12-panel")==1 and BODY.count("two-LP tracklist")==1 and BODY.count("gatefold softpak")==1
 assert BODY.count("Emily Armstrong")>=2
 gate.CHECK_IDS=True
 fails,warns,info=gate.check_post(candidate,strict=True)
 print("CANDIDATE_GATE","PASS" if not fails else "FAIL","FAILS",json.dumps(fails,ensure_ascii=True),"WARNINGS",json.dumps(warns,ensure_ascii=True),flush=True)
 if fails:raise RuntimeError("Prewrite gate rejected update")
def main():
 runner.load_env(); runner.desk_read=get;gate.KEY=runner.desk_key()
 before=get()
 old=runner.find_post(before["posts"],ID)
 if old["status"]!="live" or old["body"]!=EXPECTED:
  print("ACTUAL_BODY_SHA",fingerprint(old["body"]),"EXPECTED_SHA",fingerprint(EXPECTED),flush=True)
  raise RuntimeError("Current LP article differs from inspected state; abort to preserve owner edits")
 candidate=copy.deepcopy(old)
 candidate["body"]=BODY
 validate(candidate)
 if len(sys.argv)<2 or sys.argv[1]=="--audit":
  print("READONLY_LP_AUDIT_PASS",flush=True);return
 if sys.argv[1]!="--save":raise RuntimeError("unknown mode")
 Path("/tmp/linkin-20261002-prewrite-backup.json").write_text(json.dumps(before,ensure_ascii=False),encoding="utf-8")
 original_other={p["id"]:fingerprint(p) for p in before["posts"] if p.get("id")!=ID}
 protected={k:copy.deepcopy(v) for k,v in old.items() if k!="body"}
 def mutate(posts):
  p=runner.find_post(posts,ID)
  if p["status"]!="live" or p["body"]!=EXPECTED or {k:v for k,v in p.items() if k!="body"}!=protected:
   raise RuntimeError("LINKIN PARK changed while checking; refusing edit")
  p["body"]=BODY
  return copy.deepcopy(p)
 now=runner.guarded_write(mutate)
 assert now["body"]==BODY and {k:v for k,v in now.items() if k!="body"}==protected
 final=get()
 other={p["id"]:fingerprint(p) for p in final["posts"] if p.get("id")!=ID}
 assert other==original_other,"Other post changed during update"
 for i in range(1,4):
  ok,lines=runner.run_gate(ID,quiet=True)
  print("POSTWRITE_GATE",i,"PASS" if ok else "FAIL",json.dumps(lines,ensure_ascii=True),flush=True)
  if not ok:raise RuntimeError("Postwrite gate failure")
 done=runner.find_post(get()["posts"],ID)
 assert done["body"]==BODY and done["status"]=="live"
 print("LIVE_LP_UPDATED_VERIFIED",ID,"OLD_WORDS",len(gate.prose_of(EXPECTED).split()),"NEW_WORDS",len(gate.prose_of(BODY).split()),"OTHER_POSTS_UNCHANGED",True,"ALL_MEDIA_PRESERVED",True,flush=True)
if __name__=="__main__":main()
