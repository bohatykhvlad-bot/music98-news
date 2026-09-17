#!/usr/bin/env python3
"""Rebuild data/top50.json and the baked TOP50 list in index.html."""
import runpy
from pathlib import Path

runpy.run_path(str(Path(__file__).resolve().parents[1] / "api" / "top50.py"), run_name="__main__")
