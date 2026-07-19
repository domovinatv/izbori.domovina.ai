#!/usr/bin/env python3
"""Export aggregated election data from data/izbori.sqlite to web/public/data/.

Produces static JSON consumed by the Next.js dashboard in web/. The database
is opened READ-ONLY so this script is safe to run while other sessions are
mirroring/indexing. Only cycles present in the index are exported; the
frontend reads manifest.json and renders only what exists.

All computation happens here (Python) — the frontend only displays.

Usage:
    python3 scripts/export_web.py            # export JSON
    python3 scripts/export_web.py --geo      # also (re)build zupanije.geojson
                                             # (needs npx/mapshaper)
"""
from __future__ import annotations

import json
import re
import sqlite3
import subprocess
import sys
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "data" / "izbori.sqlite"
OUT_DIR = ROOT / "web" / "public" / "data"
SIFARNICI = ROOT / "sifarnici"
ZUP_GEOJSON_SRC = Path(
    "~/git/domovinatv/karta-hrvatske/apps/data-pipeline/data/hr_canonical_zupanije.geojson"
).expanduser()

# Sabor 2024 — geographic IJs and their fixed seat counts (mirrors app.py).
PARLAMENT_GEO_IJ = tuple(f"{i:03d}" for i in range(1, 12))
PARLAMENT_IJ_SEATS = {f"{i:03d}": 14 for i in range(1, 11)}
PARLAMENT_IJ_SEATS["011"] = 3
PARLAMENT_IJ_LABELS = {
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

# slug prefix -> cycle type (drives which sections the frontend shows)
TYPE_BY_PREFIX = {
    "parlament": "parlament",
    "predsjednik": "predsjednik",
    "euparlament": "euparlament",
    "lokalni": "lokalni",
    "referendum": "referendum",
}

# Croatian county names keyed by DIP p1 code (from the DB itself, zup_naziv),
# fallback labels only used if a zup row lacks a name.
TOP_LISTS = 12  # lists kept per view; the rest fold into "Ostali"


def cycle_type(slug: str) -> str:
    for prefix, t in TYPE_BY_PREFIX.items():
        if slug.startswith(prefix):
            return t
    return "ostalo"


def cycle_year(slug: str) -> int:
    m = re.search(r"(\d{4})", slug)
    return int(m.group(1)) if m else 0


def leading_party(naziv: str) -> str:
    """Mirror of app.py leading_party(): 'HDZ, HSLS, …' -> 'HDZ'."""
    if not naziv:
        return ""
    return naziv.split(",")[0].strip()


def short_list_name(naziv: str, max_len: int = 40) -> str:
    if not naziv:
        return ""
    if len(naziv) <= max_len:
        return naziv
    parts = [p.strip() for p in naziv.split(",")]
    out = parts[0]
    for p in parts[1:]:
        if len(out) + len(p) + 2 > max_len - 1:
            return out + " …"
        out += ", " + p
    return out


def load_sifarnik(slug: str) -> dict:
    # sifarnici file names differ slightly from mirror slugs (eu-parlament vs
    # euparlament); try both spellings.
    candidates = [
        SIFARNICI / f"{slug}.json",
        SIFARNICI / f"{slug.replace('euparlament', 'eu-parlament')}.json",
    ]
    for p in candidates:
        if p.exists():
            with open(p) as f:
                return json.load(f)
    return {}


def rows(con: sqlite3.Connection, sql: str, params: tuple = ()) -> list[sqlite3.Row]:
    cur = con.execute(sql, params)
    return cur.fetchall()


def round_summary(r: sqlite3.Row) -> dict:
    return {
        "biraci_ukupno": r["biraci_ukupno"],
        "glasovalo": r["biraci_glasovalo"],
        "odaziv_posto": r["biraci_glasovalo_posto"],
        "vazeci": r["listici_vazeci"],
        "nevazeci": r["listici_nevazeci"],
        "datum_objave": r["datum"],
    }


def lists_for(con: sqlite3.Connection, rezultat_id: int, limit: int | None = None) -> list[dict]:
    lst = rows(
        con,
        """SELECT naziv, glasova, posto, mandata FROM rezultat_lista
           WHERE rezultat_id = ? ORDER BY glasova DESC""",
        (rezultat_id,),
    )
    total = sum(r["glasova"] or 0 for r in lst)
    out = [
        {
            "naziv": r["naziv"],
            "kratki": short_list_name(r["naziv"]),
            "stranka": leading_party(r["naziv"]),
            "glasova": r["glasova"],
            # Some cycles (e.g. predsjednik-2019 round 2) lack posto in the
            # source files — derive it from the vote totals.
            "posto": (
                r["posto"]
                if r["posto"] is not None
                else (round(100.0 * (r["glasova"] or 0) / total, 2) if total else None)
            ),
            "mandata": r["mandata"],
        }
        for r in lst
    ]
    if limit is not None and len(out) > limit:
        head, tail = out[:limit], out[limit:]
        head.append(
            {
                "naziv": "Ostali",
                "kratki": "Ostali",
                "stranka": "Ostali",
                "glasova": sum(t["glasova"] or 0 for t in tail),
                "posto": round(sum(t["posto"] or 0 for t in tail), 2),
                "mandata": None,
            }
        )
        return head
    return out


def export_parlament(con: sqlite3.Connection, slug: str) -> dict:
    """Sabor cycle: RH aggregate + D'Hondt seats per IJ + minority seats."""
    sifarnik = load_sifarnik(slug)
    ij_labels = {e["code"]: e["label"] for e in sifarnik.get("izbornaJedinica", [])}
    manjina_labels = {e["code"]: e["label"] for e in sifarnik.get("manjina", [])}

    rh = rows(
        con,
        "SELECT * FROM rezultat WHERE election=? AND level='rh' AND vrsta='02'",
        (slug,),
    )
    if not rh:
        return {}
    rh_row = rh[0]
    data: dict = {
        "krugovi": {"1": {"summary": round_summary(rh_row), "liste": lists_for(con, rh_row["id"], TOP_LISTS)}},
    }

    # Seats per general list (RH aggregate carries summed mandata).
    seats_general = [
        {"naziv": l["naziv"], "kratki": l["kratki"], "stranka": l["stranka"], "mandata": l["mandata"] or 0}
        for l in lists_for(con, rh_row["id"])
        if (l["mandata"] or 0) > 0
    ]
    # Minority seats live in rezultat_lista of p1='012' rows (list IS candidate).
    manjine = rows(
        con,
        """SELECT r.vrsta AS mv, l.naziv, l.glasova, l.mandata
           FROM rezultat r JOIN rezultat_lista l ON l.rezultat_id = r.id
           WHERE r.election=? AND r.p1='012' AND l.mandata > 0
           ORDER BY r.vrsta, l.glasova DESC""",
        (slug,),
    )
    seats_manjine = [
        {
            "naziv": m["naziv"],
            "manjina": manjina_labels.get(m["mv"], f"manjina {m['mv']}"),
            "glasova": m["glasova"],
            "mandata": m["mandata"],
        }
        for m in manjine
    ]
    data["sabor"] = {
        "opci_mandati": sum(s["mandata"] for s in seats_general),
        "manjinski_mandati": sum(s["mandata"] for s in seats_manjine),
        "ukupno": sum(s["mandata"] for s in seats_general) + sum(s["mandata"] for s in seats_manjine),
        "liste": seats_general,
        "manjine": seats_manjine,
    }

    # Per-IJ: turnout + seats by list (D'Hondt result computed in build_index).
    ij_rows = rows(
        con,
        """SELECT * FROM rezultat WHERE election=? AND level='zup' AND vrsta='02'
           ORDER BY p1""",
        (slug,),
    )
    jedinice = []
    for r in ij_rows:
        lst = rows(
            con,
            """SELECT naziv, glasova, posto, mandata FROM rezultat_lista
               WHERE rezultat_id=? AND mandata > 0 ORDER BY mandata DESC, glasova DESC""",
            (r["id"],),
        )
        jedinice.append(
            {
                "code": r["p1"],
                "label": ij_labels.get(r["p1"], f"IJ {int(r['p1'])}"),
                "odaziv_posto": r["biraci_glasovalo_posto"],
                "mandati": [
                    {"stranka": leading_party(l["naziv"]), "kratki": short_list_name(l["naziv"]), "mandata": l["mandata"], "posto": l["posto"]}
                    for l in lst
                ],
            }
        )
    data["jedinice"] = jedinice
    return data


def counties_for(con: sqlite3.Connection, slug: str, vrsta: str, krug: int) -> list[dict]:
    """County-level (p1 01..21) rows with winner + turnout for choropleth."""
    zup = rows(
        con,
        """SELECT * FROM rezultat WHERE election=? AND level='zup' AND vrsta=?
           AND krug=? AND CAST(p1 AS INTEGER) BETWEEN 1 AND 21 ORDER BY p1""",
        (slug, vrsta, krug),
    )
    out = []
    for r in zup:
        top = rows(
            con,
            """SELECT naziv, glasova, posto FROM rezultat_lista
               WHERE rezultat_id=? ORDER BY glasova DESC LIMIT 2""",
            (r["id"],),
        )
        if not top:
            continue
        total = sum(
            t["glasova"] or 0
            for t in rows(con, "SELECT glasova FROM rezultat_lista WHERE rezultat_id=?", (r["id"],))
        )
        def pct(row: sqlite3.Row) -> float | None:
            if row["posto"] is not None:
                return row["posto"]
            if total:
                return round(100.0 * (row["glasova"] or 0) / total, 2)
            return None

        winner = top[0]
        out.append(
            {
                "code": r["p1"],
                "naziv": r["zup_naziv"],
                "odaziv_posto": r["biraci_glasovalo_posto"],
                "pobjednik": winner["naziv"],
                "pobjednik_stranka": leading_party(winner["naziv"]),
                "pobjednik_posto": pct(winner),
                "pobjednik_glasova": winner["glasova"],
                "drugi": top[1]["naziv"] if len(top) > 1 else None,
                "drugi_posto": pct(top[1]) if len(top) > 1 else None,
            }
        )
    return out


def export_generic(con: sqlite3.Connection, slug: str, vrsta_rh: str | None = None) -> dict:
    """Presidential / EU / referendum cycle: RH per round + counties per round."""
    where_vrsta = "AND vrsta=?" if vrsta_rh else ""
    params: tuple = (slug, vrsta_rh) if vrsta_rh else (slug,)
    rh = rows(
        con,
        f"SELECT * FROM rezultat WHERE election=? AND level='rh' {where_vrsta} ORDER BY krug",
        params,
    )
    if not rh:
        return {}
    data: dict = {"krugovi": {}}
    for r in rh:
        krug = str(r["krug"])
        data["krugovi"][krug] = {
            "summary": round_summary(r),
            "liste": lists_for(con, r["id"], TOP_LISTS),
            "zupanije": counties_for(con, slug, r["vrsta"], r["krug"]),
        }
    return data


def export_lokalni(con: sqlite3.Connection, slug: str) -> dict:
    """Local elections: county-level župan race (vrsta 15) as the map layer,
    županijska skupština (06) RH-wide list totals don't exist — skip RH bars."""
    zupani = []
    zup_meta = rows(
        con,
        """SELECT DISTINCT p1, zup_naziv FROM rezultat
           WHERE election=? AND level='zup' AND vrsta='15'
           AND CAST(p1 AS INTEGER) BETWEEN 1 AND 21 ORDER BY p1""",
        (slug,),
    )
    for zm in zup_meta:
        # Final result: round 2 if it happened in this county, else round 1.
        row = None
        for krug in (2, 1):
            found = rows(
                con,
                """SELECT * FROM rezultat WHERE election=? AND level='zup'
                   AND vrsta='15' AND krug=? AND p1=?""",
                (slug, krug, zm["p1"]),
            )
            if found:
                row = found[0]
                break
        if row is None:
            continue
        cands = rows(
            con,
            """SELECT naziv, glasova, posto, predlagatelji, stranke FROM rezultat_lista
               WHERE rezultat_id=? ORDER BY glasova DESC LIMIT 2""",
            (row["id"],),
        )
        if not cands:
            continue
        total = sum(
            t["glasova"] or 0
            for t in rows(con, "SELECT glasova FROM rezultat_lista WHERE rezultat_id=?", (row["id"],))
        )
        w = cands[0]
        posto = w["posto"]
        if posto is None and total:
            posto = round(100.0 * (w["glasova"] or 0) / total, 2)
        zupani.append(
            {
                "code": zm["p1"],
                "naziv": zm["zup_naziv"],
                "krug": row["krug"],
                "odaziv_posto": row["biraci_glasovalo_posto"],
                "pobjednik": w["naziv"],
                "stranke": w["stranke"] or w["predlagatelji"],
                "pobjednik_posto": posto,
                "pobjednik_glasova": w["glasova"],
            }
        )
    if not zupani:
        return {}
    return {"zupani": zupani}


def export_preferencijali(con: sqlite3.Connection, slug: str) -> dict:
    """Top preferential-vote candidates on general lists (vrsta 02, IJ 1-10)."""
    top = rows(
        con,
        """SELECT k.naziv, k.glasova, k.posto, k.u_saboru, r.p1,
                  l.naziv AS lista, l.mandata AS lista_mandata
           FROM rezultat_kandidat k
           JOIN rezultat_lista l ON l.id = k.lista_id
           JOIN rezultat r ON r.id = l.rezultat_id
           WHERE r.election=? AND r.level='zup' AND r.vrsta='02'
             AND CAST(r.p1 AS INTEGER) BETWEEN 1 AND 10
           ORDER BY k.glasova DESC LIMIT 20""",
        (slug,),
    )
    if not top:
        return {}
    # Lowest preferential count among currently seated MPs (u_saboru flag).
    lowest = rows(
        con,
        """SELECT k.naziv, k.glasova, r.p1, l.naziv AS lista
           FROM rezultat_kandidat k
           JOIN rezultat_lista l ON l.id = k.lista_id
           JOIN rezultat r ON r.id = l.rezultat_id
           WHERE r.election=? AND r.level='zup' AND r.vrsta='02'
             AND CAST(r.p1 AS INTEGER) BETWEEN 1 AND 10 AND k.u_saboru=1
           ORDER BY k.glasova ASC LIMIT 1""",
        (slug,),
    )
    return {
        "election": slug,
        "top": [
            {
                "naziv": t["naziv"],
                "glasova": t["glasova"],
                "posto_liste": t["posto"],
                "ij": int(t["p1"]),
                "lista": short_list_name(t["lista"]),
                "stranka": leading_party(t["lista"]),
                "u_saboru": t["u_saboru"],
            }
            for t in top
        ],
        "min_pref_u_saboru": (
            {
                "naziv": lowest[0]["naziv"],
                "glasova": lowest[0]["glasova"],
                "ij": int(lowest[0]["p1"]),
                "lista": short_list_name(lowest[0]["lista"]),
            }
            if lowest
            else None
        ),
    }


def dhondt(votes: dict[str, int], seats: int, threshold_pct: float) -> dict[str, int]:
    """D'Hondt with a percent threshold over the total (mirrors app.py)."""
    total = sum(v for v in votes.values() if v)
    awards = {n: 0 for n in votes}
    if total == 0 or seats == 0:
        return awards
    cutoff = total * threshold_pct / 100.0
    eligible = {n: v for n, v in votes.items() if (v or 0) >= cutoff}
    if not eligible:
        return awards
    for _ in range(seats):
        winner = max(eligible, key=lambda n: eligible[n] / (awards[n] + 1))
        awards[winner] += 1
    return awards


def _seat_order_within_list(cands: list[dict], num_seats: int) -> list[int]:
    """IDs of seated candidates in seat-taking order: ≥10 % preferential
    candidates by votes desc first, then default rbr order (mirrors app.py)."""
    if num_seats <= 0 or not cands:
        return []
    pref_first = sorted(
        [c for c in cands if (c.get("posto") or 0) >= 10.0],
        key=lambda c: -(c.get("glasova") or 0),
    )
    order: list[int] = []
    for c in pref_first:
        if len(order) >= num_seats:
            break
        order.append(c["id"])
    if len(order) < num_seats:
        already = set(order)
        for c in sorted(cands, key=lambda c: c.get("rbr") or 9999):
            if c["id"] in already:
                continue
            order.append(c["id"])
            if len(order) >= num_seats:
                break
    return order


def _fold_name(s: str) -> str:
    s = s.replace("Đ", "D").replace("đ", "d")
    n = unicodedata.normalize("NFD", s)
    return "".join(c for c in n if unicodedata.category(c) != "Mn").upper()


def load_sabor_parties() -> list[tuple[set, dict]]:
    """(token_set, {stranka, klub}) per seated MP from the sabor.hr snapshot.
    This is the only per-person party source we have — the DIP archive carries
    list membership, never individual party membership."""
    path = SIFARNICI / "sabor_2024_seating.json"
    if not path.exists():
        return []
    with open(path) as f:
        seating = json.load(f)
    return [
        (set(m["tokens"]), {"stranka": m["party"], "klub": m["klub"]})
        for m in seating.get("mps", [])
    ]


def sabor_party_for(name: str, mps: list[tuple[set, dict]]) -> dict | None:
    """Match a DIP ballot name to a seated MP; None unless the match is
    unambiguous (exact token set, else unique subset either way)."""
    toks = set(_fold_name(name).split())
    exact = [m for tset, m in mps if tset == toks]
    if len(exact) == 1:
        return exact[0]
    fuzzy = [m for tset, m in mps if tset.issubset(toks) or toks.issubset(tset)]
    return fuzzy[0] if len(fuzzy) == 1 else None


def export_fairness(con: sqlite3.Connection, slug: str = "parlament-2024") -> dict:
    """Port of app.py render_parlament_fairness(): wasted votes, per-IJ
    disparity, unified-RH counterfactual, coalition families, candidate
    extremes and the 'Sabor by preferential votes' thought experiment.
    Only meaningful for parlament-2024 (u_saboru flag covers that saziv)."""
    krug = 1
    ij_ph = ",".join("?" for _ in PARLAMENT_GEO_IJ)

    # ── RH effective vs wasted votes (synthetic RH row = IJ 001-011) ────────
    rh = rows(
        con,
        """SELECT l.naziv, l.glasova, l.mandata FROM rezultat r
           JOIN rezultat_lista l ON l.rezultat_id=r.id
           WHERE r.election=? AND r.level='rh' AND r.vrsta='02'""",
        (slug,),
    )
    if not rh:
        return {}
    total = sum(r["glasova"] or 0 for r in rh)
    uspjesni = sum(r["glasova"] or 0 for r in rh if (r["mandata"] or 0) > 0)
    propali = total - uspjesni

    # ── Per-IJ disparity ────────────────────────────────────────────────────
    ij_rows = rows(
        con,
        f"""SELECT r.p1 AS ij, r.biraci_ukupno, r.biraci_glasovalo,
                   r.biraci_glasovalo_posto, r.listici_vazeci,
                   COALESCE(SUM(COALESCE(l.glasova,0)),0) AS glasova_total,
                   COALESCE(SUM(CASE WHEN l.mandata>0 THEN l.glasova ELSE 0 END),0) AS glasova_uspjesni
            FROM rezultat r LEFT JOIN rezultat_lista l ON l.rezultat_id=r.id
            WHERE r.election=? AND r.krug=? AND r.vrsta='02' AND r.level='zup'
              AND r.p1 IN ({ij_ph})
            GROUP BY r.id ORDER BY r.p1""",
        (slug, krug, *PARLAMENT_GEO_IJ),
    )
    jedinice = []
    for r in ij_rows:
        mand = PARLAMENT_IJ_SEATS[r["ij"]]
        vazeci = r["glasova_total"] or 0
        usp = r["glasova_uspjesni"] or 0
        prop = max(0, vazeci - usp)
        biraci = r["biraci_ukupno"] or 0
        jedinice.append(
            {
                "code": r["ij"],
                "label": PARLAMENT_IJ_LABELS.get(r["ij"], r["ij"]),
                "biraci": biraci,
                "glasovalo": r["biraci_glasovalo"],
                "izlaznost": r["biraci_glasovalo_posto"],
                "vazeci": vazeci,
                "mandata": mand,
                "biraca_po_mandatu": round(biraci / mand) if mand else None,
                "glasova_po_mandatu": round(usp / mand) if mand else None,
                "pct_iskoristeni": round(100 * usp / vazeci, 2) if vazeci else None,
                "pct_propali": round(100 * prop / vazeci, 2) if vazeci else None,
                "pct_zastupljenih": round(100 * usp / biraci, 2) if biraci else None,
            }
        )
    gm = [j for j in jedinice if j["glasova_po_mandatu"]]
    min_ij = min(gm, key=lambda j: j["glasova_po_mandatu"])
    max_ij = max(gm, key=lambda j: j["glasova_po_mandatu"])
    nat_biraci = sum(j["biraci"] for j in jedinice)
    nat_vazeci = sum(j["vazeci"] for j in jedinice)
    nat_usp = sum(round(j["glasova_po_mandatu"] * j["mandata"]) for j in gm)
    # Recompute exactly (rounding above): effective votes summed directly.
    nat_usp = sum(
        r["glasova_uspjesni"] or 0 for r in ij_rows
    )
    nat_prop = nat_vazeci - nat_usp

    # ── Counterfactual: single national constituency, 143 seats, 5 % ───────
    nat_lists = rows(
        con,
        f"""SELECT l.naziv, SUM(COALESCE(l.glasova,0)) AS glasova,
                   SUM(COALESCE(l.mandata,0)) AS mandata
            FROM rezultat_lista l JOIN rezultat r ON r.id=l.rezultat_id
            WHERE r.election=? AND r.krug=? AND r.vrsta='02' AND r.level='zup'
              AND r.p1 IN ({ij_ph})
            GROUP BY l.naziv""",
        (slug, krug, *PARLAMENT_GEO_IJ),
    )
    total_glasova = sum(r["glasova"] or 0 for r in nat_lists)
    awards = dhondt(
        {r["naziv"]: r["glasova"] or 0 for r in nat_lists}, seats=143, threshold_pct=5.0
    )
    kontra_liste = sorted(
        (
            {
                "naziv": r["naziv"],
                "kratki": short_list_name(r["naziv"]),
                "stranka": leading_party(r["naziv"]),
                "glasova": r["glasova"],
                "posto": round(100 * (r["glasova"] or 0) / total_glasova, 2),
                "stvarno": r["mandata"],
                "jedinstvena": awards.get(r["naziv"], 0),
                "delta": awards.get(r["naziv"], 0) - (r["mandata"] or 0),
            }
            for r in nat_lists
            if (r["glasova"] or 0) > 0
        ),
        key=lambda x: (-x["jedinstvena"], -x["stvarno"], -x["glasova"]),
    )
    kontra_usp = sum(x["glasova"] for x in kontra_liste if x["jedinstvena"] > 0)
    kontra_prop = total_glasova - kontra_usp

    # ── Electorate share vs Sabor share ("Pravednost u brojkama") ──────────
    # Partition of all registered voters (biraci_ukupno, IJ 001-011): each
    # seat-winning list's votes roll up to its coalition family (leading
    # party); votes for lists with zero seats anywhere form the wasted row
    # (same definition as propali_rh, so the two figures agree on-page).
    # Minority seats (p1='012', list IS candidate) get one aggregate row so
    # the Sabor denominator is the full 151.
    manjine_row = rows(
        con,
        """SELECT COALESCE(SUM(l.glasova),0) AS glasova,
                  COALESCE(SUM(CASE WHEN l.mandata>0 THEN l.mandata ELSE 0 END),0) AS mandata
           FROM rezultat r JOIN rezultat_lista l ON l.rezultat_id=r.id
           WHERE r.election=? AND r.p1='012'""",
        (slug,),
    )[0]
    seat_families: dict[str, dict] = {}
    brojke_propali = 0
    for r in nat_lists:
        if (r["mandata"] or 0) > 0:
            f = seat_families.setdefault(
                leading_party(r["naziv"]), {"glasova": 0, "mandata": 0}
            )
            f["glasova"] += r["glasova"] or 0
            f["mandata"] += r["mandata"] or 0
        else:
            brojke_propali += r["glasova"] or 0
    sabor_ukupno = 143 + (manjine_row["mandata"] or 0)

    def brojke_row(tip: str, label: str, glasova: int, mandata: int) -> dict:
        return {
            "tip": tip,
            "label": label,
            "glasova": glasova,
            "mandata": mandata,
            "pct_biraci": round(100 * glasova / nat_biraci, 2) if nat_biraci else None,
            "pct_sabor": round(100 * mandata / sabor_ukupno, 2) if sabor_ukupno else None,
        }

    brojke_redovi = [
        brojke_row("obitelj", p, f["glasova"], f["mandata"])
        for p, f in sorted(seat_families.items(), key=lambda x: -x[1]["mandata"])
    ]
    brojke_redovi.append(
        brojke_row("manjine", "Nacionalne manjine", manjine_row["glasova"], manjine_row["mandata"])
    )
    brojke_redovi.append(brojke_row("propali", "Propali glasovi", brojke_propali, 0))
    # Residual: registered voters who did not cast a valid geographic/minority
    # list vote (abstained or invalid ballot) — completes the partition to 100%.
    brojke_ostatak = nat_biraci - sum(r["glasova"] for r in brojke_redovi)
    brojke_ostatak_pct = (
        round(100 * brojke_ostatak / nat_biraci, 2) if nat_biraci else None
    )

    # ── Coalition families (roll-up by leading party) ───────────────────────
    families: dict[str, dict] = {}
    for x in kontra_liste:
        fam = families.setdefault(
            x["stranka"],
            {"stranka": x["stranka"], "partneri": [], "broj_lista": 0, "glasova": 0,
             "stvarno": 0, "jedinstvena": 0},
        )
        fam["broj_lista"] += 1
        fam["glasova"] += x["glasova"]
        fam["stvarno"] += x["stvarno"] or 0
        fam["jedinstvena"] += x["jedinstvena"]
        for t in [t.strip().strip('"') for t in x["naziv"].split(",")][1:]:
            if t and t not in fam["partneri"]:
                fam["partneri"].append(t)
    obitelji = sorted(families.values(), key=lambda f: -f["glasova"])
    for f in obitelji:
        f["pct"] = round(100 * f["glasova"] / total_glasova, 2)
        f["partneri"] = ", ".join(f["partneri"]) if f["partneri"] else "—"

    # ── Candidate-level: D'Hondt seat assignment incl. 10 % pref rule ──────
    cands = rows(
        con,
        """SELECT k.id, k.rbr, k.naziv, k.glasova, k.posto,
                  COALESCE(k.u_saboru,0) AS u_saboru,
                  l.id AS lista_id, l.naziv AS lista, l.mandata, r.p1 AS ij
           FROM rezultat_kandidat k
           JOIN rezultat_lista l ON l.id=k.lista_id
           JOIN rezultat r ON r.id=l.rezultat_id
           WHERE r.election=? AND r.krug=? AND r.vrsta='02' AND r.level='zup'
           ORDER BY k.glasova DESC""",
        (slug, krug),
    )
    by_lista: dict[int, list[dict]] = {}
    for c in cands:
        by_lista.setdefault(c["lista_id"], []).append(dict(c))
    mandate_ranks: dict[int, int] = {}
    for lst in by_lista.values():
        seats = lst[0]["mandata"] or 0
        if seats > 0:
            for rank, kid in enumerate(_seat_order_within_list(lst, seats), start=1):
                mandate_ranks[kid] = rank

    def cand_row(c: sqlite3.Row, rang: int) -> dict:
        return {
            "rang": rang,
            "naziv": c["naziv"],
            "rbr": c["rbr"],
            "dhondt": c["id"] in mandate_ranks,
            "redni_br": mandate_ranks.get(c["id"]),
            "u_saboru": c["u_saboru"],
            "stranka": leading_party(c["lista"]),
            "ij": int(c["ij"]),
            "glasova": c["glasova"],
            "posto_liste": c["posto"],
            "lista": short_list_name(c["lista"]),
        }

    indexed = [(i + 1, c) for i, c in enumerate(cands)]
    gubitnici = [
        cand_row(c, i) for i, c in indexed
        if c["id"] not in mandate_ranks and not c["u_saboru"]
    ][:25]
    odbili = sorted(
        (cand_row(c, i) for i, c in indexed
         if c["id"] in mandate_ranks and not c["u_saboru"]),
        key=lambda x: -(x["glasova"] or 0),
    )
    namjestenici = sorted(
        (cand_row(c, i) for i, c in indexed if c["u_saboru"]),
        key=lambda x: (x["glasova"] or 0),
    )[:25]
    # Actual party of seated MPs from the sabor.hr snapshot (the DIP archive
    # has no per-person membership; leading_party() is only the list's brand).
    sabor_mps = load_sabor_parties()
    for k in namjestenici:
        mp = sabor_party_for(k["naziv"], sabor_mps)
        k["sabor_stranka"] = mp["stranka"] if mp else None
        k["sabor_klub"] = mp["klub"] if mp else None

    # ── 'Sabor elected like a president': top 143 by preferential votes ────
    top143 = [c for _, c in indexed[:143]]
    top143_ids = {c["id"] for c in top143}
    actual_ids = set(mandate_ranks.keys())
    rollup_pref: dict[str, int] = {}
    for c in top143:
        p = leading_party(c["lista"])
        rollup_pref[p] = rollup_pref.get(p, 0) + 1
    stvarno_by_party = {f["stranka"]: f["stvarno"] for f in obitelji}
    sabor_rollup = sorted(
        (
            {
                "stranka": p,
                "po_pref": n,
                "stvarno": stvarno_by_party.get(p, 0),
                "delta": n - stvarno_by_party.get(p, 0),
            }
            for p, n in {**{p: 0 for p in stvarno_by_party if stvarno_by_party[p] > 0}, **rollup_pref}.items()
            if n > 0 or stvarno_by_party.get(p, 0) > 0
        ),
        key=lambda x: -x["po_pref"],
    )

    return {
        "election": slug,
        "propali_rh": {
            "ukupno": total,
            "iskoristeni": uspjesni,
            "propali": propali,
            "pct_iskoristeni": round(100 * uspjesni / total, 2) if total else None,
            "pct_propali": round(100 * propali / total, 2) if total else None,
        },
        "disparitet": {
            "jedinice": jedinice,
            "min": {"label": min_ij["label"], "glasova_po_mandatu": min_ij["glasova_po_mandatu"]},
            "max": {"label": max_ij["label"], "glasova_po_mandatu": max_ij["glasova_po_mandatu"]},
            "omjer": round(max_ij["glasova_po_mandatu"] / max(min_ij["glasova_po_mandatu"], 1), 2),
            "nacionalno": {
                "biraci": nat_biraci,
                "vazeci": nat_vazeci,
                "iskoristeni": nat_usp,
                "propali": nat_prop,
                "pct_zastupljenih": round(100 * nat_usp / nat_biraci, 2) if nat_biraci else None,
                "pct_propali": round(100 * nat_prop / nat_vazeci, 2) if nat_vazeci else None,
            },
        },
        "kontrafaktual": {
            "liste": kontra_liste,
            "gubitnici": [x for x in kontra_liste if x["delta"] < 0],
            "dobitnici": [x for x in kontra_liste if x["delta"] > 0],
            "propalo_jedinstvena": kontra_prop,
            "pct_propalo_jedinstvena": round(100 * kontra_prop / total_glasova, 2) if total_glasova else None,
        },
        "obitelji": obitelji,
        "brojke": {
            "denominatori": {
                "biraci": nat_biraci,
                "sabor": sabor_ukupno,
                "geo_mandata": 143,
                "manjinski_mandata": manjine_row["mandata"],
            },
            "redovi": brojke_redovi,
            "ostatak": {"glasova": brojke_ostatak, "pct_biraci": brojke_ostatak_pct},
        },
        "gubitnici": gubitnici,
        "odbili": {"ukupno": len(odbili), "od": 143, "kandidati": odbili},
        "namjestenici": namjestenici,
        "sabor_po_pref": {
            "preklapanje": len(top143_ids & actual_ids),
            "novi": len(top143_ids - actual_ids),
            "gube": len(actual_ids - top143_ids),
            "rollup": sabor_rollup,
        },
    }


def export_grops(con: sqlite3.Connection, cycles: list[dict]) -> dict[str, int]:
    """Per-county (or per-IJ for parlament) town/municipality drill-down files:
    web/public/data/grop/{slug}/{p1}.json + an index.json with the unit list.
    For lokalni cycles each grop carries the mayor race (vrsta 17, final round)
    and the council race (vrsta 08)."""
    written: dict[str, int] = {}
    for c in cycles:
        slug, tip = c["slug"], c["type"]
        out_dir = OUT_DIR / "grop" / slug
        units: list[dict] = []

        if tip == "parlament":
            unit_rows = rows(
                con,
                """SELECT DISTINCT p1 FROM rezultat
                   WHERE election=? AND level='grop' AND vrsta='02' ORDER BY p1""",
                (slug,),
            )
            unit_list = [
                {"code": u["p1"], "naziv": PARLAMENT_IJ_LABELS.get(u["p1"], u["p1"])}
                for u in unit_rows
            ]
        elif tip in ("predsjednik", "euparlament", "referendum", "lokalni"):
            unit_rows = rows(
                con,
                """SELECT DISTINCT r.p1, z.zup_naziv FROM rezultat r
                   LEFT JOIN rezultat z ON z.election=r.election AND z.level='zup'
                        AND z.p1=r.p1 AND z.krug=1
                   WHERE r.election=? AND r.level='grop'
                     AND CAST(r.p1 AS INTEGER) BETWEEN 1 AND 21
                   ORDER BY r.p1""",
                (slug,),
            )
            seen = set()
            unit_list = []
            for u in unit_rows:
                if u["p1"] in seen:
                    continue
                seen.add(u["p1"])
                unit_list.append({"code": u["p1"], "naziv": u["zup_naziv"] or u["p1"]})
        else:
            continue

        if not unit_list:
            continue
        out_dir.mkdir(parents=True, exist_ok=True)

        for unit in unit_list:
            p1 = unit["code"]
            if tip == "lokalni":
                vrsta_filter = "AND vrsta IN ('08','17')"
            elif tip == "parlament":
                vrsta_filter = "AND vrsta='02'"
            else:
                vrsta_filter = ""
            grop_rows = rows(
                con,
                f"""SELECT * FROM rezultat
                    WHERE election=? AND level='grop' AND p1=? {vrsta_filter}
                    ORDER BY grop_naziv, vrsta, krug""",
                (slug, p1),
            )
            # For lokalni mayor races keep only the final round per grop+vrsta.
            if tip == "lokalni":
                final: dict[tuple, sqlite3.Row] = {}
                for g in grop_rows:
                    key = (g["p2"], g["vrsta"])
                    if key not in final or g["krug"] > final[key]["krug"]:
                        final[key] = g
                grop_rows = sorted(final.values(), key=lambda g: (g["grop_naziv"] or "", g["vrsta"]))

            grops: dict[str, dict] = {}
            for g in grop_rows:
                entry = grops.setdefault(
                    g["p2"],
                    {"code": g["p2"], "naziv": g["grop_naziv"], "utrke": []},
                )
                entry["utrke"].append(
                    {
                        "vrsta": g["vrsta"],
                        "krug": g["krug"],
                        "biraci": g["biraci_ukupno"],
                        "glasovalo": g["biraci_glasovalo"],
                        "odaziv_posto": g["biraci_glasovalo_posto"],
                        "nevazeci": g["listici_nevazeci"],
                        "liste": lists_for(con, g["id"]),
                    }
                )
            payload = {
                "slug": slug,
                "p1": p1,
                "naziv": unit["naziv"],
                "gropovi": sorted(grops.values(), key=lambda x: x["naziv"] or ""),
            }
            with open(out_dir / f"{p1}.json", "w") as f:
                json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))

        with open(out_dir / "index.json", "w") as f:
            json.dump({"slug": slug, "jedinice": unit_list}, f, ensure_ascii=False, separators=(",", ":"))
        written[slug] = len(unit_list)
    return written


