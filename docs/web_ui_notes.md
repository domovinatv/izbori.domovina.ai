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
