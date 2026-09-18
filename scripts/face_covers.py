#!/usr/bin/env python3
"""Cut 16:9 cover stills on the detected face.

Keep the whole head. Trim empty sky, but leave a little air above the
hair — never pin the crown to y=0 (that shaves the top of the head).
"""
from __future__ import annotations

import urllib.request
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
PHOTOS = ROOT / "public" / "photos"
MODEL = ROOT / "scripts" / "face_detection_yunet_2023mar.onnx"
MODEL_URL = "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"
ASPECT = 16 / 9
OUT_W = 1600

JOBS = [
    "olivia-rodrigo-glastonbury-2025.jpg",
    "carly-rae-jepsen-troubadour-2025-smile.jpg",
]


def ensure_model() -> str:
    if not MODEL.exists():
        MODEL.parent.mkdir(parents=True, exist_ok=True)
        urllib.request.urlretrieve(MODEL_URL, MODEL)
    return str(MODEL)


def detect_face(im):
    h, w = im.shape[:2]
    work = im
    scale = 1.0
    if max(h, w) > 1800:
        scale = 1800 / max(h, w)
        work = cv2.resize(im, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
        h, w = work.shape[:2]
    det = cv2.FaceDetectorYN_create(ensure_model(), "", (w, h), 0.6, 0.3, 5000)
    det.setInputSize((w, h))
    _, faces = det.detect(work)
    if faces is None or len(faces) == 0:
        raise SystemExit("no face")
    faces = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)
    x, y, fw, fh = [float(v) / scale for v in faces[0][:4]]
    return x, y, fw, fh


def hair_top(im, face):
    """First strong silhouette above the face — the crown of the hair."""
    x, y, fw, fh = face
    H, W = im.shape[:2]
    hx0 = max(0, int(x + 0.18 * fw))
    hx1 = min(W, int(x + 0.82 * fw))
    y1 = max(2, int(y))
    gray = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
    roi = gray[0:y1, hx0:hx1].astype(np.float32)
    if roi.size == 0:
        return max(0.0, y - 0.06 * fh)
    gy = cv2.Sobel(roi, cv2.CV_32F, 0, 1, ksize=5)
    energy = np.abs(gy).mean(axis=1)
    peak = float(energy.max()) if len(energy) else 0.0
    if peak < 40:
        return max(0.0, y - 0.06 * fh)
    return float(int(np.argmax(energy)))


def crop_to_face(im, face):
    H, W = im.shape[:2]
    x, y, fw, fh = face
    cx = x + fw / 2
    need_w = float(W)
    need_h = need_w / ASPECT
    if need_h > H:
        need_h = float(H)
        need_w = need_h * ASPECT
    closeup = fh > 0.28 * need_h
    chin = y + fh + 0.18 * fh
    crown = hair_top(im, face)
    hair_pad = max(18.0, 0.16 * fh)
    if closeup:
        top = crown - hair_pad
    else:
        cy = y + fh * 0.42
        top = cy - need_h / 2
        if top > crown - hair_pad:
            top = crown - hair_pad
    if top + need_h < chin:
        top = chin - need_h
    left = cx - need_w / 2
    left = max(0.0, min(left, W - need_w))
    top = max(0.0, min(top, H - need_h))
    x0, y0 = int(round(left)), int(round(top))
    x1, y1 = int(round(left + need_w)), int(round(top + need_h))
    crop = im[y0:y1, x0:x1]
    out_h = int(round(OUT_W / ASPECT))
    return cv2.resize(crop, (OUT_W, out_h), interpolation=cv2.INTER_AREA), y0, crown, closeup


def main() -> None:
    for name in JOBS:
        src = PHOTOS / name
        im = cv2.imread(str(src))
        if im is None:
            raise SystemExit(f"missing {src}")
        face = detect_face(im)
        out, y0, crown, closeup = crop_to_face(im, face)
        dest = PHOTOS / (src.stem + "-banner.jpg")
        cv2.imwrite(str(dest), out, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
        print(
            "wrote",
            dest.name,
            out.shape[1],
            out.shape[0],
            "face",
            tuple(round(v) for v in face),
            "crown",
            round(crown),
            "crop_y",
            y0,
            "closeup",
            closeup,
        )


if __name__ == "__main__":
    main()
