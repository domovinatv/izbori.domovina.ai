#!/usr/bin/env python3
"""Fetch the current Sabor seating plan PDF and save a normalized snapshot.

The plan is published as a single-page PDF at
    https://www.sabor.hr/export/new-seating-plan/hr
which lists currently-seated MPs by name. People who declined their D'Hondt
mandate (cabinet ministers, MEPs, županija prefects, etc.) do not appear; a
substitute (zamjenik) takes their seat instead.

Output: sifarnici/sabor_2024_seating.json
    {
      "fetched_at": ISO timestamp,
      "snapshot_date": as printed in PDF,
      "tokens": [<normalized surname/firstname tokens, deduped>],
      "raw_text": <full extracted text — for audit/debugging>
    }

Used by `scripts/build_index.py` to set rezultat_kandidat.u_saboru.
"""
from __future__ import annotations

import json
import re
import sys
import unicodedata
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

import pdfplumber

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "sifarnici" / "sabor_2024_seating.json"
URL = "https://www.sabor.hr/export/new-seating-plan/hr"

# Header noise we don't want as "name" tokens.
HEADER_NOISE = {
    "KLUB", "KLUBA", "ZASTUPNIK", "ZASTUPNIKA", "ZASTUPNICI", "HRVATSKI",
    "HRVATSKE", "SABOR", "SABORA", "HRVATSKOGA", "PREDSJEDNIK", "POLITICKIH",
    "STRANAKA", "POKRETA", "PARTIJE", "MOZEMO", "DOMOVINSKOG", "KLUBOVA",
    "SAVEZA", "DEMOKRATSKE", "ISTARSKOG", "PRIMORSKO", "GORANSKOG", "UNIJE",
    "KVARNERA", "STRANKE", "ZAJEDNICE", "SOCIJALDEMOKRATSKE", "SOCIJALNO",
    "LIBERALNE", "MOSTA", "NEZAVISNOG", "SAMOSTALNE", "SRPSKE", "CENTRA",
    "NEZAVISNE", "PLATFORME", "SJEVERA", "GRADJANSKO", "LIBERALNOG",
    "NARODNE", "SUVERENISTI", "HSU", "NACIONALNO", "OKUPLJANJE", "NEZAVISNI",
    "PRIKAZANO", "STANJE", "DAN", "IZVAN", "UMIROVLJENIKA", "NACIONALNIH",
    "MANJINA", "PARTITO", "ISTRIANO", "DEI", "PENSIONATI", "DOM",
    "BILEKA", "JURCEVICA", "VLADIMIRA", "JOSIPA",
}


def normalize(s: str) -> str:
    """Croatian-aware normalisation: drop accents (NFD), collapse Đ→D, upper,
    strip surrounding hyphens (so 'RAUKAR-' becomes 'RAUKAR' for compound
    surnames the PDF parser splits across rows)."""
    if not s:
        return ""
    s = s.replace("Đ", "D").replace("đ", "d")
    n = unicodedata.normalize("NFD", s)
    return "".join(c for c in n if unicodedata.category(c) != "Mn").upper().strip().strip("-")


def extract_pdf_text(blob: bytes) -> tuple[str, list]:
    """Returns (full_text, words_with_coords). Words have x0/x1/top/bottom keys."""
    import io
    with pdfplumber.open(io.BytesIO(blob)) as pdf:
        full_text = ""
        all_words: list = []
        for page in pdf.pages:
            full_text += (page.extract_text() or "") + "\n"
            words = page.extract_words(
                use_text_flow=False,
                keep_blank_chars=False,
                extra_attrs=["fontname", "size"],
            )
            all_words.extend(words)
    return full_text, all_words


def cluster_into_rows(words: list, y_tolerance: float = 4.0) -> list[list]:
    """Group word boxes into visual rows by `top` coordinate."""
    sorted_words = sorted(words, key=lambda w: (w["top"], w["x0"]))
    rows: list[list] = []
    cur_row: list = []
    cur_top: float | None = None
    for w in sorted_words:
        if cur_top is None or abs(w["top"] - cur_top) > y_tolerance:
            if cur_row:
                rows.append(cur_row)
            cur_row = [w]
            cur_top = w["top"]
        else:
            cur_row.append(w)
    if cur_row:
        rows.append(cur_row)
    for r in rows:
        r.sort(key=lambda w: w["x0"])
    return rows


def derive_pairs_coord(rows: list[list]) -> list[tuple[str, str]]:
    """Coordinate-based pairing: for every consecutive (surname row, firstname
    row), match each surname to the firstname whose x-center is closest. The
    PDF is column-aligned so this is reliable for most rows."""
    pairs: list[tuple[str, str]] = []
    text = lambda w: (w.get("text") or "").strip()  # noqa: E731

    i = 0
    while i + 1 < len(rows):
        sn_row, fn_row = rows[i], rows[i + 1]
        sn_alpha = [w for w in sn_row if re.match(r"^[A-ZČĆŠĐŽ][A-ZČĆŠĐŽa-zčćšđž\-']*$", text(w))]
        fn_alpha = [w for w in fn_row if re.match(r"^[A-ZČĆŠĐŽ][A-ZČĆŠĐŽa-zčćšđž\-']*$", text(w))]
        if len(sn_alpha) < 2 or not fn_alpha:
            i += 1
            continue

        # Skip rows that are obviously club headers (e.g. multi-word phrases).
        joined = " ".join(text(w) for w in sn_row)
        if any(s in joined for s in ("Klub zastupnika", "Zastupnici izvan",
                                     "Prikazano je", "HRVATSKI", "PREDSJEDNIK")):
            i += 1
            continue

        for sw in sn_alpha:
            sx = (sw["x0"] + sw["x1"]) / 2
            best, best_d = None, 1e9
            for fw in fn_alpha:
                fx = (fw["x0"] + fw["x1"]) / 2
                d = abs(sx - fx)
                if d < best_d:
                    best, best_d = fw, d
            if best is not None and best_d <= 30:
                pairs.append((text(sw), text(best)))
        i += 2

    return pairs


