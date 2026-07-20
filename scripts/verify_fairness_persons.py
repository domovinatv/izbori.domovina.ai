#!/usr/bin/env python3
"""Rigorous per-person verification of the candidate lists shown on the web
dashboard's fairness sections (fairness.json: gubitnici, namjestenici and
ekstremi.parovi).

For each person, three independent sources must agree:
  (a) the raw mirrored DIP JSON (via the source_file column in the DB):
      name, preferential votes, list name;
  (b) the official DIP report PDF (data/pdfs/izvjesce.pdf, fetch with
      `python3 scripts/grep_pdf.py --fetch`): name present and the vote
      count adjacent to it;
  (c) the sabor.hr seating snapshot (sifarnici/sabor_2024_seating.json):
      seated/not-seated status and, for seated MPs, the actual party.

Read-only everywhere (DB opened with mode=ro). Exits non-zero if any person
fails. Full historical results: docs/verifikacija_gubitnici_dobitnici_2024.md
and PLAN_UI.md §8.

Usage:
    python3 scripts/verify_fairness_persons.py
"""
from __future__ import annotations

import json
import re
import sqlite3
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def fold(s: str) -> str:
    s = s.replace("Đ", "D").replace("đ", "d")
    n = unicodedata.normalize("NFD", s)
    return "".join(c for c in n if unicodedata.category(c) != "Mn").upper()


def main() -> None:
    try:
        from pypdf import PdfReader
    except ImportError:
        sys.exit("pypdf not installed. Run: pip3 install pypdf")

    fair = json.load(open(ROOT / "web/public/data/fairness.json"))
    seating = json.load(open(ROOT / "sifarnici/sabor_2024_seating.json"))
    mp_tokens = [(set(m["tokens"]), m) for m in seating["mps"]]

    pdf_path = ROOT / "data/pdfs/izvjesce.pdf"
    if not pdf_path.exists():
        sys.exit("DIP PDF missing — run: python3 scripts/grep_pdf.py --fetch")
    pdf_pages: list[tuple[int, str]] = []
    for i, page in enumerate(PdfReader(str(pdf_path)).pages, start=1):
        try:
            pdf_pages.append((i, fold(page.extract_text() or "")))
        except Exception:
            pdf_pages.append((i, ""))

    con = sqlite3.connect(f"file:{ROOT}/data/izbori.sqlite?mode=ro", uri=True)
    con.row_factory = sqlite3.Row

    def pdf_check(name: str, votes: int) -> tuple[list[int], bool]:
        needle = fold(name)
        vote_pats = [str(votes), f"{votes:,}".replace(",", ".")]
        pages_hit, votes_ok = [], False
        for pno, text in pdf_pages:
            start = 0
            while True:
                idx = text.find(needle, start)
                if idx == -1:
                    break
                pages_hit.append(pno)
                window = text[idx : idx + len(needle) + 120]
                for vp in vote_pats:
                    if re.search(r"(?<!\d)" + re.escape(vp) + r"(?!\d)", window):
                        votes_ok = True
                start = idx + len(needle)
        return sorted(set(pages_hit)), votes_ok

    def seating_match(name: str) -> dict | None:
        toks = set(fold(name).split())
        exact = [m for tset, m in mp_tokens if tset == toks]
        if len(exact) == 1:
            return exact[0]
        fuzzy = [m for tset, m in mp_tokens if tset.issubset(toks) or toks.issubset(tset)]
        return fuzzy[0] if len(fuzzy) == 1 else None

    def verify(person: dict, expect_seated: bool) -> list[str]:
        naziv, ij, glasova = person["naziv"], person["ij"], person["glasova"]
        problems: list[str] = []
        db = con.execute(
            """SELECT k.glasova, COALESCE(k.u_saboru,0) u_saboru,
                      l.naziv AS lista_naziv, r.source_file
               FROM rezultat_kandidat k
               JOIN rezultat_lista l ON l.id=k.lista_id
               JOIN rezultat r ON r.id=l.rezultat_id
               WHERE r.election='parlament-2024' AND r.level='zup' AND r.vrsta='02'
                 AND k.naziv=? AND CAST(r.p1 AS INT)=?""",
            (naziv, ij),
        ).fetchall()
        if len(db) != 1:
            return [f"DB: {len(db)} rows for name+IJ"]
        db = db[0]
        if db["glasova"] != glasova:
            problems.append(f"DB votes {db['glasova']} != export {glasova}")

        raw = json.load(open(ROOT / "data" / db["source_file"]))
        hit = None
        for lst in raw["lista"]:
            for kand in lst.get("lista", []):
                if kand["naziv"] == naziv:
                    hit = (lst, kand)
        if not hit:
            problems.append("NOT FOUND in raw DIP JSON")
        else:
            lst, kand = hit
            if kand["glasova"] != glasova:
                problems.append(f"raw JSON votes {kand['glasova']} != {glasova}")
            if lst["naziv"] != db["lista_naziv"]:
                problems.append("raw list name != DB list name")

        pages, votes_ok = pdf_check(naziv, glasova)
        if not pages:
            problems.append("name NOT in DIP PDF")
        elif not votes_ok:
            problems.append("votes not adjacent to name in PDF")

        mp = seating_match(naziv)
        if expect_seated and not mp:
            problems.append("claimed seated but NOT in sabor.hr seating")
        if not expect_seated and mp:
            problems.append("claimed not seated but IS in sabor.hr seating")
        if expect_seated and mp and person.get("sabor_stranka") not in (None, mp["party"]):
            problems.append(
                f"export sabor_stranka {person.get('sabor_stranka')} != sabor.hr {mp['party']}"
            )
        return problems

    groups: list[tuple[str, dict, bool]] = []
    groups += [("gubitnici", p, False) for p in fair["gubitnici"]]
    groups += [("namjestenici", p, True) for p in fair["namjestenici"]]
    for par in fair["ekstremi"]["parovi"]:
        groups.append(("parovi/gubitnik", par["gubitnik"], False))
        groups.append(("parovi/dobitnik", par["dobitnik"], True))

    failed = 0
    for group, person, seated in groups:
        problems = verify(person, seated)
        if problems:
            failed += 1
            print(f"FAIL [{group}] {person['naziv']} (IJ {person['ij']}): {problems}")
    print(f"{len(groups)} person-checks, {failed} failed")
    con.close()
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
