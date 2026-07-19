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
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "data" / "izbori.sqlite"
OUT_DIR = ROOT / "web" / "public" / "data"
SIFARNICI = ROOT / "sifarnici"
ZUP_GEOJSON_SRC = Path(
    "~/git/domovinatv/karta-hrvatske/apps/data-pipeline/data/hr_canonical_zupanije.geojson"
).expanduser()

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
    out = [
        {
            "naziv": r["naziv"],
            "kratki": short_list_name(r["naziv"]),
            "stranka": leading_party(r["naziv"]),
            "glasova": r["glasova"],
            "posto": r["posto"],
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
        # Only parties present in >=2 cycles are a trend.
        kept = {p: v for p, v in series.items() if len(v) >= 2}
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
    # Normalize codes to 2-digit DIP strings ("7" -> "07").
    with open(out) as f:
        gj = json.load(f)
    for feat in gj["features"]:
        props = feat["properties"]
        props["code"] = f"{int(props['code']):02d}"
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

    trends = export_trends(con, exported)
    with open(OUT_DIR / "trends.json", "w") as f:
        json.dump(trends, f, ensure_ascii=False, separators=(",", ":"))

    manifest = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "cycles": sorted(exported, key=lambda c: (-c["godina"], c["slug"])),
        "has_preferencijali": bool(pref),
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
