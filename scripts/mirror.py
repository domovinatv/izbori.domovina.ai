#!/usr/bin/env python3
"""Mirror izbori.hr archive data to local disk for offline search.

Walks the geographic tree (RH → županija → grad/općina → biračko mjesto) for
a given election and downloads all `rezultati/{krug}/r_*.json` files. Each
grop-level response contains `bmUkupno`, which tells the script how many
polling stations to enumerate.

Layout on disk (relative to repo root, gitignored):
    data/{election-slug}/rezultati/{krug}/r_*.json
    data/{election-slug}/bm/bm-{sifra}.json

The script is resumable: existing files are skipped unless --force.

Usage:
    scripts/mirror.py predsjednik-2024
    scripts/mirror.py lokalni-2025 --concurrency 8
    scripts/mirror.py --list
"""
from __future__ import annotations

import argparse
import json
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Iterable

import urllib.request
import urllib.error

ROOT = Path(__file__).resolve().parent.parent
SIFARNICI_DIR = ROOT / "sifarnici"
DATA_DIR = ROOT / "data"

BASE_URL = "https://www.izbori.hr/arhiva-izbora/data"
USER_AGENT = "izbori-archive-mirror/0.1 (offline research; +https://github.com/)"


# ────────────────────────────────────────────────────────────────────────────
# Election registry
# ────────────────────────────────────────────────────────────────────────────

@dataclass(frozen=True)
class Election:
    slug: str           # CLI handle, also output dir name
    data_path: str      # path under arhiva-izbora/data/
    sifarnik: str       # filename in sifarnici/
    rounds: tuple[int, ...]
    kind: str           # 'standard' | 'parlament' | 'lokalni'
    extension: str = "json"


ELECTIONS: dict[str, Election] = {
    "predsjednik-2024": Election(
        slug="predsjednik-2024",
        data_path="predsjednik/2024",
        sifarnik="predsjednik-2024.json",
        rounds=(1, 2),
        kind="standard",
    ),
    "euparlament-2024": Election(
        slug="euparlament-2024",
        data_path="euparlament/2024",
        sifarnik="eu-parlament-2024.json",
        rounds=(1,),
        kind="standard",
    ),
    "referendum-2013": Election(
        slug="referendum-2013",
        data_path="referendum/2013",
        sifarnik="referendum-2013.json",
        rounds=(1,),
        kind="standard",
        extension="csv",
    ),
    "parlament-2024": Election(
        slug="parlament-2024",
        data_path="parlament/2024",
        sifarnik="parlament-2024.json",
        rounds=(1,),
        kind="parlament",
    ),
    "lokalni-2025": Election(
        slug="lokalni-2025",
        data_path="lokalni/2025",
        sifarnik="lokalni-2025.json",
        rounds=(1, 2),
        kind="lokalni",
    ),
}


# Election → list of `vrsta` codes used in the rezultati filename `r_{vrsta}_..`
STANDARD_VRSTA = {
    "predsjednik-2024": "01",
    "euparlament-2024": "14",
    "referendum-2013": "81",
}


# ────────────────────────────────────────────────────────────────────────────
# HTTP
# ────────────────────────────────────────────────────────────────────────────

class Stats:
    """Shared counters for progress reporting."""

    def __init__(self) -> None:
        self.lock = threading.Lock()
        self.ok = 0
        self.skipped = 0
        self.missing = 0   # 404 — expected, race didn't happen there
        self.failed = 0    # network/server error
        self.bytes = 0

    def add(self, **kw: int) -> None:
        with self.lock:
            for k, v in kw.items():
                setattr(self, k, getattr(self, k) + v)

    def __str__(self) -> str:
        return (
            f"ok={self.ok} skipped={self.skipped} 404={self.missing} "
            f"failed={self.failed} bytes={self.bytes / 1_048_576:.1f}MiB"
        )


def fetch(url: str, timeout: float = 30.0) -> tuple[int, bytes]:
    """Plain GET with retries on transient errors. Returns (status, body)."""
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    last_err: Exception | None = None
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return resp.status, resp.read()
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return 404, b""
            last_err = e
        except (urllib.error.URLError, TimeoutError, OSError) as e:
            last_err = e
        time.sleep(0.5 * (attempt + 1))
    raise RuntimeError(f"fetch failed: {url}: {last_err}")


