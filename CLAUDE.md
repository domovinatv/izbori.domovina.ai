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

# Izborni simulator (web) — export pa obavezno regresijski test
python3 scripts/export_simulator.py --check
node web/lib/sim/verify.mjs     # 109 provjera, mora proći prije diranja UI-a
cd web && npm run dev           # http://localhost:3000/simulator

# Zagreb po mjesnim odborima — spoj DIP-a i data.zagreb.hr
python3 scripts/export_zagreb_mo.py --check   # 218/218 imena mora proći
python3 scripts/export_zagreb_mo.py           # izlazi u data/zagreb/
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
- Mirrorani su i povijesni JSON ciklusi: `parlament-2020`, `predsjednik-2019`, `lokalni-2021`, `euparlament-2019`. D'Hondt raspodjela mandata i sintetički RH-agregat rade za oba saborska ciklusa (2020 i 2024). Detalji i verifikacija: `docs/mirror_povijest_notes.md`.
- Repo je javan na `github.com/domovinatv/izbori.domovina.ai`. Pretpostavi da se commit poruke i kod mogu javno čitati.
- **Izborni simulator** (`/simulator`) je jedina iznimka od pravila „svi izračuni u Pythonu": matematika je u `web/lib/sim/` jer interaktivni recompute ne može ići kroz build. Iznimka vrijedi samo za taj direktorij i uvjetovana je `node web/lib/sim/verify.mjs` koji dokazuje da engine reproducira službeni rezultat 2024. i 2020. mandat za mandat.
- **Zagreb i mjesna samouprava**: za Grad Zagreb `bmNaziv` u DIP arhivi *jest* naziv mjesnog odbora, pa se rezultati agregiraju na 218 MO i 17 gradskih četvrti (`scripts/export_zagreb_mo.py`, konfiguracija i ispravke imena u `sifarnici/zagreb_mjesna_samouprava.json`). Zagrebačka biračka mjesta za cikluse od 2024. leže pod `p2=1333` iako `r_*_21_1333_000` vraća 404 — `mirror.py` zato bmUkupno čita iz županijske datoteke.
- Pravna činjenična osnova izbornog sustava (članci ZIZHS-a, odluke Ustavnog suda, provjerene brojke, popis nepotvrđenog) je u `docs/izborni_sustav_cinjenice.md`. Nijedna brojka koja ondje nije potvrđena ne smije u UI.
- „Propali glasovi" imaju **tri** različite točne definicije koje daju 194.147 / 236.881 / 270.135 za 2024. Uvijek navesti koju koristiš — vidi `docs/izborni_sustav_cinjenice.md` §9.

## Šira dokumentacija

`README.md` — struktura URL-ova izbornika, šifre `vrsta`/`p1`/`p2`/`p3`, primjeri SQL upita.
