#!/usr/bin/env python3
"""face_crop.py - suggest music98 admin-desk crop values for a photo.

The admin stores:
  cover.pos = "X% Y%"  -> image point that sits at the CENTER of the 16:9 stage
  cover.zoom            -> main crop zoom (1..6, 1 = image fills the stage edge-to-edge)
  cover.cardY           -> image point at the center of the square card (vertical)
  cover.cardZoom        -> card zoom (1..6, same meaning)

Finds faces, builds a weighted band (bigger face = more weight), and returns
pos/zoom/cardY/cardZoom that frame the band with headroom. Usage:

  python scripts/face_crop.py <path-or-URL> [--pad 0.12]

Prints JSON: image size, detected faces, suggested cover values.
"""
import argparse, json, os, urllib.request

import cv2
import numpy as np

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
MODEL = os.path.join(os.path.expanduser("~"), ".music98-tools", "face_detection_yunet_2023mar.onnx")


def is_url(s):
    return s.lower().startswith(("http://", "https://"))


def load_image(src):
    if is_url(src):
        req = urllib.request.Request(src, headers=UA)
        data = urllib.request.urlopen(req, timeout=30).read()
        arr = np.frombuffer(data, np.uint8)
    else:
        arr = np.fromfile(src, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise SystemExit("could not decode image: " + src)
    return img


def detect_faces(img):
    """YuNet detector - returns [{'x','y','w','h'}] boxes in pixels."""
    if not os.path.exists(MODEL):
        raise SystemExit("YuNet model missing: " + MODEL +
                         "\nGet face_detection_yunet_2023mar.onnx from opencv_zoo")
    det = cv2.FaceDetectorYN_create(MODEL, "", (img.shape[1], img.shape[0]),
                                    score_threshold=0.6)
    H, W = img.shape[:2]
    if max(W, H) > 1280:  # YuNet works best near its trained scale
        s = 1280 / max(W, H)
        small = cv2.resize(img, (int(W * s), int(H * s)))
        det.setInputSize((small.shape[1], small.shape[0]))
        _, faces = det.detect(small)
        k = 1 / s
    else:
        det.setInputSize((W, H))
        _, faces = det.detect(img)
        k = 1.0
    found = []
    for f in (faces if faces is not None else []):
        x, y, w, h = f[0] * k, f[1] * k, f[2] * k, f[3] * k
        x, y = max(0, x), max(0, y)
        w = min(w, W - x)
        h = min(h, H - y)
        if w > 0 and h > 0:
            found.append({"x": int(x), "y": int(y), "w": int(w), "h": int(h)})
    # dedupe overlapping boxes (IoU > 0.4), keep the biggest first
    # (YuNet rarely double-detects, this is just belt-and-braces)
    kept = []
    for f in sorted(found, key=lambda f: -(f["w"] * f["h"])):
        fx2, fy2 = f["x"] + f["w"], f["y"] + f["h"]
        dup = False
        for k in kept:
            kx2, ky2 = k["x"] + k["w"], k["y"] + k["h"]
            ix = max(0, min(fx2, kx2) - max(f["x"], k["x"]))
            iy = max(0, min(fy2, ky2) - max(f["y"], k["y"]))
            inter = ix * iy
            iou = inter / (f["w"] * f["h"] + k["w"] * k["h"] - inter)
            if iou > 0.4:
                dup = True
                break
        if not dup:
            kept.append(f)
    return kept


def clamp(v, lo, hi):
    return max(lo, min(hi, v))


def suggest(faces, W, H, pad):
    """Frame the weighted face band for a 16:9 stage and a square card.

    pos/zoom math (mirrors admin layoutCrop):
      zoom z >= 1 scales the cover-fit size up.
      visible width fraction  vw(z) = min(1, (W/H)/(16/9) / z)
      visible height fraction vh(z) = min(1, (H/W)*(16/9) / z)
      the point pos = "X% Y%" (in image fractions) sits at the stage center,
      so centering the window on the band and clamping keeps it inside.
    """
    if not faces:
        return None
    AR = 16 / 9
    ar_img = W / H
    wsum = sum(f["w"] * f["h"] for f in faces)
    cx = sum((f["x"] + f["w"] / 2) * f["w"] * f["h"] for f in faces) / wsum
    cy = sum((f["y"] + f["h"] / 2) * f["w"] * f["h"] for f in faces) / wsum
    top = min(f["y"] for f in faces)
    bot = max(f["y"] + f["h"] for f in faces)
    left = min(f["x"] for f in faces)
    right = max(f["x"] + f["w"] for f in faces)
    band_w = (right - left) / W
    band_h = (bot - top) / H
    need_w = min(1.0, band_w + 2 * pad)
    need_h = min(1.0, band_h + 2 * pad)

    def one(vis_w1, vis_h1):
        """Largest zoom whose window still contains band+padding on both axes,
        then center the window on the band and clamp it inside the image."""
        z = clamp(min(vis_w1 / need_w, vis_h1 / need_h), 1.0, 6.0)
        vw = min(1.0, vis_w1 / z)
        vh = min(1.0, vis_h1 / z)
        cxf = clamp(cx / W, vw / 2, 1 - vw / 2) if vw < 1 else 0.5
        cyf = clamp(cy / H, vh / 2, 1 - vh / 2) if vh < 1 else 0.5
        return z, cxf, cyf

    # cover-fit visible fractions: a 16:9 window over a TALL image crops the
    # sides (full height shown at z=1); over a WIDE image it crops top/bottom.
    vw1, vh1 = ((AR / ar_img, 1.0) if ar_img >= AR else (1.0, ar_img / AR))
    z, cxf, cyf = one(vw1, vh1)
    kw1, kh1 = ((1.0 / ar_img, 1.0) if ar_img >= 1.0 else (1.0, ar_img))
    zc, kcxf, kcyf = one(kw1, kh1)
    return {
        "pos": f"{round(cxf * 100)}% {round(cyf * 100)}%",
        "zoom": round(z, 2),
        "cardY": round(kcyf, 2),
        "cardZoom": round(zc, 2),
        "bandFrac": {"top": round(top / H, 3), "bottom": round(bot / H, 3),
                     "left": round(left / W, 3), "right": round(right / W, 3)},
        "focusFrac": {"cx": round(cx / W, 3), "cy": round(cy / H, 3)},
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("--pad", type=float, default=0.12, help="headroom fraction of the window")
    args = ap.parse_args()
    img = load_image(args.src)
    H, W = img.shape[:2]
    faces = detect_faces(img)
    s = suggest(faces, W, H, args.pad)
    print(json.dumps({
        "src": args.src,
        "width": W,
        "height": H,
        "faces": [{**f, "cx": f["x"] + f["w"] // 2, "cy": f["y"] + f["h"] // 2} for f in faces],
        "suggest": s,
    }, indent=2))


if __name__ == "__main__":
    main()
