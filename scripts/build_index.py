#!/usr/bin/env python3
"""Walk data/ and build a SQLite database for searching izbori.hr archive.

Schema:
  rezultat                — one row per result file (RH/zup/grop/BM/ino level)
  rezultat_lista          — one row per top-level lista entry (party / candidate)
  rezultat_kandidat       — one row per candidate inside a party list (parlament/EU/lokalni)
  rezultat_kandidat_fts   — FTS5 virtual table over candidate names

Usage:
  scripts/build_index.py            # rebuild data/izbori.sqlite from scratch
  scripts/build_index.py --append   # don't drop existing rows
"""
from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
DB_PATH = DATA_DIR / "izbori.sqlite"


SCHEMA = """
CREATE TABLE IF NOT EXISTS rezultat (
    id INTEGER PRIMARY KEY,
    election TEXT NOT NULL,
    krug INTEGER NOT NULL,
    vrsta TEXT NOT NULL,
    p1 TEXT NOT NULL,
    p2 TEXT NOT NULL,
    p3 TEXT NOT NULL,
    level TEXT NOT NULL,            -- rh | zup | grop | bm | ino_zup | ino_zup_bm
    izbori_naziv TEXT,
    datum TEXT,
    vrijeme TEXT,
    zup_naziv TEXT,
    grop_naziv TEXT,
    bm_naziv TEXT,
    bm_zatvoreno INTEGER,
    bm_ukupno INTEGER,
    biraci_ukupno INTEGER,
    biraci_glasovalo INTEGER,
    biraci_glasovalo_posto REAL,
    listici_ukupno INTEGER,
    listici_vazeci INTEGER,
    listici_nevazeci INTEGER,
    napomena TEXT,
    source_file TEXT,
    UNIQUE (election, krug, vrsta, p1, p2, p3)
);
CREATE INDEX IF NOT EXISTS rezultat_election_level ON rezultat(election, level);
CREATE INDEX IF NOT EXISTS rezultat_geog ON rezultat(election, p1, p2, p3);

CREATE TABLE IF NOT EXISTS rezultat_lista (
    id INTEGER PRIMARY KEY,
    rezultat_id INTEGER NOT NULL REFERENCES rezultat(id) ON DELETE CASCADE,
    rbr INTEGER,
    naziv TEXT,                 -- party label OR candidate name (predsjednik)
    jedinstvena_sifra TEXT,
    glasova INTEGER,
    posto REAL,
    predlagatelji TEXT,         -- "; "-joined names
    stranke TEXT,               -- "; "-joined names
    mandata INTEGER             -- seats awarded (parlament D'Hondt / manjine top-N)
);
CREATE INDEX IF NOT EXISTS lista_rezultat ON rezultat_lista(rezultat_id);
CREATE INDEX IF NOT EXISTS lista_naziv ON rezultat_lista(naziv);

CREATE TABLE IF NOT EXISTS rezultat_kandidat (
    id INTEGER PRIMARY KEY,
    lista_id INTEGER NOT NULL REFERENCES rezultat_lista(id) ON DELETE CASCADE,
    rbr INTEGER,
    naziv TEXT,
    glasova INTEGER,
    posto REAL
);
CREATE INDEX IF NOT EXISTS kandidat_lista ON rezultat_kandidat(lista_id);
CREATE INDEX IF NOT EXISTS kandidat_naziv ON rezultat_kandidat(naziv);

CREATE VIRTUAL TABLE IF NOT EXISTS rezultat_kandidat_fts USING fts5(
    naziv,
    content='rezultat_kandidat',
    content_rowid='id',
    tokenize='unicode61'
);
CREATE VIRTUAL TABLE IF NOT EXISTS rezultat_lista_fts USING fts5(
    naziv, predlagatelji, stranke,
    content='rezultat_lista',
    content_rowid='id',
    tokenize='unicode61'
);
"""


def parse_posto(s) -> float | None:
    """Convert '46,03' → 46.03. Empty/None → None."""
    if s in (None, ""):
        return None
    try:
        return float(str(s).replace(",", "."))
    except ValueError:
        return None


