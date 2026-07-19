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

## 9. Backlog v2+

- **D1 pretraga kandidata** — verificirati aktualne D1 limite i FTS podršku
  kroz službene docs; ako FTS5 nije podržan, fallback LIKE + prefiks indeks.
- **Choropleth po općinama** (556 poligona) + BM drill-down.
- **Preferencijali kroz cikluse** — čim S4 analiza završi, nova sekcija.
- **OG image generator** po ciklusu (social sharing).
- **Usporedni mod** — dva ciklusa side-by-side sa swing strelicama.
- **i18n EN** — engleski toggle za međunarodnu publiku.
