# Mirror povijesnih ciklusa — bilješke i verifikacija (S1)

*Session S1 iz `PLAN_POBOLJSANJA.md`, dovršeno 2026-07-20.*

Dodani ciklusi (JSON, isti format kao 2024/2025):
`parlament-2020`, `predsjednik-2019`, `lokalni-2021`, `euparlament-2019`.

## Statistika mirrora

| Ciklus | Rezultat-datoteka u bazi | Napomena |
|---|---:|---|
| parlament-2020 | 7.300 | |
| predsjednik-2019 | 14.174 | oba kruga |
| euparlament-2019 | 7.072 | |
| lokalni-2021 | 39.573 | najveći ciklus; mirror `ok=13.317 skipped=26.256 404=2.081 failed=0` u završnom prolazu |

Ukupno nakon rebuilda: **137.888 redaka `rezultat`**, 1.142.434 `rezultat_lista`,
8.173.039 `rezultat_kandidat`; baza ~1,06 GiB. `build_index.py`: `files indexed:
137.886, errors: 0`.

## Otkrivene zamke (URL uzorci)

- **`p1` je troznamenkast za parlamentarne izbore**: `r_02_001_0000_000.json`
  radi, `r_02_01_0000_000.json` vraća 404. Vrijedi i za povijesne cikluse.
- DAO JS po ciklusu (`app/dao/{vrsta}/{slug}-dao.js` na izbori.hr) je izvor
  istine za `vrsta` kodove i logiku `p1/p2/p3`; kopije u `raw_dao/`.
- Popis svih ciklusa arhive: router stanja u `arhiva-izbora/app.js`.

## 404-ovi su serverski, ne naši

Provjereno pojedinačno na uzorcima — arhiva mjestimično prijavljuje više
biračkih mjesta (`bmUkupno`) nego što ima objavljenih datoteka:

- **Zadar (predsjednik-2019)**: `bmUkupno = 84`, datoteke 072–084 ne postoje na
  serveru (neobjavljena posebna biračka mjesta).
- **Tounj (euparlament-2019)**: agregat postoji, per-BM datoteke nikad nisu
  objavljene.
- **lokalni-2021**: 2.081 404-ova od 36.376 traženih BM datoteka.

Zaključak: rupe su na strani DIP-a. Mirror ih bilježi i nastavlja; nije potrebno
ponovno pokretanje.

## Verifikacija protiv službenih rezultata

Sve brojke izračunate SQL upitima nad `data/izbori.sqlite`.

### parlament-2020 — ✅ prolazi

| Provjera | Baza | Službeno | Ishod |
|---|---:|---:|:---:|
| HDZ-vodene liste, mandati (48 + 11 HDZ-HSLS + 7 HDZ-HDS) | **66** | 66 | ✅ |
| Restart (SDP-vodene liste), mandati (29 + 8 + 4) | **41** | 41 | ✅ |
| Mandati u IJ 1–10 | **140** | 140 | ✅ |
| HDZ (samostalna lista) glasovi / % | 435.336 / 26,12 % | ~26 % | ✅ |

D'Hondt raspodjela u bazi reproducira službeni ishod za oba saborska ciklusa.

### predsjednik-2019, krug 2 — ✅ prolazi

| Kandidat | Glasovi | Izračunati % | Službeno | Ishod |
|---|---:|---:|---:|:---:|
| Zoran Milanović | 1.034.170 | 52,66 % | ~52,7 % | ✅ |
| Kolinda Grabar-Kitarović | 929.707 | 47,34 % | ~47,3 % | ✅ |

### euparlament-2019 — ✅ prolazi

| Lista | Glasovi | % | Službeno | Ishod |
|---|---:|---:|---:|:---:|
| HDZ | 244.076 | 22,72 % | 22,7 % | ✅ |
| SDP | 200.976 | 18,71 % | 18,7 % | ✅ |

### ⚠️ Otvoreno odstupanje — odaziv parlament-2020

Baza (RH agregat): `biraci_ukupno = 3.672.555`, `biraci_glasovalo = 1.706.696`
→ **46,47 %**. Javno se najčešće navodi **46,9 %**.

Razlika je ~0,4 postotna boda i **nije razriješena**. Moguća objašnjenja koja
treba provjeriti prije korištenja odaziva 2020 u analizama: različit tretman
biračkih mjesta u inozemstvu, naknadne korekcije popisa birača, ili različit
nazivnik (ukupno upisani vs. „aktivni" birači). Do razrješenja: **odaziv za
2020. citirati kao vrijednost iz DIP arhive uz napomenu**, ne kao konačnu.

## Poznata ograničenja podataka

- `rezultat_lista.posto` je **NULL** za predsjednik-2019 (postotke treba
  računati iz glasova; isto provjeriti i za druge stare cikluse).
- `rezultat_lista.mandata` je **NULL** za euparlament-2019 (mandati EU
  zastupnika nisu u izvornom JSON-u; dodatno, SDP-ov 4. mandat 2019. aktiviran
  je tek po Brexitu, pa mandate za EU cikluse ne treba rekonstruirati iz ovih
  podataka bez vanjskog izvora).
- Šifre gradova/općina mijenjaju se kroz cikluse — za usporedbe kroz vrijeme
  spajati po (županija, naziv) uz ručne iznimke (vidi plan, S4).

## Sljedeći korak

S2 iz `PLAN_POBOLJSANJA.md` — CSV ciklusi 2003–2017 **plus mirror
`izabrani/*.pdf` i `kandidatura/*.pdf`** za sve cikluse (jedini izvor
kandidacijskih lista i službenih dobitnika mandata; za njih ne postoji
JSON/CSV).
