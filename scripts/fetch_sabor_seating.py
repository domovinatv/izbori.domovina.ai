#!/usr/bin/env python3
"""Fetch the current Sabor seating data and save a normalized snapshot.

Source: https://www.sabor.hr/api/interaktivna-sabornica-new?_format=json
This is the JSON API powering the official seating chart at
https://www.sabor.hr/interaktivni-raspored-zastupnika-u-hrvatskome-saboru/

Each seat lists the currently-seated MP with name, party (`stranka`),
parliamentary club, and a `manjine` flag for minority MPs. People who
declined their D'Hondt mandate (cabinet ministers, MEPs, mayors, etc.) do
not appear; a substitute (zamjenik) takes their seat instead.

Output: sifarnici/sabor_2024_seating.json
    {
      "fetched_at": ISO timestamp,
      "source_url": …,
      "mps": [{seat, surname, firstname, party, klub, manjine, tokens}, …],
      "name_token_sets": [[<sorted tokens>], …]   # primary matching key
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

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "sifarnici" / "sabor_2024_seating.json"
URL = "https://www.sabor.hr/api/interaktivna-sabornica-new?_format=json"


def normalize_token(s: str) -> str:
    """Croatian-aware: drop accents (NFD), Đ→D, upper, strip hyphens."""
    if not s:
        return ""
    s = s.replace("Đ", "D").replace("đ", "d")
    n = unicodedata.normalize("NFD", s)
    return "".join(c for c in n if unicodedata.category(c) != "Mn").upper().strip().strip("-")


def name_tokens(*parts: str) -> list[str]:
    """Split each part on whitespace + hyphens, normalize, keep tokens ≥3 chars."""
    out: list[str] = []
    for p in parts:
        for piece in re.split(r"[\s\-]+", p or ""):
            n = normalize_token(piece)
            if len(n) >= 3:
                out.append(n)
    return out


def slug_tokens(profile_url: str) -> list[str]:
    """Tokens extracted from the MP's profile-URL slug — used as a fallback
    in case the API's `ime` field is truncated. The slug format is
        /hr/zastupnici/<surname-words-firstname-words>-<saziv>-saziv[-N]
    e.g. 'ban-vlahek-boska-11-saziv' for Boška Ban Vlahek (whose `ime`
    field reads incorrectly 'Ban, Boška')."""
    if not profile_url:
        return []
    slug = profile_url.rstrip("/").split("/")[-1]
    # Strip trailing '-NN-saziv' (saziv number) and Drupal duplicate suffix '-N'.
    slug = re.sub(r"-\d+-saziv(?:-\d+)?$", "", slug)
    parts = slug.split("-")
    return [normalize_token(p) for p in parts if len(normalize_token(p)) >= 3]


def main() -> int:
    print(f"Fetching {URL} …")
    req = urllib.request.Request(
        URL,
        headers={
            "User-Agent": "izbori-archive-mirror/0.1",
            "Accept": "application/json",
        },
    )
    blob = urllib.request.urlopen(req, timeout=30).read()
    data = json.loads(blob.decode("utf-8"))

    seats = data.get("sjedeca_mjesta") or []
    mps: list[dict] = []
    for seat_obj in seats:
        z = seat_obj.get("zastupnik") or {}
        ime = (z.get("ime") or "").strip()
        if "," not in ime:
            continue
        # API formats names as "Surname, Firstname" — including multi-word
        # surnames like "Hajdaš Dončić, Siniša" or "Selak Raspudić, Marija".
        surname, firstname = (s.strip() for s in ime.split(",", 1))
        if not surname or not firstname:
            continue
        # Union with profile-URL tokens to recover any missing surname pieces
        # the `ime` field truncates (e.g. Boška Ban Vlahek appears as
        # "Ban, Boška" but profile slug is "ban-vlahek-boska").
        profile = (z.get("profile") or "").strip()
        toks = sorted(set(name_tokens(surname, firstname)) | set(slug_tokens(profile)))
        if len(toks) < 2:
            continue
        mps.append({
            "seat": str(seat_obj.get("seat") or ""),
            "surname": surname,
            "firstname": firstname,
            "party": (z.get("stranka") or "").strip(),
            "klub": (z.get("klub") or "").strip(),
            "manjine": bool(z.get("manjine")),
            "profile": profile,
            "tokens": toks,
        })

    if not mps:
        print("ERROR: no MPs parsed from JSON — payload changed?", file=sys.stderr)
        return 1

    name_token_sets = sorted(
        {frozenset(m["tokens"]) for m in mps},
        key=lambda fs: sorted(fs),
    )

    payload = {
        "fetched_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source_url": URL,
        "mps": sorted(mps, key=lambda m: (m["surname"], m["firstname"])),
        "name_token_sets": [sorted(s) for s in name_token_sets],
    }
    OUT.parent.mkdir(exist_ok=True, parents=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
                   encoding="utf-8")
    print(f"Saved {OUT.relative_to(ROOT)}  "
          f"({len(mps)} MPs, {len(name_token_sets)} unique name token sets)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
