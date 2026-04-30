# izbori.domovina.ai

Lokalna kopija javnih izbornih podataka iz arhive izbora RH (DIP), s indeksom u SQLite (FTS5) i Streamlit aplikacijom za pretragu i analizu.

## Najčešće naredbe

```bash
# Mirror jednog ciklusa (resumable, concurrent)
python3 scripts/mirror.py predsjednik-2024 -j 16

# Snapshot trenutnog Saborskog rasporeda (za u_saboru flag)
python3 scripts/fetch_sabor_seating.py

# (Re)build SQLite indeksa — uvijek nakon promjene scripts/* ili novog mirrora
python3 scripts/build_index.py

# Aplikacija
streamlit run app.py            # http://localhost:8501
```

## Konvencije

- Commit poruke: konvencionalni commits, engleski (`fix:`, `feat:`, `docs:`, `refactor:`).
- UI / korisničke poruke u Streamlitu: hrvatski.
- Kod, komentari, docstringovi: engleski.
- Python 3.10+, type hints na javnim funkcijama; izbjegavaj suvišne komentare.

## Što treba znati

- `data/` je `.gitignore`-an (~600 MiB rezultata + ~465 MiB SQLite). Tko klonira repo mora ponovo mirrorati.
- Promjene u `scripts/fetch_sabor_seating.py` ili `scripts/build_index.py` zahtijevaju **rebuild** (`python3 scripts/build_index.py`) jer se `u_saboru` i `mandata` postavljaju u tom koraku, ne pri mirroriranju.
- Saborski raspored se izvlači iz JSON API-ja `https://www.sabor.hr/api/interaktivna-sabornica-new?_format=json`. Stari PDF parser je deprekiran (`pdfplumber` uklonjen iz `requirements.txt`).
- Manjinski zastupnici sjede u `rezultat_lista` (lista *je* kandidat), ne u `rezultat_kandidat`. Kolona `u_saboru` je na `rezultat_kandidat` pa ne pokriva manjine — to je dizajnerska odluka, ne bug.
- Repo je javan na `github.com/domovinatv/izbori.domovina.ai`. Pretpostavi da se commit poruke i kod mogu javno čitati.

## Šira dokumentacija

`README.md` — struktura URL-ova izbornika, šifre `vrsta`/`p1`/`p2`/`p3`, primjeri SQL upita.
