# Disparitet preferencijalnih glasova — Parlamentarni izbori 2024.

Usporedba dviju skupina kandidata na općim listama (vrsta 02, izborne
jedinice 1–10; nacionalne manjine **nisu** u ovoj analizi jer se mandat
dodjeljuje listi, ne kandidatu unutar liste).

Izvor: `data/izbori.sqlite` (mirror DIP arhive). Skripta:
`scripts/analiza_preferencijala.py`.

## Što se uspoređuje

- **Niski preferencijal — visok status**: kandidati s vrlo malim brojem
  preferencijalnih glasova koji ipak sjede u Saboru (ili su izvorno osvojili
  mandat).
- **Visok preferencijal — bez mandata**: kandidati koje su birači jasno
  istaknuli (visok preferencijal), ali nisu osvojili saborski mandat.

Izračun se prikazuje u dvije optike, jer se razlikuju:

1. **Trenutno u Saboru** (`u_saboru` flag) — odražava sjedeće zastupnike u
   ovom trenutku. Mnogi izvorni dobitnici mandata (premijer, ministri,
   gradonačelnik Zagreba …) drže mandat u mirovanju i u ovoj optici figuriraju
   kao "nisu u Saboru" iako su uvjerljivo izabrani.
2. **Osvojio mandat na izborima** — rekonstruirano iz pravila o ≥ 10 %
   preferencijala: kandidati s ≥ 10 % glasova liste preuređuju se po broju
   preferencijala, ostali ostaju po `rbr`, a prvih `mandata` na listi osvaja
   mandat. Ovo je čistiji prikaz "tko je osvojio mandat odlukom birača i
   liste", neovisno o kasnijim zamjenama / mirovanjima.

Granica popisa: TOP 50 u svakoj skupini.

### Legenda statusa kandidata

| Ikona | Značenje | Broj kandidata |
|:---:|---|---:|
| 🟢 | **Izabran i sjedi** — osvojio mandat na izborima i sjedi u Saboru | 95 |
| 🔵 | **Zamjenik** — nije izvorno osvojio mandat, ali sjedi u Saboru kao zamjena nekoga tko je preuzeo izvršnu funkciju ili dao ostavku | 47 |
| 🟡 | **Mandat u mirovanju** — osvojio mandat na izborima ali ga drži u mirovanju (vlada / izvršne funkcije) | 48 |
| 🔴 | **Bez mandata** — nije osvojio mandat na izborima i ne sjedi kao zamjenik | 2087 |

> 🟢 + 🔵 zajedno čine 142 trenutno sjedećih zastupnika u Saboru.
> 🟢 + 🟡 zajedno čine 143 osvojenih mandata 17. travnja 2024.

---

## Optika 1 — Trenutno u Saboru (`u_saboru`)

#### A. 50 zastupnika s najmanje preferencijalnih glasova

Najmanje glasova na ovom popisu ima **DARKO VULETIĆ** (176 preferencijalnih glasova).

_Najniži preferencijal — sjede u Saboru_

| Status | Kandidat | Pref. glasova | % | IJ | rbr | Lista (skraćeno) | Mandata liste |
|:---:|---|---:|---:|:---:|---:|---|---:|
| 🔵 | DARKO VULETIĆ |   176 |  0.31 | IJ 6 | 11 | SDP, CENTAR, HSS, "DO i SIP", REFORMISTI, GLAS | 4 |
| 🟢 | VESELKO GABRIČEVIĆ |   183 |  0.22 | IJ 7 | 6 | HDZ, HSLS, HDS, HNS, HSU | 7 |
| 🔵 | MARIN ŽIVKOVIĆ |   185 |  0.43 | IJ 6 | 5 | MOŽEMO! - POLITIČKA PLATFORMA | 3 |
| 🔵 | LJUBICA LUKAČIĆ |   191 |  0.29 | IJ 1 | 7 | HDZ, HSLS, HDS, HNS, HSU | 5 |
| 🔵 | IVICA BAKSA |   242 |  0.93 | IJ 3 | 14 | NPS | 2 |
| 🔵 | KREŠIMIR ČABAJ |   331 |  1.25 | IJ 4 | 3 | DP, PRAVO I PRAVDA, NEZAVISNI, DHSS, ZELENA LISTA | 2 |
| 🔵 | MARTIN KORDIĆ |   343 |  2.28 | IJ 5 | 5 | MOST, HRVATSKI SUVERENISTI, HKS, NLM | 1 |
| 🟢 | DARKO KLASIĆ |   360 |  0.56 | IJ 1 | 5 | HDZ, HSLS, HDS, HNS, HSU | 5 |
| 🔵 | JELENA MILOŠ |   380 |  2.18 | IJ 2 | 2 | MOŽEMO! - POLITIČKA PLATFORMA, HOĆEMO PRAVEDNO | 1 |
| 🔵 | MAKSIMILIJAN ŠIMRAK |   406 |  0.63 | IJ 1 | 10 | HDZ, HSLS, HDS, HNS, HSU | 5 |
| 🔵 | MARIA BLAŽINA |   430 |  0.62 | IJ 8 | 10 | SDP, CENTAR, HSS, "DO i SIP", GLAS | 6 |
| 🔵 | MARKO PAVIĆ |   475 |  0.80 | IJ 6 | 8 | HDZ, HSLS, HDS, HNS, HSU | 4 |
| 🔵 | IVANA RIBARIĆ MAJANOVIĆ |   538 |  1.55 | IJ 5 | 7 | SDP, CENTAR, HSS, "DO i SIP", REFORMISTI, GLAS | 3 |
| 🟢 | ANA PUŽ KUKULJAN |   545 |  0.79 | IJ 8 | 6 | SDP, CENTAR, HSS, "DO i SIP", GLAS | 6 |
| 🟢 | KRUNOSLAV KATIČIĆ |   547 |  0.76 | IJ 2 | 2 | HDZ, HSLS, HDS, HNS, HSU | 6 |
| 🟢 | IRENA DRAGIĆ |   566 |  1.44 | IJ 9 | 3 | SDP, CENTAR, HSS, "DO i SIP", REFORMISTI, GLAS | 3 |
| 🔵 | IVO ZELIĆ |   604 |  0.71 | IJ 4 | 12 | HDZ, HSLS, HDS, HNS, HSU | 7 |
| 🟢 | MIRO TOTGERGELI |   605 |  0.84 | IJ 2 | 6 | HDZ, HSLS, HDS, HNS, HSU | 6 |
| 🔵 | STIPAN ŠAŠLIN |   624 |  0.73 | IJ 4 | 13 | HDZ, HSLS, HDS, HNS, HSU | 7 |
| 🔵 | JOSIP BORIĆ |   629 |  1.43 | IJ 8 | 7 | HDZ, HSLS, HDS, HNS, HSU | 4 |
| 🟢 | ŽELJKO REINER |   638 |  1.00 | IJ 1 | 2 | HDZ, HSLS, HDS, HNS, HSU | 5 |
| 🔵 | ANITA CURIŠ KROK |   648 |  0.83 | IJ 3 | 11 | SDP, CENTAR, HSS, "DO i SIP", REFORMISTI, GLAS | 6 |
| 🟢 | SAŠA ĐUJIĆ |   686 |  1.00 | IJ 8 | 5 | SDP, CENTAR, HSS, "DO i SIP", GLAS | 6 |
| 🟢 | JOSIP DABRO |   720 |  2.33 | IJ 5 | 2 | DP, PRAVO I PRAVDA | 3 |
| 🔵 | VESNA BEDEKOVIĆ |   722 |  0.85 | IJ 4 | 10 | HDZ, HSLS, HDS, HNS, HSU | 7 |
| 🔵 | DANIJELA BLAŽANOVIĆ |   734 |  1.25 | IJ 6 | 9 | HDZ, HSLS, HDS, HNS, HSU | 4 |
| 🟢 | MIROSLAV MARKOVIĆ |   744 |  0.95 | IJ 3 | 5 | SDP, CENTAR, HSS, "DO i SIP", REFORMISTI, GLAS | 6 |
| 🔵 | IVICA LEDENKO |   745 |  3.04 | IJ 9 | 3 | MOST, HRVATSKI SUVERENISTI, HKS, NLM | 2 |
| 🟢 | DUBRAVKA LIPOVAC PEHAR |   759 |  2.46 | IJ 5 | 3 | DP, PRAVO I PRAVDA | 3 |
| 🔵 | NIKOLINA BARADIĆ |   784 |  0.97 | IJ 9 | 10 | HDZ, HSLS, HDS, HNS, HSU | 7 |
| 🔵 | ZDRAVKA BUŠIĆ |   787 |  1.09 | IJ 2 | 8 | HDZ, HSLS, HDS, HNS, HSU | 6 |
| 🔵 | JASNA VOJNIĆ |   823 |  2.56 | IJ 11 | 5 | HDZ | 3 |
| 🟢 | DUBRAVKO BILIĆ |   832 |  3.22 | IJ 3 | 2 | NPS | 2 |
| 🔵 | ANTE BABIĆ |   872 |  1.08 | IJ 9 | 8 | HDZ, HSLS, HDS, HNS, HSU | 7 |
| 🟢 | MARIJANA PULJAK |   876 |  1.55 | IJ 1 | 4 | SDP, CENTAR, HSS, "DO i SIP", REFORMISTI, GLAS | 4 |
| 🟢 | BORIS PILIŽOTA |   901 |  1.76 | IJ 4 | 3 | SDP, CENTAR, HSS, "DO i SIP", REFORMISTI, GLAS | 4 |
| 🔵 | IVICA MESIĆ |   904 |  4.00 | IJ 2 | 2 | DP, PRAVO I PRAVDA, DHSS, ZELENA LISTA, AGRAMERI - NEZAVISNA | 2 |
| 🟢 | TANJA SOKOLIĆ |   905 |  1.79 | IJ 2 | 2 | SDP, CENTAR, HSS, "DO i SIP", REFORMISTI, GLAS | 4 |
| 🔵 | ANTEO MILOS |   928 |  2.83 | IJ 8 | 10 | IDS, PGS, UNIJA, ISU - PIP, SOCIJALDEMOKRATI, REFORMISTI, DE | 2 |
| 🟢 | SANDRA KRPAN |   933 |  1.88 | IJ 7 | 3 | SDP, CENTAR, HSS, "DO i SIP", GLAS | 4 |
| 🔵 | SANDA LIVIA MADUNA |   942 |  1.24 | IJ 5 | 12 | HDZ, HSLS, HDS, HNS, HSU | 7 |
| 🟢 | BRANKO KOLARIĆ |   982 |  1.74 | IJ 1 | 3 | SDP, CENTAR, HSS, "DO i SIP", REFORMISTI, GLAS | 4 |
| 🔵 | DUBRAVKA NOVAK | 1.028 |  7.77 | IJ 3 | 2 | MOŽEMO! - POLITIČKA PLATFORMA, HOĆEMO PRAVEDNO | 1 |
| 🔵 | MATE VUKUŠIĆ | 1.171 |  2.29 | IJ 4 | 5 | SDP, CENTAR, HSS, "DO i SIP", REFORMISTI, GLAS | 4 |
| 🟢 | MARTINA VLAŠIĆ ILJKIĆ | 1.178 |  3.39 | IJ 5 | 2 | SDP, CENTAR, HSS, "DO i SIP", REFORMISTI, GLAS | 3 |
| 🟢 | BOŠKA BAN VLAHEK | 1.198 |  1.53 | IJ 3 | 4 | SDP, CENTAR, HSS, "DO i SIP", REFORMISTI, GLAS | 6 |
| 🟢 | MARIO MILINKOVIĆ | 1.238 |  3.56 | IJ 5 | 3 | SDP, CENTAR, HSS, "DO i SIP", REFORMISTI, GLAS | 3 |
| 🔵 | MARIN MANDARIĆ | 1.285 |  1.51 | IJ 4 | 8 | HDZ, HSLS, HDS, HNS, HSU | 7 |
| 🟢 | SANJA BJEŽANČEVIĆ | 1.295 |  2.53 | IJ 4 | 2 | SDP, CENTAR, HSS, "DO i SIP", REFORMISTI, GLAS | 4 |
| 🔵 | DANICA BARIČEVIĆ | 1.316 |  1.64 | IJ 10 | 7 | HDZ, HSLS, HDS, HNS, HSU | 6 |

