#!/usr/bin/env python3
"""Export per-unit parliamentary results for the browser election simulator.

Unlike scripts/export_web.py, which precomputes every displayed number, this
export ships *raw inputs* — the simulator recomputes seat allocation in the
browser on every slider move. See docs/izborni_sustav_cinjenice.md for the
legal rules the engine implements and web/lib/sim/ for the engine itself.

Output: web/public/data/simulator/<slug>.json (~75-90 KB per cycle, small
enough to inline at build time via web/lib/data.ts).

Usage:
    python3 scripts/export_simulator.py
    python3 scripts/export_simulator.py --check
"""

from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "data" / "izbori.sqlite"
OUT_DIR = ROOT / "web" / "public" / "data" / "simulator"

# Cycles with full per-unit + per-candidate coverage in the local mirror.
CYCLES = ("parlament-2024", "parlament-2020")

# ZIZHS čl. 38 (10 x 14), čl. 8 (diaspora 3). Statutory, not derived from data.
GEO_IJ = tuple(f"{i:03d}" for i in range(1, 12))
IJ_SEATS = {f"{i:03d}": 14 for i in range(1, 11)}
IJ_SEATS["011"] = 3

# ZIZHS čl. 17 — fixed statutory partition of the 8 minority seats.
MANJINE_SEATS = {"13": 3, "23": 1, "33": 1, "43": 1, "53": 1, "63": 1}
MANJINE_LABELS = {
    "13": "srpska",
    "23": "mađarska",
    "33": "talijanska",
    "43": "češka i slovačka",
    "53": "austrijska, bugarska, njemačka, poljska, romska, rumunjska, "
    "rusinska, ruska, turska, ukrajinska, vlaška i židovska",
    "63": "albanska, bošnjačka, crnogorska, makedonska i slovenska",
}

# Mirrors scripts/export_web.py PARLAMENT_IJ_LABELS.
IJ_LABELS = {
    "001": "I. (Zagreb sjever)",
    "002": "II. (Zagreb istok / Slavonija)",
    "003": "III. (Zagorje / Međimurje / Bjelovar)",
    "004": "IV. (Slavonija)",
    "005": "V. (Slavonski Brod / Posavina)",
    "006": "VI. (Zagreb zapad)",
    "007": "VII. (Karlovac / Sisak)",
    "008": "VIII. (Istra / Primorje)",
    "009": "IX. (Šibenik / Zadar / Lika)",
    "010": "X. (Split / Dalmacija)",
    "011": "XI. (inozemstvo)",
}


def leading_party(naziv: str) -> str:
    """Mirror of export_web.py leading_party(): 'HDZ, HSLS, …' -> 'HDZ'.

    This is the only coalition roll-up heuristic in the repo. It is a *leading
    party of a list*, never a person's membership — see docs/web_ui_notes.md.
    """
    if not naziv:
        return ""
    return naziv.split(",")[0].strip()


def short_name(naziv: str, max_len: int = 44) -> str:
    if not naziv or len(naziv) <= max_len:
        return naziv
    parts = [p.strip() for p in naziv.split(",")]
    out = parts[0]
    for p in parts[1:]:
        if len(out) + len(p) + 2 > max_len - 1:
            return out + " …"
        out += ", " + p
    return out


def unit_row(con: sqlite3.Connection, election: str, p1: str, vrsta: str):
    return con.execute(
        "SELECT id, biraci_ukupno, biraci_glasovalo, listici_ukupno, "
        "listici_vazeci, listici_nevazeci FROM rezultat "
        "WHERE election=? AND krug=1 AND vrsta=? AND p1=? AND p2='0000' AND p3='000'",
        (election, vrsta, p1),
    ).fetchone()


def build_cycle(con: sqlite3.Connection, election: str) -> dict:
    """Per-unit lists and candidates — the raw inputs the engine re-allocates."""
    jedinice = []
    for p1 in GEO_IJ:
        r = unit_row(con, election, p1, "02")
        if r is None:
            raise SystemExit(f"{election}: missing unit row for p1={p1}")
        liste = []
        for l in con.execute(
            "SELECT id, rbr, naziv, glasova, mandata FROM rezultat_lista "
            "WHERE rezultat_id=? ORDER BY rbr",
            (r["id"],),
        ):
            kandidati = [
                [k["rbr"], k["naziv"], k["glasova"] or 0]
                for k in con.execute(
                    "SELECT rbr, naziv, glasova FROM rezultat_kandidat "
                    "WHERE lista_id=? ORDER BY rbr",
                    (l["id"],),
                )
            ]
            liste.append(
                {
                    "rbr": l["rbr"],
                    "naziv": l["naziv"],
                    "kratki": short_name(l["naziv"]),
                    "obitelj": leading_party(l["naziv"]),
                    "glasova": l["glasova"] or 0,
                    "mandata_stvarni": l["mandata"] or 0,
                    "kandidati": kandidati,
                }
            )
        jedinice.append(
            {
                "code": p1,
                "label": IJ_LABELS[p1],
                "mandata": IJ_SEATS[p1],
                "biraci": r["biraci_ukupno"],
                "glasovalo": r["biraci_glasovalo"],
                "vazeci": r["listici_vazeci"],
                "nevazeci": r["listici_nevazeci"],
                "liste": liste,
            }
        )

    # IJ XII — plurality races, one row per candidate (the list IS the person).
    manjine = []
    for vrsta, seats in MANJINE_SEATS.items():
        r = unit_row(con, election, "012", vrsta)
        if r is None:
            continue
        kandidati = [
            {
                "rbr": l["rbr"],
                "naziv": l["naziv"],
                "glasova": l["glasova"] or 0,
                "mandata_stvarni": l["mandata"] or 0,
            }
            for l in con.execute(
                "SELECT rbr, naziv, glasova, mandata FROM rezultat_lista "
                "WHERE rezultat_id=? ORDER BY rbr",
                (r["id"],),
            )
        ]
        manjine.append(
            {
                "vrsta": vrsta,
                "manjina": MANJINE_LABELS[vrsta],
                "mandata": seats,
                "biraci": r["biraci_ukupno"],
                "glasovalo": r["biraci_glasovalo"],
                "vazeci": r["listici_vazeci"],
                "nevazeci": r["listici_nevazeci"],
                "kandidati": kandidati,
            }
        )

    god = int(election.split("-")[1])
    dom = [u for u in jedinice if u["code"] != "011"]
    return {
        "slug": election,
        "godina": god,
        "label": f"Zastupnički izbori {god}.",
        "jedinice": jedinice,
        "manjine": manjine,
        "ukupno": {
            # IJ I–XI. The nationally quoted turnout also folds in IJ XII —
            # see docs/izborni_sustav_cinjenice.md §9 before labelling this.
            "biraci": sum(u["biraci"] for u in jedinice),
            "glasovalo": sum(u["glasovalo"] for u in jedinice),
            "vazeci": sum(u["vazeci"] for u in jedinice),
            "nevazeci": sum(u["nevazeci"] for u in jedinice),
            "biraci_domaci": sum(u["biraci"] for u in dom),
            "glasovalo_domaci": sum(u["glasovalo"] for u in dom),
            "vazeci_domaci": sum(u["vazeci"] for u in dom),
        },
    }