def derive_level(p1: str, p2: str, p3: str) -> str:
    if p1 == "00" and p2 == "0000":
        return "rh"
    if p1 == "22":
        return "ino_zup_bm" if p3 != "000" else ("ino_zup" if p2 != "0000" else "zup")
    if p2 == "0000":
        return "zup"
    if p3 == "000":
        return "grop"
    return "bm"


def parse_filename(name: str, ext: str) -> tuple[str, str, str, str] | None:
    """Parse `r_<vrsta>_<p1>_<p2>_<p3>.<ext>` → (vrsta, p1, p2, p3) or None."""
    if not name.endswith("." + ext):
        return None
    stem = name[: -(len(ext) + 1)]
    parts = stem.split("_")
    if len(parts) != 5 or parts[0] != "r":
        return None
    return parts[1], parts[2], parts[3], parts[4]


def insert_json_result(con: sqlite3.Connection, election: str, krug: int, file_path: Path) -> int:
    parsed = parse_filename(file_path.name, "json")
    if not parsed:
        return 0
    vrsta, p1, p2, p3 = parsed
    try:
        d = json.loads(file_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return 0
    if not isinstance(d, dict):
        return 0

    cur = con.cursor()
    cur.execute(
        """INSERT OR REPLACE INTO rezultat
           (election, krug, vrsta, p1, p2, p3, level,
            izbori_naziv, datum, vrijeme,
            zup_naziv, grop_naziv, bm_naziv,
            bm_zatvoreno, bm_ukupno, biraci_ukupno,
            biraci_glasovalo, biraci_glasovalo_posto,
            listici_ukupno, listici_vazeci, listici_nevazeci,
            napomena, source_file)
           VALUES (?,?,?,?,?,?,?, ?,?,?, ?,?,?, ?,?,?, ?,?, ?,?,?, ?,?)""",
        (
            election, krug, vrsta, p1, p2, p3, derive_level(p1, p2, p3),
            d.get("izbori"), d.get("datum"), d.get("vrijeme"),
            d.get("zupNaziv"), d.get("gropNaziv"), d.get("bmNaziv"),
            d.get("bmZatvoreno"), d.get("bmUkupno"), d.get("biraciUkupno"),
            d.get("biraciGlasovalo"), parse_posto(d.get("biraciGlasovaloPosto")),
            d.get("listiciUkupno"), d.get("listiciVazeci"), d.get("listiciNevazeci"),
            d.get("napomena"),
            str(file_path.relative_to(DATA_DIR)),
        ),
    )
    rezultat_id = cur.lastrowid

    for entry in d.get("lista") or []:
        if not isinstance(entry, dict):
            continue

        def names_of(field: str) -> str:
            v = entry.get(field)
            if isinstance(v, list):
                return "; ".join(p.get("naziv", "") for p in v if isinstance(p, dict))
            if isinstance(v, str):
                return v
            return ""

        # In lokalni 2025, party names live in `strankePuniNaziv` (list of dicts);
        # `stranke` is a comma-joined short string. We accept either.
        predlagatelji = names_of("predlagatelji")
        stranke = names_of("strankePuniNaziv") or names_of("stranke")
        cur.execute(
            """INSERT INTO rezultat_lista
               (rezultat_id, rbr, naziv, jedinstvena_sifra, glasova, posto, predlagatelji, stranke)
               VALUES (?,?,?,?,?,?,?,?)""",
            (
                rezultat_id, entry.get("rbr"), entry.get("naziv"),
                str(entry.get("jedinstvenaSifra") or ""),
                entry.get("glasova"), parse_posto(entry.get("posto")),
                predlagatelji, stranke,
            ),
        )
        lista_id = cur.lastrowid
        # Nested candidates (parlament / EU / lokalni list-style elections)
        for kand in entry.get("lista") or []:
            cur.execute(
                """INSERT INTO rezultat_kandidat (lista_id, rbr, naziv, glasova, posto)
                   VALUES (?,?,?,?,?)""",
                (
                    lista_id, kand.get("rbr"), kand.get("naziv"),
                    kand.get("glasova"), parse_posto(kand.get("posto")),
                ),
            )
    return 1


# Referendum CSV columns (semi-colon separated, BOM on first line of first file):
# 0: izboriOznaka, 1: zupSifra, 2: ?, 3: datum, 4: vrijeme,
# 5: bmZatvoreno, 6: bmUkupno, 7: zupNaziv, 8: gropNaziv, 9: bmNaziv,
# 10: biraciUkupno, 11: biraciGlasovalo, 12: biraciGlasovaloPosto,
# 13: listiciUkupno, 14: listiciVazeci, 15: listiciVazeciPosto,
# 16: listiciNevazeci, 17: listiciNevazeciPosto,
# 18: rbr, 19: naziv (ZA/PROTIV), 20: glasova, 21: posto
def insert_csv_result(con: sqlite3.Connection, election: str, krug: int, file_path: Path) -> int:
    parsed = parse_filename(file_path.name, "csv")
    if not parsed:
        return 0
    vrsta, p1, p2, p3 = parsed
    text = file_path.read_text(encoding="utf-8", errors="replace").lstrip("﻿")
    rows = [r.split(";") for r in text.splitlines() if r.strip()]
    if not rows:
        return 0
    head = rows[0]
    if len(head) < 18:
        return 0

    cur = con.cursor()
    cur.execute(
        """INSERT OR REPLACE INTO rezultat
           (election, krug, vrsta, p1, p2, p3, level,
            izbori_naziv, datum, vrijeme,
            zup_naziv, grop_naziv, bm_naziv,
            bm_zatvoreno, bm_ukupno, biraci_ukupno,
            biraci_glasovalo, biraci_glasovalo_posto,
            listici_ukupno, listici_vazeci, listici_nevazeci,
            napomena, source_file)
           VALUES (?,?,?,?,?,?,?, ?,?,?, ?,?,?, ?,?,?, ?,?, ?,?,?, ?,?)""",
        (
            election, krug, vrsta, p1, p2, p3, derive_level(p1, p2, p3),
            "Referendum", head[3], head[4],
            head[7], head[8], head[9],
            int(head[5] or 0), int(head[6] or 0), int(head[10] or 0),
            int(head[11] or 0), parse_posto(head[12]),
            int(head[13] or 0), int(head[14] or 0), int(head[16] or 0),
            None,
            str(file_path.relative_to(DATA_DIR)),
        ),
    )
    rezultat_id = cur.lastrowid
    for r in rows:
        if len(r) < 22:
            continue
        cur.execute(
            """INSERT INTO rezultat_lista
               (rezultat_id, rbr, naziv, jedinstvena_sifra, glasova, posto, predlagatelji, stranke)
               VALUES (?,?,?,?,?,?,?,?)""",
            (rezultat_id, int(r[18] or 0), r[19], "", int(r[20] or 0), parse_posto(r[21]), "", ""),
        )
    return 1


def detect_krug(rel: Path) -> int:
    # rezultati/<krug>/r_*.json — krug is parent directory name.
    try:
        return int(rel.parent.name)
    except ValueError:
        return 1


def index_election(con: sqlite3.Connection, election_dir: Path) -> tuple[int, int]:
    election = election_dir.name
    rez_dir = election_dir / "rezultati"
    if not rez_dir.exists():
        return 0, 0
    n_ok = n_err = 0
    for f in rez_dir.rglob("r_*.json"):
        krug = detect_krug(f.relative_to(election_dir))
        try:
            n_ok += insert_json_result(con, election, krug, f)
        except Exception as e:
            n_err += 1
            print(f"  err {f}: {e}", file=sys.stderr)
    for f in rez_dir.rglob("r_*.csv"):
        krug = detect_krug(f.relative_to(election_dir))
        try:
            n_ok += insert_csv_result(con, election, krug, f)
        except Exception as e:
            n_err += 1
            print(f"  err {f}: {e}", file=sys.stderr)
    return n_ok, n_err


# ── Sabor 2024 seat allocation ──────────────────────────────────────────────
# Each geographic IJ elects 14 seats by D'Hondt with a 5% threshold (within IJ).
# IJ 011 (inozemstvo) elects 3 seats.
# IJ 012 splits into 6 minority races; winners are top-N by candidate votes.

PARLAMENT_IJ_SEATS = {f"{i:03d}": 14 for i in range(1, 11)}
PARLAMENT_IJ_SEATS["011"] = 3

# manjina_code → number of seats elected from that race (D'Hondt is *not* used)
PARLAMENT_MANJINE_SEATS = {
    "13": 3,  # srpska
    "23": 1,  # mađarska
    "33": 1,  # talijanska
    "43": 1,  # češka i slovačka
    "53": 1,  # austrijska/bugarska/njemačka/poljska/romska/...
    "63": 1,  # albanska/bošnjačka/crnogorska/makedonska/slovenska
}


def dhondt(votes: dict[str, int], seats: int, threshold_pct: float) -> dict[str, int]:
    """Allocate `seats` to entries in `votes` using D'Hondt with a percent
    threshold computed against the total of `votes`. Below-threshold entries
    are excluded from allocation but still appear in the result with 0."""
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


def allocate_parlament_seats(con: sqlite3.Connection) -> int:
    """Compute and persist mandata in rezultat_lista for parlament-2024:
      - geographic IJs (001-010, 011): D'Hondt within each IJ, 5% threshold
      - minority IJ 012: top-N candidates per minority list (no threshold)
    Returns the number of IJ-level rezultat rows updated.
    """
    n_updated = 0

    # Reset any prior values for parlament-2024.
    con.execute(
        """UPDATE rezultat_lista SET mandata = 0
           WHERE rezultat_id IN (SELECT id FROM rezultat WHERE election='parlament-2024')"""
    )

    # 1) Geographic IJs.
    for ij, seats in PARLAMENT_IJ_SEATS.items():
        for krug, in con.execute(
            """SELECT DISTINCT krug FROM rezultat
               WHERE election='parlament-2024' AND vrsta='02' AND p1=? AND level='zup'""",
            (ij,),
        ).fetchall():
            rez = con.execute(
                """SELECT id FROM rezultat WHERE election='parlament-2024'
                   AND krug=? AND vrsta='02' AND p1=? AND p2='0000' AND p3='000'""",
                (krug, ij),
            ).fetchone()
            if not rez:
                continue
            rezultat_id = rez[0]
            rows = con.execute(
                "SELECT id, naziv, glasova FROM rezultat_lista WHERE rezultat_id=?",
                (rezultat_id,),
            ).fetchall()
            votes = {r[1]: (r[2] or 0) for r in rows}
            ids_by_naziv = {r[1]: r[0] for r in rows}
            awards = dhondt(votes, seats, threshold_pct=5.0)
            for naziv, m in awards.items():
                con.execute(
                    "UPDATE rezultat_lista SET mandata=? WHERE id=?",
                    (m, ids_by_naziv[naziv]),
                )
            n_updated += 1

    # 2) Minority IJ (012). Each manjina file lists candidates directly in
    #    `lista`; top-N win. The manjina code lives in p0 (vrsta).
    for vrsta, seats in PARLAMENT_MANJINE_SEATS.items():
        for krug, in con.execute(
            """SELECT DISTINCT krug FROM rezultat
               WHERE election='parlament-2024' AND vrsta=? AND p1='012' AND p2='0000' AND p3='000'""",
            (vrsta,),
        ).fetchall():
            rez = con.execute(
                """SELECT id FROM rezultat WHERE election='parlament-2024'
                   AND krug=? AND vrsta=? AND p1='012' AND p2='0000' AND p3='000'""",
                (krug, vrsta),
            ).fetchone()
            if not rez:
                continue
            rezultat_id = rez[0]
            top = con.execute(
                """SELECT id FROM rezultat_lista WHERE rezultat_id=?
                   ORDER BY (glasova IS NULL), glasova DESC LIMIT ?""",
                (rezultat_id, seats),
            ).fetchall()
            for (lid,) in top:
                con.execute("UPDATE rezultat_lista SET mandata=1 WHERE id=?", (lid,))
            n_updated += 1

    return n_updated


def synthesize_parlament_rh(con: sqlite3.Connection) -> int:
    """Sabor 2024 has no national-aggregate file in the DIP archive — only
    one per izborna jedinica. Compute the RH aggregate by summing the 11
    geographic IJs (001..010 + 011 inozemstvo). Skip IJ 012 (manjine) since
    those are 6 separate races, not one.
    """
    GEO_IJ = ("001", "002", "003", "004", "005", "006", "007", "008",
              "009", "010", "011")
    n = 0
    for krug, in con.execute(
        "SELECT DISTINCT krug FROM rezultat WHERE election='parlament-2024' AND level='zup'"
    ).fetchall():
        ij_rows = con.execute(
            f"""SELECT id, biraci_ukupno, biraci_glasovalo,
                       listici_ukupno, listici_vazeci, listici_nevazeci,
                       bm_zatvoreno, bm_ukupno, datum, vrijeme, izbori_naziv
                FROM rezultat
                WHERE election='parlament-2024' AND krug=? AND level='zup'
                  AND p1 IN ({','.join('?'*len(GEO_IJ))})""",
            (krug, *GEO_IJ),
        ).fetchall()
        if not ij_rows:
            continue

        ids = [r[0] for r in ij_rows]
        biraci_ukupno = sum((r[1] or 0) for r in ij_rows)
        biraci_glasovalo = sum((r[2] or 0) for r in ij_rows)
        listici_ukupno = sum((r[3] or 0) for r in ij_rows)
        listici_vazeci = sum((r[4] or 0) for r in ij_rows)
        listici_nevazeci = sum((r[5] or 0) for r in ij_rows)
        bm_zatvoreno = sum((r[6] or 0) for r in ij_rows)
        bm_ukupno = sum((r[7] or 0) for r in ij_rows)
        datum = max((r[8] or "") for r in ij_rows)
        vrijeme = max((r[9] or "") for r in ij_rows)
        izbori_naziv = next((r[10] for r in ij_rows if r[10]), "Parlamentarni izbori 2024")
        biraci_glasovalo_posto = (
            round(100.0 * biraci_glasovalo / biraci_ukupno, 2) if biraci_ukupno else None
        )

        cur = con.execute(
            """INSERT OR REPLACE INTO rezultat
               (election, krug, vrsta, p1, p2, p3, level,
                izbori_naziv, datum, vrijeme,
                zup_naziv, grop_naziv, bm_naziv,
                bm_zatvoreno, bm_ukupno, biraci_ukupno,
                biraci_glasovalo, biraci_glasovalo_posto,
                listici_ukupno, listici_vazeci, listici_nevazeci,
                napomena, source_file)
               VALUES ('parlament-2024', ?, '02', '00', '0000', '000', 'rh',
                ?, ?, ?,
                '', 'UKUPNO RH (sintetizirano: IJ 001-011)', '',
                ?, ?, ?, ?, ?, ?, ?, ?,
                'Sintetiziran agregat: SUM po izbornim jedinicama 001-011 (geografske + inozemstvo). Manjine (IJ 012) nisu uključene.',
                NULL)""",
            (
                krug, izbori_naziv, datum, vrijeme,
                bm_zatvoreno, bm_ukupno, biraci_ukupno,
                biraci_glasovalo, biraci_glasovalo_posto,
                listici_ukupno, listici_vazeci, listici_nevazeci,
            ),
        )
        rh_id = cur.lastrowid

        # Aggregate the lista entries by canonical naziv across the 11 IJs.
        # The same coalition appears under the same `naziv` in each IJ, so
        # GROUP BY naziv yields the national vote count and seat sum.
        rows = con.execute(
            f"""SELECT l.naziv,
                       MIN(l.jedinstvena_sifra) AS sif,
                       SUM(COALESCE(l.glasova,0)) AS suma,
                       SUM(COALESCE(l.mandata,0)) AS mand,
                       MIN(l.predlagatelji),
                       MIN(l.stranke)
                FROM rezultat_lista l
                JOIN rezultat r ON r.id = l.rezultat_id
                WHERE r.id IN ({','.join('?'*len(ids))})
                GROUP BY l.naziv
                ORDER BY suma DESC""",
            ids,
        ).fetchall()

        for rbr, (naziv, sif, glasova, mandata, predl, stranke) in enumerate(rows, start=1):
            posto = (
                round(100.0 * glasova / listici_vazeci, 2) if listici_vazeci else None
            )
            con.execute(
                """INSERT INTO rezultat_lista
                   (rezultat_id, rbr, naziv, jedinstvena_sifra, glasova, posto, predlagatelji, stranke, mandata)
                   VALUES (?,?,?,?,?,?,?,?,?)""",
                (rh_id, rbr, naziv, sif or "", glasova, posto, predl or "", stranke or "", mandata),
            )
        n += 1
    return n


def rebuild_fts(con: sqlite3.Connection) -> None:
    con.executescript("""
        INSERT INTO rezultat_kandidat_fts(rowid, naziv)
            SELECT id, naziv FROM rezultat_kandidat;
        INSERT INTO rezultat_lista_fts(rowid, naziv, predlagatelji, stranke)
            SELECT id, naziv, predlagatelji, stranke FROM rezultat_lista;
    """)


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--append", action="store_true", help="keep existing rows")
    p.add_argument("--db", default=str(DB_PATH))
    args = p.parse_args()

    db_path = Path(args.db)
    if not args.append and db_path.exists():
        db_path.unlink()
    db_path.parent.mkdir(parents=True, exist_ok=True)

    con = sqlite3.connect(db_path)
    con.execute("PRAGMA journal_mode=WAL")
    con.execute("PRAGMA synchronous=NORMAL")
    con.executescript(SCHEMA)

    if not args.append:
        # Wipe FTS first via the special command (DELETE on contentless/external FTS
        # is unsafe), then drop content tables.
        for fts in ("rezultat_kandidat_fts", "rezultat_lista_fts"):
            con.execute(f"INSERT INTO {fts}({fts}) VALUES('delete-all')")
        for t in ("rezultat_kandidat", "rezultat_lista", "rezultat"):
            con.execute(f"DELETE FROM {t}")
        con.commit()

    total_ok = total_err = 0
    for election_dir in sorted(p for p in DATA_DIR.iterdir() if p.is_dir() and p.name != "__pycache__"):
        ok, err = index_election(con, election_dir)
        print(f"  {election_dir.name}: {ok} files indexed ({err} errors)")
        total_ok += ok
        total_err += err
        con.commit()

    print("Allocating parlament-2024 seats (D'Hondt + manjine top-N) …")
    n_alloc = allocate_parlament_seats(con)
    print(f"  updated {n_alloc} IJ-level rezultat rows")
    con.commit()

    print("Synthesizing RH aggregate for parlament-2024 …")
    n_synth = synthesize_parlament_rh(con)
    print(f"  inserted {n_synth} synthetic RH rows")
    con.commit()

    print("Rebuilding FTS …")
    for fts in ("rezultat_kandidat_fts", "rezultat_lista_fts"):
        con.execute(f"INSERT INTO {fts}({fts}) VALUES('delete-all')")
    rebuild_fts(con)
    con.commit()

    print("Counts:")
    for t in ("rezultat", "rezultat_lista", "rezultat_kandidat"):
        n = con.execute(f"SELECT count(*) FROM {t}").fetchone()[0]
        print(f"  {t}: {n}")
    print(f"DB at {db_path} ({db_path.stat().st_size / 1_048_576:.1f} MiB)")
    print(f"DONE  files indexed: {total_ok}  errors: {total_err}")
    con.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