**Kumulativno preferencijalnih glasova ovih 50 kandidata: 35.934**


#### B. 50 kandidata s najviše preferencijalnih glasova koji **nisu** trenutno u Saboru

Najviše glasova ima **IVAN ANUŠIĆ** (37.531 preferencijalnih glasova).

> Napomena: ovaj popis sadrži i izvorne dobitnike mandata koji su preuzeli
> izvršne funkcije (premijer, ministri, gradonačelnici) — formalno mandat
> imaju, ali ne sjede u Saboru.

_Najviši preferencijal — nisu trenutno u Saboru_

| Status | Kandidat | Pref. glasova | % | IJ | rbr | Lista (skraćeno) | Mandata liste |
|:---:|---|---:|---:|:---:|---:|---|---:|
| 🟡 | IVAN ANUŠIĆ | 37.531 | 44.30 | IJ 4 | 1 | HDZ, HSLS, HDS, HNS, HSU | 7 |
| 🟡 | ANDREJ PLENKOVIĆ | 33.080 | 51.87 | IJ 1 | 1 | HDZ, HSLS, HDS, HNS, HSU | 5 |
| 🟡 | TOMO MEDVED | 23.136 | 28.74 | IJ 7 | 1 | HDZ, HSLS, HDS, HNS, HSU | 7 |
| 🟡 | PEĐA GRBIN | 19.982 | 29.13 | IJ 8 | 1 | SDP, CENTAR, HSS, "DO i SIP", GLAS | 6 |
| 🟡 | OLEG BUTKOVIĆ | 19.646 | 44.91 | IJ 8 | 1 | HDZ, HSLS, HDS, HNS, HSU | 4 |
| 🟡 | TOMISLAV TOMAŠEVIĆ | 17.674 | 41.25 | IJ 6 | 1 | MOŽEMO! - POLITIČKA PLATFORMA | 3 |
| 🟡 | MATIJA POSAVEC | 16.241 | 62.87 | IJ 3 | 1 | NPS | 2 |
| 🟡 | DAVOR BOŽINOVIĆ | 15.082 | 25.71 | IJ 6 | 1 | HDZ, HSLS, HDS, HNS, HSU | 4 |
| 🟡 | IVAN CELJAK | 14.458 | 17.96 | IJ 7 | 2 | HDZ, HSLS, HDS, HNS, HSU | 7 |
| 🟡 | BRANKO BAČIĆ | 14.291 | 17.85 | IJ 10 | 1 | HDZ, HSLS, HDS, HNS, HSU | 6 |
| 🟡 | PREDRAG FRED MATIĆ | 12.419 | 35.81 | IJ 5 | 1 | SDP, CENTAR, HSS, "DO i SIP", REFORMISTI, GLAS | 3 |
| 🟡 | ANĐELKO STRIČAK | 9.600 | 16.45 | IJ 3 | 1 | HDZ, HSLS, HDS, HNS, HSU | 5 |
| 🟡 | BILJANA BORZAN | 9.585 | 18.77 | IJ 4 | 14 | SDP, CENTAR, HSS, "DO i SIP", REFORMISTI, GLAS | 4 |
| 🟡 | DAMIR KRSTIČEVIĆ | 9.171 | 11.45 | IJ 10 | 14 | HDZ, HSLS, HDS, HNS, HSU | 6 |
| 🟡 | ŠIME ERLIĆ | 8.813 | 10.93 | IJ 9 | 2 | HDZ, HSLS, HDS, HNS, HSU | 7 |
| 🟡 | MARIO RADIĆ | 8.373 | 31.62 | IJ 4 | 1 | DP, PRAVO I PRAVDA, NEZAVISNI, DHSS, ZELENA LISTA | 2 |
| 🟡 | MISLAV KOLAKUŠIĆ | 8.364 | 39.01 | IJ 1 | 1 | DP, PRAVO I PRAVDA, BLOK, AGRAMERI - NEZAVISNA LISTA | 1 |
| 🟡 | IVICA PULJAK | 8.056 | 14.62 | IJ 10 | 2 | SDP, CENTAR, HSS, "DO i SIP", REFORMISTI, GLAS | 4 |
| 🟡 | ZVONKO MILAS | 7.967 | 24.81 | IJ 11 | 1 | HDZ | 3 |
| 🟡 | KREŠO BELJAK | 7.855 | 13.96 | IJ 6 | 3 | SDP, CENTAR, HSS, "DO i SIP", REFORMISTI, GLAS | 4 |
| 🟡 | IGOR ANDROVIĆ | 6.857 |  8.09 | IJ 4 | 2 | HDZ, HSLS, HDS, HNS, HSU | 7 |
| 🟡 | ANTONIJA JOZIĆ | 6.472 |  8.53 | IJ 5 | 4 | HDZ, HSLS, HDS, HNS, HSU | 7 |
| 🟡 | DAVOR IVO STIER | 6.318 | 10.77 | IJ 6 | 6 | HDZ, HSLS, HDS, HNS, HSU | 4 |
| 🟡 | DANIJEL MARUŠIĆ | 6.317 |  8.33 | IJ 5 | 6 | HDZ, HSLS, HDS, HNS, HSU | 7 |
| 🔴 | ZLATKO HASANBEGOVIĆ | 6.163 | 28.74 | IJ 1 | 2 | DP, PRAVO I PRAVDA, BLOK, AGRAMERI - NEZAVISNA LISTA | 1 |
| 🟡 | IVAN BOSANČIĆ | 6.127 |  8.08 | IJ 5 | 2 | HDZ, HSLS, HDS, HNS, HSU | 7 |
| 🟡 | ŽELJKO KOLAR | 5.760 |  7.40 | IJ 3 | 3 | SDP, CENTAR, HSS, "DO i SIP", REFORMISTI, GLAS | 6 |
| 🔴 | ANTE ŠOŠIĆ | 5.604 |  7.00 | IJ 10 | 8 | HDZ, HSLS, HDS, HNS, HSU | 6 |
| 🟡 | BLAŽENKO BOBAN | 5.047 |  6.30 | IJ 10 | 2 | HDZ, HSLS, HDS, HNS, HSU | 6 |
| 🔴 | RADIMIR ČAČIĆ | 4.960 |  6.37 | IJ 3 | 13 | SDP, CENTAR, HSS, "DO i SIP", REFORMISTI, GLAS | 6 |
| 🔴 | SINIŠA JENKAČ | 4.935 |  8.45 | IJ 3 | 10 | HDZ, HSLS, HDS, HNS, HSU | 5 |
| 🔴 | DAVOR DRETAR | 4.703 | 43.89 | IJ 3 | 1 | DP, PRAVO I PRAVDA, DHSS, ZELENA LISTA | 0 |
| 🔴 | LOVRO LUKAVEČKI | 4.657 |  5.98 | IJ 3 | 12 | SDP, CENTAR, HSS, "DO i SIP", REFORMISTI, GLAS | 6 |
| 🔴 | ŽELJKO POSAVEC | 4.561 |  5.86 | IJ 3 | 10 | SDP, CENTAR, HSS, "DO i SIP", REFORMISTI, GLAS | 6 |
| 🟡 | DANIJELA DOLENEC | 4.478 | 25.73 | IJ 2 | 1 | MOŽEMO! - POLITIČKA PLATFORMA, HOĆEMO PRAVEDNO | 1 |
| 🟡 | DAMIR HABIJAN | 4.386 |  7.51 | IJ 3 | 5 | HDZ, HSLS, HDS, HNS, HSU | 5 |
| 🔴 | MARKO MARUŠIĆ | 4.336 |  6.04 | IJ 2 | 14 | HDZ, HSLS, HDS, HNS, HSU | 6 |
| 🔴 | ENIO MEŠTROVIĆ | 4.326 | 63.06 | IJ 10 | 1 | RIČARD NEZAVISNI | 0 |
| 🟡 | LORIS PERŠURIĆ | 4.065 | 12.42 | IJ 8 | 4 | IDS, PGS, UNIJA, ISU - PIP, SOCIJALDEMOKRATI, REFORMISTI, DE | 2 |
| 🔴 | DARIJO VASILIĆ | 4.033 | 12.32 | IJ 8 | 2 | IDS, PGS, UNIJA, ISU - PIP, SOCIJALDEMOKRATI, REFORMISTI, DE | 2 |
| 🔴 | KAROLINA VIDOVIĆ KRIŠTO | 3.785 | 80.29 | IJ 1 | 1 | OIP | 0 |
| 🔴 | SAMIR HAJ BARAKAT | 3.751 |  7.34 | IJ 4 | 13 | SDP, CENTAR, HSS, "DO i SIP", REFORMISTI, GLAS | 4 |
| 🔴 | DAMIR VANĐELIĆ | 3.731 | 47.04 | IJ 1 | 1 | FOKUS, REPUBLIKA | 0 |
| 🔴 | KATARINA PEOVIĆ | 3.545 | 62.16 | IJ 8 | 1 | RF | 0 |
| 🟡 | RADOJE VIDOVIĆ | 3.499 | 10.89 | IJ 11 | 3 | HDZ | 3 |
| 🔴 | ŽELJKO BURIĆ | 3.473 |  4.31 | IJ 9 | 14 | HDZ, HSLS, HDS, HNS, HSU | 7 |
| 🔴 | VOJKO OBERSNEL | 3.455 |  6.99 | IJ 7 | 14 | SDP, CENTAR, HSS, "DO i SIP", GLAS | 4 |
| 🔴 | DAVOR NAĐI | 3.387 | 18.49 | IJ 6 | 1 | FOKUS, REPUBLIKA | 1 |
| 🟡 | VILI BEROŠ | 3.367 |  5.74 | IJ 6 | 2 | HDZ, HSLS, HDS, HNS, HSU | 4 |
| 🔴 | JOSIP SAMARDŽIĆ | 3.359 |  4.43 | IJ 5 | 14 | HDZ, HSLS, HDS, HNS, HSU | 7 |

