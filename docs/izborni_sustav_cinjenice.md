# Izborni sustav za Hrvatski sabor — činjenična osnova

*Single source of truth za `web/lib/sim/` (izborni simulator). Svaka tvrdnja
nosi citat članka ili izračun iz baze. Sastavljeno 2026-09-03 provjerom
primarnih izvora (zakon.hr, narodne-novine.nn.hr, izbori.hr) i unakrsnom
provjerom protiv `data/izbori.sqlite`.*

**Pravilo:** ako brojka nije ovdje potvrđena, ne ulazi u UI simulatora.

---

## 0. Legenda oznaka

Simulator svaki broj označava podrijetlom. Iste oznake koriste se i ovdje:

| Oznaka | Značenje |
|---|---|
| `ZAKON` | Doslovno iz propisa, s člankom |
| `PODACI` | Izračunato iz `data/izbori.sqlite` (DIP arhiva) |
| `PRETPOSTAVKA` | Naša odluka jer propis šuti ili nije dohvatljiv |
| `KONSTRUKCIJA` | Teorijski primjer, nije se dogodio |

## 1. Izvori prava

| Propis | Verzija | URL |
|---|---|---|
| **ZIZHS** — Zakon o izborima zastupnika u Hrvatski sabor | pročišćeni tekst NN 116/99 … 98/19, na snazi od 1. 1. 2020, **bez izmjena poslije** | https://www.zakon.hr/z/355/ |
| **ZIJ** — Zakon o izbornim jedinicama | NN 114/23, 125/23, na snazi 3. 11. 2023. | https://www.zakon.hr/z/3574/ |
| **Ustav RH** | pročišćeni tekst | https://www.zakon.hr/z/94/ |
| ZIZHS (izvorni tekst 1999) | NN 116/99 | https://narodne-novine.nn.hr/clanci/sluzbeni/1999_11_116_1854.html |
| Izmjene koje su uvele preferencijale | NN 19/15 | https://narodne-novine.nn.hr/clanci/sluzbeni/2015_02_19_398.html |

## 2. Sastav Sabora — `ZAKON`

**151 mandat = 140 + 3 + 8.**

- **ZIZHS čl. 38 st. 1** — *„140 zastupnika u Sabor, ne računajući zastupnike
  nacionalnih manjina i zastupnike koje biraju hrvatski državljani koji nemaju
  prebivalište u Republici Hrvatskoj, bira se tako da se područje Republike
  Hrvatske podijeli na **deset izbornih jedinica** te se u svakoj izbornoj
  jedinici bira **14 zastupnika**."*
- **ZIZHS čl. 8** — dijaspora bira **tri** zastupnika u posebnoj izbornoj jedinici.
- **Ustav čl. 45 st. 2** — *„…birači koji nemaju prebivalište u Republici
  Hrvatskoj imaju pravo izabrati **tri zastupnika**…"*
  → **broj 3 je ustavna, ne zakonska kategorija.** Promjena traži 2/3 većinu.
- **ZIZHS čl. 16 st. 2** — pripadnici nacionalnih manjina biraju **osam**
  zastupnika.
- **Ustav čl. 72** — Sabor ima 100–160 zastupnika.

### Numeriranje jedinica — riješeno

**XI. = dijaspora. XII. = nacionalne manjine.** To su dvije različite jedinice
i obje oznake su istovremeno točne.

- **ZIJ čl. 12** — *„**XI. izborna jedinica**: Zasebna izborna jedinica za izbor
  zastupnika … koje biraju hrvatski državljani koji nemaju prebivalište u
  Republici Hrvatskoj."*
- **ZIJ čl. 13** — *„**XII. izborna jedinica**: Izborna jedinica koju čini
  cjelokupno područje Republike Hrvatske u kojoj pripadnici nacionalnih manjina
  … biraju svoje zastupnike."*
- Potvrda u DIP-ovim podacima: `raw_dao/parlament-2024-dao.js` →
  `{ "code": "012", "label": "XII. nacionalne manjine" }`; agregat dijaspore je
  `r_02_011_0000_000.json` s `"ijNaziv": "XI. IZBORNA JEDINICA"`.

