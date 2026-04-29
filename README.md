# izbori.domovina.ai

Lokalna kopija javnih podataka iz arhive izbora Republike Hrvatske
(`https://www.izbori.hr/arhiva-izbora/`) za offline pretragu i analizu.

Frontend te arhive je AngularJS SPA koji ne zove pravi API — sve rezultate
poslužuje kao statične JSON i CSV datoteke pod `arhiva-izbora/data/`. Ove
skripte hodaju zemljopisnom strukturom (RH → županija → grad/općina →
biračko mjesto) i mirroriraju te datoteke lokalno, a zatim ih indeksiraju u
SQLite bazu s FTS5 pretragom.

## Što se preuzima

| Slug             | Putanja                | Krugovi | Format |
|------------------|------------------------|---------|--------|
| `predsjednik-2024` | `predsjednik/2024`    | 1, 2    | JSON   |
| `parlament-2024`   | `parlament/2024`      | 1       | JSON   |
| `lokalni-2025`     | `lokalni/2025`        | 1, 2    | JSON   |
| `euparlament-2024` | `euparlament/2024`    | 1       | JSON   |
| `referendum-2013`  | `referendum/2013`     | 1       | CSV    |

Strukture URL-a:

```
data/{election}/{year}/rezultati/{krug}/r_{vrsta}_{p1}_{p2}_{p3}.{json|csv}
```

- `vrsta` — kod rezultata (01 predsjednik, 02 sabor, 14 EU, 81 referendum, 06 žup. skupština, 08 GO vijeće, 15 župan, 17 gradonačelnik …)
- `p1` — županija `01..21`, ili izborna jedinica `001..010`, ili `22` za inozemstvo, ili `13/23/33/43/53/63` za saborsku manjinsku listu (kombinirano s `p2=012`)
- `p2` — `0000` (agregat), ili šifra grada/općine, ili šifra zemlje za inozemstvo
- `p3` — `000` (agregat), ili `001..N` po biračkom mjestu

Šifrarnici (županije, gradovi/općine, izborne jedinice, manjine, inozemstvo)
ne postoje kao zasebni JSON — tvrdo su kodirani u DAO JS datotekama
arhive. Ekstrahiraju se jednom u `sifarnici/`.

## Korištenje

```bash
# 1) Šifrarnici iz DAO JS-a (jednom)
python3 scripts/extract_sifarnici.py

# 2) Mirror jednog izbora — sve datoteke padnu u data/{slug}/
python3 scripts/mirror.py predsjednik-2024 -j 16
python3 scripts/mirror.py euparlament-2024
python3 scripts/mirror.py parlament-2024
python3 scripts/mirror.py lokalni-2025
python3 scripts/mirror.py referendum-2013
# resumable: postojeće datoteke se preskaču; --force za ponovni download

# 3) Indeks
python3 scripts/build_index.py     # gradi data/izbori.sqlite
```

`mirror.py` prvo skida `RH/zup/grop` razinu, iz svakog odgovora čita
`bmUkupno`, i u drugoj fazi pokupi sva biračka mjesta. Tipičan `predsjednik-2024`
generira ~14 000 datoteka i ~600 MiB; `lokalni-2025` najviše (puno vrsti × krugovi).

## Pretraga

`data/izbori.sqlite` ima tri glavne tablice + FTS5:

- **`rezultat`** — jedan red po rezultat-datoteci (RH/zup/grop/BM razina)
- **`rezultat_lista`** — top-level liste (kandidati u predsjedničkim, stranke/koalicije u parl./lok./EU)
- **`rezultat_kandidat`** — pojedinačni kandidati unutar liste (parl./EU/lok.)
- **`rezultat_kandidat_fts`**, **`rezultat_lista_fts`** — FTS5 indeksi imena

Primjeri:

```sql
-- Sva mjesta gdje se pojavljuje kandidat
SELECT r.election, r.zup_naziv, r.grop_naziv, r.bm_naziv,
       k.naziv, k.glasova, k.posto
FROM rezultat_kandidat_fts fts
JOIN rezultat_kandidat k ON k.id = fts.rowid
JOIN rezultat_lista l ON l.id = k.lista_id
JOIN rezultat r ON r.id = l.rezultat_id
WHERE rezultat_kandidat_fts MATCH 'plenković'
ORDER BY k.glasova DESC LIMIT 20;

-- Rezultat predsjedničkih u jednoj općini
SELECT l.rbr, l.naziv, l.glasova, l.posto
FROM rezultat r JOIN rezultat_lista l ON l.rezultat_id = r.id
WHERE r.election = 'predsjednik-2024'
  AND r.krug = 1 AND r.p1 = '01' AND r.p2 = '5410' AND r.p3 = '000'
ORDER BY l.rbr;

-- Stranka pretraga (lokalni 2025)
SELECT r.zup_naziv, r.grop_naziv, l.naziv, l.glasova, l.posto
FROM rezultat_lista_fts fts
JOIN rezultat_lista l ON l.id = fts.rowid
JOIN rezultat r ON r.id = l.rezultat_id
WHERE rezultat_lista_fts MATCH 'možemo'
  AND r.election = 'lokalni-2025' AND r.level = 'grop'
ORDER BY l.glasova DESC;
```

Razine (`level`):

| Razina       | p1   | p2     | p3   | Što je |
|--------------|------|--------|------|--------|
| `rh`         | `00` | `0000` | `000`| ukupno RH |
| `zup`        | `01..22` | `0000` | `000`| županija (22 = inozemstvo) |
| `grop`       | `01..21` | šifra GO | `000`| grad/općina |
| `bm`         | …    | …      | `001..N` | biračko mjesto |
| `ino_zup`    | `22` | šifra zemlje | `000`| inozemstvo, država |
| `ino_zup_bm` | `22` | šifra zemlje | `001..N` | inozemstvo, BM |

## Struktura repozitorija

```
sifarnici/         JSON šifrarnici izvučeni iz DAO JS datoteka
raw_dao/           izvorni DAO JS-i (samo radi audita)
scripts/
  extract_sifarnici.py
  mirror.py        downloader (concurrent, resumable)
  build_index.py   gradi izbori.sqlite
data/              gitignored — preuzeti rezultati i SQLite baza
```

## Napomene

- Podaci su javni — DIP ih objavljuje preko iste statičke arhive iz koje
  ova skripta čita. Koristi `User-Agent: izbori-archive-mirror/0.1` i
  trenutni concurrency limit (12–16) iz pristojnosti.
- Stranica vraća `404` za biračka mjesta koja su naknadno spojena/preimenovana —
  to je očekivano i ne znači grešku (stupac `404` u izvještaju mirrora).
- Šifre građe (`zup`, `grop`, `vrsta`, `manjina`) se s vremenom mijenjaju (npr. nove
  općine, nove vrste manjinskih izbora). Šifrarnici za svaki ciklus izbora su
  zasebne datoteke u `sifarnici/`.