**Kumulativno preferencijalnih glasova ovih 50 kandidata: 440.781**


#### C. Kumulativna usporedba (Optika 1)

| Skupina | Broj kandidata | Σ preferencijalnih glasova |
|---|---:|---:|
| 50 zastupnika s najnižim preferencijalom | 50 | **35.934** |
| 50 kandidata s najvišim preferencijalom (nisu u Saboru) | 50 | **440.781** |
| Omjer | | ≈ **12.3×** |

#### D. Break-even (Optika 1) — gdje prestaje kontradikcija

Sparujem `i`-tog gubitnika s najviše preferencijala (nije u Saboru) s `i`-tim
zastupnikom s najmanje preferencijala (sjedi u Saboru). Kontradikcija postoji
dok gubitnik ima više glasova od zastupnika.

**Prelom: rang #80** — od ovog ranga nadalje, sjedeći
zastupnik ima više preferencijala od najboljeg neuključenog gubitnika koji
mu se pridružuje u paru.

**Indeks zaobilaženja birača — Optika 1:**

| Mjera | Vrijednost |
|---|---:|
| Mandata u Saboru (sjedeći) | 142 |
| Svih kontradiktornih parova (gubitnik > sjedeći) | 79 |
| ❌ **Stvarne nepravde** (loser je 🔴 — bez mandata, ne sjedi) | **40** |
| 🟡 Loser dobio mandat ali u mirovanju (vlada / izvršne f.) | 39 |
| 🔵 Riješeno zamjenikom (loser je 🔵 — sjedi kao zamjena) | 0 |
| **Udio mandata gdje volja birača nije ispoštovana (samo ❌)** | **28.2 %** |

> Optika 1 je metodološki "bučnija" jer "nije u Saboru" uključuje ministre i
> druge nositelje izvršne vlasti koji jesu osvojili mandat (🟡). Žuti redovi
> u tablici ispod pokazuju upravo te slučajeve. Za čistu sliku samo izborne
> matematike vidi Optika 2 / sekcija D dolje.

