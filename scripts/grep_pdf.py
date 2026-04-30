#!/usr/bin/env python3
"""Download the official DIP elections report (single source of truth) and
grep for text inside it.

Croatian-diacritic-insensitive search by default, with page-number reporting
for each hit. Useful for double-checking individual MPs / candidates / vote
counts against the authoritative DIP report.

Assets are stored under `data/pdfs/<name>.pdf` and downloaded on first use.
The `data/` directory is gitignored — the script makes them re-fetchable.

Usage:
    # Search the elections report for "Dabro", ignoring diacritics:
    python3 scripts/grep_pdf.py Dabro

    # Search a local PDF path:
    python3 scripts/grep_pdf.py --pdf path/to/file.pdf "neki tekst"

    # Pre-download known asset without searching:
    python3 scripts/grep_pdf.py --fetch
"""
from __future__ import annotations

import argparse
import sys
import unicodedata
import urllib.request
from pathlib import Path

try:
    from pypdf import PdfReader
except ImportError:
    sys.exit("pypdf not installed. Run: pip3 install pypdf")

ROOT = Path(__file__).resolve().parent.parent
PDF_DIR = ROOT / "data" / "pdfs"

ASSETS: dict[str, tuple[str, str]] = {
    "izvjesce": (
        "https://www.izbori.hr/site/UserDocsImages/2024/"
        "Izbori_za_zastupnike_u_Hrvatski_sabor/Rezultati/"
        "Izvje%C5%A1%C4%87e%20o%20provedenim%20izborima%20za%20zastupnike"
        "%20u%20Hrvatski%20sabor%202024.pdf",
        "DIP izvješće o provedenim parlamentarnim izborima 2024 — "
        "JEDINI cjeloviti DIP izvor (svih 11 geografskih IJ + manjine)",
    ),
}


def asset_path(name: str) -> Path:
    return PDF_DIR / f"{name}.pdf"


def fetch(name: str, url: str) -> Path:
    PDF_DIR.mkdir(parents=True, exist_ok=True)
    p = asset_path(name)
    if p.exists() and p.stat().st_size > 0:
        return p
    print(f"Downloading {name} ← {url}", file=sys.stderr)
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req) as r, open(p, "wb") as f:
        f.write(r.read())
    print(f"  → {p.relative_to(ROOT)} ({p.stat().st_size:,} bytes)", file=sys.stderr)
    return p


def fold(s: str) -> str:
    """Strip Croatian diacritics for diacritic-insensitive search."""
    s = s.replace("Đ", "D").replace("đ", "d")
    n = unicodedata.normalize("NFD", s)
    return "".join(c for c in n if unicodedata.category(c) != "Mn")


def grep_pdf(path: Path, query: str, ignore_diacritics: bool,
             ignore_case: bool, context_chars: int) -> int:
    reader = PdfReader(str(path))
    needle = query
    if ignore_diacritics:
        needle = fold(needle)
    if ignore_case:
        needle = needle.lower()

    hits = 0
    total_chars = 0
    for i, page in enumerate(reader.pages, start=1):
        try:
            text = page.extract_text() or ""
        except Exception as e:
            print(f"p.{i}: extract failed ({e})", file=sys.stderr)
            continue
        total_chars += len(text)
        haystack = text
        if ignore_diacritics:
            haystack = fold(haystack)
        if ignore_case:
            haystack = haystack.lower()
        if needle not in haystack:
            continue
        hits += 1
        # Report each occurrence with surrounding context.
        start = 0
        while True:
            idx = haystack.find(needle, start)
            if idx == -1:
                break
            a = max(0, idx - context_chars)
            b = min(len(text), idx + len(query) + context_chars)
            snippet = text[a:b].replace("\n", " ")
            print(f"p.{i}: …{snippet}…")
            start = idx + len(needle)

    print(file=sys.stderr)
    if total_chars == 0:
        print(
            f"⚠ 0 chars extracted from {path.name}. PDF likely contains scanned "
            f"images (no OCR layer) — Cmd+F won't find anything either.",
            file=sys.stderr,
        )
    print(
        f"{hits} of {len(reader.pages)} pages matched "
        f"'{query}' in {path.name} ({total_chars:,} chars total).",
        file=sys.stderr,
    )
    return hits


def main() -> None:
    ap = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    ap.add_argument("query", nargs="?", help="text to search for")
    ap.add_argument(
        "--pdf", default="izvjesce",
        help=f"asset name ({', '.join(ASSETS)}) or path to local PDF "
             f"(default: izvjesce)",
    )
    ap.add_argument("--fetch", action="store_true",
                    help="download all known PDF assets and exit")
    ap.add_argument("--list", action="store_true",
                    help="list known asset names and exit")
    ap.add_argument("-d", "--ignore-diacritics", action="store_true",
                    default=True,
                    help="diacritic-insensitive (default ON)")
    ap.add_argument("-D", "--strict-diacritics", dest="ignore_diacritics",
                    action="store_false",
                    help="require exact diacritics in match")
    ap.add_argument("-s", "--case-sensitive", dest="ignore_case",
                    action="store_false", default=True,
                    help="case-sensitive match (default OFF)")
    ap.add_argument("-c", "--context", type=int, default=40,
                    help="chars of surrounding context per hit (default 40)")
    args = ap.parse_args()

    if args.list:
        for name, (url, desc) in ASSETS.items():
            p = asset_path(name)
            mark = "✓" if p.exists() else "·"
            print(f"  {mark} {name:<10} — {desc}")
        return

    if args.fetch:
        for name, (url, _desc) in ASSETS.items():
            fetch(name, url)
        return

    if not args.query:
        ap.error("query required (or use --fetch / --list)")

    if args.pdf in ASSETS:
        path = fetch(args.pdf, ASSETS[args.pdf][0])
    else:
        path = Path(args.pdf).expanduser()
        if not path.exists():
            sys.exit(f"PDF not found: {path}")

    grep_pdf(path, args.query, args.ignore_diacritics,
             args.ignore_case, args.context)


if __name__ == "__main__":
    main()
