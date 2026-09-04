# Web dashboard (izbori.domovina.ai) — operativne bilješke

*Zapisano 2026-07-20 nakon prva dva UI sessiona. Dopuna PLAN_UI.md §8 —
ovdje je znanje koje nije očito iz koda.*

## Runbook

```bash
# 1) Re-export podataka (read-only nad bazom; --geo regenerira kartu županija)
python3 scripts/export_web.py --geo --check   # --check MORA proći (12/12)

# 2) Lokalni pregled builda (next start NE radi s output:"export"!)
cd web && npm run build && npx wrangler dev --port 3300

# 3) Deploy (D.O.M. account, worker izbori-domovina-ai)
cd web && npm run deploy
```

- Produkcija: https://izbori.domovina.ai (custom domena preko
  `routes[].custom_domain` u `web/wrangler.jsonc`); preview:
  https://izbori-domovina-ai.d-o-m.workers.dev
- Nakon deploya novi asseti mogu ~30 s vraćati 404/500 (propagacija) —
  ne dijagnosticirati prerano, pričekati pa ponoviti curl.
- `curl`/`urllib` bez browser User-Agenta dobiva **403** (CF bot zaštita) —
  za produkcijske provjere uvijek slati `User-Agent: Mozilla/5.0 …`.

## Arhitektonske činjenice (ne otvarati ponovno bez razloga)

- **Bez OpenNext adaptera.** `@opennextjs/cloudflare` 1.20.1 je i za čisti
  SSG renderirao rute u runtimeu (fs poziv u Workers okruženju → 500).
  Zato `next.config.ts` ima `output: "export"`, a `out/` se servira kao
  Workers **static assets** (bez server koda). CF docs (2026-07): Workers
  preporučen, Pages de-emphasiziran.
- **GeoJSON winding**: d3-geo traži vanjske prstene u smjeru kazaljke
  (suprotno RFC 7946); `export_web.py::build_zupanije_geojson()` radi
  rewind, inače se karta rendira kao puni pravokutnik ("crveni kvadrat").
- **Šifre županija**: DIP p1 (01–21) == službeni `broj_zupanije` iz
  `hr_canonical_zupanije.geojson` — verificirano po imenima svih 21.
- **Grad Zagreb kvirk**: za državne cikluse nema grop-razinu (grad ==
  županija 21), pa ga grop drill-down index ispravno izostavlja; za
  lokalne izbore gradonačelnik ZG živi na zup razini (vidi README).
- **Stranačka paleta** (`web/lib/palette.ts`) validirana
  `domovina-stats/scripts/validate_palette.js` (5/5 PASS uz mitigacije:
  2 px razmaci, izravne oznake, tablice uz grafove). Ako se boje mijenjaju,
  ponovo provući kroz validator; redoslijed slotova je CVD mehanizam.
- **`stranka` polje u exportima je heuristika** `leading_party()` — prva
  imenovana stranka koalicijske liste, **ne stvarno članstvo kandidata**.
  DIP arhiva ne nosi stranačku pripadnost pojedinog kandidata; kandidat
  pripada listi. U UI-ju to tumačiti kao "vodeća stranka liste".

## Stanje funkcionalnosti vs. stari Streamlit UI (2026-07-20)

Portano: rezultati po ciklusima (9), sastav Sabora, choropleth, trendovi,
preferencijali, **analiza pravednosti** (kompletna), **drill-down
grad/općina** (svi ciklusi; lokalni = vijeće 08 + načelnik 17 finalni krug).
Novo (isti dan, nastavak 2): **„Pravednost u brojkama"** (udio biračkog
tijela vs. udio Sabora po koalicijskim obiteljima + manjine + propali;
`fairness.json::brojke`) i **„Najveći gubitnici ↔ najveći dobitnici"**
(preferencijalni ekstremi, zajednička skala) — obje sekcije prve na
`/parlament-2024`, svih 50 osoba verificirano protiv DIP JSON + PDF +
sabor.hr (tablica u PLAN_UI §8). Stvarna stranka zastupnika u UI-ju dolazi
isključivo iz `sabor_2024_seating.json` (`sabor_stranka`), nikad iz
`leading_party()` heuristike.

Svjesno NIJE portano (backlog §9): FTS pretraga kandidata (čeka D1),
razina biračkih mjesta (~35k datoteka — čeka D1), statistika baze,
tehnički detalji p1/p2/p3.

## Gotche iz sessiona 2026-07-20 (nastavci 2–4)