| # | Tip | Gubitnik (više glasova) | Glasova | Dobitnik (manje glasova) | Glasova | Razlika |
|---:|:---:|---|---:|---|---:|---:|
| 1 | 🟡 | 🟡 IVAN ANUŠIĆ | 37.531 | 🔵 DARKO VULETIĆ | 176 | +37355 |
| 2 | 🟡 | 🟡 ANDREJ PLENKOVIĆ | 33.080 | 🟢 VESELKO GABRIČEVIĆ | 183 | +32897 |
| 3 | 🟡 | 🟡 TOMO MEDVED | 23.136 | 🔵 MARIN ŽIVKOVIĆ | 185 | +22951 |
| 4 | 🟡 | 🟡 PEĐA GRBIN | 19.982 | 🔵 LJUBICA LUKAČIĆ | 191 | +19791 |
| 5 | 🟡 | 🟡 OLEG BUTKOVIĆ | 19.646 | 🔵 IVICA BAKSA | 242 | +19404 |
| 6 | 🟡 | 🟡 TOMISLAV TOMAŠEVIĆ | 17.674 | 🔵 KREŠIMIR ČABAJ | 331 | +17343 |
| 7 | 🟡 | 🟡 MATIJA POSAVEC | 16.241 | 🔵 MARTIN KORDIĆ | 343 | +15898 |
| 8 | 🟡 | 🟡 DAVOR BOŽINOVIĆ | 15.082 | 🟢 DARKO KLASIĆ | 360 | +14722 |
| 9 | 🟡 | 🟡 IVAN CELJAK | 14.458 | 🔵 JELENA MILOŠ | 380 | +14078 |
| 10 | 🟡 | 🟡 BRANKO BAČIĆ | 14.291 | 🔵 MAKSIMILIJAN ŠIMRAK | 406 | +13885 |
| 11 | 🟡 | 🟡 PREDRAG FRED MATIĆ | 12.419 | 🔵 MARIA BLAŽINA | 430 | +11989 |
| 12 | 🟡 | 🟡 ANĐELKO STRIČAK | 9.600 | 🔵 MARKO PAVIĆ | 475 | +9125 |
| 13 | 🟡 | 🟡 BILJANA BORZAN | 9.585 | 🔵 IVANA RIBARIĆ MAJANOVIĆ | 538 | +9047 |
| 14 | 🟡 | 🟡 DAMIR KRSTIČEVIĆ | 9.171 | 🟢 ANA PUŽ KUKULJAN | 545 | +8626 |
| 15 | 🟡 | 🟡 ŠIME ERLIĆ | 8.813 | 🟢 KRUNOSLAV KATIČIĆ | 547 | +8266 |
| 16 | 🟡 | 🟡 MARIO RADIĆ | 8.373 | 🟢 IRENA DRAGIĆ | 566 | +7807 |
| 17 | 🟡 | 🟡 MISLAV KOLAKUŠIĆ | 8.364 | 🔵 IVO ZELIĆ | 604 | +7760 |
| 18 | 🟡 | 🟡 IVICA PULJAK | 8.056 | 🟢 MIRO TOTGERGELI | 605 | +7451 |
| 19 | 🟡 | 🟡 ZVONKO MILAS | 7.967 | 🔵 STIPAN ŠAŠLIN | 624 | +7343 |
| 20 | 🟡 | 🟡 KREŠO BELJAK | 7.855 | 🔵 JOSIP BORIĆ | 629 | +7226 |
| 21 | 🟡 | 🟡 IGOR ANDROVIĆ | 6.857 | 🟢 ŽELJKO REINER | 638 | +6219 |
| 22 | 🟡 | 🟡 ANTONIJA JOZIĆ | 6.472 | 🔵 ANITA CURIŠ KROK | 648 | +5824 |
| 23 | 🟡 | 🟡 DAVOR IVO STIER | 6.318 | 🟢 SAŠA ĐUJIĆ | 686 | +5632 |
| 24 | 🟡 | 🟡 DANIJEL MARUŠIĆ | 6.317 | 🟢 JOSIP DABRO | 720 | +5597 |
| 25 | ❌ | 🔴 ZLATKO HASANBEGOVIĆ | 6.163 | 🔵 VESNA BEDEKOVIĆ | 722 | +5441 |
| 26 | 🟡 | 🟡 IVAN BOSANČIĆ | 6.127 | 🔵 DANIJELA BLAŽANOVIĆ | 734 | +5393 |
| 27 | 🟡 | 🟡 ŽELJKO KOLAR | 5.760 | 🟢 MIROSLAV MARKOVIĆ | 744 | +5016 |
| 28 | ❌ | 🔴 ANTE ŠOŠIĆ | 5.604 | 🔵 IVICA LEDENKO | 745 | +4859 |
| 29 | 🟡 | 🟡 BLAŽENKO BOBAN | 5.047 | 🟢 DUBRAVKA LIPOVAC PEHAR | 759 | +4288 |
| 30 | ❌ | 🔴 RADIMIR ČAČIĆ | 4.960 | 🔵 NIKOLINA BARADIĆ | 784 | +4176 |
| 31 | ❌ | 🔴 SINIŠA JENKAČ | 4.935 | 🔵 ZDRAVKA BUŠIĆ | 787 | +4148 |
| 32 | ❌ | 🔴 DAVOR DRETAR | 4.703 | 🔵 JASNA VOJNIĆ | 823 | +3880 |
| 33 | ❌ | 🔴 LOVRO LUKAVEČKI | 4.657 | 🟢 DUBRAVKO BILIĆ | 832 | +3825 |
| 34 | ❌ | 🔴 ŽELJKO POSAVEC | 4.561 | 🔵 ANTE BABIĆ | 872 | +3689 |
| 35 | 🟡 | 🟡 DANIJELA DOLENEC | 4.478 | 🟢 MARIJANA PULJAK | 876 | +3602 |
| 36 | 🟡 | 🟡 DAMIR HABIJAN | 4.386 | 🟢 BORIS PILIŽOTA | 901 | +3485 |
| 37 | ❌ | 🔴 MARKO MARUŠIĆ | 4.336 | 🔵 IVICA MESIĆ | 904 | +3432 |
| 38 | ❌ | 🔴 ENIO MEŠTROVIĆ | 4.326 | 🟢 TANJA SOKOLIĆ | 905 | +3421 |
| 39 | 🟡 | 🟡 LORIS PERŠURIĆ | 4.065 | 🔵 ANTEO MILOS | 928 | +3137 |
| 40 | ❌ | 🔴 DARIJO VASILIĆ | 4.033 | 🟢 SANDRA KRPAN | 933 | +3100 |
| 41 | ❌ | 🔴 KAROLINA VIDOVIĆ KRIŠTO | 3.785 | 🔵 SANDA LIVIA MADUNA | 942 | +2843 |
| 42 | ❌ | 🔴 SAMIR HAJ BARAKAT | 3.751 | 🟢 BRANKO KOLARIĆ | 982 | +2769 |
| 43 | ❌ | 🔴 DAMIR VANĐELIĆ | 3.731 | 🔵 DUBRAVKA NOVAK | 1.028 | +2703 |
| 44 | ❌ | 🔴 KATARINA PEOVIĆ | 3.545 | 🔵 MATE VUKUŠIĆ | 1.171 | +2374 |
| 45 | 🟡 | 🟡 RADOJE VIDOVIĆ | 3.499 | 🟢 MARTINA VLAŠIĆ ILJKIĆ | 1.178 | +2321 |
| 46 | ❌ | 🔴 ŽELJKO BURIĆ | 3.473 | 🟢 BOŠKA BAN VLAHEK | 1.198 | +2275 |
| 47 | ❌ | 🔴 VOJKO OBERSNEL | 3.455 | 🟢 MARIO MILINKOVIĆ | 1.238 | +2217 |
| 48 | ❌ | 🔴 DAVOR NAĐI | 3.387 | 🔵 MARIN MANDARIĆ | 1.285 | +2102 |
| 49 | 🟡 | 🟡 VILI BEROŠ | 3.367 | 🟢 SANJA BJEŽANČEVIĆ | 1.295 | +2072 |
| 50 | ❌ | 🔴 JOSIP SAMARDŽIĆ | 3.359 | 🔵 DANICA BARIČEVIĆ | 1.316 | +2043 |
| 51 | 🟡 | 🟡 MARIJAN PAVLIČEK | 3.336 | 🟢 ŽELJKO GLAVIĆ | 1.320 | +2016 |
| 52 | ❌ | 🔴 ŽARKO TUŠEK | 3.325 | 🟢 ANTE KUJUNDŽIĆ | 1.377 | +1948 |
| 53 | ❌ | 🔴 ANDREJA MARIĆ | 3.272 | 🟢 MARIJA LUGARIĆ | 1.379 | +1893 |
| 54 | ❌ | 🔴 BOJAN GLAVAŠEVIĆ | 3.264 | 🟢 BARBARA ANTOLIĆ VUPORA | 1.391 | +1873 |
| 55 | ❌ | 🔴 BRANKO GRČIĆ | 3.166 | 🔵 RADA BORIĆ | 1.403 | +1763 |
| 56 | ❌ | 🔴 BRANKA BAKŠIĆ-MITIĆ | 3.099 | 🟢 DAMIR BAKIĆ | 1.461 | +1638 |
| 57 | ❌ | 🔴 IVAN VILIBOR SINČIĆ | 3.085 | 🔵 ANĐELKA SALOPEK | 1.469 | +1616 |
| 58 | ❌ | 🔴 ALKA VUICA | 3.029 | 🔵 ANAMARIJA BLAŽEVIĆ | 1.478 | +1551 |
| 59 | 🟡 | 🟡 STEPHEN NIKOLA BARTULICA | 3.012 | 🟢 TOMISLAV KLARIĆ | 1.501 | +1511 |
| 60 | 🟡 | 🟡 ERNEST PETRY | 2.989 | 🔵 MAGDALENA KOMES | 1.569 | +1420 |
| 61 | ❌ | 🔴 JOSIP ŠARIĆ | 2.943 | 🔵 TOMISLAV ZADRO | 1.635 | +1308 |
| 62 | ❌ | 🔴 MATE OMAZIĆ | 2.892 | 🔵 MATEJ MOSTARAC | 1.672 | +1220 |
| 63 | 🟡 | 🟡 JOSIP BILAVER | 2.854 | 🟢 BRANKA JURIČEV-MARTINČEV | 1.731 | +1123 |
| 64 | ❌ | 🔴 VIKTOR ŠIMUNIĆ | 2.793 | 🔵 IVAN DABO | 1.780 | +1013 |
| 65 | ❌ | 🔴 PETRA ŠKROBOT | 2.768 | 🔵 MAJDA BURIĆ | 1.800 | +968 |
| 66 | 🟡 | 🟡 MARTINA FURDEK-HAJDIN | 2.617 | 🔵 GORAN KANIŠKI | 1.806 | +811 |
| 67 | ❌ | 🔴 MATO ČIČAK | 2.576 | 🔵 PREDRAG MIŠIĆ | 1.812 | +764 |
| 68 | ❌ | 🔴 EMIL DAUS | 2.572 | 🔵 ŽELJKO TURK | 1.831 | +741 |
| 69 | ❌ | 🔴 TOMISLAV OKROŠA | 2.450 | 🟢 JOSIP ĐAKIĆ | 1.860 | +590 |
| 70 | 🟡 | 🟡 IVAN ŠIPIĆ | 2.437 | 🔵 IVAN BUDALIĆ | 1.896 | +541 |
| 71 | ❌ | 🔴 MARKO PRIMORAC | 2.426 | 🔵 DAMIR BARBIR | 1.915 | +511 |
| 72 | ❌ | 🔴 NIKOLA KAJKIĆ | 2.424 | 🟢 IVICA KUKAVICA | 1.945 | +479 |
| 73 | ❌ | 🔴 IVAN LOVRINOVIĆ | 2.370 | 🟢 DARKO SOBOTA | 1.963 | +407 |
| 74 | ❌ | 🔴 VALTER GLAVIČIĆ | 2.279 | 🟢 NIKOLA MAŽAR | 1.993 | +286 |
| 75 | ❌ | 🔴 ALEMKA MARKOTIĆ | 2.246 | 🟢 JASENKA AUGUŠTAN-PENTEK | 2.004 | +242 |
| 76 | ❌ | 🔴 DAMIR MARKUŠ | 2.193 | 🔵 LJUBICA JEMBRIH | 2.014 | +179 |
| 77 | 🟡 | 🟡 IVICA LUKANOVIĆ | 2.183 | 🟢 JOSIP OSTROGOVIĆ | 2.017 | +166 |
| 78 | ❌ | 🔴 ŽELJKO JOVANOVIĆ | 2.173 | 🟢 DRAŽENKA POLOVIĆ | 2.040 | +133 |
| 79 | ❌ | 🔴 SREĆKO SLADOLJEV | 2.145 | 🟢 TONČI RESTOVIĆ | 2.049 | +96 |
| 80 | ✅ | 🔴 ĐURO CAPOR | 2.132 | 🟢 IVANA MARKOVIĆ | 2.219 | -87 |
| 81 | ✅ | 🔴 JAKOV VETMA | 2.083 | 🔵 DAMIR MANDIĆ | 2.249 | -166 |
| 82 | ✅ | 🔴 BRANKO HRG | 2.077 | 🟢 MISLAV HERMAN | 2.332 | -255 |
| 83 | ✅ | 🔴 JAVOR BOJAN LEŠ | 2.073 | 🟢 ANTE DEUR | 2.369 | -296 |
| 84 | ✅ | 🔴 ŽELJKO SAČIĆ | 1.970 | 🟢 URŠA RAUKAR-GAMULIN | 2.431 | -461 |

---

## Optika 2 — Osvojio mandat na izborima

Ova optika ignorira tko trenutno sjedi i fokusira se na to **tko je dobio
mandat odlukom birača i liste 17. travnja 2024**.

#### A. 50 dobitnika mandata s najmanje preferencijalnih glasova