def export_trends(con: sqlite3.Connection, cycles: list[dict]) -> dict:
    """Turnout across all cycles + party share across same-type cycles (>=2)."""
    turnout = []
    for c in cycles:
        slug = c["slug"]
        vrsta_filter = "AND vrsta='02'" if c["type"] == "parlament" else ""
        rh = rows(
            con,
            f"""SELECT krug, biraci_glasovalo_posto, biraci_glasovalo FROM rezultat
                WHERE election=? AND level='rh' {vrsta_filter} ORDER BY krug LIMIT 1""",
            (slug,),
        )
        if rh and rh[0]["biraci_glasovalo_posto"] is not None:
            turnout.append(
                {
                    "slug": slug,
                    "label": c["label"],
                    "godina": c["godina"],
                    "tip": c["type"],
                    "odaziv_posto": rh[0]["biraci_glasovalo_posto"],
                    "glasovalo": rh[0]["biraci_glasovalo"],
                }
            )
    turnout.sort(key=lambda t: t["godina"])

    party: dict[str, list] = {}
    by_type: dict[str, list[dict]] = {}
    for c in cycles:
        if c["type"] in ("parlament", "euparlament"):
            by_type.setdefault(c["type"], []).append(c)
    for t, cyc in by_type.items():
        if len(cyc) < 2:
            continue
        series: dict[str, dict[str, float]] = {}
        for c in sorted(cyc, key=lambda x: x["godina"]):
            vrsta_filter = "AND r.vrsta='02'" if t == "parlament" else ""
            lst = rows(
                con,
                f"""SELECT l.naziv, l.posto FROM rezultat r
                    JOIN rezultat_lista l ON l.rezultat_id=r.id
                    WHERE r.election=? AND r.level='rh' {vrsta_filter}
                    ORDER BY l.glasova DESC""",
                (c["slug"],),
            )
            for l in lst:
                p = leading_party(l["naziv"])
                if not p or l["posto"] is None:
                    continue
                series.setdefault(p, {})
                # Keep the larger share if a party leads several lists.
                series[p][c["slug"]] = max(series[p].get(c["slug"], 0.0), l["posto"])
        # Only parties present in >=2 cycles and with a meaningful share
        # (>=3% at least once) are a trend — the rest is name-collision noise.
        kept = {
            p: v
            for p, v in series.items()
            if len(v) >= 2 and max(v.values()) >= 3.0
        }
        if kept:
            top_parties = sorted(kept, key=lambda p: -max(kept[p].values()))[:8]
            party[t] = [
                {"stranka": p, "po_ciklusu": kept[p]} for p in top_parties
            ]
    return {"odaziv": turnout, "stranke": party}


