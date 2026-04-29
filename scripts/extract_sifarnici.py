#!/usr/bin/env python3
"""Extract hardcoded sifarniks (zupanije, gradOpcina, vrste, izborneJedinice,
manjine, inozemstvo) from DAO JS files into JSON files under sifarnici/.

The izbori.hr archive is an AngularJS SPA whose codebooks live as plain JS
arrays of {"code": ..., "label": ..., "codetop": ...} inside the DAO files.
Keys are quoted, so a regex grab + json.loads is enough.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / "raw_dao"
OUT_DIR = ROOT / "sifarnici"

# Variable names we want to pull out of each DAO. Not every DAO defines every
# variable — that's fine, missing ones are silently skipped.
WANTED_VARS = [
    "zupanija",
    "gradOpcina",
    "inozemstvo",
    "izbornaJedinica",
    "manjina",
    "vrsta",
]


def extract_array(js: str, var_name: str) -> list | None:
    """Find `var <var_name> = [ ... ];` and parse the array as JSON."""
    pattern = re.compile(
        r"var\s+" + re.escape(var_name) + r"\s*=\s*(\[.*?\])\s*;",
        re.DOTALL,
    )
    m = pattern.search(js)
    if not m:
        return None

    text = m.group(1)
    # Strip trailing commas before `]` or `}` (legal in JS, not in JSON).
    text = re.sub(r",(\s*[\]}])", r"\1", text)
    # Strip JS line comments to be safe.
    text = re.sub(r"//[^\n]*", "", text)
    return json.loads(text)


def process_dao(dao_path: Path) -> dict[str, list]:
    js = dao_path.read_text(encoding="utf-8")
    out: dict[str, list] = {}
    for var in WANTED_VARS:
        arr = extract_array(js, var)
        if arr is not None:
            out[var] = arr
    return out


def main() -> int:
    OUT_DIR.mkdir(exist_ok=True)
    if not RAW_DIR.is_dir():
        print(f"missing {RAW_DIR}", file=sys.stderr)
        return 1

    for dao in sorted(RAW_DIR.glob("*-dao.js")):
        # `predsjednik-2024-dao.js` -> `predsjednik-2024`
        slug = dao.stem.removesuffix("-dao")
        sifarnici = process_dao(dao)
        out_file = OUT_DIR / f"{slug}.json"
        out_file.write_text(
            json.dumps(sifarnici, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        sizes = ", ".join(f"{k}={len(v)}" for k, v in sifarnici.items())
        print(f"{slug}: {sizes}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