Najmanje glasova ima **VESELKO GABRIČEVIĆ** (183 preferencijalnih glasova).

_Najniži preferencijal — osvojili mandat_

| Status | Kandidat | Pref. glasova | % | IJ | rbr | Lista (skraćeno) | Mandata liste |
|:---:|---|---:|---:|:---:|---:|---|---:|
| 🟢 | VESELKO GABRIČEVIĆ |   183 |  0.22 | IJ 7 | 6 | HDZ, HSLS, HDS, HNS, HSU | 7 |
| 🟢 | DARKO KLASIĆ |   360 |  0.56 | IJ 1 | 5 | HDZ, HSLS, HDS, HNS, HSU | 5 |
| 🟡 | GORDAN BOSANAC |   428 |  0.99 | IJ 6 | 3 | MOŽEMO! - POLITIČKA PLATFORMA | 3 |
| 🟡 | IVAN MATIĆ |   506 |  2.06 | IJ 9 | 2 | MOST, HRVATSKI SUVERENISTI, HKS, NLM | 2 |
| 🟡 | NINA OBULJEN KORŽINEK |   506 |  0.79 | IJ 1 | 3 | HDZ, HSLS, HDS, HNS, HSU | 5 |
| 🟢 | ANA PUŽ KUKULJAN |   545 |  0.79 | IJ 8 | 6 | SDP, CENTAR, HSS, "DO i SIP", GLAS | 6 |
| 🟢 | KRUNOSLAV KATIČIĆ |   547 |  0.76 | IJ 2 | 2 | HDZ, HSLS, HDS, HNS, HSU | 6 |
| 🟢 | IRENA DRAGIĆ |   566 |  1.44 | IJ 9 | 3 | SDP, CENTAR, HSS, "DO i SIP", REFORMISTI, GLAS | 3 |
| 🟢 | MIRO TOTGERGELI |   605 |  0.84 | IJ 2 | 6 | HDZ, HSLS, HDS, HNS, HSU | 6 |
| 🟢 | ŽELJKO REINER |   638 |  1.00 | IJ 1 | 2 | HDZ, HSLS, HDS, HNS, HSU | 5 |
| 🟡 | TOMISLAV GOLUBIĆ |   662 |  1.31 | IJ 2 | 4 | SDP, CENTAR, HSS, "DO i SIP", REFORMISTI, GLAS | 4 |
| 🟢 | SAŠA ĐUJIĆ |   686 |  1.00 | IJ 8 | 5 | SDP, CENTAR, HSS, "DO i SIP", GLAS | 6 |
| 🟡 | GORAN IVANOVIĆ |   701 |  0.82 | IJ 4 | 6 | HDZ, HSLS, HDS, HNS, HSU | 7 |
| 🟢 | JOSIP DABRO |   720 |  2.33 | IJ 5 | 2 | DP, PRAVO I PRAVDA | 3 |
| 🟢 | MIROSLAV MARKOVIĆ |   744 |  0.95 | IJ 3 | 5 | SDP, CENTAR, HSS, "DO i SIP", REFORMISTI, GLAS | 6 |
| 🟢 | DUBRAVKA LIPOVAC PEHAR |   759 |  2.46 | IJ 5 | 3 | DP, PRAVO I PRAVDA | 3 |
| 🟢 | DUBRAVKO BILIĆ |   832 |  3.22 | IJ 3 | 2 | NPS | 2 |
| 🟢 | MARIJANA PULJAK |   876 |  1.55 | IJ 1 | 4 | SDP, CENTAR, HSS, "DO i SIP", REFORMISTI, GLAS | 4 |
| 🟢 | BORIS PILIŽOTA |   901 |  1.76 | IJ 4 | 3 | SDP, CENTAR, HSS, "DO i SIP", REFORMISTI, GLAS | 4 |
| 🟢 | TANJA SOKOLIĆ |   905 |  1.79 | IJ 2 | 2 | SDP, CENTAR, HSS, "DO i SIP", REFORMISTI, GLAS | 4 |
| 🟢 | SANDRA KRPAN |   933 |  1.88 | IJ 7 | 3 | SDP, CENTAR, HSS, "DO i SIP", GLAS | 4 |
| 🟢 | BRANKO KOLARIĆ |   982 |  1.74 | IJ 1 | 3 | SDP, CENTAR, HSS, "DO i SIP", REFORMISTI, GLAS | 4 |
| 🟡 | GORDAN GRLIĆ-RADMAN | 1.036 |  1.44 | IJ 2 | 5 | HDZ, HSLS, HDS, HNS, HSU | 6 |
| 🟢 | MARTINA VLAŠIĆ ILJKIĆ | 1.178 |  3.39 | IJ 5 | 2 | SDP, CENTAR, HSS, "DO i SIP", REFORMISTI, GLAS | 3 |
| 🟢 | BOŠKA BAN VLAHEK | 1.198 |  1.53 | IJ 3 | 4 | SDP, CENTAR, HSS, "DO i SIP", REFORMISTI, GLAS | 6 |
| 🟢 | MARIO MILINKOVIĆ | 1.238 |  3.56 | IJ 5 | 3 | SDP, CENTAR, HSS, "DO i SIP", REFORMISTI, GLAS | 3 |
| 🟡 | NATAŠA TRAMIŠAK | 1.260 |  1.48 | IJ 4 | 5 | HDZ, HSLS, HDS, HNS, HSU | 7 |
| 🟢 | SANJA BJEŽANČEVIĆ | 1.295 |  2.53 | IJ 4 | 2 | SDP, CENTAR, HSS, "DO i SIP", REFORMISTI, GLAS | 4 |
| 🟢 | ŽELJKO GLAVIĆ | 1.320 |  1.74 | IJ 5 | 7 | HDZ, HSLS, HDS, HNS, HSU | 7 |
| 🟡 | NIKOLINA BRNJAC | 1.360 |  1.68 | IJ 7 | 7 | HDZ, HSLS, HDS, HNS, HSU | 7 |
| 🟢 | ANTE KUJUNDŽIĆ | 1.377 |  5.55 | IJ 10 | 2 | MOST, HRVATSKI SUVERENISTI, HKS, NLM | 2 |
| 🟢 | MARIJA LUGARIĆ | 1.379 |  2.45 | IJ 6 | 2 | SDP, CENTAR, HSS, "DO i SIP", REFORMISTI, GLAS | 4 |
| 🟢 | BARBARA ANTOLIĆ VUPORA | 1.391 |  1.78 | IJ 3 | 2 | SDP, CENTAR, HSS, "DO i SIP", REFORMISTI, GLAS | 6 |
| 🟢 | DAMIR BAKIĆ | 1.461 |  3.18 | IJ 1 | 3 | MOŽEMO! - POLITIČKA PLATFORMA | 3 |
| 🟢 | TOMISLAV KLARIĆ | 1.501 |  3.43 | IJ 8 | 4 | HDZ, HSLS, HDS, HNS, HSU | 4 |
| 🟢 | BRANKA JURIČEV-MARTINČEV | 1.731 |  2.14 | IJ 9 | 4 | HDZ, HSLS, HDS, HNS, HSU | 7 |
| 🟡 | LUKA KORLAET | 1.773 | 13.40 | IJ 3 | 1 | MOŽEMO! - POLITIČKA PLATFORMA, HOĆEMO PRAVEDNO | 1 |
| 🟢 | JOSIP ĐAKIĆ | 1.860 |  2.19 | IJ 4 | 7 | HDZ, HSLS, HDS, HNS, HSU | 7 |
| 🟢 | IVICA KUKAVICA | 1.945 |  8.29 | IJ 10 | 2 | DP, PRAVO I PRAVDA | 2 |
| 🟢 | DARKO SOBOTA | 1.963 |  2.31 | IJ 4 | 3 | HDZ, HSLS, HDS, HNS, HSU | 7 |
| 🟢 | NIKOLA MAŽAR | 1.993 |  2.62 | IJ 5 | 5 | HDZ, HSLS, HDS, HNS, HSU | 7 |
| 🟢 | JASENKA AUGUŠTAN-PENTEK | 2.004 |  2.57 | IJ 3 | 6 | SDP, CENTAR, HSS, "DO i SIP", REFORMISTI, GLAS | 6 |
| 🟢 | JOSIP OSTROGOVIĆ | 2.017 |  4.61 | IJ 8 | 3 | HDZ, HSLS, HDS, HNS, HSU | 4 |
| 🟢 | DRAŽENKA POLOVIĆ | 2.040 | 15.10 | IJ 7 | 1 | MOŽEMO! - POLITIČKA PLATFORMA, HOĆEMO PRAVEDNO | 1 |
| 🟢 | TONČI RESTOVIĆ | 2.049 |  5.21 | IJ 9 | 2 | SDP, CENTAR, HSS, "DO i SIP", REFORMISTI, GLAS | 3 |
| 🟡 | IVICA LUKANOVIĆ | 2.183 |  4.41 | IJ 7 | 2 | SDP, CENTAR, HSS, "DO i SIP", GLAS | 4 |
| 🟢 | IVANA MARKOVIĆ | 2.219 |  4.02 | IJ 10 | 3 | SDP, CENTAR, HSS, "DO i SIP", REFORMISTI, GLAS | 4 |
| 🟢 | MISLAV HERMAN | 2.332 |  3.97 | IJ 6 | 3 | HDZ, HSLS, HDS, HNS, HSU | 4 |
| 🟢 | ANTE DEUR | 2.369 |  3.30 | IJ 2 | 4 | HDZ, HSLS, HDS, HNS, HSU | 6 |
| 🟢 | URŠA RAUKAR-GAMULIN | 2.431 |  5.67 | IJ 6 | 2 | MOŽEMO! - POLITIČKA PLATFORMA | 3 |

