#!/usr/bin/env python3
"""Cut 16:9 cover stills centred on the detected face, keeping the whole head."""
from __future__ import annotations

import urllib.request
from pathlib import Path

import cv2

ROOT = Path(__file__).resolve().parents[1]
PHOTOS = ROOT / "public" / "photos"
MODEL = ROOT / "scripts" / "face_detection_yunet_2023mar.onnx"
MODEL_URL = "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"
ASPECT = 16 / 9
OUT_W = 1600

JOBS = [
    "olivia-rodrigo-glastonbury-2025.jpg",
    "carly-rae-jepsen-primavera-2019.jpg",
]


def ensure_model() -> str:
    if not MODEL.exists():
        MODEL.parent.mkdir(parents=True, exist_ok=True)
        urllib.request.urlretrieve(MODEL_URL, MODEL)
    return str(MODEL)


def detect_face(im):
    h, w = im.shape[:2]
    det = cv2.FaceDetectorYN_create(ensure_model(), "", (w, h), 0.7, 0.3, 5000)
    det.setInputSize((w, h))
    _, faces = det.detect(im)
    if faces is None or len(faces) == 0:
        raise SystemExit("no face")
    faces = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)
    x, y, fw, fh = [float(v) for v in faces[0][:4]]
    return x, y, fw, fh


def crop_to_face(im, face):
    H, W = im.shape[:2]
    x, y, fw, fh = face
    cx = x + fw / 2
    cy = y + fh * 0.42
    hair = y - 0.55 * fh
    chin = y + fh + 0.22 * fh
    need_h = max(chin - hair, W / ASPECT)
    need_w = need_h * ASPECT
    if need_w > W:
        need_w = float(W)
        need_h = need_w / ASPECT
    left = cx - need_w / 2
    top = cy - need_h / 2
    if top > hair:
        top = hair
    if top + need_h < chin:
        top = chin - need_h
    left = max(0.0, min(left, W - need_w))
    top = max(0.0, min(top, H - need_h))
    x0, y0 = int(round(left)), int(round(top))
    x1, y1 = int(round(left + need_w)), int(round(top + need_h))
    crop = im[y0:y1, x0:x1]
    out_h = int(round(OUT_W / ASPECT))
    return cv2.resize(crop, (OUT_W, out_h), interpolation=cv2.INTER_AREA)


def main() -> None:
    for name in JOBS:
        src = PHOTOS / name
        im = cv2.imread(str(src))
        if im is None:
            raise SystemExit(f"missing {src}")
        face = detect_face(im)
        out = crop_to_face(im, face)
        dest = PHOTOS / (src.stem + "-banner.jpg")
        cv2.imwrite(str(dest), out, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
        print("wrote", dest.name, out.shape[1], out.shape[0], "face", tuple(round(v) for v in face))


if __name__ == "__main__":
    main()