def build_zupanije_geojson() -> None:
    """Simplify hr_canonical_zupanije.geojson (<300 KB) via mapshaper (npx)."""
    if not ZUP_GEOJSON_SRC.exists():
        print(f"! zupanije geojson source missing: {ZUP_GEOJSON_SRC}", file=sys.stderr)
        return
    out = OUT_DIR / "zupanije.geojson"
    cmd = [
        "npx", "-y", "mapshaper", str(ZUP_GEOJSON_SRC),
        "-simplify", "12%", "keep-shapes",
        "-filter-fields", "name,broj_zupanije",
        "-rename-fields", "code=broj_zupanije",
        "-o", "precision=0.0001", "format=geojson", str(out),
    ]
    subprocess.run(cmd, check=True)
    # Normalize codes to 2-digit DIP strings ("7" -> "07") and rewind rings
    # for d3-geo (outer rings clockwise, holes counter-clockwise — opposite
    # of RFC 7946; otherwise d3 renders the complement of each polygon).
    def signed_area(ring: list) -> float:
        s = 0.0
        for i in range(len(ring) - 1):
            (x1, y1), (x2, y2) = ring[i], ring[i + 1]
            s += (x2 - x1) * (y2 + y1)
        return s  # > 0 for clockwise with this formulation

    def rewind_polygon(rings: list) -> list:
        fixed = []
        for idx, ring in enumerate(rings):
            cw = signed_area(ring) > 0
            outer = idx == 0
            if (outer and not cw) or (not outer and cw):
                ring = ring[::-1]
            fixed.append(ring)
        return fixed

    with open(out) as f:
        gj = json.load(f)
    for feat in gj["features"]:
        props = feat["properties"]
        props["code"] = f"{int(props['code']):02d}"
        geom = feat["geometry"]
        if geom["type"] == "Polygon":
            geom["coordinates"] = rewind_polygon(geom["coordinates"])
        elif geom["type"] == "MultiPolygon":
            geom["coordinates"] = [rewind_polygon(p) for p in geom["coordinates"]]
    with open(out, "w") as f:
        json.dump(gj, f, ensure_ascii=False, separators=(",", ":"))
    print(f"  zupanije.geojson: {out.stat().st_size / 1024:.0f} KiB")


