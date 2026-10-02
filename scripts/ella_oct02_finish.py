#!/usr/bin/env python3
"""Replace only existing Ella longread draft after photo and editorial QC. No publication."""
from __future__ import annotations
import base64,copy,hashlib,io,json,re,sys,time,urllib.request
from pathlib import Path
from PIL import Image
sys.path.insert(0,str(Path(__file__).resolve().parent))
import gate
import post as runner

ID="ella26choosintexas"
BODYFILE=Path(__file__).with_name("ella-oct02-longread-body.txt")
PHOTO_NAME="post-malone-morgan-wallen-official-bts-2024.jpg"
PHOTO_SOURCE="https://app.box.com/index.php?rm=box_download_shared_file&shared_name=im7ys9giua9fklfrbh2b6zz37kwrni4o&file_id=f_1525974462869"
MEDIA="[photo:photos/"+PHOTO_NAME+"|Big Loud Records|https://bigloud.com/post-malone-morgan-wallens-i-had-some-help-makes-history/|50% 37%|1]"
def get():
 return runner.http(runner.DESK_API+"?nocache="+str(time.time_ns()),runner.desk_key())
def digest(x):
 return hashlib.sha256(json.dumps(x,sort_keys=True,ensure_ascii=False).encode()).hexdigest()
def fetch_binary(url):
 with urllib.request.urlopen(urllib.request.Request(url,headers={"User-Agent":runner.UA}),timeout=75) as r:
  raw=r.read()
  ctype=r.headers.get("Content-Type","")
 return raw,ctype
def picture():
 raw,ctype=fetch_binary(PHOTO_SOURCE)
 im=Image.open(io.BytesIO(raw)); im.verify()
 im=Image.open(io.BytesIO(raw))
 assert im.width==1080 and im.height==1350 and im.format=="JPEG",(im.size,im.format)
 assert 500_000<len(raw)<2_990_000,(len(raw),ctype)
 print("OFFICIAL_PHOTO_ORIGINAL",im.size,"BYTES",len(raw),"SOURCE_BIG_LOUD_PRESS_BOX",flush=True)
 return raw
def existing_photo_ok(path):
 url="https://music98.news/"+path+"?nocache="+str(time.time_ns())
 try:
  raw,ctype=fetch_binary(url)
  im=Image.open(io.BytesIO(raw))
  print("SITE_MEDIA_OK",path,im.size,"MIME",ctype,flush=True)
  return im.size
 except Exception as e:
  print("SITE_MEDIA_ERROR",path,str(e)[:180],flush=True);return None
def upload(raw):
 uri="data:image/jpeg;base64,"+base64.b64encode(raw).decode("ascii")
 uploaded=runner.http("https://music98.news/api/photo",runner.desk_key(),{"name":PHOTO_NAME,"data":uri},method="POST")
 if not uploaded.get("ok") or uploaded.get("url")!="photos/"+PHOTO_NAME:
  raise RuntimeError("photo upload rejected: "+repr(uploaded))
 for t in range(8):
  size=existing_photo_ok("photos/"+PHOTO_NAME)
  if size==(1080,1350):print("PHOTO_UPLOAD_VERIFIED",flush=True);return
  time.sleep(3)
 raise RuntimeError("photo upload was not visible at the site")