def download_one(url: str, dest: Path, force: bool, stats: Stats) -> bytes | None:
    """Download `url` to `dest` (skip if exists). Returns body on 200."""
    if dest.exists() and not force:
        stats.add(skipped=1)
        return dest.read_bytes()

    status, body = fetch(url)
    if status == 404:
        stats.add(missing=1)
        return None
    if status != 200:
        stats.add(failed=1)
        return None

    dest.parent.mkdir(parents=True, exist_ok=True)
    # Write atomically.
    tmp = dest.with_suffix(dest.suffix + ".tmp")
    tmp.write_bytes(body)
    tmp.rename(dest)
    stats.add(ok=1, bytes=len(body))
    return body


# ────────────────────────────────────────────────────────────────────────────
# Geography traversal
# ────────────────────────────────────────────────────────────────────────────

def load_sifarnik(name: str) -> dict:
    return json.loads((SIFARNICI_DIR / name).read_text(encoding="utf-8"))


def parse_bm_ukupno(body: bytes, ext: str) -> int:
    """Read `bmUkupno` from a result file body (best effort)."""
    if ext == "json":
        try:
            return int(json.loads(body).get("bmUkupno") or 0)
        except (json.JSONDecodeError, ValueError):
            return 0
    if ext == "csv":
        # Referendum CSV: semi-colon separated; bmUkupno is column index 6.
        # Strip BOM if present.
        text = body.decode("utf-8", errors="replace").lstrip("﻿")
        first = text.split("\n", 1)[0]
        cols = first.split(";")
        try:
            return int(cols[6])
        except (IndexError, ValueError):
            return 0
    return 0


def grop_url(election: Election, krug: int, vrsta: str, p1: str, p2: str, p3: str) -> str:
    return (
        f"{BASE_URL}/{election.data_path}/rezultati/{krug}/"
        f"r_{vrsta}_{p1}_{p2}_{p3}.{election.extension}"
    )


def grop_dest(election: Election, krug: int, vrsta: str, p1: str, p2: str, p3: str) -> Path:
    return (
        DATA_DIR
        / election.slug
        / "rezultati"
        / str(krug)
        / f"r_{vrsta}_{p1}_{p2}_{p3}.{election.extension}"
    )


@dataclass(frozen=True)
class Job:
    """One file to fetch, plus optional follow-up metadata."""
    url: str
    dest: Path
    expand_bms: bool = False  # if True, after fetching, queue BM children
    krug: int = 0
    vrsta: str = ""
    p1: str = ""
    p2: str = ""


def jobs_standard(election: Election, sifarnik: dict) -> list[Job]:
    """Build job list for predsjednik / euparlament / referendum.

    These have a single `vrsta` and traverse: RH → zup → grop → BM, plus
    inozemstvo (zup=22) → ino-country → BM.
    """
    vrsta = STANDARD_VRSTA[election.slug]
    jobs: list[Job] = []

    for krug in election.rounds:
        # RH-level
        jobs.append(Job(
            url=grop_url(election, krug, vrsta, "00", "0000", "000"),
            dest=grop_dest(election, krug, vrsta, "00", "0000", "000"),
        ))

        # Per-županija aggregate (no children traversal needed here — county
        # itself is the aggregate of its grops, which we visit directly).
        seen_zup: set[str] = set()
        for go in sifarnik.get("gradOpcina", []):
            seen_zup.add(go["codetop"])
        for zup in sorted(seen_zup):
            if zup in {"22"}:  # inozemstvo handled separately below
                continue
            jobs.append(Job(
                url=grop_url(election, krug, vrsta, zup, "0000", "000"),
                dest=grop_dest(election, krug, vrsta, zup, "0000", "000"),
            ))

        # Per grad/općina, with BM expansion
        for go in sifarnik.get("gradOpcina", []):
            zup = go["codetop"]
            grop = go["code"]
            jobs.append(Job(
                url=grop_url(election, krug, vrsta, zup, grop, "000"),
                dest=grop_dest(election, krug, vrsta, zup, grop, "000"),
                expand_bms=True,
                krug=krug, vrsta=vrsta, p1=zup, p2=grop,
            ))

        # Inozemstvo (zup=22) aggregate + per-country
        jobs.append(Job(
            url=grop_url(election, krug, vrsta, "22", "0000", "000"),
            dest=grop_dest(election, krug, vrsta, "22", "0000", "000"),
        ))
        for ino in sifarnik.get("inozemstvo", []):
            jobs.append(Job(
                url=grop_url(election, krug, vrsta, "22", ino["code"], "000"),
                dest=grop_dest(election, krug, vrsta, "22", ino["code"], "000"),
                expand_bms=True,
                krug=krug, vrsta=vrsta, p1="22", p2=ino["code"],
            ))

    return jobs