def extra_presidium_pairs(text: str) -> list[tuple[str, str]]:
    """The seating PDF places presidium / Speaker entries in their own
    columns at the bottom of the chart. They follow the same surname-then-
    firstname pattern but with fewer tokens per row, so the main parser
    sometimes misses them. Re-scan the bottom of the text for stand-alone
    'Surname' / 'Firstname' line pairs."""
    pairs: list[tuple[str, str]] = []
    lines = [ln.strip() for ln in text.splitlines()]
    for i in range(len(lines) - 1):
        a, b = lines[i], lines[i + 1]
        if not a or not b or " " in a or " " in b:
            continue
        if not (a[:1].isupper() and b[:1].isupper()):
            continue
        # Skip header words.
        if a.upper() in HEADER_NOISE or b.upper() in HEADER_NOISE:
            continue
        if a.isupper() or b.isupper():  # all-caps lines are headings/labels
            continue
        pairs.append((a, b))
    return pairs


def main() -> int:
    print(f"Fetching {URL} …")
    blob = urllib.request.urlopen(URL, timeout=30).read()
    text, words = extract_pdf_text(blob)

    snapshot_date = ""
    m = re.search(r"Prikazano je stanje na dan:\s*([0-9./]+)", text)
    if m:
        snapshot_date = m.group(1)

    rows = cluster_into_rows(words)
    pairs = derive_pairs_coord(rows)
    pairs.extend(extra_presidium_pairs(text))

    # Manual overrides for MPs the coordinate parser misses due to compound
    # surnames or oversized rows that throw off the column alignment. These
    # are MPs whose surname tokens *are* present in the raw text but didn't
    # form a clean pair. Verify each entry against the seating PDF when the
    # snapshot date changes.
    KNOWN_SEATED = [
        ("Penava", "Ivan"),                  # IJ 5, DP president
        ("Marković", "Mario"),               # row missed
        ("Marković", "Ivana"),
        ("Marković", "Miroslav"),
        ("Auguštan-Pentek", "Jasenka"),      # compound surname overflow
        ("Raukar-Gamulin", "Urša"),          # compound surname overflow
        ("Selak Raspudić", "Marija"),        # compound surname (3-line block)
        ("Juričev-Martinčev", "Branka"),     # compound surname overflow
    ]
    for sn, fn in KNOWN_SEATED:
        pairs.append((sn, fn))

    # Build a normalized name set: both "SURNAME FIRSTNAME" and "FIRSTNAME SURNAME"
    # so matching is order-independent.
    pair_set: set[str] = set()
    surname_set: set[str] = set()
    for sn, fn in pairs:
        ns, nf = normalize(sn), normalize(fn)
        if not ns or not nf:
            continue
        if ns in HEADER_NOISE or nf in HEADER_NOISE:
            continue
        pair_set.add(f"{ns} {nf}")
        pair_set.add(f"{nf} {ns}")
        surname_set.add(ns)

    # Token set as a fallback (less accurate, more lenient)
    all_words = re.findall(r"[A-ZČĆŠĐŽa-zčćšđž\-']+", text)
    tokens: set[str] = set()
    for w in all_words:
        if len(w) < 3:
            continue
        n = normalize(w)
        if n in HEADER_NOISE:
            continue
        tokens.add(n)

    # Same noise filter for the JSON-exported pair list.
    clean_pairs = sorted({
        f"{normalize(sn)}|{normalize(fn)}"
        for sn, fn in pairs
        if normalize(sn) not in HEADER_NOISE
        and normalize(fn) not in HEADER_NOISE
        and len(normalize(sn)) >= 3 and len(normalize(fn)) >= 3
    })

    # Token-frozenset per MP — this is the *primary* matching key. A pair
    # like ("Marija", "Selak Raspudić") becomes the set {MARIJA, SELAK,
    # RASPUDIC}. A candidate's normalised token set must equal one of these
    # to be considered seated; partial overlaps (e.g. "Ivana Frljić Marković"
    # vs the seated "Ivana Marković") are correctly rejected.
    name_token_sets: set[frozenset[str]] = set()
    for sn, fn in pairs:
        toks: list[str] = []
        for raw in (sn, fn):
            for piece in re.split(r"[\s\-]+", raw or ""):
                n = normalize(piece)
                if len(n) >= 3 and n not in HEADER_NOISE:
                    toks.append(n)
        if len(toks) >= 2:
            name_token_sets.add(frozenset(toks))

    payload = {
        "fetched_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source_url": URL,
        "snapshot_date": snapshot_date,
        "name_token_sets": [sorted(s) for s in sorted(
            name_token_sets, key=lambda fs: sorted(fs)
        )],
        "pairs": clean_pairs,
        "pair_set": sorted(pair_set),
        "surname_set": sorted(surname_set),
        "tokens": sorted(tokens),
        "raw_text": text,
    }
    OUT.parent.mkdir(exist_ok=True, parents=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
                   encoding="utf-8")
    print(f"Saved {OUT.relative_to(ROOT)}  ({len(pairs)} pairs, "
          f"{len(surname_set)} unique surnames, {len(tokens)} tokens, snapshot {snapshot_date})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
