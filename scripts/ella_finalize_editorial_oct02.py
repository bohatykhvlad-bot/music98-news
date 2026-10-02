#!/usr/bin/env python3
"""Finalize only existing Ella Draft after exact crop QC and source checks."""
from __future__ import annotations
import base64,copy,hashlib,io,json,re,sys,time,urllib.request
from pathlib import Path
from PIL import Image,ImageOps
sys.path.insert(0,str(Path(__file__).resolve().parent))
import post as runner,gate
ID="ella26choosintexas"
PREVIOUS_BODY_HASH="9c6ef8445d78d109a4f742851e1bed058e86d7a7f55bcf9ec54e7f7f9d9b76e2"
HERO_NAME="ella-sony-standing-dandelion-2026.jpg"
HERO_SOURCE="https://kommunikasjon.ntb.no/files/8931514/18858703/263460/no"
HERO_CREDIT="https://kommunikasjon.ntb.no/pressemelding/18858703/ella-langley-vokser-som-ugress-med-dandelion?lang=no&publisherId=8931514"
GUITAR_NAME="ella-crs2026-guitar-amy-harris.jpg"
GUITAR_SOURCE="https://thetraveladdict.com/wp-content/uploads/2026/03/EllaLangley-00419.jpg"
GUITAR_CREDIT="https://thetraveladdict.com/continents/northamerica/new-faces-of-country-music-show-shines-at-crs-2026-with-breakout-performances-and-industry-honors/"
BASE=Path(__file__).resolve().parent
BODY=(BASE/"ella-oct02-longread-body.txt").read_text("utf-8").strip()
NEW_COVER={"kind":"img","src":"photos/"+HERO_NAME,"credit":"Sony Music","creditUrl":HERO_CREDIT,"pos":"50% 28%","cardX":0.5,"cardY":0.34,"cardZoom":1.45}
def read_desk():
 return runner.http(runner.DESK_API+"?nocache="+str(time.time_ns()),runner.desk_key())
def sha(s):
 return hashlib.sha256(s.strip().encode("utf-8")).hexdigest()
def digest(x):
 return hashlib.sha256(json.dumps(x,sort_keys=True,ensure_ascii=False,separators=(",",":")).encode("utf-8")).hexdigest()
def read_url(url):
 req=urllib.request.Request(url,headers={"User-Agent":runner.UA})
 with urllib.request.urlopen(req,timeout=55) as r:return r.read(),r.headers.get("Content-Type","")
def local_image(name,source,w,h):
 raw,ctype=read_url(source)
 im=Image.open(io.BytesIO(raw));im=ImageOps.exif_transpose(im)
 assert im.size==(w,h),(name,im.size)
 assert im.format=="JPEG", (name,im.format)
 if name==HERO_NAME:
  # Compress original native Sony crop source in its full unmodified resolution.
  buf=io.BytesIO();im.convert("RGB").save(buf,"JPEG",quality=87,optimize=True)
  raw=buf.getvalue()
 assert len(raw)<2_850_000,(name,"KV limit",len(raw))
 print("ASSET_VERIFIED",name,"SOURCE_PIXELS",im.size,"BYTES_TO_UPLOAD",len(raw),flush=True)
 return raw
def online_size(name):
 try:
  b,t=read_url("https://music98.news/photos/"+name+"?check="+str(time.time_ns()))
  im=Image.open(io.BytesIO(b))
  print("SITE_PHOTO",name,"PIXELS",im.size,"BYTES",len(b),flush=True)
  return im.size
 except Exception as e:
  print("NOT_YET_STORED",name,str(e)[:110],flush=True);return None
def push_image(name,raw,sz):
 if online_size(name)==sz:
  print("IMAGE_REUSED",name,flush=True);return
 uri="data:image/jpeg;base64,"+base64.b64encode(raw).decode("ascii")
 r=runner.http("https://music98.news/api/photo",runner.desk_key(),{"name":name,"data":uri},method="POST")
 if r.get("url")!="photos/"+name or not r.get("ok"):raise RuntimeError("Upload failed "+repr(r))
 for _ in range(8):
  if online_size(name)==sz:print("IMAGE_UPLOAD_CONFIRMED",name,flush=True);return
  time.sleep(2)
 raise RuntimeError("Image upload did not reach origin "+name)