def jobs_parlament(election: Election, sifarnik: dict) -> list[Job]:
    """Sabor 2024 — 10 izborne jedinice (per-grop), 11 inozemstvo, 12 manjine."""
    jobs: list[Job] = []
    grops_by_ij: dict[str, list[str]] = {}
    for go in sifarnik.get("gradOpcina", []):
        grops_by_ij.setdefault(go["codetop"], []).append(go["code"])

    for krug in election.rounds:
        # IJ 001..010 (with grops and BMs)
        for ij in [f"{i:03d}" for i in range(1, 11)]:
            # IJ-level aggregate
            jobs.append(Job(
                url=grop_url(election, krug, "02", ij, "0000", "000"),
                dest=grop_dest(election, krug, "02", ij, "0000", "000"),
            ))
            for grop in grops_by_ij.get(ij, []):
                jobs.append(Job(
                    url=grop_url(election, krug, "02", ij, grop, "000"),
                    dest=grop_dest(election, krug, "02", ij, grop, "000"),
                    expand_bms=True,
                    krug=krug, vrsta="02", p1=ij, p2=grop,
                ))
        # IJ 011 — inozemstvo
        jobs.append(Job(
            url=grop_url(election, krug, "02", "011", "0000", "000"),
            dest=grop_dest(election, krug, "02", "011", "0000", "000"),
        ))
        for ino in sifarnik.get("inozemstvo", []):
            jobs.append(Job(
                url=grop_url(election, krug, "02", "011", ino["code"], "000"),
                dest=grop_dest(election, krug, "02", "011", ino["code"], "000"),
                expand_bms=True,
                krug=krug, vrsta="02", p1="011", p2=ino["code"],
            ))
        # IJ 012 — manjine: vrsta is replaced by manjina code (13/23/33/43/53/63)
        jobs.append(Job(
            url=grop_url(election, krug, "02", "012", "0000", "000"),
            dest=grop_dest(election, krug, "02", "012", "0000", "000"),
        ))
        for m in sifarnik.get("manjina", []):
            jobs.append(Job(
                url=grop_url(election, krug, m["code"], "012", "0000", "000"),
                dest=grop_dest(election, krug, m["code"], "012", "0000", "000"),
            ))

    return jobs


def jobs_lokalni(election: Election, sifarnik: dict) -> list[Job]:
    """Lokalni 2025 — multiple vrste; codetop of each vrsta entry says
    where the race exists (a county code 01..21 or a 4-digit grop code)."""
    jobs: list[Job] = []
    grops_by_zup: dict[str, list[str]] = {}
    grop_zup: dict[str, str] = {}
    for go in sifarnik.get("gradOpcina", []):
        grops_by_zup.setdefault(go["codetop"], []).append(go["code"])
        grop_zup[go["code"]] = go["codetop"]

    # Aggregate vrste by code → list of codetops
    by_vrsta: dict[str, list[str]] = {}
    for v in sifarnik.get("vrsta", []):
        by_vrsta.setdefault(v["code"], []).append(v["codetop"])

    for krug in election.rounds:
        for vrsta, codetops in sorted(by_vrsta.items()):
            for codetop in codetops:
                if len(codetop) == 2:  # county-level race (e.g. ŽUPAN, žup. skupština)
                    zup = codetop
                    # zup-level aggregate
                    jobs.append(Job(
                        url=grop_url(election, krug, vrsta, zup, "0000", "000"),
                        dest=grop_dest(election, krug, vrsta, zup, "0000", "000"),
                    ))
                    # per grop in that zup, with BMs (county results break down to BMs)
                    for grop in grops_by_zup.get(zup, []):
                        jobs.append(Job(
                            url=grop_url(election, krug, vrsta, zup, grop, "000"),
                            dest=grop_dest(election, krug, vrsta, zup, grop, "000"),
                            expand_bms=True,
                            krug=krug, vrsta=vrsta, p1=zup, p2=grop,
                        ))
                else:  # municipality-level race (GO vijeće, gradonačelnik...)
                    grop = codetop
                    zup = grop_zup.get(grop, "00")
                    jobs.append(Job(
                        url=grop_url(election, krug, vrsta, zup, grop, "000"),
                        dest=grop_dest(election, krug, vrsta, zup, grop, "000"),
                        expand_bms=True,
                        krug=krug, vrsta=vrsta, p1=zup, p2=grop,
                    ))

    return jobs


