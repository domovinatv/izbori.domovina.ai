# Plan UI — premium dashboard "Izbori" (DOMOVINA branding)

*Napisano 2026-07-20. Ovaj dokument je izvor istine za izgradnju i deploy javnog
Next.js dashboarda na Cloudflare. Namijenjen je autonomnom Claude Code sessionu —
handoff prompt je u §7 i može se pokrenuti copy-paste.*

---

## 1. Cilj

Javni, brz, vizualno vrhunski dashboard hrvatskih izbornih rezultata iz ove baze —
razina dizajna na kojoj posjetitelj kaže "tko je ovo radio?". Streamlit app
(`app.py`) ostaje interni istraživački alat; dashboard je javno lice projekta.

Produkcijska meta-domena: **izbori.domovina.ai** (prvo workers.dev, domena kad
bude dostupna u Cloudflare accountu).

## 2. Arhitektonske odluke (donesene — ne otvarati ponovno)

| Odluka | Izbor | Zašto |
|---|---|---|
| Lokacija koda | `web/` poddirektorij ovog repoa | monorepo, zajednički kontekst s podacima |
| Stack | Next.js (App Router, TypeScript, Tailwind) + `@opennextjs/cloudflare` na Workers | aktualna CF preporuka; Pages je de-emphasiziran |
| Data layer v1 | **Statički JSON eksporti** iz `data/izbori.sqlite` u `web/public/data/` | baza je ~0.5–1 GiB i gitignorana — ne ide u cloud; agregati su nekoliko MB, brzi i besplatni |
| Export skripta | `scripts/export_web.py` — **NOVA datoteka**, ne mijenjati postojeće skripte | paralelni sessioni (S1–S6) rade na `mirror.py`/`build_index.py` |
| Izračuni | SVI izračuni (D'Hondt, agregati, trendovi) rade se u exportu (Python), frontend samo prikazuje | jedna istina, bez duplikacije logike u TS-u |
| Pretraga kandidata | v2 (Cloudflare D1) — NIJE u v1 | limiti D1/FTS5 se moraju verificirati kroz docs prije obećavanja |
| UI jezik | hrvatski | konvencija repoa |

## 3. Data pipeline

```
data/izbori.sqlite --scripts/export_web.py--> web/public/data/*.json --build--> Workers
```

- `manifest.json` — popis eksportiranih ciklusa + timestamp eksporta; frontend
  čita manifest i prikazuje samo ono što postoji (baza može biti u međustanju
  dok paralelni sessioni mirroraju nove cikluse).
- Po ciklusu: RH agregat (liste, glasovi, %, mandati, odaziv, nevažeći),
  po-županijski rezultati top listi, za parlament i D'Hondt mandati po IJ.
- Trendovi: gdje isti kanonski naziv stranke postoji kroz cikluse (prije S3
  normalizacije koristiti konzervativno mapiranje po vodećoj stranci liste —
  logika `leading_party()` iz `app.py` kao uzor, ali NE mijenjati `app.py`).
- Preferencijali: top 20 po preferencijalima iz parlament-2024 (+ 2020 ako je
  indeksiran) — izvor logike `analiza_preferencijala_parlament-2024.md`.
- Re-run friendly: eksport se pokreće ponovno nakon svakog novog ciklusa u bazi.

## 4. DOMOVINA branding — SVE IZ LOKALNIH REPOA (ne istraživati remote)

Kanonski izvori na ovom disku:

- **Brand tokeni**: `~/git/domovinatv/sms.domovina.ai/webhook/src/views.ts` je
  kanonska implementacija (potvrđeno u `domovina-stats/docs/03-frontend.md`).
  Izvučeno 2026-07-20: `--navy: #002F6C`, tamniji navy `#001D4A`, `--red:
  #FF0000` (trikolor akcent), `--muted: #5A6570`, `--border: #E1E5EA`,
  `--surface: #F5F7F9`, bg `#FFFFFF`. Landing domovina.ai koristi i duboki
  navy `#001a3d` za dark hero + tekst `#cdd6e6`, fontove Inter + Playfair
  Display. Dashboard: dark-first hero na dubokom navyju, sadržajne sekcije
  mogu biti light (kao sms views) — odluku donosi builder, ali hexevi se NE
  izmišljaju, uzimaju se odavde.
- **Logotipi**: `~/git/domovinatv/mediakit.domovina.tv/` — službeni SVG-ovi
  (`domovina_ai_logo_square.svg`, `domovina_logo_square.svg` …). Kopirati
  potreban SVG u `web/`, ne crtati vlastiti logo.
- **Dataviz konvencije**: `~/git/domovinatv/domovina-stats/docs/03-frontend.md`
  — non-negotiables (fiksni redoslijed kategorijskih boja, jedna os, boja prati
  entitet, sekvencijalno = jedna nijansa, hover layer, dark mode ručno biran) i
  `scripts/validate_palette.js` za validaciju palete. Prije prvog grafa učitati
  i `dataviz` skill; stranačke boje (HDZ plava, SDP crvena, Možemo zelena…)
  provući kroz validator, snap na najbliži prolazeći korak.
- **Prijašnje DOMOVINA web aplikacije za referencu stila**:
  `stranke.domovina.ai/frontend`, `klubovi.domovina.ai/frontend`,
  `zakoni.domovina.ai/frontend`, `domovina-stats/` — pogledati kako izgledaju
  prije dizajniranja, radi konzistencije ekosustava.
- Trikolora kao *suptilan* akcent (tanka linija, hover detalji), bez kiča;
  šahovnica najviše kao jedva vidljiv pattern u hero pozadini.
- Ton: ozbiljno, novinsko-analitički („FT/Economist graphics" razina).

## 5. Sadržaj v1 (redoslijed po wow faktoru)

1. **Hero** — naslov, izbor ciklusa, 3–4 ključne brojke (odaziv, mandati,
   najveća lista) s count-up animacijom.
2. **Rezultati ciklusa** — horizontalni bar chart listi + vizualizacija sastava
   Sabora (polukružni seat chart za parlamentarne cikluse).
3. **Karta** — choropleth po županijama (pobjednik / odaziv po županiji).
   GeoJSON: LOKALNO u `~/git/domovinatv/karta-hrvatske/apps/data-pipeline/`
   (`hrvatska_adm2.geojson` = JLS/općine, ima i naselja i ZG JLS; provjeriti
   ima li županijski sloj ili ga derivirati dissolveom iz adm2). Taj repo je
   podatkovni sloj za gis.domovina.ai — koristiti njega, NE tražiti GeoJSON
   na webu. Simplify za web (< ~300 KB po sloju).
4. **Trendovi** — linije udjela stranaka kroz cikluse (koliko baza pokriva).
5. **Preferencijali** — top kandidati po preferencijalnim glasovima; teaser
   nalaza iz postojeće analize (npr. raspon 176 vs 37.531 glasova za mandat).
6. **Metodologija + footer** — izvor podataka (DIP arhiva), link na GitHub repo,
   napomena o ogradama, DOMOVINA.ai brand potpis.

Responsive (mobitel prvo lomljenje), a11y (kontrast na navy pozadini!),
mikroanimacije na scroll (umjereno), OG meta + social card.

## 6. Deploy na Cloudflare

- **Presedan postoji lokalno**: `karta-hrvatske/apps/karta-web` je LIVE na
  gis.domovina.ai (Cloudflare Pages, projekt `gis-domovina`, deploy kroz
  `npm run deploy` → wrangler) — dakle domovina.ai zona JE u Cloudflare
  accountu i custom domena `izbori.domovina.ai` je izvediva. Pogledati
  njihov deploy setup (package.json scripts, wrangler config) kao uzor.
  I `domovina-stats/docs/04-deploy-and-cron.md` opisuje CF direct deploy.
- Prije konfiguracije pročitati `cloudflare` + `wrangler` +
  `workers-best-practices` skillove i verificirati aktualni preporučeni put
  za Next.js na CF (OpenNext/Workers vs Pages) — ne oslanjati se na memoriju.
- Auth: `npx wrangler whoami`; ako nije prijavljen, tražiti korisnika da
  pokrene `! npx wrangler login` (interaktivno) pa nastaviti.
- Prvo deploy na testni URL, verifikacija, pa vezanje `izbori.domovina.ai`.
- Worker/projekt naziv: `izbori-domovina-ai`.
- Deploy naredbe i finalni URL zapisati u README i u Dnevnik (§8).

## 7. Handoff prompt za autonomni session (copy-paste)

```text
Radiš autonomno u repou /Users/ms/git/domovinatv/izbori.domovina.ai. Prvo
pročitaj CLAUDE.md, README.md i PLAN_UI.md — PLAN_UI.md je potpuna
specifikacija i izvor istine; ovaj prompt je samo sažetak.

Zadatak: izgradi i deployaj premium javni dashboard "Izbori — DOMOVINA.ai":
Next.js (App Router, TypeScript, Tailwind), kod u web/ poddirektoriju, UI na
hrvatskom, deploy na Cloudflare. Cilj kvalitete: posjetitelj kaže "wow, tko
je ovo radio" — razina FT/Economist graphics, ne generički admin template.

SVE REFERENCE SU LOKALNE — ne istražuj brand ni podatke po webu:
- Brand tokeni: ~/git/domovinatv/sms.domovina.ai/webhook/src/views.ts
  (kanonski: --navy #002F6C, #001D4A, --red #FF0000 trikolor akcent, --muted
  #5A6570; dark hero može #001a3d + tekst #cdd6e6, Inter + Playfair Display).
  Hexeve ne izmišljaj. Detalji: PLAN_UI.md §4.
- Logotipi: ~/git/domovinatv/mediakit.domovina.tv/ (službeni SVG-ovi).
- Dataviz pravila: ~/git/domovinatv/domovina-stats/docs/03-frontend.md
  (non-negotiables + validate_palette.js) + učitaj dataviz skill prije
  prvog grafa.
- Stil ekosustava: pogledaj stranke.domovina.ai/frontend,
  klubovi.domovina.ai/frontend, zakoni.domovina.ai/frontend, domovina-stats.
- GeoJSON za kartu: ~/git/domovinatv/karta-hrvatske/apps/data-pipeline/
  (hrvatska_adm2.geojson i srodni; simplify < ~300 KB po sloju).
- Deploy presedan: karta-hrvatske/apps/karta-web je live na gis.domovina.ai
  (CF Pages projekt gis-domovina, npm run deploy → wrangler) — zona
  domovina.ai JE u Cloudflare accountu.

Ograničenja (kritično):
- U repou PARALELNO rade drugi autonomni sessioni na scripts/mirror.py,
  scripts/build_index.py i data/ — te datoteke NE diraj. Tvoje su: web/**,
  NOVA skripta scripts/export_web.py, README (samo dodatak o webu) i
  PLAN_UI.md dnevnik (§8). Baza data/izbori.sqlite može biti u međustanju —
  eksportiraj cikluse koji postoje i zapiši ih u manifest.json.
- SVI izračuni u Pythonu (export), frontend samo prikazuje. Ne implementiraj
  D'Hondt ni agregacije u TypeScriptu.
- Podaci na dashboardu MORAJU odgovarati bazi: napiši spot-check koji 5+
  vrijednosti iz eksporta usporedi sa SQL upitima na bazi i rezultat zapiši
  u PLAN_UI.md §8. Ništa se ne hardkodira i ne izmišlja; ako podatka nema
  u bazi, sekcija se ne prikazuje.

Koraci:
1. scripts/export_web.py → web/public/data/ (manifest + po-ciklusni agregati
   + trendovi + preferencijali; detalji u PLAN_UI.md §3).
2. Next.js app u web/ sa sekcijama iz PLAN_UI.md §5 (hero s count-up
   brojkama, rezultati + polukružni seat chart, choropleth županija,
   trendovi, preferencijali, metodologija/footer s izvorima). Responsive,
   a11y kontrast, OG meta. Prije CF konfiguracije učitaj cloudflare +
   wrangler + workers-best-practices skillove i verificiraj aktualni
   preporučeni put za Next.js na CF (OpenNext/Workers vs Pages).
3. Deploy (naziv: izbori-domovina-ai). Provjeri `npx wrangler whoami`; ako
   nisi prijavljen, zamoli korisnika da pokrene `! npx wrangler login` pa
   nastavi. Nakon verifikacije veži custom domenu izbori.domovina.ai
   (zona postoji — uzor: karta-web deploy setup).
4. Verifikacija: produkcijski URL mora posluživati stvarne podatke (curl
   provjera + screenshot ako je browser dostupan); Lighthouse cilj LCP<2.5s
   na mobitelu. Rezultate + finalni URL zapiši u PLAN_UI.md §8 i README.
5. Conventional commits (engleski) po logičkim koracima. NE pushaj na
   GitHub.

Radi potpuno autonomno; jedina dopuštena pauza je wrangler login. Završna
poruka: URL deploya, popis commitova, rezultat spot-checka, što nije
dovršeno i zašto.
```

## 8. Dnevnik (puni session ovdje)

### 2026-07-20 — prvi UI session (build + deploy)

**Deploy: https://izbori.domovina.ai** (Workers custom domena, D.O.M. account;
preview: https://izbori-domovina-ai.d-o-m.workers.dev). Worker
`izbori-domovina-ai`, deploy naredba: `cd web && npm run deploy`.

**Commitovi:**

- `520d658` feat: export_web.py — static JSON aggregates for the web dashboard
- `8b3974a` feat(web): Next.js dashboard — hero, results, seat chart, choropleth, trends
- `aa29d56` feat(web): Cloudflare Workers deploy — static export on izbori.domovina.ai
- (docs commit: ovaj dnevnik + README dodatak)

**Arhitektonska korekcija (§2):** Next.js (App Router, TS, Tailwind 4) na
Workers stoji, ali **bez OpenNext server adaptera**: adapter 1.20.1 je za
potpuno statični SSG site svejedno renderirao rute u runtimeu (fs poziv u
Workers okruženju → 500). Budući da je stranica 100 % SSG, koristi se
`output: "export"` → `out/` posluženo kao **Workers static assets** (bez
server koda). CF docs verificirani 2026-07-20: Workers je preporučeni put,
Pages de-emphasiziran.

**Spot-check (produkcija vs. SQL na data/izbori.sqlite), 6/6 OK:**

| Vrijednost | Produkcija | SQL |
|---|---:|---:|
| parlament-2024 HDZ lista, RH glasova | 697.841 | 697.841 |
| parlament-2024 ukupno mandata (opći+manjine) | 151 | 151 |
| predsjednik-2024 2. krug, Grad Zagreb, pobjednik glasova | 240.508 | 240.508 |
| preferencijali top 1 (Anušić) | 37.531 | 37.531 |
| referendum-2013 ZA glasova | 946.433 | 946.433 |
| parlament-2020 ukupno mandata | 151 | 151 |

Isti spot-check nad lokalnim eksportom: `python3 scripts/export_web.py --check`
(8/8 OK). Eksport pokriva **9 ciklusa** (uklj. povijesne 2019–2021 koje su
paralelni sessioni indeksirali tijekom rada); re-run nakon novih ciklusa:
`python3 scripts/export_web.py --geo && cd web && npm run deploy`.

**Performanse (emulirani mobitel, Slow 4G + 4× CPU throttle, Chrome trace):**
LCP **1,42 s** (< 2,5 s cilj), CLS **0,00**, TTFB 28 ms. Glavni preostali
trošak je render-delay (font + CSS); backlog: `font-display: optional` ili
subset.

**Dataviz:** stranačka paleta validirana `domovina-stats/scripts/validate_palette.js`
(svih 5 provjera PASS; CVD worst-pair 7,0 u 6–8 bandu → mitigirano 2 px
razmacima + izravnim oznakama; kontrast WARN za IDS/FOKUS → tablice uz svaki
graf). GeoJSON županija iz karta-hrvatske, mapshaper 12 % + rewind za d3-geo,
185 KiB.

**Poznata ograničenja:**

- Lokalni ciklusi prikazuju samo župansku utrku (vrsta 15) — nema RH agregata
  u bazi; načelnici/gradonačelnici i vijeća su backlog (§9).
- Preferencijali samo za parlament-2024 (u_saboru flag postoji samo za
  aktualni saziv).
- Trendovi stranaka konzervativno mapirani po vodećoj stranci liste (kao
  `leading_party()` u app.py); prava normalizacija čeka S3.
- OG social card je logo (SVG); generator pravih 1200×630 kartica je u §9.

### 2026-07-20 (nastavak) — port analize pravednosti + grop drill-down

Na temelju usporedbe sa starim Streamlit UI-jem portano u premium dashboard:

- **Analiza pravednosti** (parlament-2024, sekcija `#pravednost`): iskorišteni
  vs. propali glasovi + % zastupljenih birača, disparitet IJ (glasova/mandatu,
  omjer 1,46× XI. vs VI.), kontrafaktual RH kao jedna IJ (D'Hondt 143, 5 %
  nac. prag), kandidati u ekstremima (gubitnici / odbili mandat 48/143 /
  najmanje preferencijala u Saboru) i „Sabor po preferencijalima"
  (preklapanje 98/143). Sve izračunato u `export_web.py::export_fairness()`
  (port `app.py::render_parlament_fairness`), frontend samo prikazuje.
- **Drill-down po gradovima/općinama** (sve stranice, sekcija `#gradovi`):
  `grop/{slug}/{p1}.json` (174 datoteka, 10,2 MiB, lazy-load po jedinici);
  lokalni ciklusi nose vijeće (08) + načelničku utrku (17, finalni krug).
  Grad Zagreb nema grop razinu za državne cikluse (DIP kvirk — grad =
  županija), pa ga index ispravno izostavlja.
- Spot-check proširen na 12 provjera (svih 12 OK); dodatni produkcijski
  spot-check nakon deploya: Vuletić 176, odbili 48, kontrafaktual Σ=143,
  Samobor 2. krug 13.166 — sve odgovara SQL-u na bazi.
- Commitovi: `7ac9dd2` (export), `e45e128` (UI). Deploy verzija `3948854b`.
- Nije portano (i dalje): FTS pretraga (v2, D1), razina biračkih mjesta
  (v2, D1 — ~35k datoteka je previše za static export), statistika baze
  („O bazi" tab je interni), tehnički detalji p1/p2/p3.

### 2026-07-20 (nastavak 2) — „Pravednost u brojkama" + gubitnici↔dobitnici + verifikacija osoba

Dvije nove sekcije na `/parlament-2024`, obje **iznad** „Rezultati na razini
Hrvatske" (odmah nakon hero headera):

- **`#pravednost-brojke` „Pravednost u brojkama"** — za svaku koalicijsku
  obitelj s mandatima par horizontalnih pruga: **udio biračkog tijela**
  (glasovi kao % svih 3.523.270 upisanih birača, `biraci_ukupno` IJ 001–011)
  naspram **udjela u Saboru** (% svih 151 mandata — geografski 143 + 8
  manjinskih; denominator naveden u legendi). Redovi: 8 obitelji + red
  **Nacionalne manjine** (55.505 glasova = 1,6 % biračkog tijela → 8 mandata
  = 5,3 % Sabora, zastupljenost ×3,4 — najveći ekstrem) + red **Propali
  glasovi** (194.147 = 5,5 % biračkog tijela → 0 mandata). Particija čista:
  obitelj = glasovi lista s mandatima grupirani po vodećoj stranci; propali =
  glasovi lista bez ijednog mandata (ista definicija kao `propali_rh`, pa se
  brojke na stranici slažu). Ostatak (38,2 %, 1.346.986) = nije glasovalo /
  nevažeći — u fusnoti, izračunat u exportu. Sve u
  `export_web.py::export_fairness()` pod ključem `brojke`.
- **`#gubitnici-dobitnici` „Najveći gubitnici ↔ najveći dobitnici"** — 
  side-by-side, top 10 sa svake strane na **zajedničkoj skali glasova**
  (asimetrija 6.163 : 176 je poanta): lijevo najviše preferencijala bez
  D'Hondtova mandata i bez mjesta u sazivu, desno najmanje preferencijala
  među zastupnicima koji sjede (badge **D'Hondt mandat / Zamjenik** iz
  `dhondt` polja). Podaci iz postojećih `gubitnici`/`namjestenici` +
  novo polje `sabor_stranka`/`sabor_klub` (sabor.hr snimka).

**Stranačka pripadnost — sanacija rizika halucinacije:** polje `stranka` je
heuristika `leading_party()` (prva stranka koalicijske liste), NE članstvo.
U UI-ju se sada nigdje ne prikazuje kao članstvo: nove sekcije pišu
„lista: …", obojena točka je označena kao vodeća stranka liste, a header
„Stranka" u starim tablicama pravednosti preimenovan u „Vodeća stranka
liste". Za zastupnike koji sjede prikazuje se stvarna stranka iz
interaktivne sabornice sabor.hr (`sifarnici/sabor_2024_seating.json`,
snimka 2026-04-30) — upravo je ona pokazala da bi heuristika krivo
etiketirala npr. Vuletića (lista SDP → stvarno **HSS**), Gabričevića
(lista HDZ → **HSU**), Čabaja (lista DP → **DOMINO**), Kordića (lista
MOST → **Hrvatski suverenisti**), Klasića (lista HDZ → **HSLS**).

**Spot-check proširen 12 → 19 provjera** (svih 19 OK): zbroj mandata svih
redova = 151, denominator birača = SQL, propali red = SQL, HDZ obitelj =
SQL, manjine = SQL, svih 25 gubitnika (glasovi + u_saboru=0) i svih 25
namještenika (glasovi + u_saboru=1) potvrđeni u bazi, sabor.hr stranka
razriješena za svih 25.

**Verifikacija svake osobe (50/50 OK, 0 ispravaka)** — skripta u
scratchpadu usporedila svaku osobu s (a) mirroranim DIP JSON-om
(`source_file` iz baze: ime, glasovi, rbr, naziv liste), (b) službenim DIP
PDF izvješćem (`scripts/grep_pdf.py` asset; ime nađeno + broj glasova
neposredno uz ime na stranici) i (c) sabornicom sabor.hr (sjedi/ne sjedi +
stranka). Nijedna vrijednost nije trebala ispravak.

**Gubitnici (top 25 preferencijala bez mandata i bez Sabora):**

| Osoba | Lista (kako je prijavljena DIP-u) | IJ | Pref. glasova | Izvor (mirror DIP JSON · službeni PDF) | Stranka (sabor.hr) | Status |
|---|---|---:|---:|---|---|---|
| Zlatko Hasanbegović | DP, PRAVO I PRAVDA, BLOK … | 1 | 6.163 | `r_02_001_0000_000.json` · PDF str. 5 | — | OK |
| Ante Šošić | HDZ, HSLS, HDS, HNS, HSU | 10 | 5.604 | `r_02_010_0000_000.json` · PDF str. 91 | — | OK |
| Radimir Čačić | SDP, CENTAR, HSS, "DO i SIP" … | 3 | 4.960 | `r_02_003_0000_000.json` · PDF str. 23 | — | OK |
| Siniša Jenkač | HDZ, HSLS, HDS, HNS, HSU | 3 | 4.935 | `r_02_003_0000_000.json` · PDF str. 24 | — | OK |
| Davor Dretar | DP, PRAVO I PRAVDA, DHSS, ZELENA LISTA | 3 | 4.703 | `r_02_003_0000_000.json` · PDF str. 25 | — | OK |
| Lovro Lukavečki | SDP, CENTAR, HSS, "DO i SIP" … | 3 | 4.657 | `r_02_003_0000_000.json` · PDF str. 23 | — | OK |
| Željko Posavec | SDP, CENTAR, HSS, "DO i SIP" … | 3 | 4.561 | `r_02_003_0000_000.json` · PDF str. 23 | — | OK |
| Marko Marušić | HDZ, HSLS, HDS, HNS, HSU | 2 | 4.336 | `r_02_002_0000_000.json` · PDF str. 14 | — | OK |
| Enio Meštrović | RIČARD NEZAVISNI | 10 | 4.326 | `r_02_010_0000_000.json` · PDF str. 93 | — | OK |
| Darijo Vasilić | IDS, PGS, UNIJA, ISU - PIP … | 8 | 4.033 | `r_02_008_0000_000.json` · PDF str. 72 | — | OK |
| Karolina Vidović Krišto | OIP | 1 | 3.785 | `r_02_001_0000_000.json` · PDF str. 6 | — | OK |
| Samir Haj Barakat | SDP, CENTAR, HSS, "DO i SIP" … | 4 | 3.751 | `r_02_004_0000_000.json` · PDF str. 34 | — | OK |
| Damir Vanđelić | FOKUS, REPUBLIKA | 1 | 3.731 | `r_02_001_0000_000.json` · PDF str. 6 | — | OK |
| Katarina Peović | RF | 8 | 3.545 | `r_02_008_0000_000.json` · PDF str. 73 | — | OK |
| Željko Burić | HDZ, HSLS, HDS, HNS, HSU | 9 | 3.473 | `r_02_009_0000_000.json` · PDF str. 80 | — | OK |
| Vojko Obersnel | SDP, CENTAR, HSS, "DO i SIP", GLAS | 7 | 3.455 | `r_02_007_0000_000.json` · PDF str. 62 | — | OK |
| Davor Nađi | FOKUS, REPUBLIKA | 6 | 3.387 | `r_02_006_0000_000.json` · PDF str. 53 | — | OK |
| Josip Samardžić | HDZ, HSLS, HDS, HNS, HSU | 5 | 3.359 | `r_02_005_0000_000.json` · PDF str. 42 | — | OK |
| Žarko Tušek | HDZ, HSLS, HDS, HNS, HSU | 3 | 3.325 | `r_02_003_0000_000.json` · PDF str. 24 | — | OK |
| Andreja Marić | SDP, CENTAR, HSS, "DO i SIP" … | 3 | 3.272 | `r_02_003_0000_000.json` · PDF str. 23 | — | OK |
| Bojan Glavašević | SDP, CENTAR, HSS, "DO i SIP" … | 2 | 3.264 | `r_02_002_0000_000.json` · PDF str. 15 | — | OK |
| Branko Grčić | SDP, CENTAR, HSS, "DO i SIP" … | 9 | 3.166 | `r_02_009_0000_000.json` · PDF str. 80 | — | OK |
| Branka Bakšić-Mitić | SDP, CENTAR, HSS, "DO i SIP", GLAS | 7 | 3.099 | `r_02_007_0000_000.json` · PDF str. 62 | — | OK |
| Ivan Vilibor Sinčić | DP, PRAVO I PRAVDA | 8 | 3.085 | `r_02_008_0000_000.json` · PDF str. 73 | — | OK |
| Alka Vuica | SDP, CENTAR, HSS, "DO i SIP" … | 6 | 3.029 | `r_02_006_0000_000.json` · PDF str. 52 | — | OK |

**Namještenici (25 najmanjih preferencijala među zastupnicima koji sjede):**

| Osoba | Lista (kako je prijavljena DIP-u) | IJ | Pref. glasova | Izvor (mirror DIP JSON · službeni PDF) | Stranka (sabor.hr) | Status |
|---|---|---:|---:|---|---|---|
| Darko Vuletić | SDP, CENTAR, HSS, "DO i SIP" … | 6 | 176 | `r_02_006_0000_000.json` · PDF str. 52 | HSS | OK |
| Veselko Gabričević | HDZ, HSLS, HDS, HNS, HSU | 7 | 183 | `r_02_007_0000_000.json` · PDF str. 61, 69 | HSU | OK |
| Marin Živković | MOŽEMO! - POLITIČKA PLATFORMA | 6 | 185 | `r_02_006_0000_000.json` · PDF str. 52 | Možemo! | OK |
| Ljubica Lukačić | HDZ, HSLS, HDS, HNS, HSU | 1 | 191 | `r_02_001_0000_000.json` · PDF str. 4 | HDZ | OK |
| Ivica Baksa | NPS | 3 | 242 | `r_02_003_0000_000.json` · PDF str. 24 | NPS | OK |
| Krešimir Čabaj | DP, PRAVO I PRAVDA, NEZAVISNI, DHSS … | 4 | 331 | `r_02_004_0000_000.json` · PDF str. 34 | DOMINO | OK |
| Martin Kordić | MOST, HRVATSKI SUVERENISTI, HKS, NLM | 5 | 343 | `r_02_005_0000_000.json` · PDF str. 43 | Hrvatski suverenisti | OK |
| Darko Klasić | HDZ, HSLS, HDS, HNS, HSU | 1 | 360 | `r_02_001_0000_000.json` · PDF str. 4, 12 | HSLS | OK |
| Jelena Miloš | MOŽEMO! - POLITIČKA PLATFORMA … | 2 | 380 | `r_02_002_0000_000.json` · PDF str. 16 | Možemo! | OK |
| Maksimilijan Šimrak | HDZ, HSLS, HDS, HNS, HSU | 1 | 406 | `r_02_001_0000_000.json` · PDF str. 4 | HDZ | OK |
| Maria Blažina | SDP, CENTAR, HSS, "DO i SIP", GLAS | 8 | 430 | `r_02_008_0000_000.json` · PDF str. 71 | SDP | OK |
| Marko Pavić | HDZ, HSLS, HDS, HNS, HSU | 6 | 475 | `r_02_006_0000_000.json` · PDF str. 51 | HDZ | OK |
| Ivana Ribarić Majanović | SDP, CENTAR, HSS, "DO i SIP" … | 5 | 538 | `r_02_005_0000_000.json` · PDF str. 43 | SDP | OK |
| Ana Puž Kukuljan | SDP, CENTAR, HSS, "DO i SIP", GLAS | 8 | 545 | `r_02_008_0000_000.json` · PDF str. 71, 78 | SDP | OK |
| Krunoslav Katičić | HDZ, HSLS, HDS, HNS, HSU | 2 | 547 | `r_02_002_0000_000.json` · PDF str. 14, 21 | HDZ | OK |
| Irena Dragić | SDP, CENTAR, HSS, "DO i SIP" … | 9 | 566 | `r_02_009_0000_000.json` · PDF str. 80, 89 | SDP | OK |
| Ivo Zelić | HDZ, HSLS, HDS, HNS, HSU | 4 | 604 | `r_02_004_0000_000.json` · PDF str. 33 | HDZ | OK |
| Miro Totgergeli | HDZ, HSLS, HDS, HNS, HSU | 2 | 605 | `r_02_002_0000_000.json` · PDF str. 14, 21 | HDZ | OK |
| Stipan Šašlin | HDZ, HSLS, HDS, HNS, HSU | 4 | 624 | `r_02_004_0000_000.json` · PDF str. 33 | HDZ | OK |
| Josip Borić | HDZ, HSLS, HDS, HNS, HSU | 8 | 629 | `r_02_008_0000_000.json` · PDF str. 72 | HDZ | OK |
| Željko Reiner | HDZ, HSLS, HDS, HNS, HSU | 1 | 638 | `r_02_001_0000_000.json` · PDF str. 4, 12 | HDZ | OK |
| Anita Curiš Krok | SDP, CENTAR, HSS, "DO i SIP" … | 3 | 648 | `r_02_003_0000_000.json` · PDF str. 23 | SDP | OK |
| Saša Đujić | SDP, CENTAR, HSS, "DO i SIP", GLAS | 8 | 686 | `r_02_008_0000_000.json` · PDF str. 71, 78 | SDP | OK |
| Josip Dabro | DP, PRAVO I PRAVDA | 5 | 720 | `r_02_005_0000_000.json` · PDF str. 43, 50 | DP | OK |
| Vesna Bedeković | HDZ, HSLS, HDS, HNS, HSU | 4 | 722 | `r_02_004_0000_000.json` · PDF str. 33 | HDZ | OK |

Napomena: manjinski zastupnici (8) nisu u usporedbi — biraju se na posebnim
listama bez preferencijalnog glasovanja (lista JE kandidat); navedeno u
fusnoti sekcije.

## 9. Backlog v2+

- **D1 pretraga kandidata** — verificirati aktualne D1 limite i FTS podršku
  kroz službene docs; ako FTS5 nije podržan, fallback LIKE + prefiks indeks.
- **Choropleth po općinama** (556 poligona) + BM drill-down.
- **Preferencijali kroz cikluse** — čim S4 analiza završi, nova sekcija.
- **OG image generator** po ciklusu (social sharing).
- **Usporedni mod** — dva ciklusa side-by-side sa swing strelicama.
- **i18n EN** — engleski toggle za međunarodnu publiku.