**Kumulativno preferencijalnih glasova ovih 50 kandidata: 62.488**


#### B. 50 kandidata s najviše preferencijalnih glasova koji **nisu** osvojili mandat

Najviše glasova ima **ZLATKO HASANBEGOVIĆ** (6.163 preferencijalnih glasova).

_Najviši preferencijal — bez mandata_

| Status | Kandidat | Pref. glasova | % | IJ | rbr | Lista (skraćeno) | Mandata liste |
|:---:|---|---:|---:|:---:|---:|---|---:|
| 🔴 | ZLATKO HASANBEGOVIĆ | 6.163 | 28.74 | IJ 1 | 2 | DP, PRAVO I PRAVDA, BLOK, AGRAMERI - NEZAVISNA LISTA | 1 |
| 🔴 | ANTE ŠOŠIĆ | 5.604 |  7.00 | IJ 10 | 8 | HDZ, HSLS, HDS, HNS, HSU | 6 |
| 🔴 | RADIMIR ČAČIĆ | 4.960 |  6.37 | IJ 3 | 13 | SDP, CENTAR, HSS, "DO i SIP", REFORMISTI, GLAS | 6 |
| 🔴 | SINIŠA JENKAČ | 4.935 |  8.45 | IJ 3 | 10 | HDZ, HSLS, HDS, HNS, HSU | 5 |
| 🔴 | DAVOR DRETAR | 4.703 | 43.89 | IJ 3 | 1 | DP, PRAVO I PRAVDA, DHSS, ZELENA LISTA | 0 |
| 🔴 | LOVRO LUKAVEČKI | 4.657 |  5.98 | IJ 3 | 12 | SDP, CENTAR, HSS, "DO i SIP", REFORMISTI, GLAS | 6 |
| 🔴 | ŽELJKO POSAVEC | 4.561 |  5.86 | IJ 3 | 10 | SDP, CENTAR, HSS, "DO i SIP", REFORMISTI, GLAS | 6 |
| 🔴 | MARKO MARUŠIĆ | 4.336 |  6.04 | IJ 2 | 14 | HDZ, HSLS, HDS, HNS, HSU | 6 |
| 🔴 | ENIO MEŠTROVIĆ | 4.326 | 63.06 | IJ 10 | 1 | RIČARD NEZAVISNI | 0 |
| 🔵 | DENIS KRALJ | 4.230 |  8.39 | IJ 2 | 6 | SDP, CENTAR, HSS, "DO i SIP", REFORMISTI, GLAS | 4 |
| 🔵 | DALIBOR MILAN | 4.220 |  5.27 | IJ 10 | 9 | HDZ, HSLS, HDS, HNS, HSU | 6 |
| 🔴 | DARIJO VASILIĆ | 4.033 | 12.32 | IJ 8 | 2 | IDS, PGS, UNIJA, ISU - PIP, SOCIJALDEMOKRATI, REFORMISTI, DE | 2 |
| 🔴 | KAROLINA VIDOVIĆ KRIŠTO | 3.785 | 80.29 | IJ 1 | 1 | OIP | 0 |
| 🔴 | SAMIR HAJ BARAKAT | 3.751 |  7.34 | IJ 4 | 13 | SDP, CENTAR, HSS, "DO i SIP", REFORMISTI, GLAS | 4 |
| 🔴 | DAMIR VANĐELIĆ | 3.731 | 47.04 | IJ 1 | 1 | FOKUS, REPUBLIKA | 0 |
| 🔴 | KATARINA PEOVIĆ | 3.545 | 62.16 | IJ 8 | 1 | RF | 0 |
| 🔴 | ŽELJKO BURIĆ | 3.473 |  4.31 | IJ 9 | 14 | HDZ, HSLS, HDS, HNS, HSU | 7 |
| 🔴 | VOJKO OBERSNEL | 3.455 |  6.99 | IJ 7 | 14 | SDP, CENTAR, HSS, "DO i SIP", GLAS | 4 |
| 🔴 | DAVOR NAĐI | 3.387 | 18.49 | IJ 6 | 1 | FOKUS, REPUBLIKA | 1 |
| 🔴 | JOSIP SAMARDŽIĆ | 3.359 |  4.43 | IJ 5 | 14 | HDZ, HSLS, HDS, HNS, HSU | 7 |
| 🔴 | ŽARKO TUŠEK | 3.325 |  5.69 | IJ 3 | 6 | HDZ, HSLS, HDS, HNS, HSU | 5 |
| 🔴 | ANDREJA MARIĆ | 3.272 |  4.20 | IJ 3 | 9 | SDP, CENTAR, HSS, "DO i SIP", REFORMISTI, GLAS | 6 |
| 🔴 | BOJAN GLAVAŠEVIĆ | 3.264 |  6.47 | IJ 2 | 14 | SDP, CENTAR, HSS, "DO i SIP", REFORMISTI, GLAS | 4 |
| 🔴 | BRANKO GRČIĆ | 3.166 |  8.05 | IJ 9 | 5 | SDP, CENTAR, HSS, "DO i SIP", REFORMISTI, GLAS | 3 |
| 🔴 | BRANKA BAKŠIĆ-MITIĆ | 3.099 |  6.27 | IJ 7 | 5 | SDP, CENTAR, HSS, "DO i SIP", GLAS | 4 |
| 🔴 | IVAN VILIBOR SINČIĆ | 3.085 | 37.27 | IJ 8 | 1 | DP, PRAVO I PRAVDA | 0 |
| 🔴 | ALKA VUICA | 3.029 |  5.38 | IJ 6 | 14 | SDP, CENTAR, HSS, "DO i SIP", REFORMISTI, GLAS | 4 |
| 🔴 | JOSIP ŠARIĆ | 2.943 |  3.88 | IJ 5 | 8 | HDZ, HSLS, HDS, HNS, HSU | 7 |
| 🔴 | MATE OMAZIĆ | 2.892 |  9.00 | IJ 11 | 8 | HDZ | 3 |
| 🔴 | VIKTOR ŠIMUNIĆ | 2.793 | 56.59 | IJ 3 | 1 | NEOVISNA LISTA -  VIKTOR ŠIMUNIĆ | 0 |
| 🔴 | PETRA ŠKROBOT | 2.768 | 15.11 | IJ 6 | 2 | FOKUS, REPUBLIKA | 1 |
| 🔵 | NEVENKO BARBARIĆ | 2.665 |  8.30 | IJ 11 | 2 | HDZ | 3 |
| 🔴 | MATO ČIČAK | 2.576 |  4.03 | IJ 1 | 9 | HDZ, HSLS, HDS, HNS, HSU | 5 |
| 🔴 | EMIL DAUS | 2.572 |  7.85 | IJ 8 | 6 | IDS, PGS, UNIJA, ISU - PIP, SOCIJALDEMOKRATI, REFORMISTI, DE | 2 |
| 🔴 | TOMISLAV OKROŠA | 2.450 |  3.41 | IJ 2 | 10 | HDZ, HSLS, HDS, HNS, HSU | 6 |
| 🔴 | MARKO PRIMORAC | 2.426 |  4.13 | IJ 6 | 4 | HDZ, HSLS, HDS, HNS, HSU | 4 |
| 🔴 | NIKOLA KAJKIĆ | 2.424 | 16.12 | IJ 5 | 14 | MOST, HRVATSKI SUVERENISTI, HKS, NLM | 1 |
| 🔴 | IVAN LOVRINOVIĆ | 2.370 | 11.53 | IJ 6 | 2 | DP, PRAVO I PRAVDA, DHSS, ZELENA LISTA, AGRAMERI - NEZAVISNA | 1 |
| 🔴 | VALTER GLAVIČIĆ | 2.279 |  6.96 | IJ 8 | 3 | IDS, PGS, UNIJA, ISU - PIP, SOCIJALDEMOKRATI, REFORMISTI, DE | 2 |
| 🔵 | DAMIR MANDIĆ | 2.249 |  2.79 | IJ 7 | 11 | HDZ, HSLS, HDS, HNS, HSU | 7 |
| 🔴 | ALEMKA MARKOTIĆ | 2.246 |  3.52 | IJ 1 | 8 | HDZ, HSLS, HDS, HNS, HSU | 5 |
| 🔴 | DAMIR MARKUŠ | 2.193 | 13.02 | IJ 7 | 2 | DP, PRAVO I PRAVDA, DHSS, ZELENA LISTA | 1 |
| 🔴 | ŽELJKO JOVANOVIĆ | 2.173 |  3.16 | IJ 8 | 14 | SDP, CENTAR, HSS, "DO i SIP", GLAS | 6 |
| 🔴 | SREĆKO SLADOLJEV | 2.145 |  9.14 | IJ 10 | 13 | DP, PRAVO I PRAVDA | 2 |
| 🔴 | ĐURO CAPOR | 2.132 | 18.69 | IJ 10 | 1 | MOŽEMO! - POLITIČKA PLATFORMA, SRĐ JE GRAD | 0 |
| 🔴 | JAKOV VETMA | 2.083 |  2.58 | IJ 9 | 9 | HDZ, HSLS, HDS, HNS, HSU | 7 |
| 🔴 | BRANKO HRG | 2.077 |  2.89 | IJ 2 | 13 | HDZ, HSLS, HDS, HNS, HSU | 6 |
| 🔴 | JAVOR BOJAN LEŠ | 2.073 |  2.89 | IJ 2 | 7 | HDZ, HSLS, HDS, HNS, HSU | 6 |
| 🔵 | LJUBICA JEMBRIH | 2.014 |  3.45 | IJ 3 | 9 | HDZ, HSLS, HDS, HNS, HSU | 5 |
| 🔴 | ŽELJKO SAČIĆ | 1.970 | 24.24 | IJ 3 | 1 | MOST, HRVATSKI SUVERENISTI, HKS, NLM | 0 |

