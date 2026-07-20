# Verifikacija osoba — „Najveći gubitnici ↔ najveći dobitnici" (parlament-2024)

*Generirano 2026-07-20. Svaka osoba prikazana u sekciji `#gubitnici-dobitnici`
(60 parova = 120 osoba) provjerena je pojedinačno protiv tri neovisna izvora:*

1. **Mirrorani DIP JSON** — `source_file` iz lokalnog indeksa
   (`data/parlament-2024/…`): ime, preferencijalni glasovi, redni broj na
   listi, puni naziv liste.
2. **Službeni DIP PDF** („Izvješće o provedenim izborima za zastupnike u
   Hrvatski sabor 2024.", jedini cjeloviti DIP izvor; `scripts/grep_pdf.py`):
   ime pronađeno na navedenoj stranici i broj glasova neposredno uz ime.
3. **Sabornica sabor.hr** (`sifarnici/sabor_2024_seating.json`, snimka
   2026-04-30): sjedi / ne sjedi u aktualnom sazivu + stvarna stranka
   zastupnika (DIP arhiva ne bilježi stranačku pripadnost pojedinca; polje
   `stranka` u exportima je samo vodeća stranka koalicijske liste).

**Rezultat: 120/120 OK, 0 ispravaka.**

Agregati (izračunati u `scripts/export_web.py::export_fairness`, pokriveni
`--check` provjerama): gubitnici 173.594 glasova
(7,956 % izašlih, 4,927 % biračkog tijela) → 0 mandata;
dobitnici 50.282 glasova (2,304 % izašlih,
1,427 % biračkog tijela) → 60 mandata =
39,74 % Sabora; ukupni omjer ×3,45; prelom nakon
60. para (1.620 > 1.569 glasova). Denominatori:
3.523.270 upisanih birača i 2.181.944 izašlih (IJ 001–011).

## Gubitnici (bez D'Hondtova mandata i bez mjesta u sazivu)

| # | Osoba | Lista (kako je prijavljena DIP-u) | IJ | Pref. glasova | Izvor (mirror DIP JSON · službeni PDF) | Stranka (sabor.hr) | Status |
|---:|---|---|---:|---:|---|---|---|
| 1 | Zlatko Hasanbegović | DP, PRAVO I PRAVDA, BLOK … | 1 | 6.163 | `r_02_001_0000_000.json` · PDF str. 5 | — | OK |
| 2 | Ante Šošić | HDZ, HSLS, HDS, HNS, HSU | 10 | 5.604 | `r_02_010_0000_000.json` · PDF str. 91 | — | OK |
| 3 | Radimir Čačić | SDP, CENTAR, HSS, "DO i SIP" … | 3 | 4.960 | `r_02_003_0000_000.json` · PDF str. 23 | — | OK |
| 4 | Siniša Jenkač | HDZ, HSLS, HDS, HNS, HSU | 3 | 4.935 | `r_02_003_0000_000.json` · PDF str. 24 | — | OK |
| 5 | Davor Dretar | DP, PRAVO I PRAVDA, DHSS, ZELENA LISTA | 3 | 4.703 | `r_02_003_0000_000.json` · PDF str. 25 | — | OK |
| 6 | Lovro Lukavečki | SDP, CENTAR, HSS, "DO i SIP" … | 3 | 4.657 | `r_02_003_0000_000.json` · PDF str. 23 | — | OK |
| 7 | Željko Posavec | SDP, CENTAR, HSS, "DO i SIP" … | 3 | 4.561 | `r_02_003_0000_000.json` · PDF str. 23 | — | OK |
| 8 | Marko Marušić | HDZ, HSLS, HDS, HNS, HSU | 2 | 4.336 | `r_02_002_0000_000.json` · PDF str. 14 | — | OK |
| 9 | Enio Meštrović | RIČARD NEZAVISNI | 10 | 4.326 | `r_02_010_0000_000.json` · PDF str. 93 | — | OK |
| 10 | Darijo Vasilić | IDS, PGS, UNIJA, ISU - PIP … | 8 | 4.033 | `r_02_008_0000_000.json` · PDF str. 72 | — | OK |
| 11 | Karolina Vidović Krišto | OIP | 1 | 3.785 | `r_02_001_0000_000.json` · PDF str. 6 | — | OK |
| 12 | Samir Haj Barakat | SDP, CENTAR, HSS, "DO i SIP" … | 4 | 3.751 | `r_02_004_0000_000.json` · PDF str. 34 | — | OK |
| 13 | Damir Vanđelić | FOKUS, REPUBLIKA | 1 | 3.731 | `r_02_001_0000_000.json` · PDF str. 6 | — | OK |
| 14 | Katarina Peović | RF | 8 | 3.545 | `r_02_008_0000_000.json` · PDF str. 73 | — | OK |
| 15 | Željko Burić | HDZ, HSLS, HDS, HNS, HSU | 9 | 3.473 | `r_02_009_0000_000.json` · PDF str. 80 | — | OK |
| 16 | Vojko Obersnel | SDP, CENTAR, HSS, "DO i SIP", GLAS | 7 | 3.455 | `r_02_007_0000_000.json` · PDF str. 62 | — | OK |
| 17 | Davor Nađi | FOKUS, REPUBLIKA | 6 | 3.387 | `r_02_006_0000_000.json` · PDF str. 53 | — | OK |
| 18 | Josip Samardžić | HDZ, HSLS, HDS, HNS, HSU | 5 | 3.359 | `r_02_005_0000_000.json` · PDF str. 42 | — | OK |
| 19 | Žarko Tušek | HDZ, HSLS, HDS, HNS, HSU | 3 | 3.325 | `r_02_003_0000_000.json` · PDF str. 24 | — | OK |
| 20 | Andreja Marić | SDP, CENTAR, HSS, "DO i SIP" … | 3 | 3.272 | `r_02_003_0000_000.json` · PDF str. 23 | — | OK |
| 21 | Bojan Glavašević | SDP, CENTAR, HSS, "DO i SIP" … | 2 | 3.264 | `r_02_002_0000_000.json` · PDF str. 15 | — | OK |
| 22 | Branko Grčić | SDP, CENTAR, HSS, "DO i SIP" … | 9 | 3.166 | `r_02_009_0000_000.json` · PDF str. 80 | — | OK |
| 23 | Branka Bakšić-Mitić | SDP, CENTAR, HSS, "DO i SIP", GLAS | 7 | 3.099 | `r_02_007_0000_000.json` · PDF str. 62 | — | OK |
| 24 | Ivan Vilibor Sinčić | DP, PRAVO I PRAVDA | 8 | 3.085 | `r_02_008_0000_000.json` · PDF str. 73 | — | OK |
| 25 | Alka Vuica | SDP, CENTAR, HSS, "DO i SIP" … | 6 | 3.029 | `r_02_006_0000_000.json` · PDF str. 52 | — | OK |
| 26 | Josip Šarić | HDZ, HSLS, HDS, HNS, HSU | 5 | 2.943 | `r_02_005_0000_000.json` · PDF str. 42 | — | OK |
| 27 | Mate Omazić | HDZ | 11 | 2.892 | `r_02_011_0000_000.json` · PDF str. 101 | — | OK |
| 28 | Viktor Šimunić | NEOVISNA LISTA -  VIKTOR ŠIMUNIĆ | 3 | 2.793 | `r_02_003_0000_000.json` · PDF str. 25 | — | OK |
| 29 | Petra Škrobot | FOKUS, REPUBLIKA | 6 | 2.768 | `r_02_006_0000_000.json` · PDF str. 53 | — | OK |
| 30 | Mato Čičak | HDZ, HSLS, HDS, HNS, HSU | 1 | 2.576 | `r_02_001_0000_000.json` · PDF str. 4 | — | OK |
| 31 | Emil Daus | IDS, PGS, UNIJA, ISU - PIP … | 8 | 2.572 | `r_02_008_0000_000.json` · PDF str. 72 | — | OK |
| 32 | Tomislav Okroša | HDZ, HSLS, HDS, HNS, HSU | 2 | 2.450 | `r_02_002_0000_000.json` · PDF str. 14 | — | OK |
| 33 | Marko Primorac | HDZ, HSLS, HDS, HNS, HSU | 6 | 2.426 | `r_02_006_0000_000.json` · PDF str. 51 | — | OK |
| 34 | Nikola Kajkić | MOST, HRVATSKI SUVERENISTI, HKS, NLM | 5 | 2.424 | `r_02_005_0000_000.json` · PDF str. 44 | — | OK |
| 35 | Ivan Lovrinović | DP, PRAVO I PRAVDA, DHSS, ZELENA LISTA … | 6 | 2.370 | `r_02_006_0000_000.json` · PDF str. 53 | — | OK |
| 36 | Valter Glavičić | IDS, PGS, UNIJA, ISU - PIP … | 8 | 2.279 | `r_02_008_0000_000.json` · PDF str. 72 | — | OK |
| 37 | Alemka Markotić | HDZ, HSLS, HDS, HNS, HSU | 1 | 2.246 | `r_02_001_0000_000.json` · PDF str. 4 | — | OK |
| 38 | Damir Markuš | DP, PRAVO I PRAVDA, DHSS, ZELENA LISTA | 7 | 2.193 | `r_02_007_0000_000.json` · PDF str. 62 | — | OK |
| 39 | Željko Jovanović | SDP, CENTAR, HSS, "DO i SIP", GLAS | 8 | 2.173 | `r_02_008_0000_000.json` · PDF str. 71 | — | OK |
| 40 | Srećko Sladoljev | DP, PRAVO I PRAVDA | 10 | 2.145 | `r_02_010_0000_000.json` · PDF str. 93 | — | OK |
| 41 | Đuro Capor | MOŽEMO! - POLITIČKA PLATFORMA … | 10 | 2.132 | `r_02_010_0000_000.json` · PDF str. 93 | — | OK |
| 42 | Jakov Vetma | HDZ, HSLS, HDS, HNS, HSU | 9 | 2.083 | `r_02_009_0000_000.json` · PDF str. 80 | — | OK |
| 43 | Branko Hrg | HDZ, HSLS, HDS, HNS, HSU | 2 | 2.077 | `r_02_002_0000_000.json` · PDF str. 14 | — | OK |
| 44 | Javor Bojan Leš | HDZ, HSLS, HDS, HNS, HSU | 2 | 2.073 | `r_02_002_0000_000.json` · PDF str. 14 | — | OK |
| 45 | Željko Sačić | MOST, HRVATSKI SUVERENISTI, HKS, NLM | 3 | 1.970 | `r_02_003_0000_000.json` · PDF str. 25 | — | OK |
| 46 | Željko Pervan | DP, PRAVO I PRAVDA, DHSS, ZELENA LISTA … | 6 | 1.960 | `r_02_006_0000_000.json` · PDF str. 53 | — | OK |
| 47 | Katarina Kruhonja | MOŽEMO! - POLITIČKA PLATFORMA … | 4 | 1.942 | `r_02_004_0000_000.json` · PDF str. 35 | — | OK |
| 48 | Tamara Visković | MOŽEMO! - POLITIČKA PLATFORMA … | 10 | 1.899 | `r_02_010_0000_000.json` · PDF str. 93 | — | OK |
| 49 | Krešimir Kašuba | HDZ, HSLS, HDS, HNS, HSU | 4 | 1.890 | `r_02_004_0000_000.json` · PDF str. 33 | — | OK |
| 50 | Zvonimir Novosel | SDP, CENTAR, HSS, "DO i SIP" … | 6 | 1.878 | `r_02_006_0000_000.json` · PDF str. 51 | — | OK |
| 51 | Petar Šimić | HDZ, HSLS, HDS, HNS, HSU | 5 | 1.865 | `r_02_005_0000_000.json` · PDF str. 42 | — | OK |
| 52 | Ratimir Ljubić | HDZ, HSLS, HDS, HNS, HSU | 4 | 1.836 | `r_02_004_0000_000.json` · PDF str. 33 | — | OK |
| 53 | Maja Šintić | MOŽEMO! - POLITIČKA PLATFORMA | 9 | 1.825 | `r_02_009_0000_000.json` · PDF str. 82 | — | OK |
| 54 | Matko Burić | SDP, CENTAR, HSS, "DO i SIP" … | 10 | 1.824 | `r_02_010_0000_000.json` · PDF str. 92 | — | OK |
| 55 | Josip Skočibušić | MOST, HRVATSKI SUVERENISTI, HKS, NLM | 4 | 1.798 | `r_02_004_0000_000.json` · PDF str. 34 | — | OK |
| 56 | Ivan Pernar | STRANKA IVANA PERNARA | 6 | 1.699 | `r_02_006_0000_000.json` · PDF str. 54 | — | OK |
| 57 | Sanja Borovec | HDZ, HSLS, HDS, HNS, HSU | 3 | 1.683 | `r_02_003_0000_000.json` · PDF str. 24 | — | OK |
| 58 | Vlatka Martinović | HDZ | 11 | 1.653 | `r_02_011_0000_000.json` · PDF str. 101 | — | OK |
| 59 | Franjo Poljak | HDZ, HSLS, HDS, HNS, HSU | 2 | 1.633 | `r_02_002_0000_000.json` · PDF str. 14 | — | OK |
| 60 | Toni Štimac | SDP, CENTAR, HSS, "DO i SIP", GLAS | 7 | 1.620 | `r_02_007_0000_000.json` · PDF str. 62 | — | OK |

## Dobitnici (sjede u Saboru, upareni uzlazno po glasovima)

| # | Osoba | Lista (kako je prijavljena DIP-u) | IJ | Pref. glasova | Izvor (mirror DIP JSON · službeni PDF) | Stranka (sabor.hr) | Status |
|---:|---|---|---:|---:|---|---|---|
| 1 | Darko Vuletić | SDP, CENTAR, HSS, "DO i SIP" … | 6 | 176 | `r_02_006_0000_000.json` · PDF str. 52 | HSS | OK |
| 2 | Veselko Gabričević | HDZ, HSLS, HDS, HNS, HSU | 7 | 183 | `r_02_007_0000_000.json` · PDF str. 61, 69 | HSU | OK |
| 3 | Marin Živković | MOŽEMO! - POLITIČKA PLATFORMA | 6 | 185 | `r_02_006_0000_000.json` · PDF str. 52 | Možemo! | OK |
| 4 | Ljubica Lukačić | HDZ, HSLS, HDS, HNS, HSU | 1 | 191 | `r_02_001_0000_000.json` · PDF str. 4 | HDZ | OK |
| 5 | Ivica Baksa | NPS | 3 | 242 | `r_02_003_0000_000.json` · PDF str. 24 | NPS | OK |
| 6 | Krešimir Čabaj | DP, PRAVO I PRAVDA, NEZAVISNI, DHSS … | 4 | 331 | `r_02_004_0000_000.json` · PDF str. 34 | DOMINO | OK |
| 7 | Martin Kordić | MOST, HRVATSKI SUVERENISTI, HKS, NLM | 5 | 343 | `r_02_005_0000_000.json` · PDF str. 43 | Hrvatski suverenisti | OK |
| 8 | Darko Klasić | HDZ, HSLS, HDS, HNS, HSU | 1 | 360 | `r_02_001_0000_000.json` · PDF str. 4, 12 | HSLS | OK |
| 9 | Jelena Miloš | MOŽEMO! - POLITIČKA PLATFORMA … | 2 | 380 | `r_02_002_0000_000.json` · PDF str. 16 | Možemo! | OK |
| 10 | Maksimilijan Šimrak | HDZ, HSLS, HDS, HNS, HSU | 1 | 406 | `r_02_001_0000_000.json` · PDF str. 4 | HDZ | OK |
| 11 | Maria Blažina | SDP, CENTAR, HSS, "DO i SIP", GLAS | 8 | 430 | `r_02_008_0000_000.json` · PDF str. 71 | SDP | OK |
| 12 | Marko Pavić | HDZ, HSLS, HDS, HNS, HSU | 6 | 475 | `r_02_006_0000_000.json` · PDF str. 51 | HDZ | OK |
| 13 | Ivana Ribarić Majanović | SDP, CENTAR, HSS, "DO i SIP" … | 5 | 538 | `r_02_005_0000_000.json` · PDF str. 43 | SDP | OK |
| 14 | Ana Puž Kukuljan | SDP, CENTAR, HSS, "DO i SIP", GLAS | 8 | 545 | `r_02_008_0000_000.json` · PDF str. 71, 78 | SDP | OK |
| 15 | Krunoslav Katičić | HDZ, HSLS, HDS, HNS, HSU | 2 | 547 | `r_02_002_0000_000.json` · PDF str. 14, 21 | HDZ | OK |
| 16 | Irena Dragić | SDP, CENTAR, HSS, "DO i SIP" … | 9 | 566 | `r_02_009_0000_000.json` · PDF str. 80, 89 | SDP | OK |
| 17 | Ivo Zelić | HDZ, HSLS, HDS, HNS, HSU | 4 | 604 | `r_02_004_0000_000.json` · PDF str. 33 | HDZ | OK |
| 18 | Miro Totgergeli | HDZ, HSLS, HDS, HNS, HSU | 2 | 605 | `r_02_002_0000_000.json` · PDF str. 14, 21 | HDZ | OK |
| 19 | Stipan Šašlin | HDZ, HSLS, HDS, HNS, HSU | 4 | 624 | `r_02_004_0000_000.json` · PDF str. 33 | HDZ | OK |
| 20 | Josip Borić | HDZ, HSLS, HDS, HNS, HSU | 8 | 629 | `r_02_008_0000_000.json` · PDF str. 72 | HDZ | OK |
| 21 | Željko Reiner | HDZ, HSLS, HDS, HNS, HSU | 1 | 638 | `r_02_001_0000_000.json` · PDF str. 4, 12 | HDZ | OK |
| 22 | Anita Curiš Krok | SDP, CENTAR, HSS, "DO i SIP" … | 3 | 648 | `r_02_003_0000_000.json` · PDF str. 23 | SDP | OK |
| 23 | Saša Đujić | SDP, CENTAR, HSS, "DO i SIP", GLAS | 8 | 686 | `r_02_008_0000_000.json` · PDF str. 71, 78 | SDP | OK |
| 24 | Josip Dabro | DP, PRAVO I PRAVDA | 5 | 720 | `r_02_005_0000_000.json` · PDF str. 43, 50 | DP | OK |
| 25 | Vesna Bedeković | HDZ, HSLS, HDS, HNS, HSU | 4 | 722 | `r_02_004_0000_000.json` · PDF str. 33 | HDZ | OK |
| 26 | Danijela Blažanović | HDZ, HSLS, HDS, HNS, HSU | 6 | 734 | `r_02_006_0000_000.json` · PDF str. 51 | HDZ | OK |
| 27 | Miroslav Marković | SDP, CENTAR, HSS, "DO i SIP" … | 3 | 744 | `r_02_003_0000_000.json` · PDF str. 23, 31, 76 | SDP | OK |
| 28 | Ivica Ledenko | MOST, HRVATSKI SUVERENISTI, HKS, NLM | 9 | 745 | `r_02_009_0000_000.json` · PDF str. 81 | Most | OK |
| 29 | Dubravka Lipovac Pehar | DP, PRAVO I PRAVDA | 5 | 759 | `r_02_005_0000_000.json` · PDF str. 43, 50 | DP | OK |
| 30 | Nikolina Baradić | HDZ, HSLS, HDS, HNS, HSU | 9 | 784 | `r_02_009_0000_000.json` · PDF str. 80 | HDZ | OK |
| 31 | Zdravka Bušić | HDZ, HSLS, HDS, HNS, HSU | 2 | 787 | `r_02_002_0000_000.json` · PDF str. 14 | HDZ | OK |
| 32 | Jasna Vojnić | HDZ | 11 | 823 | `r_02_011_0000_000.json` · PDF str. 101 | HDZ | OK |
| 33 | Dubravko Bilić | NPS | 3 | 832 | `r_02_003_0000_000.json` · PDF str. 24, 31 | NPS | OK |
| 34 | Ante Babić | HDZ, HSLS, HDS, HNS, HSU | 9 | 872 | `r_02_009_0000_000.json` · PDF str. 80 | HDZ | OK |
| 35 | Marijana Puljak | SDP, CENTAR, HSS, "DO i SIP" … | 1 | 876 | `r_02_001_0000_000.json` · PDF str. 4, 13 | Centar | OK |
| 36 | Boris Piližota | SDP, CENTAR, HSS, "DO i SIP" … | 4 | 901 | `r_02_004_0000_000.json` · PDF str. 33, 40 | SDP | OK |
| 37 | Ivica Mesić | DP, PRAVO I PRAVDA, DHSS, ZELENA LISTA … | 2 | 904 | `r_02_002_0000_000.json` · PDF str. 15 | DP | OK |
| 38 | Tanja Sokolić | SDP, CENTAR, HSS, "DO i SIP" … | 2 | 905 | `r_02_002_0000_000.json` · PDF str. 14, 21 | SDP | OK |
| 39 | Anteo Milos | IDS, PGS, UNIJA, ISU - PIP … | 8 | 928 | `r_02_008_0000_000.json` · PDF str. 72 | IDS | OK |
| 40 | Sandra Krpan | SDP, CENTAR, HSS, "DO i SIP", GLAS | 7 | 933 | `r_02_007_0000_000.json` · PDF str. 61, 69 | SDP | OK |
| 41 | Sanda Livia Maduna | HDZ, HSLS, HDS, HNS, HSU | 5 | 942 | `r_02_005_0000_000.json` · PDF str. 42 | HDZ | OK |
| 42 | Branko Kolarić | SDP, CENTAR, HSS, "DO i SIP" … | 1 | 982 | `r_02_001_0000_000.json` · PDF str. 4, 13 | SDP | OK |
| 43 | Dubravka Novak | MOŽEMO! - POLITIČKA PLATFORMA … | 3 | 1.028 | `r_02_003_0000_000.json` · PDF str. 24 | Možemo! | OK |
| 44 | Mate Vukušić | SDP, CENTAR, HSS, "DO i SIP" … | 4 | 1.171 | `r_02_004_0000_000.json` · PDF str. 33 | SDP | OK |
| 45 | Martina Vlašić Iljkić | SDP, CENTAR, HSS, "DO i SIP" … | 5 | 1.178 | `r_02_005_0000_000.json` · PDF str. 42, 50 | SDP | OK |
| 46 | Boška Ban Vlahek | SDP, CENTAR, HSS, "DO i SIP" … | 3 | 1.198 | `r_02_003_0000_000.json` · PDF str. 23, 31 | HDZ | OK |
| 47 | Mario Milinković | SDP, CENTAR, HSS, "DO i SIP" … | 5 | 1.238 | `r_02_005_0000_000.json` · PDF str. 42, 50 | SDP | OK |
| 48 | Marin Mandarić | HDZ, HSLS, HDS, HNS, HSU | 4 | 1.285 | `r_02_004_0000_000.json` · PDF str. 33 | HDZ | OK |
| 49 | Sanja Bježančević | SDP, CENTAR, HSS, "DO i SIP" … | 4 | 1.295 | `r_02_004_0000_000.json` · PDF str. 33, 40 | SDP | OK |
| 50 | Danica Baričević | HDZ, HSLS, HDS, HNS, HSU | 10 | 1.316 | `r_02_010_0000_000.json` · PDF str. 91 | HDZ | OK |
| 51 | Željko Glavić | HDZ, HSLS, HDS, HNS, HSU | 5 | 1.320 | `r_02_005_0000_000.json` · PDF str. 42, 50 | HDZ | OK |
| 52 | Ante Kujundžić | MOST, HRVATSKI SUVERENISTI, HKS, NLM | 10 | 1.377 | `r_02_010_0000_000.json` · PDF str. 92, 100 | Most | OK |
| 53 | Marija Lugarić | SDP, CENTAR, HSS, "DO i SIP" … | 6 | 1.379 | `r_02_006_0000_000.json` · PDF str. 51, 59 | SDP | OK |
| 54 | Barbara Antolić Vupora | SDP, CENTAR, HSS, "DO i SIP" … | 3 | 1.391 | `r_02_003_0000_000.json` · PDF str. 23, 31 | SDP | OK |
| 55 | Rada Borić | MOŽEMO! - POLITIČKA PLATFORMA | 6 | 1.403 | `r_02_006_0000_000.json` · PDF str. 52 | Možemo! | OK |
| 56 | Damir Bakić | MOŽEMO! - POLITIČKA PLATFORMA | 1 | 1.461 | `r_02_001_0000_000.json` · PDF str. 5, 13 | Možemo! | OK |
| 57 | Anđelka Salopek | HDZ, HSLS, HDS, HNS, HSU | 7 | 1.469 | `r_02_007_0000_000.json` · PDF str. 61 | HDZ | OK |
| 58 | Anamarija Blažević | HDZ, HSLS, HDS, HNS, HSU | 5 | 1.478 | `r_02_005_0000_000.json` · PDF str. 42 | HDZ | OK |
| 59 | Tomislav Klarić | HDZ, HSLS, HDS, HNS, HSU | 8 | 1.501 | `r_02_008_0000_000.json` · PDF str. 71, 79 | HDZ | OK |
| 60 | Magdalena Komes | HDZ, HSLS, HDS, HNS, HSU | 7 | 1.569 | `r_02_007_0000_000.json` · PDF str. 61 | HDZ | OK |
