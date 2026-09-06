#!/usr/bin/env python3
"""Aggregate Zagreb election results to mjesni odbori and gradske četvrti.

For Grad Zagreb the DIP archive's polling-station name (`bmNaziv`) is the name
of the mjesni odbor the station sits in — not a school or a street. That makes
the City's own registry of mjesna samouprava a join key, and turns national
results into a city-level geography that neither DIP nor the City publishes:
218 mjesni odbori and 17 gradske četvrti, on the City's own polygons.

Sources, their URLs and the (few) name mismatches between them are declared in
sifarnici/zagreb_mjesna_samouprava.json. City sources are cached under
data/zagreb/izvori/ on first run.

Reads the mirrored JSON files directly rather than data/izbori.sqlite, so it
works before the index is rebuilt after a fresh mirror.

Outputs (data/zagreb/):
    zagreb_mo_odaziv.csv     turnout per (cycle, round, race, mjesni odbor)
    zagreb_gc_odaziv.csv     the same, aggregated to gradska četvrt
    zagreb_mo_liste.csv      votes per list/candidate per mjesni odbor
    zagreb_mo.geojson        MO polygons + population + turnout per cycle
    izvjestaj.md             what matched, what did not, headline numbers

Usage:
    python3 scripts/export_zagreb_mo.py
    python3 scripts/export_zagreb_mo.py --check     # verify join, no writes
    python3 scripts/export_zagreb_mo.py --refresh   # re-download City sources
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
import unicodedata
import urllib.request
from collections import defaultdict
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
CONF_PATH = ROOT / "sifarnici" / "zagreb_mjesna_samouprava.json"
OUT_DIR = DATA_DIR / "zagreb"
SRC_DIR = OUT_DIR / "izvori"

USER_AGENT = "izbori.domovina.ai mirror (+https://github.com/domovinatv/izbori.domovina.ai)"

# Grad Zagreb, popis stanovništva 2021. Used only to flag the age of the
# population column the City ships (see the note in the sifarnik).
POPIS_2021 = 767_131

# Mjesni odbori range from 61 to ~11 800 voters. Headline extremes are quoted
# over MOs above this size — in a 61-voter MO a handful of people move the
# turnout by ten points and the extreme says nothing about the city.
MIN_BIRACA = 1_000


def norm(s: str) -> str:
    """Fold a name to a comparison key: upper, no diacritics, no punctuation."""
    s = (s or "").strip().upper().replace("Đ", "DJ")
    s = "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")
    return re.sub(r"[^A-Z0-9]+", " ", s).strip()


def to_int(v: object) -> int:
    try:
        return int(str(v).replace(".", "").strip())
    except (TypeError, ValueError):
        return 0


def to_float(v: object) -> float | None:
    """Parse a Croatian-formatted number ('68,42') to float."""
    if v is None:
        return None
    try:
        return float(str(v).replace(".", "").replace(",", "."))
    except ValueError:
        return None


# ────────────────────────────────────────────────────────────────────────────
# City of Zagreb open data
# ────────────────────────────────────────────────────────────────────────────

def cached(url: str, name: str, refresh: bool) -> bytes:
    dest = SRC_DIR / name
    if dest.exists() and not refresh:
        return dest.read_bytes()
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=60) as resp:
        body = resp.read()
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(body)
    print(f"  downloaded {name} ({len(body) / 1024:.0f} KiB)")
    return body


def load_registry(conf: dict, refresh: bool) -> tuple[dict, dict]:
    """Return (mjesni odbori by key, MO polygons by key) from City open data."""
    izvori = conf["izvori"]
    alias_geo = {norm(k): v for k, v in conf["aliases"]["geoportal"].items()}

    body = cached(izvori["mjesni_odbori_csv"]["url"], "mjesni-odbori.csv", refresh)
    mo: dict[str, dict] = {}
    for row in csv.DictReader(body.decode("utf-8-sig").splitlines(), delimiter=";"):
        naziv = (row.get("Naziv MO") or "").strip()
        if not naziv:
            continue
        # Column headers carry stray spaces and a newline in the source file.
        cols = {k.strip().replace("\n", " "): v for k, v in row.items() if k}
        mo[norm(naziv)] = {
            "mo": naziv,
            "gc": (cols.get("Gradska četvrt") or "").strip(),
            "adresa": (cols.get("Adresa sjedišta") or "").strip(),
            "povrsina_ha": to_float(cols.get("Površina (ha)")),
            "stanovnika_popis_2011": to_int(cols.get("Broj stanovnika")),
        }

    body = cached(izvori["geoportal_mjesna_samouprava_geojson"]["url"], "mjesna-samouprava.geojson", refresh)
    geo: dict[str, dict] = {}
    for feat in json.loads(body)["features"]:
        raw = (feat["properties"].get("MO") or "").strip()
        key = norm(alias_geo.get(norm(raw), raw))
        geo[key] = feat
    return mo, geo


# ────────────────────────────────────────────────────────────────────────────
# DIP archive
# ────────────────────────────────────────────────────────────────────────────

def parse_referendum_csv(text: str) -> dict | None:
    """Referendum files are CSV, one row per option, station fields repeated.

    Columns (0-based): 9 bmNaziv, 10 biraciUkupno, 11 biraciGlasovalo,
    14 listiciVazeci, 16 listiciNevazeci, 19 option name, 20 votes.
    Reshaped into the same dict the JSON cycles use.
    """
    rows = [r for r in csv.reader(text.lstrip("\ufeff").splitlines(), delimiter=";") if len(r) > 20]
    if not rows:
        return None
    head = rows[0]
    return {
        "izbori": "", "datum": head[3], "bmNaziv": head[9],
        "biraciUkupno": head[10], "biraciGlasovalo": head[11],
        "listiciVazeci": head[14], "listiciNevazeci": head[16],
        "lista": [{"naziv": r[19], "glasova": r[20]} for r in rows],
    }


def read_bm_files(slug: str, krug: int, vrsta: str, p1: str, p2: str, ext: str) -> list[dict]:
    """Every mirrored polling-station file for one Zagreb container."""
    d = DATA_DIR / slug / "rezultati" / str(krug)
    out = []
    for path in sorted(d.glob(f"r_{vrsta}_{p1}_{p2}_[0-9][0-9][0-9].{ext}")):
        if path.stem.endswith("_000"):  # container aggregate, not a station
            continue
        text = path.read_text(encoding="utf-8")
        if ext == "csv":
            rec = parse_referendum_csv(text)
            if rec:
                out.append(rec)
            continue
        try:
            out.append(json.loads(text))
        except json.JSONDecodeError:
            print(f"  ! neispravan JSON: {path}", file=sys.stderr)
    return out


def read_container_total(slug: str, krug: int, vrsta: str, p1: str, p2: str, ext: str) -> dict | None:
    """The container's own aggregate file, to check the per-station sums against.

    Grad Zagreb has no grop-level aggregate in most cycles, so fall back to the
    county-21 file, which for Zagreb is the whole city.
    """
    d = DATA_DIR / slug / "rezultati" / str(krug)
    for name in (f"r_{vrsta}_{p1}_{p2}_000.{ext}", f"r_{vrsta}_{p1}_0000_000.{ext}"):
        path = d / name
        if not path.exists():
            continue
        text = path.read_text(encoding="utf-8")
        rec = parse_referendum_csv(text) if ext == "csv" else json.loads(text)
        return {"biraci": to_int(rec.get("biraciUkupno")),
                "glasovalo": to_int(rec.get("biraciGlasovalo")),
                "izvor": name}
    return None


def collect(conf: dict) -> list[dict]:
    """Read every configured Zagreb container, one entry per race."""
    alias_dip = {norm(k): v for k, v in conf["aliases"]["dip"].items()}
    races: list[dict] = []

    for slug, containers in conf["kontejneri"].items():
        for c in containers:
            for krug in c["krugovi"]:
                ext = c.get("format", "json")
                files = read_bm_files(slug, krug, c["vrsta"], c["p1"], c["p2"], ext)
                if not files:
                    continue
                by_mo: dict[str, dict] = {}
                for f in files:
                    raw = (f.get("bmNaziv") or "").strip()
                    key = norm(alias_dip.get(norm(raw), raw))
                    rec = by_mo.setdefault(key, {
                        "key": key, "dip_naziv": raw, "bm": 0,
                        "biraci": 0, "glasovalo": 0, "vazeci": 0, "nevazeci": 0,
                        "liste": defaultdict(lambda: {"naziv": "", "glasova": 0}),
                    })
                    rec["bm"] += 1
                    rec["biraci"] += to_int(f.get("biraciUkupno"))
                    rec["glasovalo"] += to_int(f.get("biraciGlasovalo"))
                    rec["vazeci"] += to_int(f.get("listiciVazeci"))
                    rec["nevazeci"] += to_int(f.get("listiciNevazeci"))
                    for lista in f.get("lista") or []:
                        naziv = (lista.get("naziv") or lista.get("nazivKandidata") or "").strip()
                        if not naziv:
                            continue
                        slot = rec["liste"][norm(naziv)]
                        slot["naziv"] = naziv
                        slot["glasova"] += to_int(lista.get("glasova"))
                total = read_container_total(slug, krug, c["vrsta"], c["p1"], c["p2"], ext)
                races.append({
                    "kontrola": total,
                    "slug": slug, "krug": krug, "vrsta": c["vrsta"],
                    "naziv": c["naziv"] if len(containers) == 1 else c["naziv"].split(" (")[0],
                    "izbori": files[0].get("izbori") or c.get("izbori", slug),
                    "datum": files[0].get("datum", ""),
                    "by_mo": by_mo,
                })

    # Collapse the parliamentary izborne jedinice: one city-wide race per cycle.
    merged: list[dict] = []
    seen: dict[tuple, dict] = {}
    for r in races:
        k = (r["slug"], r["krug"], r["vrsta"], r["naziv"])
        if k not in seen:
            seen[k] = r
            merged.append(r)
            continue
        if r["kontrola"] and seen[k]["kontrola"]:
            for f in ("biraci", "glasovalo"):
                seen[k]["kontrola"][f] += r["kontrola"][f]
        tgt = seen[k]["by_mo"]
        for key, rec in r["by_mo"].items():
            if key not in tgt:
                tgt[key] = rec
                continue
            for f in ("bm", "biraci", "glasovalo", "vazeci", "nevazeci"):
                tgt[key][f] += rec[f]
            for lk, slot in rec["liste"].items():
                t = tgt[key]["liste"][lk]
                t["naziv"] = t["naziv"] or slot["naziv"]
                t["glasova"] += slot["glasova"]
    return merged


# ────────────────────────────────────────────────────────────────────────────
# Output
# ────────────────────────────────────────────────────────────────────────────

def race_id(r: dict) -> str:
    return f"{r['slug']}_k{r['krug']}_v{r['vrsta']}"


def write_outputs(races: list[dict], mo: dict, geo: dict) -> dict:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    gc_of = {k: v["gc"] for k, v in mo.items()}

    with (OUT_DIR / "zagreb_mo_odaziv.csv").open("w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["ciklus", "krug", "vrsta", "izbori", "datum", "mjesni_odbor",
                    "gradska_cetvrt", "birackih_mjesta", "biraci", "glasovalo",
                    "odaziv_posto", "vazeci", "nevazeci", "nevazeci_posto",
                    "stanovnika_popis_2011", "povrsina_ha"])
        for r in sorted(races, key=lambda x: (x["slug"], x["vrsta"], x["krug"])):
            for key, rec in sorted(r["by_mo"].items()):
                m = mo.get(key, {})
                w.writerow([
                    r["slug"], r["krug"], r["vrsta"], r["izbori"], r["datum"],
                    m.get("mo", rec["dip_naziv"]), m.get("gc", ""), rec["bm"],
                    rec["biraci"], rec["glasovalo"],
                    round(100 * rec["glasovalo"] / rec["biraci"], 2) if rec["biraci"] else "",
                    rec["vazeci"], rec["nevazeci"],
                    round(100 * rec["nevazeci"] / (rec["vazeci"] + rec["nevazeci"]), 2)
                    if (rec["vazeci"] + rec["nevazeci"]) else "",
                    m.get("stanovnika_popis_2011", ""), m.get("povrsina_ha", ""),
                ])

    with (OUT_DIR / "zagreb_gc_odaziv.csv").open("w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["ciklus", "krug", "vrsta", "izbori", "datum", "gradska_cetvrt",
                    "mjesnih_odbora", "biraci", "glasovalo", "odaziv_posto",
                    "vazeci", "nevazeci", "nevazeci_posto", "stanovnika_popis_2011"])
        for r in sorted(races, key=lambda x: (x["slug"], x["vrsta"], x["krug"])):
            agg: dict[str, dict] = defaultdict(lambda: dict.fromkeys(
                ("n", "biraci", "glasovalo", "vazeci", "nevazeci", "stan"), 0))
            for key, rec in r["by_mo"].items():
                a = agg[gc_of.get(key, "NEPOZNATO")]
                a["n"] += 1
                a["biraci"] += rec["biraci"]
                a["glasovalo"] += rec["glasovalo"]
                a["vazeci"] += rec["vazeci"]
                a["nevazeci"] += rec["nevazeci"]
                a["stan"] += mo.get(key, {}).get("stanovnika_popis_2011", 0)
            for gc, a in sorted(agg.items()):
                w.writerow([
                    r["slug"], r["krug"], r["vrsta"], r["izbori"], r["datum"], gc, a["n"],
                    a["biraci"], a["glasovalo"],
                    round(100 * a["glasovalo"] / a["biraci"], 2) if a["biraci"] else "",
                    a["vazeci"], a["nevazeci"],
                    round(100 * a["nevazeci"] / (a["vazeci"] + a["nevazeci"]), 2)
                    if (a["vazeci"] + a["nevazeci"]) else "",
                    a["stan"],
                ])

    rows = 0
    with (OUT_DIR / "zagreb_mo_liste.csv").open("w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["ciklus", "krug", "vrsta", "mjesni_odbor", "gradska_cetvrt",
                    "lista", "glasova", "posto_vazecih"])
        for r in sorted(races, key=lambda x: (x["slug"], x["vrsta"], x["krug"])):
            for key, rec in sorted(r["by_mo"].items()):
                m = mo.get(key, {})
                for slot in sorted(rec["liste"].values(), key=lambda s: -s["glasova"]):
                    w.writerow([
                        r["slug"], r["krug"], r["vrsta"], m.get("mo", rec["dip_naziv"]),
                        m.get("gc", ""), slot["naziv"], slot["glasova"],
                        round(100 * slot["glasova"] / rec["vazeci"], 2) if rec["vazeci"] else "",
                    ])
                    rows += 1

    feats = []
    for key, feat in sorted(geo.items()):
        m = mo.get(key, {})
        props = {
            "mjesni_odbor": m.get("mo", feat["properties"].get("MO")),
            "gradska_cetvrt": m.get("gc", ""),
            "adresa_sjedista": m.get("adresa", ""),
            "povrsina_ha": m.get("povrsina_ha"),
            "stanovnika_popis_2011": m.get("stanovnika_popis_2011"),
        }
        for r in races:
            rec = r["by_mo"].get(key)
            if not rec or not rec["biraci"]:
                continue
            props[f"odaziv_{race_id(r)}"] = round(100 * rec["glasovalo"] / rec["biraci"], 2)
            props[f"biraci_{race_id(r)}"] = rec["biraci"]
        feats.append({"type": "Feature", "geometry": feat["geometry"], "properties": props})
    (OUT_DIR / "zagreb_mo.geojson").write_text(
        json.dumps({"type": "FeatureCollection", "features": feats}, ensure_ascii=False),
        encoding="utf-8")

    return {"liste_redaka": rows, "poligona": len(feats)}


def write_report(races: list[dict], mo: dict, geo: dict, stats: dict, conf: dict) -> str:
    stan = sum(v["stanovnika_popis_2011"] for v in mo.values())
    lines = [
        "# Zagreb po mjesnim odborima — izvještaj o spoju",
        "",
        f"Generirano `scripts/export_zagreb_mo.py`, {date.today().isoformat()}.",
        "",
        "## Registar mjesne samouprave",
        "",
        f"- mjesnih odbora u skupu `mjesni-odbori`: **{len(mo)}**",
        f"- poligona u skupu `geoportal-mjesna-samouprava`: **{len(geo)}**",
        f"- gradskih četvrti: **{len({v['gc'] for v in mo.values()})}**",
        f"- zbroj stupca *Broj stanovnika*: **{stan:,}**".replace(",", "."),
        f"  (popis 2021. za Grad Zagreb: {POPIS_2021:,})".replace(",", "."),
        "",
        "## Poklapanje imena po ciklusu",
        "",
        "| Ciklus | Krug | Izbori | Biračkih mjesta | MO s rezultatom | Neupareno |",
        "|---|---:|---|---:|---:|---|",
    ]
    problems: list[str] = []
    for r in sorted(races, key=lambda x: (x["slug"], x["vrsta"], x["krug"])):
        miss = sorted(rec["dip_naziv"] for k, rec in r["by_mo"].items() if k not in mo)
        bm = sum(rec["bm"] for rec in r["by_mo"].values())
        lines.append(f"| {r['slug']} | {r['krug']} | {r['naziv']} | {bm} | "
                     f"{len(r['by_mo'])} | {', '.join(miss) if miss else '—'} |")
        if miss:
            problems += [f"{r['slug']} k{r['krug']}: {m}" for m in miss]
    sizes = sorted(rec["biraci"] for r in races for rec in r["by_mo"].values() if rec["biraci"])
    lines += [
        "",
        "## Pokrivenost — zbroj biračkih mjesta protiv službenog agregata",
        "",
        "| Ciklus | Krug | Utrka | Birači (zbroj BM) | Birači (agregat) | Pokrivenost |",
        "|---|---:|---|---:|---:|---:|",
    ]
    for r in sorted(races, key=lambda x: (x["slug"], x["vrsta"], x["krug"])):
        sm = sum(rec["biraci"] for rec in r["by_mo"].values())
        ctrl = r.get("kontrola")
        if not ctrl or not ctrl["biraci"]:
            lines.append(f"| {r['slug']} | {r['krug']} | {r['naziv']} | {sm} | — | — |")
            continue
        lines.append(f"| {r['slug']} | {r['krug']} | {r['naziv']} | {sm} | {ctrl['biraci']} | "
                     f"{100 * sm / ctrl['biraci']:.2f} % |")
    lines += [
        "",
        "Manjak je poznata rupa arhive: DIP prijavi više biračkih mjesta nego što "
        "objavi datoteka (404 na strani servera). Postoci po mjesnom odboru računaju "
        "se iz onoga što je objavljeno.",
        "",
        "## Odaziv po gradskoj četvrti",
        "",
        f"Mjesni odbori su vrlo nejednaki: od {min(sizes)} do {max(sizes)} birača "
        f"(medijan {sizes[len(sizes) // 2]}). Zato su glavni ekstremi navedeni među "
        f"MO-ovima s najmanje {MIN_BIRACA} birača, a apsolutni ekstrem uz broj birača.",
        "",
    ]

    for r in sorted(races, key=lambda x: (x["slug"], x["vrsta"], x["krug"])):
        agg: dict[str, list[int]] = defaultdict(lambda: [0, 0])
        for key, rec in r["by_mo"].items():
            a = agg[mo.get(key, {}).get("gc", "NEPOZNATO")]
            a[0] += rec["biraci"]
            a[1] += rec["glasovalo"]
        tb = sum(a[0] for a in agg.values())
        tg = sum(a[1] for a in agg.values())
        best = max(agg.items(), key=lambda x: x[1][1] / x[1][0] if x[1][0] else 0)
        worst = min(agg.items(), key=lambda x: x[1][1] / x[1][0] if x[1][0] else 1)
        per_mo = [(mo.get(k, {}).get("mo", rec["dip_naziv"]), 100 * rec["glasovalo"] / rec["biraci"],
                   rec["biraci"]) for k, rec in r["by_mo"].items() if rec["biraci"]]
        big = [x for x in per_mo if x[2] >= MIN_BIRACA] or per_mo
        hi, lo = max(big, key=lambda x: x[1]), min(big, key=lambda x: x[1])
        hi_all, lo_all = max(per_mo, key=lambda x: x[1]), min(per_mo, key=lambda x: x[1])
        lines.append(
            f"- **{r['slug']} k{r['krug']} ({r['naziv']}, {r['datum']})** — grad "
            f"{100 * tg / tb:.2f} %; četvrti {worst[0]} {100 * worst[1][1] / worst[1][0]:.2f} % → "
            f"{best[0]} {100 * best[1][1] / best[1][0]:.2f} %; "
            f"MO ≥{MIN_BIRACA} birača: {lo[0]} {lo[1]:.1f} % → {hi[0]} {hi[1]:.1f} % "
            f"(raspon {hi[1] - lo[1]:.1f} pb); svi MO: {lo_all[0]} {lo_all[1]:.1f} % "
            f"({lo_all[2]} birača) → {hi_all[0]} {hi_all[1]:.1f} % ({hi_all[2]} birača)")

    lines += [
        "",
        "## Ispravke imena koje spoj traži",
        "",
        "| Kanonski naziv (skup `mjesni-odbori`) | DIP | Geoportal |",
        "|---|---|---|",
    ]
    inv_dip = {v: k for k, v in conf["aliases"]["dip"].items()}
    inv_geo = {v: k for k, v in conf["aliases"]["geoportal"].items()}
    for canon in sorted(set(inv_dip) | set(inv_geo)):
        lines.append(f"| {canon} | {inv_dip.get(canon, '=')} | {inv_geo.get(canon, '=')} |")
    lines += ["", f"Obrazloženja svakog uparivanja: `{CONF_PATH.relative_to(ROOT)}`.", ""]
    if problems:
        lines += ["## Neuparena imena (traže ručnu odluku)", ""] + [f"- {p}" for p in problems] + [""]
    lines += [
        "## Izlazi",
        "",
        f"- `zagreb_mo_odaziv.csv` — odaziv po MO i utrci",
        f"- `zagreb_gc_odaziv.csv` — isto, po gradskoj četvrti",
        f"- `zagreb_mo_liste.csv` — {stats['liste_redaka']} redaka glasova po listi/kandidatu",
        f"- `zagreb_mo.geojson` — {stats['poligona']} poligona s pokazateljima",
        "",
    ]
    text = "\n".join(lines)
    (OUT_DIR / "izvjestaj.md").write_text(text, encoding="utf-8")
    return text


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--check", action="store_true",
                    help="verify the name join and exit non-zero on any unmatched name")
    ap.add_argument("--refresh", action="store_true", help="re-download City of Zagreb sources")
    args = ap.parse_args()

    conf = json.loads(CONF_PATH.read_text(encoding="utf-8"))
    mo, geo = load_registry(conf, args.refresh)
    races = collect(conf)
    if not races:
        print("nema mirroranih zagrebačkih biračkih mjesta — pokreni scripts/mirror.py",
              file=sys.stderr)
        return 1

    unmatched_dip = {rec["dip_naziv"] for r in races for k, rec in r["by_mo"].items() if k not in mo}
    unmatched_geo = sorted(set(geo) - set(mo))
    no_geo = sorted(set(mo) - set(geo))

    print(f"mjesnih odbora: {len(mo)}  poligona: {len(geo)}  utrka: {len(races)}")
    for r in sorted(races, key=lambda x: (x["slug"], x["vrsta"], x["krug"])):
        bm = sum(rec["bm"] for rec in r["by_mo"].values())
        print(f"  {r['slug']:16s} k{r['krug']} v{r['vrsta']}  {bm:4d} BM → {len(r['by_mo'])} MO")
    if unmatched_dip:
        print(f"NEUPARENO (DIP): {sorted(unmatched_dip)}", file=sys.stderr)
    if unmatched_geo:
        print(f"NEUPARENO (geoportal): {unmatched_geo}", file=sys.stderr)
    if no_geo:
        print(f"MO bez poligona: {no_geo}", file=sys.stderr)

    if args.check:
        ok = not (unmatched_dip or unmatched_geo or no_geo)
        print("OK — svaki naziv uparen" if ok else "PAD — neupareni nazivi gore")
        return 0 if ok else 1

    stats = write_outputs(races, mo, geo)
    print()
    print(write_report(races, mo, geo, stats, conf))
    print(f"zapisano u {OUT_DIR.relative_to(ROOT)}/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