def inspect_layout():
 a=[x.strip() for x in BODY.split("\n\n") if x.strip()]
 prose=[p for p in a if not p.startswith("[")]
 media=[p for p in a if p.startswith("[")]
 assert len(prose)==20 and len(media)==10
 gaps=[];n=0
 for x in a:
  if x.startswith("["):gaps.append(n);n=0
  else:n+=1
 gaps.append(n)
 assert gaps==[2]*10+[0],("Need minimum two full paragraphs between carriers",gaps)
 assert all(80<=len(p.split())<=200 for p in prose),[len(p.split()) for p in prose]
 assert not any("post-malone-morgan-wallen-official-bts" in x for x in a)
 assert any("[youtube:4QIZE708gJ4]"==x for x in a)
 assert not any("1434919688" in x for x in a)
 assert "[apple:song:1062400323:1062400330]" in media
 assert a[-1].startswith("[photo:photos/"+GUITAR_NAME+"|Amy Harris|"+GUITAR_CREDIT)
 assert all(c not in BODY for c in ("\u2019","\u2018","\u2014"))
 print("LAYOUT_VALIDATED","PROSE_WORDS",sum(len(x.split()) for x in prose),"PROSE_PARAS",len(prose),"MEDIA",len(media),"GAPS",gaps,flush=True)
def main():
 runner.load_env();runner.desk_read=read_desk;gate.KEY=runner.desk_key();gate.CHECK_IDS=True
 inspect_layout()
 before=read_desk();old=runner.find_post(before["posts"],ID)
 print("ELLA_CURRENT_STATUS",old.get("status"),"CURRENT_BODY_HASH",sha(old.get("body") or ""),"OLD_COVER",json.dumps(old.get("cover"),ensure_ascii=True),flush=True)
 if old.get("status")!="draft" or sha(old.get("body") or "")!=PREVIOUS_BODY_HASH:raise RuntimeError("Draft changed since owner-approved audit; do not overwrite")
 assert old.get("excerpt") and BODY.startswith(old["excerpt"])
 hero=local_image(HERO_NAME,HERO_SOURCE,2128,2515)
 guitar=local_image(GUITAR_NAME,GUITAR_SOURCE,1200,800)
 if len(sys.argv)<2 or sys.argv[1]=="--audit":
  print("READONLY_ELLA_FINAL_AUDIT_PASSED",flush=True);return
 if sys.argv[1]!="--save":raise RuntimeError("Unknown mode")
 # Backup entire desk outside Git, never log sensitive parts.
 Path("/tmp/music98-ella-desk-before-final.json").write_text(json.dumps(before,ensure_ascii=False),encoding="utf-8")
 push_image(HERO_NAME,hero,(2128,2515));push_image(GUITAR_NAME,guitar,(1200,800))
 candidate=copy.deepcopy(old);candidate["body"]=BODY;candidate["cover"]=copy.deepcopy(NEW_COVER)
 fails,warns,info=gate.check_post(candidate,strict=True)
 print("PREWRITE_GATE","PASS" if not fails else "FAIL","FAILS",json.dumps(fails,ensure_ascii=True),"WARNINGS",json.dumps(warns,ensure_ascii=True),flush=True)
 if fails:raise RuntimeError("Candidate gate rejected, existing draft unchanged")
 old_protected={k:copy.deepcopy(v) for k,v in old.items() if k not in ("body","cover")}
 other_before={str(p["id"]):digest(p) for p in before["posts"] if str(p["id"])!=ID}
 def mutate(posts):
  p=runner.find_post(posts,ID)
  if p.get("status")!="draft" or sha(p.get("body") or "")!=PREVIOUS_BODY_HASH:raise RuntimeError("Draft changed while editing")
  if {k:v for k,v in p.items() if k not in ("body","cover") }!=old_protected:raise RuntimeError("Owner changed protected metadata")
  p["body"]=BODY;p["cover"]=copy.deepcopy(NEW_COVER)
  return copy.deepcopy(p)
 now=runner.guarded_write(mutate)
 assert now.get("status")=="draft" and now.get("body")==BODY and now.get("cover")==NEW_COVER
 after=read_desk()
 others_after={str(p["id"]):digest(p) for p in after["posts"] if str(p["id"])!=ID}
 assert others_after==other_before,"Other posts unexpectedly changed; report immediately"
 for i in range(1,4):
  good,lines=runner.run_gate(ID,quiet=True)
  print("POSTWRITE_GATE",i,"PASS" if good else "FAIL",json.dumps(lines,ensure_ascii=True),flush=True)
  if not good:raise RuntimeError("Postwrite gate failure")
 final=runner.find_post(read_desk()["posts"],ID)
 assert final.get("status")=="draft" and final.get("body")==BODY and final.get("cover")==NEW_COVER
 assert {k:v for k,v in final.items() if k not in ("body","cover")}==old_protected
 public=runner.http(runner.DESK_API+"?nocache="+str(time.time_ns()))
 assert not any(str(p.get("id"))==ID for p in public.get("posts",[]))
 print("ELLA_FINAL_DRAFT_VERIFIED",ID,"WORDS",len(gate.prose_of(BODY).split()),"OTHER_POSTS_UNCHANGED",True,"GUITAR_FINALE",True,"NEW_HERO",True,"PUBLIC_VISIBLE",False,flush=True)
if __name__=="__main__":main()
