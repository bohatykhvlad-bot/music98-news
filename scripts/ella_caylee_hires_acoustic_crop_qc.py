#!/usr/bin/env python3
"""Read-only QC of artist photographer's full-res CMA Fest 2024 acoustic image."""
from io import BytesIO
from pathlib import Path
from PIL import Image,ImageOps,ImageDraw
import urllib.request,base64,json,hashlib
url="https://imgix.bustle.com/uploads/image/2024/7/1/06d98009/2i0a5096-2.jpg"
with urllib.request.urlopen(urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0","Accept":"image/jpeg"}),timeout=55) as res: raw=res.read()
original=Image.open(BytesIO(raw));original.load()
assert original.size==(3648,5472) and original.format=="JPEG",(original.size,original.format)
print("VERIFIED_ORIGINAL_2024_ACOUSTIC",original.size,"bytes",len(raw),"sha256",hashlib.sha256(raw).hexdigest(),flush=True)
im=ImageOps.exif_transpose(original).convert("RGB")
sheet=Image.new("RGB",(1170,700*4),"white");d=ImageDraw.Draw(sheet)
for i,y in enumerate((0.1,0.25,0.40,0.57)):
 thumb=ImageOps.fit(im,(1138,640),method=Image.Resampling.LANCZOS,centering=(.5,y))
 sheet.paste(thumb,(10,i*700+35));d.text((12,i*700+10),f"2024 Caylee genuine acoustic source 3648x5472: final widescreen y={y}",fill="black")
buf=BytesIO();sheet.save(buf,"JPEG",quality=78)
out=Path(".editorial");out.mkdir(exist_ok=True)
(out/"ella-caylee-2024-acoustic-hires-crop-check.b64").write_text(base64.b64encode(buf.getvalue()).decode())
(out/"ella-caylee-2024-acoustic-hires-crop-check.json").write_text(json.dumps({"original":url,"size":original.size,"bytes":len(raw),"sha256":hashlib.sha256(raw).hexdigest(),"author":"Caylee Robillard","firsthand_report":"https://www.elitedaily.com/entertainment/ella-langley-weekend-in-the-life-cma-fest-2024"},indent=2))