def spot_check(con: sqlite3.Connection) -> bool:
    """Compare exported JSON values against direct SQL queries. Returns ok."""

    def load(name: str) -> dict:
        with open(OUT_DIR / name) as f:
            return json.load(f)

    def one(sql: str, params: tuple = ()):
        r = rows(con, sql, params)
        return r[0][0] if r else None

    checks = []

    def add(label: str, exported, sql_value):
        checks.append((label, exported, sql_value, exported == sql_value))

    parl = load("parlament-2024.json")
    add(
        "parlament-2024 RH HDZ lista glasova",
        parl["krugovi"]["1"]["liste"][0]["glasova"],
        one(
            """SELECT l.glasova FROM rezultat r JOIN rezultat_lista l ON l.rezultat_id=r.id
               WHERE r.election='parlament-2024' AND r.level='rh' ORDER BY l.glasova DESC LIMIT 1"""
        ),
    )
    add(
        "parlament-2024 ukupno mandata (opci+manjine)",
        parl["sabor"]["ukupno"],
        one(
            """SELECT (SELECT sum(l.mandata) FROM rezultat r JOIN rezultat_lista l ON l.rezultat_id=r.id
                       WHERE r.election='parlament-2024' AND r.level='rh')
                    + (SELECT sum(l.mandata) FROM rezultat r JOIN rezultat_lista l ON l.rezultat_id=r.id
                       WHERE r.election='parlament-2024' AND r.p1='012' AND l.mandata>0)"""
        ),
    )
    add(
        "parlament-2024 odaziv RH",
        parl["krugovi"]["1"]["summary"]["odaziv_posto"],
        one(
            "SELECT biraci_glasovalo_posto FROM rezultat WHERE election='parlament-2024' AND level='rh'"
        ),
    )
    pred = load("predsjednik-2024.json")
    zup21 = next(z for z in pred["krugovi"]["2"]["zupanije"] if z["code"] == "21")
    add(
        "predsjednik-2024 k2 Grad Zagreb pobjednik glasova",
        zup21["pobjednik_glasova"],
        one(
            """SELECT l.glasova FROM rezultat r JOIN rezultat_lista l ON l.rezultat_id=r.id
               WHERE r.election='predsjednik-2024' AND r.level='zup' AND r.krug=2 AND r.p1='21'
               ORDER BY l.glasova DESC LIMIT 1"""
        ),
    )
    pref = load("preferencijali.json")
    add(
        "preferencijali top1 (Anušić) glasova",
        pref["top"][0]["glasova"],
        one(
            """SELECT k.glasova FROM rezultat_kandidat k
               JOIN rezultat_lista l ON l.id=k.lista_id JOIN rezultat r ON r.id=l.rezultat_id
               WHERE r.election='parlament-2024' AND r.level='zup' AND r.vrsta='02'
                 AND CAST(r.p1 AS INTEGER) BETWEEN 1 AND 10
               ORDER BY k.glasova DESC LIMIT 1"""
        ),
    )
    ref = load("referendum-2013.json")
    add(
        "referendum-2013 ZA glasova",
        next(l["glasova"] for l in ref["krugovi"]["1"]["liste"] if l["naziv"] == "ZA"),
        one(
            """SELECT l.glasova FROM rezultat r JOIN rezultat_lista l ON l.rezultat_id=r.id
               WHERE r.election='referendum-2013' AND r.level='rh' AND l.naziv='ZA'"""
        ),
    )
    lok = load("lokalni-2025.json")
    zup01 = next(z for z in lok["zupani"] if z["code"] == "01")
    add(
        "lokalni-2025 zupan Zagrebacka pobjednik glasova",
        zup01["pobjednik_glasova"],
        one(
            """SELECT l.glasova FROM rezultat r JOIN rezultat_lista l ON l.rezultat_id=r.id
               WHERE r.election='lokalni-2025' AND r.level='zup' AND r.vrsta='15'
                 AND r.krug=2 AND r.p1='01' ORDER BY l.glasova DESC LIMIT 1"""
        ),
    )
    eu = load("euparlament-2024.json")
    add(
        "euparlament-2024 HDZ posto",
        eu["krugovi"]["1"]["liste"][0]["posto"],
        one(
            """SELECT l.posto FROM rezultat r JOIN rezultat_lista l ON l.rezultat_id=r.id
               WHERE r.election='euparlament-2024' AND r.level='rh' ORDER BY l.glasova DESC LIMIT 1"""
        ),
    )

    fair = load("fairness.json")
    add(
        "fairness: najmanji preferencijal u Saboru (Vuletic)",
        fair["namjestenici"][0]["glasova"],
        one(
            """SELECT min(k.glasova) FROM rezultat_kandidat k
               JOIN rezultat_lista l ON l.id=k.lista_id JOIN rezultat r ON r.id=l.rezultat_id
               WHERE r.election='parlament-2024' AND r.level='zup' AND r.vrsta='02'
                 AND CAST(r.p1 AS INT) BETWEEN 1 AND 10 AND k.u_saboru=1"""
        ),
    )
    add(
        "fairness: kontrafaktual raspodjeljuje tocno 143 mandata",
        sum(x["jedinstvena"] for x in fair["kontrafaktual"]["liste"]),
        143,
    )
    add(
        "fairness brojke: mandati svih redova zbroje se na 151",
        sum(r["mandata"] for r in fair["brojke"]["redovi"]),
        one(
            """SELECT (SELECT sum(l.mandata) FROM rezultat r JOIN rezultat_lista l ON l.rezultat_id=r.id
                       WHERE r.election='parlament-2024' AND r.level='rh')
                    + (SELECT sum(l.mandata) FROM rezultat r JOIN rezultat_lista l ON l.rezultat_id=r.id
                       WHERE r.election='parlament-2024' AND r.p1='012' AND l.mandata>0)"""
        ),
    )
    add(
        "fairness brojke: denominator biraci == SUM(biraci_ukupno) IJ 1-11",
        fair["brojke"]["denominatori"]["biraci"],
        one(
            """SELECT sum(biraci_ukupno) FROM rezultat
               WHERE election='parlament-2024' AND vrsta='02' AND level='zup'
                 AND CAST(p1 AS INT) BETWEEN 1 AND 11"""
        ),
    )
    add(
        "fairness brojke: propali red == glasovi lista bez mandata (RH)",
        next(r["glasova"] for r in fair["brojke"]["redovi"] if r["tip"] == "propali"),
        one(
            """SELECT sum(l.glasova) FROM rezultat r JOIN rezultat_lista l ON l.rezultat_id=r.id
               WHERE r.election='parlament-2024' AND r.level='rh' AND COALESCE(l.mandata,0)=0"""
        ),
    )
    add(
        "fairness brojke: HDZ obitelj glasova (liste s mandatima)",
        next(r["glasova"] for r in fair["brojke"]["redovi"] if r["label"] == "HDZ"),
        one(
            """SELECT sum(l.glasova) FROM rezultat r JOIN rezultat_lista l ON l.rezultat_id=r.id
               WHERE r.election='parlament-2024' AND r.level='rh' AND l.mandata>0
                 AND l.naziv LIKE 'HDZ%'"""
        ),
    )
    add(
        "fairness brojke: manjine glasova (p1='012')",
        next(r["glasova"] for r in fair["brojke"]["redovi"] if r["tip"] == "manjine"),
        one(
            """SELECT sum(l.glasova) FROM rezultat r JOIN rezultat_lista l ON l.rezultat_id=r.id
               WHERE r.election='parlament-2024' AND r.p1='012'"""
        ),
    )
    # Every listed gubitnik/namjestenik must match the DB row exactly
    # (name+IJ -> votes, u_saboru flag). Ranking logic (10 % pref rule) is
    # Python-only, so verify the underlying facts, not the ordering.
    def cand_facts(k: dict):
        r = rows(
            con,
            """SELECT k.glasova, COALESCE(k.u_saboru,0) AS u_saboru
               FROM rezultat_kandidat k
               JOIN rezultat_lista l ON l.id=k.lista_id JOIN rezultat r ON r.id=l.rezultat_id
               WHERE r.election='parlament-2024' AND r.level='zup' AND r.vrsta='02'
                 AND k.naziv=? AND CAST(r.p1 AS INT)=?""",
            (k["naziv"], k["ij"]),
        )
        return (r[0]["glasova"], r[0]["u_saboru"]) if r else None

    add(
        "fairness gubitnici: svih 25 potvrdjeno u bazi (glasovi, u_saboru=0)",
        sum(1 for k in fair["gubitnici"] if cand_facts(k) == (k["glasova"], 0)),
        len(fair["gubitnici"]),
    )
    add(
        "fairness namjestenici: svih 25 potvrdjeno u bazi (glasovi, u_saboru=1)",
        sum(1 for k in fair["namjestenici"] if cand_facts(k) == (k["glasova"], 1)),
        len(fair["namjestenici"]),
    )
    add(
        "fairness namjestenici: sabor.hr stranka razrijesena za svih 25",
        sum(1 for k in fair["namjestenici"] if k.get("sabor_stranka")),
        len(fair["namjestenici"]),
    )
    grop01 = json.load(open(OUT_DIR / "grop" / "predsjednik-2024" / "01.json"))
    add(
        "grop predsjednik-2024 zup01: broj gradova/opcina",
        len(grop01["gropovi"]),
        one(
            """SELECT count(DISTINCT p2) FROM rezultat
               WHERE election='predsjednik-2024' AND level='grop' AND p1='01'"""
        ),
    )
    samobor = next(g for g in grop01["gropovi"] if g["naziv"] == "SAMOBOR")
    k2 = next(u for u in samobor["utrke"] if u["krug"] == 2)
    add(
        "grop predsjednik-2024 Samobor k2 pobjednik glasova",
        k2["liste"][0]["glasova"],
        one(
            """SELECT max(l.glasova) FROM rezultat r JOIN rezultat_lista l ON l.rezultat_id=r.id
               WHERE r.election='predsjednik-2024' AND r.level='grop' AND r.krug=2
                 AND r.p1='01' AND r.grop_naziv='SAMOBOR'"""
        ),
    )

    ok = True
    print("spot-check export vs SQL:")
    for label, exp, sql_v, match in checks:
        status = "OK " if match else "FAIL"
        if not match:
            ok = False
        print(f"  [{status}] {label}: export={exp} sql={sql_v}")
    return ok