- **Produkcijski grep protiv SSG HTML-a**: React static export ubacuje
  `<!-- -->` između susjednih tekstualnih čvorova (granice JSX izraza), pa
  `grep "vlast ×81"` ili `grep "stranka: HSS"` NE matcha („vlast ×<!-- -->81").
  U curl provjerama matchati samo literale koji su u JSX-u jedan string,
  nikad tekst koji prelazi granicu `{izraza}`. (Dva puta pojelo vrijeme.)
- **Tailwind 4 translate**: `-translate-y-1/2` ide kroz CSS `translate`
  svojstvo, a ne `transform` — inline `style={{transform}}` se KOMBINIRA s
  klasom (offseti se zbroje, label završi izvan pruge). Za oznake unutar
  bara koristiti `left`/`right` pozicioniranje, ne transform.
- **Saziv ≠ 151**: snimka sabornice (2026-04-30) ima 150 zastupnika, od
  toga 142 iz geografskih IJ — desni stupac gubitnici↔dobitnici zato broji
  142 „sjede", navedeno u fusnoti sekcije.
- **Verifikacija osoba je skriptirana**: `python3
  scripts/verify_fairness_persons.py` (170 person-checkova: 25+25 top
  liste + 60+60 parovi; DIP JSON preko source_file + DIP PDF + sabornica).
  Pokrenuti nakon svake promjene fairness exporta; rezultat 2026-07-20:
  0 failova (tablice: `docs/verifikacija_gubitnici_dobitnici_2024.md`).

## Podatkovni oprezi za buduće sekcije

- `posto` u `rezultat_lista` zna biti NULL (npr. predsjednik-2019 krug 2)
  — export računa fallback iz glasova; ne oslanjati se na kolonu direktno.
- RH red za parlament je sintetički zbroj IJ 001–011 (`build_index.py`);
  ista koalicija se pojavljuje kao više lista ako joj se sastav razlikuje
  po IJ (npr. HDZ 2020 = 48+11+7 mandata kroz tri liste) — grupirati po
  `leading_party` gdje treba jedan red.
- Manjinski zastupnici: lista JE kandidat (`rezultat_lista`, p1='012',
  vrsta 13–63); `u_saboru` flag postoji samo na `rezultat_kandidat`
  (parlament-2024) i ne pokriva manjine.
- Mandat po D'Hondtu ≠ sjedi u Saboru: 48 izabranih drži mandat u
  mirovanju; `u_saboru` odražava trenutni saziv (snapshot
  `sifarnici/sabor_2024_seating.json`).

---

## Izborni simulator (`/simulator`)

*Dodano 2026-09-03.*

### Runbook

```bash
python3 scripts/export_simulator.py --check   # SQLite → web/public/data/simulator/
node web/lib/sim/verify.mjs                   # 109 provjera, MORA proći
cd web && npm run dev                         # http://localhost:3000/simulator
```

`verify.mjs` je uvjet, ne formalnost: dokazuje da TypeScript engine reproducira
službeni rezultat 2024. i 2020. **mandat za mandat, po listi i po jedinici**.
To je ono što opravdava odstupanje od pravila „svi izračuni u Pythonu"
(`PLAN_UI.md` §2). Ako padne, ne diraj UI dok ne prođe.

Node ≥ 22.6 sam skida TypeScript tipove pri importu, pa `verify.mjs` testira
**isti** kod koji ide u bundle. `lib/sim/ts-loader.mjs` samo pomiruje
extensionless importe (koje traži `moduleResolution: "bundler"`) s Nodeovim
resolverom — nije transpiler.

### Zašto je matematika u TS-u

Interaktivni simulator mora preračunati raspodjelu na svaki pomak klizača.
Podaci su sitni (165 lista + 2.277 kandidata za 2024. = 89 KB), pa se oba
ciklusa čitaju u build-timeu i inline-aju — bez fetcha, bez loading statea.

### Gotchas

- **`toFixed()` daje točku, ne zarez.** Sve decimalne vrijednosti idu kroz
  `fmtDec()` iz `lib/format.ts`. Prvi prolaz je pokazivao „7.04" pored „13,1 %".
- **Hrvatski navodnici u TS stringu.** `„…"` mora završiti U+201C, a ne ASCII
  `"` — ASCII zatvara string literal i Node javlja
  `ERR_INVALID_TYPESCRIPT_SYNTAX`. Pojelo jedan build.
- **Root layout ima `min-h-screen` na `<body>`.** `/simulator` iz toga izlazi
  preko `fixed inset-0 overflow-hidden` u vlastitom `app/simulator/layout.tsx`,
  a NE mijenjanjem `globals.css` — to bi razbilo 9 stranica koje scrollaju.
- **Za nula unutarnjeg scrolla treba ≥ 957 px visine viewporta.** Na 1080p
  monitoru to prolazi i u prozoru (~990) i fullscreen. Ispod toga scrollaju
  samo dvije lijeve ploče, ne stranica.
- **Jedinstvena IJ mora spajati po obitelji, ne po nazivu liste.** Spajanje po
  nazivu (kako radi `export_web.py::export_fairness`) razbije koaliciju koja je
  u različitim jedinicama nastupala pod različitim imenom na više podpražnih
  lista i onda je izbriše: DP 2024. je pokazivao **0 mandata na 9,6 % glasova**.
  To je artefakt imenovanja, ne svojstvo sustava.
- **Kompenzacijski mandati moraju biti korektivni, ne paralelni.** Paralelna
  D'Hondt raspodjela nagrađuje iste velike liste koje je nagradila i ona po
  jedinicama, pa nerazmjernost *raste* (7,04 → 7,20). Korektivna raspodjela
  (cilj = razmjeran udio u uvećanom saboru, dodjela onima koji zaostaju) daje
  7,04 → 5,19.

### Nalazi vrijedni citiranja

- **Spuštanje praga na 0 % ne mijenja nijedan mandat.** Efektivni prag u
  14-mandatnoj jedinici je ~5,5–6,5 %, dakle već viši od zakonskih 5 %.
  Prag djeluje samo prema gore (10 % → Gallagher 7,04 → 11,46).
- **Pet lista je 2024. prešlo 5 % i ostalo bez mandata** (npr. MOŽEMO!+Srđ je
  grad, IJ X, 11.407 = 5,27 %).
- **HDZ + DP = 75**, jedan mandat manje od većine — stvarna situacija 2024.

### Tri različite definicije „propalih glasova"

Ne miješati; sve tri su točne i odgovaraju na različita pitanja (puni izračun i
izvori: `docs/izborni_sustav_cinjenice.md` §9):

| Definicija | 2024, IJ I–X |
|---|---:|
| Rollup po nacionalnom nazivu liste — **definicija `fairness.json`** | 194.147 (9,15 %) |
| Liste ispod praga, po jedinici | 236.881 (11,39 %) |
| Liste bez ijednog mandata, po jedinici | 270.135 (12,98 %) |

Brojka „194.000" koja kruži javno **potječe iz ovog repoa**, ne iz DIP-a.
Simulator prikazuje drugu i treću, s eksplicitnim nazivnikom.

### Što simulator NE radi

Ne predviđa glasove i nema model javnog mnijenja. Klizači pomaka su
pretpostavka koju zadaje korisnik; rezultat je determinističa posljedica te
pretpostavke, ne prognoza. Zato svaki broj u UI-u nosi oznaku podrijetla
(`ZAKON` / `PODACI` / `KONTRAFAKTUAL` / `PRETPOSTAVKA` / `KONSTRUKCIJA`).

Također: broj parova gubitnik↔dobitnik u simulatoru (45 za 2024.) **nije** isti
kao u `fairness.json` (60). Simulator pita *tko je osvojio mandat po zakonu*,
`fairness.json` pita *tko danas sjedi u Saboru* (`u_saboru`, nakon 48 odbijenih
mandata). Različita pitanja, oba točna.

### Otvoreno nakon ovog sessiona

- **`components/charts/SeatArc.tsx` vjerojatno ima isti hidracijski mismatch.**
  Dijeli originalni `seatSlots()` iz kojeg je preslikan simulatorov luk, a
  `Math.cos/Math.sin` nisu bit-identični između Nodea i V8. U simulatoru je
  riješeno zaokruživanjem koordinata na 3 decimale
  (`components/sim/Hemicycle.tsx`, helper `px()`). **Nije provjereno** na
  postojećim stranicama — provjeriti konzolu na `/parlament-2024`.
- **Prag u XI. izbornoj jedinici** je prekidač s defaultom „primjenjuje se".
  Tekstualno stoji, ali je izričita uputnica na čl. 41 obrisana 2015. i nikad
  nije bilo ishodovno relevantno. Ako se nađe DIP dokument koji to razrješava,
  maknuti prekidač.
- **Mobilni dizajn** stoji na `MobileNotice`. Kad se radi, radi se kao zaseban
  tok, ne kao responzivni desktop.
