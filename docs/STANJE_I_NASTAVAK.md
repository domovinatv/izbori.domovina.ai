# Stanje projekta i nastavak rada

*Zapisano 2026-07-20 na kraju orkestratorskog sessiona. Ovaj dokument je
polazna točka za novi (prazan) chat — sadrži sve što je naučeno, a nije
očito iz koda ili git povijesti.*

---

## 1. Gdje smo

### Gotovo ✅

- **S1 — povijesni JSON ciklusi**: `parlament-2020`, `predsjednik-2019`,
  `lokalni-2021`, `euparlament-2019` mirrorani, indeksirani i verificirani
  protiv službenih rezultata. Detalji i verifikacijske tablice:
  `docs/mirror_povijest_notes.md`.
- **Web dashboard**: Next.js static export na Cloudflare Workers, live na
  **izbori.domovina.ai** (custom domenu složio Matija ručno). Dnevnik rada,
  odluke i gotchas: `PLAN_UI.md` §8 i `docs/web_ui_notes.md`.
  Dodatno napravljeno u tom sessionu: fairness sekcija, drill-down po
  gradovima/općinama, „Pravednost u brojkama", parovi gubitnika/dobitnika,
  per-person power factor. Verifikacija: `docs/verifikacija_gubitnici_dobitnici_2024.md`.

### Stanje baze

`data/izbori.sqlite` ≈ **1,06 GiB** (gitignorano):
137.888 `rezultat`, 1.142.434 `rezultat_lista`, 8.173.039 `rezultat_kandidat`.

| Ciklus | Redaka `rezultat` |
|---|---:|
| lokalni-2021 | 39.573 |
| lokalni-2025 | 36.046 |
| predsjednik-2019 | 14.174 |
| predsjednik-2024 | 12.606 |
| parlament-2020 | 7.300 |
| parlament-2024 | 7.284 |
| referendum-2013 | 7.187 |
| euparlament-2019 | 7.072 |
| euparlament-2024 | 6.646 |

### Preostalo (redom)

**S2** (CSV ciklusi 2003–2017 + PDF-ovi) → **S3** (normalizacija stranaka i
osoba) → **S4** (longitudinalne analize) ∥ **S5** (odaziv/BM screening) →
**S6** (refactor, testovi, app tabovi). Puni promptovi: `PLAN_POBOLJSANJA.md` §4.

---

## 2. Naučeno o DIP arhivi (ne ponavljati istraživanje)

- **`p1` je troznamenkast za parlamentarne izbore** — `r_02_001_…` radi,
  `r_02_01_…` je 404. Ovo je koštalo vremena; zapisano i u README i ovdje.
- **DAO JS po ciklusu** (`app/dao/{vrsta}/{slug}-dao.js`) je izvor istine za
  `vrsta` kodove i p1/p2/p3 logiku. Popis svih ciklusa: router stanja u
  `arhiva-izbora/app.js`.
- **Pokrivenost**: JSON od 2019 naovamo; CSV unatrag do 2003 (parlament
  2016/2015/2011/2007/2003, predsjednik 2014/2009, lokalni 2017/2013,
  euparlament 2014/2013). Starije od toga nema strojno čitljivo.
- **Kandidacijske liste i službeni dobitnici mandata postoje SAMO kao PDF**
  (`kandidatura/k_*.pdf`, `izabrani/i_*.pdf`) — nema JSON/CSV ekvivalenta, a
  sadrže puno informacija. Mirror ide u S2, parsiranje je backlog (S7).
- **404-ovi su serverski**: arhiva prijavljuje više `bmUkupno` nego što je
  objavila datoteka (npr. Zadar 2019: BM 072–084 ne postoje; Tounj 2019: samo
  agregat). Nije bug mirrora.

## 3. Otvorena pitanja (za nekoga tko nastavlja)

- ⚠️ **Odaziv parlament-2020**: baza daje **46,47 %** (1.706.696 / 3.672.555),
  javno se navodi **46,9 %**. Nije razriješeno — moguće razlike u tretmanu
  inozemstva, korekcijama popisa birača ili nazivniku. Do razrješenja citirati
  kao „vrijednost iz DIP arhive".
- `rezultat_lista.posto` je NULL za predsjednik-2019 → postotke računati iz
  glasova. Provjeriti isto za buduće stare cikluse.
- `rezultat_lista.mandata` je NULL za euparlament-2019; EU mandate ne
  rekonstruirati bez vanjskog izvora (SDP-ov 4. mandat aktiviran tek po Brexitu).
- Šifre gradova/općina mijenjaju se kroz cikluse — za usporedbe kroz vrijeme
  spajati po (županija, naziv) uz dokumentirane iznimke.

## 4. Naučeno o načinu rada (orkestracija)

- Mirror/rebuild poslovi traju satima ali su **lokalne skripte — ne troše
  tokene**. Agent spava dok proces radi. S1 je kroz cijelu noć potrošio
  ~140k tokena; analitički sessioni (S3/S4) bit će skuplji (~300–600k).
- **Subagenti se znaju zaustaviti tvrdeći da čekaju pozadinski proces.**
  Prije buđenja provjeriti `ps aux | grep mirror.py` i tail loga: ako proces
  stvarno radi — pustiti ga (buđenje bez novog stanja je čist trošak); ako je
  pao — probuditi ga sa SendMessage.
- Kad paralelno rade dva sessiona (npr. UI u drugom prozoru), svakom
  eksplicitno reći koje su datoteke tuđe i da commita **selektivno**, nikad
  `git add -A`. U ovom ciklusu je UI session commitao S1-ov WIP u
  `ce6220a` — prošlo je dobro, ali je moglo zamrsiti povijest.
- Subagenti nasljeđuju model orkestratora. Za mehaničke faze (S1/S2/S6) model
  je manje bitan; za S3/S4 (prosudba o spajanju entiteta, metodološke odluke)
  koristiti najjači dostupni model.

## 5. Brand i deploy (sve lokalno, ne tražiti po webu)

- Brand tokeni: `~/git/domovinatv/sms.domovina.ai/webhook/src/views.ts`
- Logotipi: `~/git/domovinatv/mediakit.domovina.tv/`
- Dataviz pravila: `~/git/domovinatv/domovina-stats/docs/03-frontend.md`
- GeoJSON Hrvatske: `~/git/domovinatv/karta-hrvatske/apps/data-pipeline/`
- Deploy presedan: `karta-hrvatske/apps/karta-web` (live na gis.domovina.ai)