⚠️ **Opseg mirrora:** repo pokriva IJ 001–011. IJ XII živi pod drugom URL
shemom (`r_{13|23|33|43|53|63}_012_0000_000.json`) i **nije** u sintetičkom
RH agregatu. Zbog toga se odaziv iz ove baze razlikuje od javno citiranog
(§8).

## 3. Prag — `ZAKON`

**ZIZHS čl. 41**, cijeli članak:

> *„Pravo na sudjelovanje u diobi zastupničkih mjesta u izbornoj jedinici
> ostvaruju liste koje na izborima dobiju najmanje **5% važećih glasova
> birača**."*

- Prag je **po izbornoj jedinici**, ne nacionalni.
- **Isti za samostalne stranke i za koalicije.** Zakon ne poznaje povišeni
  koalicijski prag — to je izravan uzrok dominacije koalicijskih lista u RH.
- Baza je **važeći glasovi u toj jedinici** (`rezultat.listici_vazeci`), ne
  izašli birači i ne upisani birači.

**Primjena u IJ XI (dijaspora): `PRETPOSTAVKA`.** Čl. 41 je generički
(„u izbornoj jedinici") i čl. 44 ga ne isključuje, ali izričita uputnica iz
zakona iz 1999. (čl. 45: dioba *„prema odredbama članka 40. do 42."*) obrisana
je s NN 19/15. Nikad nije bilo ishodovno relevantno — 2020. i 2024. HDZ-ova su
prva tri kvocijenta u XI. tukla svaki suparnički prvi. → u simulatoru je to
prekidač, s defaultom „prag se primjenjuje".

## 4. Raspodjela mandata — `ZAKON` + jedna rupa

**ZIZHS čl. 40 al. 1**:

> *„…ukupan broj važećih glasova koji je dobila svaka lista (biračka masa liste)
> dijeli se brojevima od **1 do zaključno 14**, pri čemu se uvažavaju i decimalni
> ostaci. Od svih dobivenih rezultata, zastupnička mjesta … osvajaju one liste na
> kojima se iskaže **14 brojčano najvećih rezultata**…"*

Čisti D'Hondt. `„uvažavaju se decimalni ostaci"` znači samo *ne krati kvocijente*
— ne uvodi nikakav dodatni korak s ostacima.

### ⚠️ Zakon NEMA pravilo za neriješene kvocijente — `PRETPOSTAVKA`

Pretraga cijelog pročišćenog teksta: riječi ***ždrijeb*/*žrijeb* ne postoje**.
Jedina pravila o izjednačenju u cijelom zakonu su:

- **čl. 40 al. 3 / čl. 44 al. 3** — izjednačeni *preferencijalni* glasovi
  *kandidata na istoj listi*: *„odlučujući je poredak na listi kandidata."*
  (determinističko)
- **čl. 46** — izjednačenje u *manjinskoj* jedinici: *„izbori se ponavljaju."*
  (pravno determinističko, računski nesimulabilno)

**To je regresija iz 2015.** Izvorni čl. 40 (NN 116/99) je imao pravilo:

> *„Ako su glasovi tako podijeljeni da se ne može utvrditi koja bi između dviju
> ili više lista dobila koje zastupničko mjesto, ono će pripasti onoj listi koja
> je dobila više glasova."*

Ta je rečenica **izbrisana** kad je NN 19/15 čl. 24 zamijenio cijeli čl. 40
preferencijalnom verzijom.

**Odluka simulatora** (`TIE_BREAK_ASSUMPTION` u `web/lib/sim/allocate.ts`):
poredak `(kvocijent ↓, ukupni glasovi liste ↓, redni broj liste ↑)`.
Drugi kriterij je analogija na pravilo iz 1999.; treći je čista konvencija.
UI to mora prikazati kao pretpostavku, nikad kao zakon.

**Implementacijska napomena:** postojeći `dhondt()` u `scripts/build_index.py:317`
koristi *float* dijeljenje i `max()` koji vraća prvi ključ u redoslijedu SQL
redaka. Simulator umjesto toga uspoređuje cjelobrojno — `vA·(sB+1)` vs
`vB·(sA+1)` — pa nema zaokruživanja ni ovisnosti o redoslijedu.

## 5. Preferencijalni glasovi — `ZAKON`

**ZIZHS čl. 40 al. 2–4** (opće jedinice) i **čl. 44 al. 2–4** (dijaspora,
identičan tekst). Mehanika listića: **čl. 76 st. 3**.

Algoritam točno kako ga zakon propisuje:

1. D'Hondt dodijeli listi L broj mandata `m`.
2. **Filtar:** preferencijalni glas kandidata `c` vrijedi samo ako
   `pref(c) ≥ 0,10 × glasovi(L u toj jedinici)`.
   Nazivnik su **glasovi te liste u toj jedinici** — ne važeći glasovi jedinice.
3. **Preslagivanje:** samo kvalificirani, silazno po preferencijalnim glasovima;
   izjednačeni po izvornom `rbr` uzlazno. Oni uzimaju mandate prvi.
4. **Dopuna:** ako je kvalificiranih manje od `m`, ostatak ide *„po redoslijedu
   na listi"*, preskačući već izabrane.

Posljedica: kandidat s 14. mjesta i ≥10 % preskače nositelja liste; kandidat s
9,9 % je nevidljiv preslagivanju čak i ako je nadglasao sve.

- **Ne primjenjuje se na manjine** — čl. 16 st. 3.
- **Primjenjuje se na dijasporu** — čl. 44.
- **Zamjenici** (čl. 42 st. 2–5) slijede ista pravila, uz dodatni uvjet da
  zamjenik na koalicijskoj listi dolazi **iz iste stranke**. Taj uvjet nije
  izvediv iz DIP podataka (DIP bilježi samo naziv koalicijske liste).

## 6. Manjinski mandati — `ZAKON`

**ZIZHS čl. 17** — fiksna zakonska podjela, nije razmjerna:

| Manjina | Mandata | `vrsta` u bazi |
|---|---:|---|
| srpska | **3** | `13` |
| mađarska | 1 | `23` |
| talijanska | 1 | `33` |
| češka i slovačka | 1 | `43` |
| austrijska, bugarska, njemačka, poljska, romska, rumunjska, rusinska, ruska, turska, ukrajinska, vlaška, židovska | 1 | `53` |
| albanska, bošnjačka, crnogorska, makedonska, slovenska | 1 | `63` |

**Formula — čl. 46:** *„…**pojedinačnim izborom** tako da je za zastupnika
izabran kandidat koji je dobio najveći broj glasova… Ako dva ili više kandidata
dobiju isti broj glasova, **izbori se ponavljaju**."* → većinski (FPTP), ne D'Hondt.

**Srpska podjedinica je *block vote*** — 3 mandata, birač zaokružuje do 3
kandidata. `PODACI`: 2024. je srpska utrka imala 15.353 važeća listića, a zbroj
glasova kandidata je 36.904 — moguće samo s više oznaka po listiću.
`PRETPOSTAVKA`: granica „najviše 3" dolazi iz obvezatnih uputa DIP-a, ne iz
ZIZHS-a (čl. 77 st. 3 ne navodi broj).

**Manjinski birač gubi teritorijalni listić** — **čl. 76 st. 1**: birač može
glasovati *„za kandidacijsku listu prema mjestu prebivališta **ILI** zatražiti
glasački listić za izbor predstavnika nacionalnih manjina"*. Jedan listić.
2024. je 34.819 birača odabralo manjinski listić.

## 7. Dijaspora — sadašnji i predzakonski model

### Sadašnji (od NN 145/10 + ustavne promjene 2010.) — `ZAKON`

- **3 mandata**, fiksno (Ustav čl. 45 st. 2, ZIZHS čl. 8).
- **čl. 43** — dijasporska lista ima *„najmanje šest a najviše četrnaest
  kandidata"* (opće liste imaju točno 14, čl. 20 st. 5–6).
- **čl. 44 al. 1** — djelitelji 1…3, ali tekst je zadržao **staru formulaciju
  „zajedničkog djelitelja"**: *„…**treći rezultat po redu jest zajednički
  djelitelj** kojim se dijeli ukupan broj važećih glasova svake kandidacijske
  liste…"*

  Matematički identično „uzmi 3 najveća kvocijenta" **osim na točnom
  izjednačenju**, gdje čitanje preko zajedničkog djelitelja dodijeli 4 mandata.
  Simulator koristi semantiku čl. 40 (3 najveća kvocijenta) i to bilježi kao
  odstupanje. `PRETPOSTAVKA`

- **Glasovanje samo u DKP-u** — Ustav čl. 45 st. 3. Nema dopisnog ni
  elektroničkog glasovanja. Zato DIP za XI. prijavljuje odaziv 100,00 %
  (`biraciUkupno == biraciGlasovalo`): ne postoji birački popis dijaspore, samo
  oni koji su došli.

**Regresijski test `PODACI`:** 2020., IJ XI — HDZ 17.905 (kvocijenti 17905 /
8952,5 / **5968,33**) protiv Nezavisne liste Željko Glasnović 5.958 → HDZ uzima
sva 3, Glasnović promašuje za 10,33. 2024., IJ XI — HDZ 32.108 (79,45 %), sva 3.

### Predzakonski „nefiksni" model (ZIZHS 1999 čl. 44–45) — simulabilan

> *„Ukupni broj važećih glasova birača u deset izbornih jedinica … dijeli se sa
> 140 … Dobivenim rezultatom (količnikom) dijeli se broj važećih glasova u
> posebnoj izbornoj jedinici. Rezultat … jest broj zastupnika koji je izabran u
> posebnoj izbornoj jedinici. **Ako rezultat nije cijeli broj, zaokružuje se na
> cijeli broj od 0,5 na više, a ispod 0,5 na niže.**"*

```
q    = važeći(IJ I–X) / 140            # prosječna "cijena" mandata
S_XI = round_half_up( važeći(IJ XI) / q )
# zatim D'Hondt s djeliteljima 1…S_XI unutar XI; čl. 45 (1999) izričito
# upućuje na čl. 40–42, dakle prag od 5 % se primjenjuje
```

Nije bilo zakonskog stropa; praktični je bio Ustav čl. 72 (160 zastupnika).

`PODACI`: pod brojkama iz 2024. taj model daje
`40.412 / (2.080.367/140) = 2,72 → 3` mandata — **praktički isto kao danas**.
To je politički zanimljiv nalaz koji simulator treba iznijeti.

⚠️ `NEPOTVRĐENO`: povijesni ishodi (2000: 6, 2003: 4, 2007: 5 mandata) dolaze iz
medijskih izvora. Preračunati iz DIP CSV ciklusa kad S2 bude gotov.

## 8. Neujednačenost jedinica i Ustavni sud

### Pravilo ±5 % postoji u dva propisa i ne znači isto — `ZAKON`

- **ZIZHS čl. 39 st. 1** — *„…tako da se **broj birača u izbornim jedinicama ne
  smije razlikovati više od + - 5 %**."* Naivno čitanje je **parno** (nijedne
  dvije jedinice ne smiju se razlikovati >5 %).
- **ZIJ čl. 14 st. 3** — *„**Broj birača u pojedinoj izbornoj jedinici ne smije
  se razlikovati više od + – 5 % od osnove**…"*, gdje je osnova prosjek
  (`ukupno birača / 10`, čl. 14 st. 1–2).

**To nisu iste stvari** — parni test je otprilike dvostruko stroži. Simulator
mora imenovati koji test primjenjuje.

Nadzor: ZIJ čl. 15 (ministarstvo prati **tromjesečno**, obavještava Vladu *„bez
odgode"*) i čl. 16 (Vlada izvještava Sabor **dvaput godišnje**).

### Stvarno odstupanje 2024. — `PODACI`

Prosjek IJ I–X = 348.215 birača.

| IJ | Birača | Odstupanje |
|---:|---:|---:|
| I | 341.023 | −2,07 % |
| II | 345.398 | −0,81 % |
| III | 349.058 | +0,24 % |
| IV | 351.860 | +1,05 % |
| V | 336.652 | **−3,32 %** |
| VI | 352.234 | +1,15 % |
| VII | 340.923 | −2,09 % |
| VIII | 355.951 | +2,22 % |
| IX | 350.941 | +0,78 % |
| X | 358.110 | **+2,84 %** |

Sve unutar ±5 % od prosjeka → **ZIJ čl. 14 je zadovoljen**. Ali parni raspon
max/min = **6,37 %** → strogo čitanje ZIZHS čl. 39 **nije** zadovoljeno.

### Ustavni sud — `ZAKON`

1. **U-I-3789/2003**, 8. 12. 2010., NN 142/10 — *„Izvješće o nejednakoj težini
   biračkog glasa"*. Upozorenje, ne ukidanje. Sabor ga je ignorirao 12 godina.
2. **U-I-4089/2020 i dr.**, 7. 2. 2023., NN 24/23 — **ukinuti čl. 2.–11.** starog
   ZIJ-a s odgodom do **1. 10. 2023.** Nalazi: IJ IV i IX razlikovale se
   **92.946 birača** (2015.); *nijedna jedinica nije bila unutar dopuštenog
   odstupanja od više od tri druge*.
3. **U-I-4116/2023 i dr.**, 6. 2. 2024., NN 20/2024 — prigovori na **novu** kartu
   **odbijeni u cijelosti**, uz 5 izdvojenih mišljenja. Odluka je pala 10 tjedana
   prije izbora 2024.

**2024. su prvi izbori po novoj karti.** Zato je usporedba 2020. ↔ 2024. u
simulatoru smislena: pokazuje što je prekrajanje stvarno napravilo.

## 9. Brojke iz 2024. — `PODACI`, provjereno u bazi

Izbori 17. 4. 2024. (16. 4. u inozemstvu; djelomično ponavljanje 21. 4. u IJ V).

### Odaziv ovisi o opsegu — tri točna odgovora

| Opseg | Upisanih | Glasovalo | Odaziv |
|---|---:|---:|---:|
| IJ I–X (samo teritorijalne) | 3.482.150 | 2.140.824 | **61,48 %** |
| IJ I–XI (opseg ove baze) | 3.523.270 | 2.181.944 | **61,93 %** |
| IJ I–XII (javno citirano) | 3.558.089 | 2.216.763 | **62,30 %** |

Razlika se točno raspada: XI. doprinosi 41.120, XII. 34.819, a DIP za obje
prijavljuje **100,00 % odaziva** (upisani ≡ glasovali, po konstrukciji).
→ **Javnih 62,30 % je napuhano**: 75.939 birača u nazivniku po definiciji su svi
izašli. Metodološki pošten domaći odaziv je **61,48 %**.

Važećih (I–XI) 2.120.779 · nevažećih 59.632 (2,73 %).

⚠️ Nerazriješeno pitanje odaziva 2020. (baza 46,47 % vs javnih 46,9 %,
`docs/STANJE_I_NASTAVAK.md` §3) vrlo je vjerojatno **isti efekt IJ XII** —
provjeriti zbrajanjem manjinske jedinice 2020.

### Mandati — engine mora reproducirati točno ovo

| Lista / koalicija | I–X | XI | Ukupno | Glasova | % važećih |
|---|---:|---:|---:|---:|---:|
| HDZ, HSLS, HDS, HNS, HSU | 58 | 3 | **61** | 729.949 | 34,42 % |
| SDP, Centar, HSS, DO i SIP, Reformisti, Glas | 42 | 0 | **42** | 538.748 | 25,40 % |
| DP, Pravo i pravda (+ partneri) | 14 | 0 | **14** | 202.714 | 9,56 % |
| MOST, Hrvatski suverenisti, HKS, NLM | 11 | 0 | **11** | 169.988 | 8,02 % |
| MOŽEMO! (+ partneri) | 10 | 0 | **10** | 193.051 | 9,10 % |
| IDS, PGS, Unija … | 2 | 0 | **2** | 32.728 | 1,54 % |
| NPS | 2 | 0 | **2** | 25.830 | 1,22 % |
| FOKUS, Republika | 1 | 0 | **1** | 47.715 | 2,25 % |
| **Ukupno geografski** | **140** | **3** | **143** | | |
| Manjine (IJ XII) | | | **8** | | |
| **Sabor** | | | **151** | | |

HDZ po jedinicama (regresijski test): 5, 6, 5, 7, 7, 4, 7, 4, 7, 6 (+3 u XI).
Rijeke pravde: 4, 4, 6, 4, 3, 4, 4, 6, 3, 4.

### Propali glasovi — TRI različite definicije, sve točne

Ovo je najčešći izvor zabune. Sve tri su izračunate iz baze:

| Definicija | IJ I–X | % | Napomena |
|---|---:|---:|---|
| Rollup po **nacionalnom nazivu liste** | 194.147 | 9,15 % | **Definicija ovog repoa** (`fairness.json.propali_rh`). Darežljiva: koalicija koja je osvojila mandat *bilo gdje* računa se kao „iskorištena" *svugdje*. |
| Liste **ispod praga**, po jedinici | **236.881** | 11,39 % | Najuži pravno smislen pojam |
| Liste **bez ijednog mandata**, po jedinici | **270.135** | 12,98 % | Stvarna nezastupljenost |

⚠️ Brojka „194.000" koja kruži **potječe iz ovog repoa**, ne iz DIP-a ni medija.
Citirati je smije samo uz definiciju. Za IJ I–XI iznosi 240.032 / 278.439.

Četvrta, potpuno različita brojka: `fairness.ekstremi.gubitnici_ukupno.glasova`
= 173.594 — to su glasovi 60 kandidata s najvišim preferencijalima bez mandata.
Ne miješati.

### Prag ne jamči mandat — `PODACI`

Pet lista je 2024. prešlo 5 % i ostalo bez mandata:

| IJ | Lista | Glasova | % |
|---|---|---:|---:|
| III | DP, PRAVO I PRAVDA, DHSS, ZELENA LISTA | 10.714 | 5,06 % |
| IV | MOŽEMO! – POLITIČKA PLATFORMA, HOĆEMO PRAVEDNO | 11.133 | 5,50 % |
| X | MOŽEMO! – POLITIČKA PLATFORMA, SRĐ JE GRAD | 11.407 | 5,27 % |
| XI | MOST | 2.684 | 6,64 % |
| XI | HRVATSKO BILO | 2.469 | 6,11 % |

Efektivni prag u 14-mandatnoj jedinici sa 4–6 ozbiljnih lista je **~5,5–6,5 %**.

### „40,4 % vlasti s 20,7 % biračkog tijela" — potvrđeno

- 61 / 151 = **40,40 %** ✅
- HDZ-ove liste 729.949 / 3.523.270 upisanih (I–XI) = **20,72 %** ✅

Uz napomenu: nazivnik uključuje 41.120 iz XI. koji su svi „izašli". Prema samo
domaćem registru (3.482.150) udio je 20,05 %; prema važećim glasovima 34,42 %;
prema izašlima 33,45 %. Sve četiri su obranjive — treba imenovati koju koristiš.

## 10. Mjere nerazmjernosti — `PODACI`

Izračunato nad rollupom po `leading_party()`. Nijedna od ovih mjera ne postoji
u repou prije simulatora (`PLAN_POBOLJSANJA.md` ih vodi kao backlog S4).

| Mjera | 2024 | 2020 | Tumačenje |
|---|---:|---:|---|
| **Gallagher (LSq)** | **7,04** | 7,42 | <2 vrlo razmjerno, 2–5 umjereno, **>5 visoka nerazmjernost** |
| Loosemore–Hanby | 12,62 | 13,01 | Ukupno odstupanje |
| ENP glasovi (Laakso–Taagepera) | 4,79 | 4,44 | Efektivni broj stranaka |
| ENP mandati | 3,46 | 3,19 | Sustav „pojede" ~1,3 stranke |
| Max amplifikacija (% mandata ÷ % glasova) | **1,24×** HDZ | 1,24× HDZ | |
| Birača/mandat, max÷min (I–X) | **1,064×** | **1,311×** | Zakonski test |
| Važećih glasova/mandat, max÷min | 1,333× | 1,381× | **Razlika u odazivu, ne u granicama** |

⚠️ **Dvije metrike koje se ne smiju miješati.** *Birača* po mandatu mjeri
granice jedinica (zakonski test, 2024. uredan). *Važećih glasova* po mandatu
mjeri stvarnu cijenu mandata, a razlika dolazi iz **odaziva**. Nazvati drugo
„gerrymanderingom" bilo bi činjenično netočno.

Gallagher od 7,0 je stvaran nalaz: za razmjeran sustav to je visoko.

## 11. Sljedeći izbori — `ZAKON`, uz nesigurnost

- **Ustav čl. 73 st. 1** — mandat traje **četiri godine**.
- **Ustav čl. 74 st. 1** — izbori **najkasnije 60 dana** nakon isteka mandata ili
  raspuštanja.
- **Ustav čl. 78** — prijevremeno raspuštanje apsolutnom većinom svih zastupnika.
- **ZIZHS čl. 5** — izbore raspisuje **Predsjednik**; ≥30 dana između stupanja
  odluke na snagu i dana izbora; izborni dan je neradni.

`PODACI`: izbori 17. 4. 2024.; **11. saziv konstituiran 16. 5. 2024.**
→ mandat ističe ~16. 5. 2028., vanjski ustavni rok ~**15. 7. 2028.**
Realan prozor: proljeće do sredine srpnja 2028.

⚠️ `NEPOTVRĐENO`: teče li *„istek mandata"* iz čl. 74 od **dana izbora** ili od
**konstituiranja** nije razriješeno ni u Ustavu ni u ZIZHS-u, a odluka Ustavnog
suda o tome nije pronađena. Razlika je mjesec dana. Engleska Wikipedija navodi
„do 30. travnja 2028." — **za to nije nađena pravna osnova**.

⚠️ **Bazna stopa:** Hrvatska nije odradila puni mandat od 2015. I 2020. (5. 7.) i
2024. (17. 4.) došli su nakon samoraspuštanja. Datum sljedećih izbora je
parametar, ne činjenica.

## 12. Reforma u tijeku (stanje 2026-09) 

**Zakon nije mijenjan.** ZIZHS je i dalje tekst 98/19; ZIJ je NN 114/23 + 125/23.

1. **Dijaspora 3 → više.** 29. 5. 2026., na sjednici Savjeta za Hrvate izvan RH,
   premijer Plenković izjavio je da je Vlada spremna ukinuti ustavni limit od tri
   mandata i *„vratiti kako je bilo prije 2010."* Traži **ustavnu promjenu (2/3)**,
   koju koalicija nema. DP predlaže referendumski put. Nema prijedloga zakona ni
   roka. → **najvrjedniji alternativni scenarij za simulator** (§7).
2. **Dva zastupnička prijedloga** u prvom čitanju: **P.Z. 137** (Selak Raspudić) i
   **P.Z. 295** (Klub SDP-a), oba mijenjaju ZIZHS. ⚠️ `NEPOTVRĐENO` — sadržaj i
   status nisu dohvaćeni (sabor.hr vraća 404 na izravni dohvat).
3. **Čišćenje registra birača** („400.000 fantomskih birača") — ponavljajući
   oporbeni zahtjev. Svako čišćenje pomiče i nazivnik odaziva i granice jedinica.
4. **Nije na stolu:** promjena praga od 5 %, broja jedinica, D'Hondta ni
   preferencijalnog praga od 10 %.

## 13. Popis nepotvrđenog

Ovo se ne smije pojaviti u UI-u kao činjenica:

| Stavka | Status |
|---|---|
| „~194.000 propalih glasova" kao *neutralna* brojka | Točna samo uz definiciju repoa (§9) |
| „Sljedeći izbori do 30. 4. 2028." | Nema pravne osnove; ~15. 7. 2028. je ustavni rok |
| Teče li mandat od izbora ili konstituiranja | Nije razriješeno, nema odluke US-a |
| Primjenjuje li se prag od 5 % u IJ XI | Tekstualno da, uputnica obrisana 2015. |
| „Najviše 3 oznake" na srpskom manjinskom listiću | Empirijski sigurno, ali iz uputa DIP-a, ne iz zakona |
| Povijesni broj dijasporskih mandata (2000/2003/2007) | Samo mediji; preračunati iz CSV-a u S2 |
| DIP 3.482.150 (2024) vs registar 3.609.130 (Q3 2025) | Različite populacije, nisu pomirene |
| Sadržaj P.Z. 137 i P.Z. 295 | sabor.hr nedohvatljiv |