def analyze(body):
 assert body and MEDIA in body
 assert "Dolly Parton" in body and "Beyoncé" in body and "Kitty Wells" in body
 assert "[apple:song:1844932149:1844932150]" in body
 assert "[youtube:nUsrYVxrDwI]" in body and "[youtube:i1IX4Dusi9k]" in body
 blocks=[x.strip() for x in body.split("\n\n") if x.strip()]
 prose=[x for x in blocks if not x.startswith("[")]
 carriers=[x for x in blocks if x.startswith("[")]
 lengths=[len(x.split()) for x in prose]
 assert len(prose)==19 and len(carriers)==8,(len(prose),len(carriers))
 assert all(80<=n<=200 for n in lengths),lengths
 assert all(not(a.startswith("[") and b.startswith("[")) for a,b in zip(blocks,blocks[1:]))
 first=prose[0];excerpt=first.split(". ")[0]+"."
 assert 80<=len(excerpt)<=170
 assert body.startswith(excerpt)
 assert not re.search(r"[\u2019\u2018\u2014]",body),"wrong apostrophe or long em dash"
 print("COPY_QC",sum(lengths),"WORDS",len(prose),"PARAGRAPHS",len(carriers),"MEDIA","EXCERPT",len(excerpt),flush=True)
 return excerpt
def upload_simple(name, raw, mime):
 data="data:"+mime+";base64,"+base64.b64encode(raw).decode("ascii")
 result=runner.http("https://music98.news/api/photo",runner.desk_key(),{"name":name,"data":data},method="POST")
 if not result.get("ok") or result.get("url")!="photos/"+name:
  raise RuntimeError("Upload failed "+name+" "+repr(result))
 for n in range(7):
  sz=existing_photo_ok("photos/"+name)
  if sz:return sz
  time.sleep(3)
 raise RuntimeError("Uploaded photo not visible "+name)
def ensure_ella_images():
 cover="photos/ella-choosin-texas-cover.jpg"
 body_photo="photos/ella-choosin-texas-caylee-robillard.webp"
 sz=existing_photo_ok(cover)
 if not sz:
  url="https://fortworth.culturemap.com/media-library/ella-langley.jpg?coordinates=0%2C0%2C0%2C0&height=1500&id=63691936&width=2000"
  raw,ctype=fetch_binary(url);im=Image.open(io.BytesIO(raw))
  assert im.size==(2000,1500) and im.format=="JPEG"
  sz=upload_simple(cover.split("/")[-1],raw,"image/jpeg")
 assert sz[0]>=1920,("hero too small",sz)
 sz=existing_photo_ok(body_photo)
 if not sz:
  url="https://media.zenfs.com/en/billboard_547/80f5cb3c59c106a6caf51f7d27dfe52d"
  raw,ctype=fetch_binary(url);im=Image.open(io.BytesIO(raw))
  assert im.size==(1548,1024) and im.format=="JPEG"
  buf=io.BytesIO();im.save(buf,"WEBP",quality=92,method=6)
  sz=upload_simple(body_photo.split("/")[-1],buf.getvalue(),"image/webp")
 assert sz[0]>=1200,("body photo too small",sz)
def record(body,excerpt):
 from datetime import datetime,timezone
 now=datetime.now(timezone.utc)
 return {"id":ID,"type":"news","tag":"Feature","rtype":"","artist":"Ella Langley",
  "title":'Ella Langley and the "Choosin\' Texas" Phenomenon',"excerpt":excerpt,"body":body,
  "date":now.strftime("%Y-%m-%d"),"publishAt":now.isoformat(timespec="milliseconds").replace("+00:00","Z"),
  "status":"draft","pinned":False,
  "cover":{"kind":"img","src":"photos/ella-choosin-texas-cover.jpg",
    "credit":"Ella Langley","creditUrl":"https://www.ellalangley.com/","pos":"50% 43%"}}