**Kumulativno preferencijalnih glasova ovih 50 kandidata: 161.967**


#### C. Kumulativna usporedba (Optika 2)

| Skupina | Broj kandidata | Σ preferencijalnih glasova |
|---|---:|---:|
| 50 dobitnika mandata s najnižim preferencijalom | 50 | **62.488** |
| 50 kandidata s najvišim preferencijalom (bez mandata) | 50 | **161.967** |
| Omjer | | ≈ **2.6×** |

#### D. Break-even (Optika 2) — gdje prestaje kontradikcija

Sparujem `i`-tog gubitnika s najviše preferencijala s `i`-tim dobitnikom
mandata s najmanje preferencijala. Kontradikcija postoji dok gubitnik ima
više preferencijalnih glasova od dobitnika; pravilo D'Hondta + ≥ 10 % praga
ovo dopušta jer mandat ovisi o **listi** i **redoslijedu na listi**, a ne o
apsolutnom broju preferencijala.

**Prelom: rang #46** — od ovog ranga nadalje, dobitnik
mandata ima više (ili isto) preferencijala od najjačeg gubitnika koji mu se
pridružuje u paru.

**Indeks zaobilaženja birača — Optika 2:**

| Mjera | Vrijednost |
|---|---:|
| Ukupno mandata na izborima | 143 |
| Svih kontradiktornih parova (gubitnik > dobitnik) | 45 |
| ❌ **Stvarnih nepravdi** (loser je 🔴 — nikad nije ušao u Sabor) | **41** |
| 🔵 Riješeno zamjenikom (loser je 🔵 — kasnije ušao kao zamjena) | 4 |
| 🟡 Loser dobio mandat (mirovanje) — N/A za Optiku 2 | 0 |
| **Udio mandata raspoređenih protivno preferencijalnoj volji (samo stvarne nepravde)** | **28.7 %** |
| Σ preferencijala "robbed" (samo 🔴 gubitnici) | 138.386 |
| Σ preferencijala "placed" (dobitnici nasuprot 🔴) | 46.312 |
| **Udio neispoštovane preferencijalne podrške u stvarnim nepravdama** | **74.9 %** |
| Omjer "robbed" : "placed" preferencijala (stvarne nepravde) | **2.99 : 1** |

Drugim riječima:

- U **28.7 %** mandata (
  41 od 143) preferencijalno jači
  kandidat **nikad nije ušao u Sabor** — to je čista nepravda gdje izborna
  matematika (D'Hondt + redoslijed na listi) nadjačava preferencijalnu volju
  birača i nema kasnijeg "ispravljanja" kroz zamjenike.
- Dodatnih 4 kontradikcija je
  **kasnije riješeno** zamjenikom — preferencijalno jači kandidat ipak je
  ušao u Sabor jer je jedan od izvornih dobitnika preuzeo izvršnu funkciju
  ili dao ostavku, pa se lista pomaknula. Nije idealna, ali tu sustav
  zapravo "popravi" matematiku kroz kasniju realokaciju.
- U stvarnim nepravdama, birači su preferencijalno iskazali **74.9 %**
  podrške ljudima koji su ostali izvan Sabora — više od **3.0×**
  nego što su ih dali ljudima koji su sjeli na te mandate.

| # | Tip | Gubitnik (više glasova) | Glasova | Dobitnik (manje glasova) | Glasova | Razlika |
|---:|:---:|---|---:|---|---:|---:|
| 1 | ❌ | 🔴 ZLATKO HASANBEGOVIĆ | 6.163 | 🟢 VESELKO GABRIČEVIĆ | 183 | +5980 |
| 2 | ❌ | 🔴 ANTE ŠOŠIĆ | 5.604 | 🟢 DARKO KLASIĆ | 360 | +5244 |
| 3 | ❌ | 🔴 RADIMIR ČAČIĆ | 4.960 | 🟡 GORDAN BOSANAC | 428 | +4532 |
| 4 | ❌ | 🔴 SINIŠA JENKAČ | 4.935 | 🟡 IVAN MATIĆ | 506 | +4429 |
| 5 | ❌ | 🔴 DAVOR DRETAR | 4.703 | 🟡 NINA OBULJEN KORŽINEK | 506 | +4197 |
| 6 | ❌ | 🔴 LOVRO LUKAVEČKI | 4.657 | 🟢 ANA PUŽ KUKULJAN | 545 | +4112 |
| 7 | ❌ | 🔴 ŽELJKO POSAVEC | 4.561 | 🟢 KRUNOSLAV KATIČIĆ | 547 | +4014 |
| 8 | ❌ | 🔴 MARKO MARUŠIĆ | 4.336 | 🟢 IRENA DRAGIĆ | 566 | +3770 |
| 9 | ❌ | 🔴 ENIO MEŠTROVIĆ | 4.326 | 🟢 MIRO TOTGERGELI | 605 | +3721 |
| 10 | 🔵 | 🔵 DENIS KRALJ | 4.230 | 🟢 ŽELJKO REINER | 638 | +3592 |
| 11 | 🔵 | 🔵 DALIBOR MILAN | 4.220 | 🟡 TOMISLAV GOLUBIĆ | 662 | +3558 |
| 12 | ❌ | 🔴 DARIJO VASILIĆ | 4.033 | 🟢 SAŠA ĐUJIĆ | 686 | +3347 |
| 13 | ❌ | 🔴 KAROLINA VIDOVIĆ KRIŠTO | 3.785 | 🟡 GORAN IVANOVIĆ | 701 | +3084 |
| 14 | ❌ | 🔴 SAMIR HAJ BARAKAT | 3.751 | 🟢 JOSIP DABRO | 720 | +3031 |
| 15 | ❌ | 🔴 DAMIR VANĐELIĆ | 3.731 | 🟢 MIROSLAV MARKOVIĆ | 744 | +2987 |
| 16 | ❌ | 🔴 KATARINA PEOVIĆ | 3.545 | 🟢 DUBRAVKA LIPOVAC PEHAR | 759 | +2786 |
| 17 | ❌ | 🔴 ŽELJKO BURIĆ | 3.473 | 🟢 DUBRAVKO BILIĆ | 832 | +2641 |
| 18 | ❌ | 🔴 VOJKO OBERSNEL | 3.455 | 🟢 MARIJANA PULJAK | 876 | +2579 |
| 19 | ❌ | 🔴 DAVOR NAĐI | 3.387 | 🟢 BORIS PILIŽOTA | 901 | +2486 |
| 20 | ❌ | 🔴 JOSIP SAMARDŽIĆ | 3.359 | 🟢 TANJA SOKOLIĆ | 905 | +2454 |
| 21 | ❌ | 🔴 ŽARKO TUŠEK | 3.325 | 🟢 SANDRA KRPAN | 933 | +2392 |
| 22 | ❌ | 🔴 ANDREJA MARIĆ | 3.272 | 🟢 BRANKO KOLARIĆ | 982 | +2290 |
| 23 | ❌ | 🔴 BOJAN GLAVAŠEVIĆ | 3.264 | 🟡 GORDAN GRLIĆ-RADMAN | 1.036 | +2228 |
| 24 | ❌ | 🔴 BRANKO GRČIĆ | 3.166 | 🟢 MARTINA VLAŠIĆ ILJKIĆ | 1.178 | +1988 |
| 25 | ❌ | 🔴 BRANKA BAKŠIĆ-MITIĆ | 3.099 | 🟢 BOŠKA BAN VLAHEK | 1.198 | +1901 |
| 26 | ❌ | 🔴 IVAN VILIBOR SINČIĆ | 3.085 | 🟢 MARIO MILINKOVIĆ | 1.238 | +1847 |
| 27 | ❌ | 🔴 ALKA VUICA | 3.029 | 🟡 NATAŠA TRAMIŠAK | 1.260 | +1769 |
| 28 | ❌ | 🔴 JOSIP ŠARIĆ | 2.943 | 🟢 SANJA BJEŽANČEVIĆ | 1.295 | +1648 |
| 29 | ❌ | 🔴 MATE OMAZIĆ | 2.892 | 🟢 ŽELJKO GLAVIĆ | 1.320 | +1572 |
| 30 | ❌ | 🔴 VIKTOR ŠIMUNIĆ | 2.793 | 🟡 NIKOLINA BRNJAC | 1.360 | +1433 |
| 31 | ❌ | 🔴 PETRA ŠKROBOT | 2.768 | 🟢 ANTE KUJUNDŽIĆ | 1.377 | +1391 |
| 32 | 🔵 | 🔵 NEVENKO BARBARIĆ | 2.665 | 🟢 MARIJA LUGARIĆ | 1.379 | +1286 |
| 33 | ❌ | 🔴 MATO ČIČAK | 2.576 | 🟢 BARBARA ANTOLIĆ VUPORA | 1.391 | +1185 |
| 34 | ❌ | 🔴 EMIL DAUS | 2.572 | 🟢 DAMIR BAKIĆ | 1.461 | +1111 |
| 35 | ❌ | 🔴 TOMISLAV OKROŠA | 2.450 | 🟢 TOMISLAV KLARIĆ | 1.501 | +949 |
| 36 | ❌ | 🔴 MARKO PRIMORAC | 2.426 | 🟢 BRANKA JURIČEV-MARTINČEV | 1.731 | +695 |
| 37 | ❌ | 🔴 NIKOLA KAJKIĆ | 2.424 | 🟡 LUKA KORLAET | 1.773 | +651 |
| 38 | ❌ | 🔴 IVAN LOVRINOVIĆ | 2.370 | 🟢 JOSIP ĐAKIĆ | 1.860 | +510 |
| 39 | ❌ | 🔴 VALTER GLAVIČIĆ | 2.279 | 🟢 IVICA KUKAVICA | 1.945 | +334 |
| 40 | 🔵 | 🔵 DAMIR MANDIĆ | 2.249 | 🟢 DARKO SOBOTA | 1.963 | +286 |
| 41 | ❌ | 🔴 ALEMKA MARKOTIĆ | 2.246 | 🟢 NIKOLA MAŽAR | 1.993 | +253 |
| 42 | ❌ | 🔴 DAMIR MARKUŠ | 2.193 | 🟢 JASENKA AUGUŠTAN-PENTEK | 2.004 | +189 |
| 43 | ❌ | 🔴 ŽELJKO JOVANOVIĆ | 2.173 | 🟢 JOSIP OSTROGOVIĆ | 2.017 | +156 |
| 44 | ❌ | 🔴 SREĆKO SLADOLJEV | 2.145 | 🟢 DRAŽENKA POLOVIĆ | 2.040 | +105 |
| 45 | ❌ | 🔴 ĐURO CAPOR | 2.132 | 🟢 TONČI RESTOVIĆ | 2.049 | +83 |
| 46 | ✅ | 🔴 JAKOV VETMA | 2.083 | 🟡 IVICA LUKANOVIĆ | 2.183 | -100 |
| 47 | ✅ | 🔴 BRANKO HRG | 2.077 | 🟢 IVANA MARKOVIĆ | 2.219 | -142 |
| 48 | ✅ | 🔴 JAVOR BOJAN LEŠ | 2.073 | 🟢 MISLAV HERMAN | 2.332 | -259 |
| 49 | ✅ | 🔵 LJUBICA JEMBRIH | 2.014 | 🟢 ANTE DEUR | 2.369 | -355 |
| 50 | ✅ | 🔴 ŽELJKO SAČIĆ | 1.970 | 🟢 URŠA RAUKAR-GAMULIN | 2.431 | -461 |

---

## Indeksi pravednosti (objektivne mjere)

Dvije sintetičke mjere koje sažimaju ono što je pojedinačno vidljivo u
optikama i break-even tablicama. Svi brojevi se odnose isključivo na
opće liste izbornih jedinica 1–11 (vrsta 02); manjinske liste su
izostavljene jer ne dodjeljuju mandat preferencijalom unutar liste.

### A. Indeks zamjene (bait-and-switch)

Mjera u kojoj su birači glasovali za određena imena (često jaka, prepoznatljiva,
visok preferencijal), a u Saboru ih zastupa netko drugi jer su izvorno izabrani
preuzeli izvršnu funkciju (premijer, ministri, gradonačelnici).

| Mjera | Vrijednost |
|---|---:|
| Mandata u mirovanju (🟡) | 48 od 143 = **33.6 %** mandata |
| Σ preferencijala koji su otišli na 🟡 (bait) | 391.677 |
| Σ svih preferencijala na općim listama | 1.356.787 |
| **Udio preferencijalne podrške koja je "preusmjerena"** | **28.9 %** |
| Σ preferencijala 🟡 (izvorno izabranih) | 391.677 |
| Σ preferencijala 🔵 (zamjenika koji su sjeli umjesto njih) | 56.687 |
| **Omjer "obećana" : "isporučena" preferencijalna snaga** | **6.9 : 1** |
| Prosjek pref. po 🟡 | 8.159 |
| Prosjek pref. po 🔵 | 1.206 |

Interpretacija (deskriptivna):

- **33.6 %** mandata u trenutnom Saboru izvorno je
  osvojila osoba koja sada **ne sjedi** — mandat drži u mirovanju zbog
  izvršne funkcije. U te 48 situacije birači su za prepoznato ime
  dali ukupno 391.677 preferencijalnih glasova, a u Sabor su
  na njihova mjesta sjeli zamjenici koji su, zbrojeno, dobili
  56.687 preferencijala — **6.9×** manje.
- Drugim riječima, preferencijalna podrška na ovih 48 mandata
  realizirana je u Saboru na razini **61.6 %** od one
  koja je iskazana na izborima.

### B. Indeks reprezentativnog deficita

Mjera u kojoj zastupnici u trenutnom Saboru imaju (ili nemaju) preferencijalnu
podršku birača iza sebe.

| Skupina | Broj | Σ preferencijala | Prosjek | Medijan |
|---|---:|---:|---:|---:|
| 🟢 Izabran i sjedi | 95 | 480.762 | 5.060 | 3.250 |
| 🔵 Zamjenik (sjedi bez izvornog mandata) | 47 | 56.687 | 1.206 | 928 |
| 🟡 Mandat u mirovanju | 48 | 391.677 | 8.159 | 6.222 |
| 🔴 Bez mandata | 2087 | 427.661 | 204 | 40 |

| Mjera | Vrijednost |
|---|---:|
| Prosječni preferencijal 🔵 zamjenika | 1.206 |
| Prosječni preferencijal 🟢 (legitimno izabranih i sjede) | 5.060 |
| **Omjer "podrška 🟢 : podrška 🔵"** | **4.2 : 1** |
| Najmanje preferencijala kod 🟢 (donja granica izborne legitimnosti) | 183 |
| Broj 🔵 zamjenika **ispod** te granice | **1 od 47** (2.1 %) |
| Broj 🔵 s manje od 1.000 preferencijala | 25 od 47 (53.2 %) |
| Broj 🔵 s manje od 500 preferencijala | 10 od 47 (21.3 %) |
| **Udio sjedećih zastupnika koji nisu izvorno osvojili mandat** | **33.1 %** |

Interpretacija (deskriptivna):

- **33.1 %** trenutnog Sabora (47 od 142
  zastupnika) čine osobe koje **nisu** osvojile mandat odlukom birača na
  izborima — sjede kao zamjenici izvorno izabranih.
- Prosječni 🔵 zamjenik ima **4.2×** manje preferencijalnih
  glasova od prosječnog 🟢 izabranog koji sjedi.
- **1 od 47** (2.1 %)
  zamjenika sjedi u Saboru s **manje** preferencijala od najslabijeg 🟢 izvornog
  zastupnika (183). Drugim riječima, postoji skupina sjedećih
  zastupnika koji individualno nisu prešli "donji prag" izborne potvrde.

### C. Voter-fate svake preferencijalne ruke

Svaki preferencijalni glas birača na općim listama može se pratiti do
ishoda. Distribucija 1.356.787 preferencijalnih glasova
ukupno:

| Ishod glasa za kandidata | Σ glasova | Udio |
|---|---:|---:|
| 🟢 Kandidat sjedi u Saboru (izabran direktno) | 480.762 | **35.4 %** |
| 🔵 Kandidat sjedi kao zamjenik | 56.687 | 4.2 % |
| 🟡 Kandidat osvojio mandat ali ne sjedi (izvršna f.) | 391.677 | 28.9 % |
| 🔴 Kandidat nije osvojio mandat i ne sjedi | 427.661 | 31.5 % |
| **Glas birača "došao" do osobe u Saboru (🟢 + 🔵)** | 537.449 | **39.6 %** |
| **Glas birača nije rezultirao zastupljenošću (🟡 + 🔴)** | 819.338 | **60.4 %** |

Drugim riječima: od svakih 100 preferencijalnih glasova na općim listama,
**35** je pogodilo osobu koja danas sjedi
u Saboru kao izvorni izabranik, **4**
osobu koja sjedi kao zamjenik, **29**
osobu koja je izabrana ali drži mandat u mirovanju, a
**32** preferencijala dano je osobama koje
nisu prošle.

> **Napomena o čitanju:** ovi indeksi su deskriptivni. "Pravednost" /
> "nepravednost" nije matematički definirana — model se može različito
> tumačiti (D'Hondt + redoslijed na listi je ustavna i zakonita procedura;
> mirovanje mandata uz zamjenika je predviđeno zakonom). Brojevi pokazuju
> samo razliku između preferencijalne volje birača i krajnjeg sastava
> Sabora — ne i je li ta razlika "pogrešna" u normativnom smislu.

---

## Metodološke napomene

- **Manjinske liste izostavljene.** Manjinski mandati dodjeljuju se listi
  koja je sama po sebi kandidat (`rezultat_lista`), pa preferencijal po
  pojedincu unutar liste ne postoji u istom obliku kao na općim izbornim
  jedinicama.
- **`u_saboru`** se postavlja iz aktualnog rasporeda saborskih klupa
  (`scripts/fetch_sabor_seating.py`, JSON API Sabora). Snapshot u trenutku
  izgradnje indeksa.
- **Pravilo preferencijala**: "Glasovat će se za listu i moći za jednog
  kandidata s te liste; kandidat koji je dobio najmanje 10 % preferencijala
  od ukupno važećih glasova za listu pomiče se u redoslijedu prema gore."
  Implementacija u skripti: kandidati s `posto >= 10` sortirani po
  `glasova` silazno (kod izjednačenosti — po `rbr`); ostali ostaju po
  `rbr`. Prvih `mandata` na rekonstruiranoj listi su izvorni dobitnici.
- Σ glasova ne reflektira ukupnu izlaznost u IJ-ima — to su isključivo
  preferencijalni glasovi, koje birači nisu obavezni dati.

Generirano skriptom `scripts/analiza_preferencijala.py`.