def spot_check(con: sqlite3.Connection, data: dict) -> list[str]:
    """Assert the JSON reconciles with direct SQL and with the official result."""
    fails: list[str] = []
    el = data["slug"]

    def eq(label: str, got, want):
        if got != want:
            fails.append(f"{el}: {label}: {got!r} != {want!r}")

    eq("broj jedinica", len(data["jedinice"]), 11)
    eq("geografskih mandata", sum(u["mandata"] for u in data["jedinice"]), 143)
    eq("manjinskih mandata", sum(m["mandata"] for m in data["manjine"]), 8)

    for u in data["jedinice"]:
        got = sum(l["glasova"] for l in u["liste"])
        row = con.execute(
            "SELECT SUM(l.glasova) s FROM rezultat r JOIN rezultat_lista l "
            "ON l.rezultat_id=r.id WHERE r.election=? AND r.krug=1 AND r.vrsta='02' "
            "AND r.p1=? AND r.p2='0000' AND r.p3='000'",
            (el, u["code"]),
        ).fetchone()
        eq(f"IJ {u['code']} zbroj glasova", got, row["s"])
        # Valid ballots should equal the sum of list votes (no blank-but-valid).
        eq(f"IJ {u['code']} važeći == Σ glasova", got, u["vazeci"])
        eq(
            f"IJ {u['code']} stvarnih mandata",
            sum(l["mandata_stvarni"] for l in u["liste"]),
            u["mandata"],
        )
        for l in u["liste"]:
            if l["kandidati"] and len(l["kandidati"]) > 14:
                fails.append(f"{el}: IJ {u['code']} '{l['kratki']}' ima >14 kandidata")

    for m in data["manjine"]:
        eq(
            f"manjina {m['vrsta']} stvarnih mandata",
            sum(k["mandata_stvarni"] for k in m["kandidati"]),
            m["mandata"],
        )

    tot = con.execute(
        "SELECT SUM(biraci_ukupno) b, SUM(biraci_glasovalo) g, SUM(listici_vazeci) v "
        "FROM rezultat WHERE election=? AND krug=1 AND vrsta='02' AND level='zup' "
        "AND p2='0000' AND p3='000' AND p1<='011'",
        (el,),
    ).fetchone()
    eq("ukupno birača", data["ukupno"]["biraci"], tot["b"])
    eq("ukupno glasovalo", data["ukupno"]["glasovalo"], tot["g"])
    eq("ukupno važećih", data["ukupno"]["vazeci"], tot["v"])
    return fails


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--check", action="store_true", help="verify against SQL and exit non-zero on mismatch")
    args = ap.parse_args()

    if not DB_PATH.exists():
        print(f"missing {DB_PATH} — run scripts/mirror.py + build_index.py first", file=sys.stderr)
        return 1

    con = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
    con.row_factory = sqlite3.Row
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    fails: list[str] = []
    index = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "cycles": [],
    }
    for el in CYCLES:
        data = build_cycle(con, el)
        if args.check:
            fails += spot_check(con, data)
        path = OUT_DIR / f"{el}.json"
        path.write_text(
            json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
        )
        n_l = sum(len(u["liste"]) for u in data["jedinice"])
        n_k = sum(len(l["kandidati"]) for u in data["jedinice"] for l in u["liste"])
        print(f"{path.relative_to(ROOT)}  {path.stat().st_size:>7,} B  {n_l} lista, {n_k} kandidata")
        index["cycles"].append(
            {"slug": el, "godina": data["godina"], "label": data["label"], "file": f"{el}.json"}
        )

    (OUT_DIR / "index.json").write_text(
        json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"{(OUT_DIR / 'index.json').relative_to(ROOT)}")

    if args.check:
        if fails:
            print(f"\n{len(fails)} PROVJERA PALO:", file=sys.stderr)
            for f in fails:
                print(f"  ✗ {f}", file=sys.stderr)
            return 1
        print("\n✓ sve provjere prošle")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