def main() -> None:
    if not DB_PATH.exists():
        sys.exit(f"database not found: {DB_PATH}")
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
    con.row_factory = sqlite3.Row

    present = [
        r["election"]
        for r in rows(con, "SELECT DISTINCT election FROM rezultat ORDER BY election")
    ]
    cycles = []
    for slug in present:
        naziv = rows(
            con,
            "SELECT izbori_naziv FROM rezultat WHERE election=? AND izbori_naziv IS NOT NULL LIMIT 1",
            (slug,),
        )
        cycles.append(
            {
                "slug": slug,
                "type": cycle_type(slug),
                "godina": cycle_year(slug),
                "label": naziv[0]["izbori_naziv"] if naziv else slug,
            }
        )

    exported = []
    for c in cycles:
        slug, t = c["slug"], c["type"]
        if t == "parlament":
            data = export_parlament(con, slug)
        elif t == "lokalni":
            data = export_lokalni(con, slug)
        elif t in ("predsjednik", "euparlament", "referendum"):
            data = export_generic(con, slug)
        else:
            data = {}
        if not data:
            print(f"  skip {slug}: no exportable aggregate")
            continue
        data = {"slug": slug, "tip": t, "godina": c["godina"], "label": c["label"], **data}
        path = OUT_DIR / f"{slug}.json"
        with open(path, "w") as f:
            json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
        sections = [k for k in ("krugovi", "sabor", "jedinice", "zupani") if k in data]
        exported.append({**c, "sections": sections, "file": f"{slug}.json"})
        print(f"  {slug}: {path.stat().st_size / 1024:.0f} KiB  sections={sections}")

    pref = export_preferencijali(con, "parlament-2024")
    if pref:
        with open(OUT_DIR / "preferencijali.json", "w") as f:
            json.dump(pref, f, ensure_ascii=False, separators=(",", ":"))
        print("  preferencijali.json: parlament-2024")

    fairness = export_fairness(con, "parlament-2024")
    if fairness:
        with open(OUT_DIR / "fairness.json", "w") as f:
            json.dump(fairness, f, ensure_ascii=False, separators=(",", ":"))
        print(f"  fairness.json: {(OUT_DIR / 'fairness.json').stat().st_size / 1024:.0f} KiB")

    grops = export_grops(con, exported)
    for c in exported:
        if c["slug"] in grops:
            c["sections"].append("grops")
    if grops:
        total_files = sum(grops.values())
        print(f"  grop drill-down: {len(grops)} cycles, {total_files} unit files")

    trends = export_trends(con, exported)
    with open(OUT_DIR / "trends.json", "w") as f:
        json.dump(trends, f, ensure_ascii=False, separators=(",", ":"))

    manifest = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "cycles": sorted(exported, key=lambda c: (-c["godina"], c["slug"])),
        "has_preferencijali": bool(pref),
        "has_fairness": bool(fairness),
        "has_trends": bool(trends["odaziv"]) or bool(trends["stranke"]),
    }
    with open(OUT_DIR / "manifest.json", "w") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print(f"manifest.json: {len(exported)} cycles")

    if "--geo" in sys.argv:
        build_zupanije_geojson()
    if "--check" in sys.argv:
        if not spot_check(con):
            con.close()
            sys.exit("spot-check FAILED")
    con.close()


if __name__ == "__main__":
    main()