def main():
 runner.load_env()
 gate.KEY=runner.desk_key()
 gate.CHECK_IDS=True
 runner.desk_read=get
 body=BODYFILE.read_text(encoding="utf-8").strip()
 excerpt=analyze(body)
 before=get()
 matches=[p for p in before["posts"] if "ella" in (str(p.get("title"))+" "+str(p.get("artist"))).lower()]
 print("DESK_STATS","TOTAL",len(before["posts"]),"ELLA_MATCHES",[(p.get("id"),p.get("title"),p.get("status")) for p in matches],flush=True)
 old=next((p for p in before["posts"] if str(p.get("id"))==ID),None)
 if old and (old.get("status")!="draft" or old.get("artist")!="Ella Langley"):
  raise RuntimeError("Existing id protected; not a target Ella draft")
 if old:print("UPDATING_EXISTING",ID,"BODY_SHA",digest(old.get("body")),flush=True)
 else:print("CREATING_MISSING_CANONICAL_DRAFT",ID,flush=True)
 if matches and not old:
  raise RuntimeError("Unexpected Ella draft with another id; review before creating duplicate")
 for name in ["photos/ella-choosin-texas-cover.jpg","photos/ella-choosin-texas-caylee-robillard.webp"]:
  print("AUDIT_PHOTO",name,existing_photo_ok(name),flush=True)
 raw=picture()
 if len(sys.argv)<2 or sys.argv[1]=="--audit":
  print("AUDIT_ONLY_NOT_SAVED",flush=True)
  return
 if sys.argv[1]!="--save-draft":raise RuntimeError("Unknown action")
 protected={k:copy.deepcopy(v) for k,v in old.items() if k not in {"body","excerpt"}} if old else None
 backup=Path("/tmp/desk-before-ella-oct02.json")
 backup.write_text(json.dumps(before,ensure_ascii=False),encoding="utf-8")
 print("PRIVATE_BACKUP_LOCAL",str(backup),"POSTS",len(before["posts"]),flush=True)
 ensure_ella_images()
 upload(raw)
 candidate=copy.deepcopy(old) if old else record(body,excerpt)
 candidate["body"]=body;candidate["excerpt"]=excerpt
 fails,warns,info=gate.check_post(candidate,strict=True)
 print("CANDIDATE_GATE","PASS" if not fails else "FAIL","WARNINGS",json.dumps(warns,ensure_ascii=True),"INFO",repr(info)[:500],flush=True)
 if fails:
  print("CANDIDATE_GATE_ERRORS",json.dumps(fails,ensure_ascii=True),flush=True)
  raise RuntimeError("Candidate gate failed; desk unchanged")
 def mutate(posts):
  cur=next((p for p in posts if str(p.get("id"))==ID),None)
  if old:
   if not cur or cur.get("status")!="draft" or digest(cur.get("body"))!=digest(old.get("body")):
    raise RuntimeError("Existing draft changed during edit")
   if {k:v for k,v in cur.items() if k not in {"body","excerpt"}}!=protected:
    raise RuntimeError("Protected fields changed; abort")
   cur["body"]=body;cur["excerpt"]=excerpt
   return copy.deepcopy(cur)
  if cur is not None or any("ella" in (str(p.get("title"))+" "+str(p.get("artist"))).lower() for p in posts):
   raise RuntimeError("Ella post appeared; do not duplicate")
  posts.insert(0,copy.deepcopy(candidate))
  return copy.deepcopy(posts[0])
 now=runner.guarded_write(mutate)
 final=runner.find_post(get()["posts"],ID)
 assert final.get("status")=="draft" and final.get("body")==body and final.get("excerpt")==excerpt
 assert final==now
 if protected:
  assert {k:v for k,v in final.items() if k not in {"body","excerpt"}}==protected
 for n in range(1,4):
  passed,lines=runner.run_gate(ID,quiet=False)
  print("POSTWRITE_GATE",n,"PASS" if passed else "FAIL","\n".join(lines[-20:]),flush=True)
  if not passed:raise RuntimeError("Draft saved but gate failed")
 public=runner.http(runner.DESK_API+"?nocache="+str(time.time_ns()))
 assert not any(str(p.get("id"))==ID for p in public.get("posts",[])),"Draft leaked publicly"
 print("VERIFIED_SAVED_DRAFT",ID,"WORDS",len(gate.prose_of(body).split()),"PUBLIC_VISIBLE",False,"CREATED",not bool(old),flush=True)
if __name__=="__main__":
 main()