JOB_BUILDERS: dict[str, Callable[[Election, dict], list[Job]]] = {
    "standard": jobs_standard,
    "parlament": jobs_parlament,
    "lokalni": jobs_lokalni,
}


# ────────────────────────────────────────────────────────────────────────────
# Runner
# ────────────────────────────────────────────────────────────────────────────

def expand_bm_jobs(election: Election, body: bytes, j: Job) -> list[Job]:
    """After downloading a grop-level file, queue per-BM jobs based on bmUkupno."""
    n = parse_bm_ukupno(body, election.extension)
    if n <= 0:
        return []
    out: list[Job] = []
    for i in range(1, n + 1):
        bm = f"{i:03d}"
        out.append(Job(
            url=grop_url(election, j.krug, j.vrsta, j.p1, j.p2, bm),
            dest=grop_dest(election, j.krug, j.vrsta, j.p1, j.p2, bm),
        ))
    return out


def run(election: Election, concurrency: int, force: bool) -> Stats:
    sifarnik = load_sifarnik(election.sifarnik)
    builder = JOB_BUILDERS[election.kind]
    jobs = builder(election, sifarnik)
    print(f"{election.slug}: {len(jobs)} top-level jobs queued", flush=True)

    stats = Stats()

    # Phase 1: top-level downloads (zup, grop, etc.). Collect bm expansions.
    bm_followup: list[Job] = []
    bm_followup_lock = threading.Lock()

    def worker(j: Job) -> None:
        body = download_one(j.url, j.dest, force, stats)
        if body and j.expand_bms:
            extra = expand_bm_jobs(election, body, j)
            with bm_followup_lock:
                bm_followup.extend(extra)

    last_report = time.monotonic()
    with ThreadPoolExecutor(max_workers=concurrency) as ex:
        futures = [ex.submit(worker, j) for j in jobs]
        for i, f in enumerate(as_completed(futures), 1):
            f.result()
            now = time.monotonic()
            if now - last_report > 5:
                print(f"  [phase 1] {i}/{len(futures)}  {stats}", flush=True)
                last_report = now

    print(f"phase 1 done: {stats}", flush=True)
    print(f"phase 2: {len(bm_followup)} BM files", flush=True)

    # Phase 2: BM downloads.
    with ThreadPoolExecutor(max_workers=concurrency) as ex:
        futures = [ex.submit(download_one, j.url, j.dest, force, stats) for j in bm_followup]
        for i, f in enumerate(as_completed(futures), 1):
            f.result()
            now = time.monotonic()
            if now - last_report > 5:
                print(f"  [phase 2] {i}/{len(futures)}  {stats}", flush=True)
                last_report = now

    print(f"phase 2 done: {stats}", flush=True)
    return stats


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("election", nargs="?", help="election slug (see --list)")
    p.add_argument("--list", action="store_true", help="list known elections and exit")
    p.add_argument("--concurrency", "-j", type=int, default=12)
    p.add_argument("--force", action="store_true", help="redownload existing files")
    p.add_argument("--dry-run", action="store_true", help="print job count and exit")
    args = p.parse_args(argv)

    if args.list:
        for slug, e in ELECTIONS.items():
            print(f"  {slug:24s} {e.data_path}  rounds={list(e.rounds)}  kind={e.kind}")
        return 0

    if not args.election or args.election not in ELECTIONS:
        p.error("election required (use --list)")

    election = ELECTIONS[args.election]

    if args.dry_run:
        sif = load_sifarnik(election.sifarnik)
        jobs = JOB_BUILDERS[election.kind](election, sif)
        print(f"{election.slug}: {len(jobs)} top-level jobs (BM expansion happens at runtime)")
        return 0

    stats = run(election, args.concurrency, args.force)
    print(f"DONE  {election.slug}  {stats}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
