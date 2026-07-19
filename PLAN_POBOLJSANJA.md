# Plan poboljšanja — izbori.domovina.ai

*Analiza stanja: 2026-07-19 (Claude Fable 5). Promptovi u nastavku pripremljeni su za
autonomne Claude Code sessione (Opus 4.8) — svaki je samostalan i može se pokrenuti
copy-paste bez dodatnog konteksta.*

---

## 1. Objektivna ocjena dosadašnjeg stanja

### Što je dobro napravljeno

- **Mirror infrastruktura** (`scripts/mirror.py`): concurrent, resumable, pristojan
  prema DIP serveru, jasna faza RH/zup/grop → BM. Solidan temelj za proširenje.
- **SQLite + FTS5 indeks** (`scripts/build_index.py`): čista trorazinska shema
  (`rezultat` → `rezultat_lista` → `rezultat_kandidat`), dobro indeksirana,
  dokumentirana u README-u s primjerima SQL upita.
- **Analiza preferencijala za parlament-2024**: metodološki ozbiljna — D'Hondt
  rekonstrukcija, pravilo ≥10 % preferencijala, dvije optike (trenutno u Saboru vs.
  osvojio mandat), cross-check sa stvarnim saborskim rasporedom (JSON API) i sa
  službenim DIP PDF izvještajem (`grep_pdf.py`). Fairness indeksi, wasted votes,
  counterfactual jedinstvene IJ.
- **Streamlit app**: funkcionalna kaskadna navigacija + FTS pretraga + fairness
  prikaz za parlament.

### Objektivne slabosti

1. **Nema vremenske dimenzije — najveći propust.** Mirrorano je samo 5 ciklusa
   (2024/2025 + referendum 2013). Sve analize su presjek jednog trenutka; nema
   trendova, swingova, usporedbi. A arhiva DIP-a ima strojno čitljive podatke
   unatrag do 2003. (vidi §2) — neiskorišteno.
2. **Nema normalizacije entiteta.** Stranke postoje samo kao stringovi naziva
   koalicija (različiti po IJ i po godini); kandidati samo kao imena. Bez tablice
   stranaka/osoba nemoguće je pratiti HDZ ili pojedinog političara kroz cikluse.
3. **Duplikacija logike.** D'Hondt + dodjela mandata unutar liste postoji u
   `app.py` (`dhondt`, `_seat_order_within_list`) i neovisno u
   `scripts/analiza_preferencijala.py` (`compute_original_winners`). Rizik tihog
   razilaženja.
4. **Nula testova.** Izborna pravila (D'Hondt, prag 5 %, pravilo 10 % preferencijala)
   idealni su za unit testove s poznatim službenim ishodima — a nema ih.
5. **`app.py` je monolit od 1100 redaka** — analitika, SQL i UI izmiješani.
6. **Analitički doseg je uzak.** Postoji samo preferencijalna analiza jednog ciklusa.
   Nedostaju: odaziv i nevažeći listići kroz vrijeme i geografiju, izborna geografija
   (uporišta, swing), volatilnost, disproporcionalnost (Gallagher) po ciklusima,
   dijaspora, urbano/ruralno, BM-razina anomalije.
7. Sitnice: `.DS_Store` nije u `.gitignore`; `requirements.txt` bez pinanih verzija.

---

## 2. Ključni nalaz: arhiva ima podatke do 2003.

Probe (2026-07-19) na `https://www.izbori.hr/arhiva-izbora/data/…` — isti URL uzorak
`rezultati/{krug}/r_{vrsta}_{p1}_{p2}_{p3}.{ext}` vrijedi za sve cikluse; razlika je
samo ekstenzija (stariji = CSV) i šifrarnici po ciklusu:

| Izbori | JSON | CSV | Nedostupno (nije nađeno) |
|---|---|---|---|
| Parlament | 2024, 2020 | 2016, 2015, 2011, 2007, 2003 | 2000 i starije |
| Predsjednik | 2024, 2019 | 2014, 2009 | 2005 i starije |
| Lokalni | 2025, 2021 | 2017, 2013 | 2009 i starije |
| EU parlament | 2024, 2019 | 2014, 2013 | — |
| Referendum | 2013 (CSV, mirrorano) | | 2019 pod `r_81_*` ne postoji — treba provjeriti DAO |

Verificirani primjeri (HTTP 200):
```
data/parlament/2020/rezultati/1/r_02_001_0000_000.json
data/parlament/2003/rezultati/1/r_02_001_0000_000.csv
data/predsjednik/2009/rezultati/2/r_01_00_0000_000.csv
data/lokalni/2013/rezultati/1/r_15_01_0000_000.csv
data/euparlament/2013/rezultati/1/r_14_00_0000_000.csv
```

Zamke otkrivene probingom:
- **p1 padding**: parlament koristi troznamenkasti `001..010` u imenu datoteke iako
  DAO varijabla izgleda dvoznamenkasto — `r_02_01_…` vraća 404, `r_02_001_…` radi.
- DAO JS po ciklusu je na `app/dao/{vrsta}/{slug}-dao.js` (npr.
  `app/dao/parlament/parlament-2020-dao.js`) — tamo su točne putanje, `vrsta` kodovi
  i logika p1/p2/p3 za svaki ciklus. Lazy-load mapa: `app/config/oc-lazy-load.js`.
- Popis svih ciklusa (uklj. dopunske, prijevremene, manjinske): router stanja u
  `arhiva-izbora/app.js` (`state("app.parlament-2020"`, …).
- Stariji DAO-i imaju i `odaziv/`, `izabrani/*.pdf`, `kandidatura/*.pdf` — odaziv je
  JSON/CSV i vrijedi ga mirrorati; PDF-ovi su sekundarni.

---

## 3. Plan — 6 autonomnih sessiona

| # | Session | Vrijednost | Ovisi o |
|---|---|---|---|
| S1 | Mirror JSON ciklusa (2019–2021) | ★★★ | — |
| S2 | Mirror CSV ciklusa (2003–2017) | ★★★ | S1 |
| S3 | Normalizacija stranaka i kandidata | ★★★ | S1+S2 |
| S4 | Longitudinalne analize (trendovi, swing, disproporcionalnost, preferencijali 2015→2024) | ★★★ | S3 |
| S5 | Odaziv, nevažeći listići, BM-screening (s metodološkim ogradama) | ★★ | S2 |
| S6 | Refactor u paket, testovi, novi tabovi u appu, docs | ★★ | S4 |

Redoslijed S1→S2→S3→S4 je kritični put za "pametnije zaključke iz prethodnih izbora".
S5 i S6 mogu ići paralelno nakon svojih ovisnosti.

Procjena volumena: JSON ciklusi ~1–2 GiB dodatno; CSV ciklusi manje po datoteci.
`data/` ostaje gitignoran. Za stare lokalne izbore (2013/2017) BM-razina se u prvoj
iteraciji može preskočiti (flag u mirroru) ako volumen postane problem.

---

## 4. Točni promptovi za Opus 4.8 sessione

Opće napomene za sve sessione (uključene i u svaki prompt):

- Radni jezik koda/commitova: engleski; dokumenti i UI: hrvatski (vidi CLAUDE.md).
- Svaka promjena `scripts/build_index.py` → obavezan rebuild indeksa.
- Committati lokalno konvencionalnim porukama; **ne pushati**.
- Concurrency prema DIP-u max 16, `User-Agent: izbori-archive-mirror/0.1`.

---

### S1 — Mirror povijesnih JSON ciklusa

```text
Radiš autonomno u repou /Users/ms/git/domovinatv/izbori.domovina.ai. Prvo pročitaj
CLAUDE.md i README.md. Zadatak: proširi mirror + indeks na četiri povijesna ciklusa
koja DIP arhiva poslužuje kao JSON u istom formatu kao 2024/2025:

  parlament-2020, predsjednik-2019, lokalni-2021, euparlament-2019

Verificirane činjenice (ne troši vrijeme na ponovno otkrivanje):
- URL uzorak identičan postojećem: https://www.izbori.hr/arhiva-izbora/data/
  {election}/{year}/rezultati/{krug}/r_{vrsta}_{p1}_{p2}_{p3}.json
- Provjereno HTTP 200: parlament/2020/rezultati/1/r_02_001_0000_000.json (p1 je
  TROZNAMENKAST za parlament: 001..010 + manjinske kombinacije),
  predsjednik/2019/rezultati/1 i 2/r_01_00_0000_000.json,
  lokalni/2021/rezultati/1/r_15_01_0000_000.json,
  euparlament/2019/rezultati/1/r_14_00_0000_000.json
- DAO JS s točnom logikom p1/p2/p3 i vrsta kodovima za svaki ciklus:
  https://www.izbori.hr/arhiva-izbora/app/dao/parlament/parlament-2020-dao.js
  (analogno za predsjednik/predsjednik-2019-dao.js, lokalni/lokalni-2021-dao.js,
  euparlament/eu-parlament-2019-dao.js). Skini ih u raw_dao/ radi audita.

Koraci:
1. Skini DAO JS-ove u raw_dao/, prouči ih i proširi scripts/extract_sifarnici.py da
   generira sifarnici/{slug}.json za nova 4 ciklusa (županije/GO/IJ/manjine/inozemstvo
   se razlikuju po ciklusu — npr. Pag i pripajanja općina).
2. Proširi scripts/mirror.py konfiguracijom za nova 4 sluga (uzor: postojećih 5).
   Zadrži resumability i politeness (max -j 16, postojeći User-Agent).
3. Pokreni mirror za sva 4 ciklusa. 404 za pojedina BM je očekivan (spajanja BM).
   Prati i zapiši statistiku (broj datoteka, 404-ovi) u izvještaj.
4. Proširi scripts/build_index.py da indeksira nove cikluse i pokreni rebuild.
5. Verifikacija (obavezno, prije commita) — usporedi RH-agregate iz baze sa službenim
   rezultatima (provjeri na webu, npr. DIP objave ili Wikipedija; navedeni brojevi su
   sidra po sjećanju pa ih NAJPRIJE potvrdi):
   - parlament-2020: HDZ koalicija 66 mandata, Restart koalicija 41; odaziv ~46.9 %
   - predsjednik-2019 krug 2: Milanović ~52.7 %, Grabar-Kitarović ~47.3 %
   - euparlament-2019: HDZ i SDP po 4 mandata (SDP-ova 4. tek po Brexitu — u bazi
     gledaj glasove, ne mandate)
   Za parlament-2020 dodatno provjeri da D'Hondt logika u app.py reproducira 66/41
   po IJ (ako vrsta/prag odgovaraju). Svako odstupanje istraži i dokumentiraj.
6. Ažuriraj README tablicu "Što se preuzima" i CLAUDE.md ako se mijenjaju naredbe.
7. Commitaj logičkim koracima (conventional commits, engleski). NE pushaj.

Piši sažetak onoga što je napravljeno + verifikacijske brojke u
docs/mirror_povijest_notes.md (hrvatski). Ako nešto od navedenog ne postoji na
serveru, dokumentiraj točan URL i HTTP kod umjesto da tiho preskočiš.
```

---

### S2 — Mirror CSV ciklusa (2003–2017)

```text
Radiš autonomno u repou /Users/ms/git/domovinatv/izbori.domovina.ai. Prvo pročitaj
CLAUDE.md, README.md i docs/mirror_povijest_notes.md (nastao u prethodnom sessionu).
Zadatak: dodaj podršku za povijesne cikluse koje arhiva poslužuje kao CSV, u istoj
URL strukturi (samo ekstenzija .csv):

  parlament: 2016, 2015, 2011, 2007, 2003
  predsjednik: 2014, 2009
  lokalni: 2017, 2013
  euparlament: 2014, 2013

Verificirano HTTP 200 (2026-07-19): parlament/2016..2003 rezultati/1/
r_02_001_0000_000.csv; predsjednik/2009/rezultati/2/r_01_00_0000_000.csv;
lokalni/2013/rezultati/1/r_15_01_0000_000.csv; euparlament/2013/rezultati/1/
r_14_00_0000_000.csv. DAO JS po ciklusu na app/dao/{vrsta}/{slug}-dao.js definira
točne kodove — skini ih u raw_dao/.

Koraci:
1. Skini nekoliko CSV uzoraka i utvrdi format (separator, encoding — očekuj
   windows-1250 ili utf-8 s BOM-om, struktura kolona po vrsti izbora; format se
   vjerojatno mijenjao kroz godine — dokumentiraj razlike po ciklusu).
2. Proširi mirror.py (slug konfiguracije + .csv ekstenzija) i extract_sifarnici.py.
   Za lokalne 2013/2017 dodaj opciju preskakanja BM-razine (--no-bm) i koristi je u
   prvoj iteraciji ako je volumen > ~2 GiB.
2b. PDF-ovi: za svaki ciklus (i CSV i JSON, uključivo one iz S1) mirroraj i
   izabrani/*.pdf i kandidatura/*.pdf (URL uzorci u DAO-ima: izabrani/i_{p0}_{p1}_0000.pdf,
   kandidatura/k_{p0}_{p1}_0000.pdf; potvrđeno HTTP 200 npr.
   parlament/2011/izabrani/i_02_001_0000.pdf, parlament/2020/kandidatura/k_02_001_0000.pdf).
   To su JEDINI izvori potpunih kandidacijskih lista i službenih dobitnika mandata —
   za te sadržaje ne postoji JSON/CSV. Samo download u data/{slug}/pdfs/, bez
   parsiranja (ekstrakcija je zaseban backlog zadatak). Ako CSV rezultati starih
   ciklusa nemaju imena kandidata, eksplicitno to zabilježi u notes — PDF-ovi su
   tada jedini kandidatski izvor.
3. Napiši CSV parser u build_index.py koji puni ISTE tablice (rezultat,
   rezultat_lista, rezultat_kandidat) — bez paralelne sheme. Pazi: preferencijalni
   glasovi postoje tek od parlament-2015; stariji parlamentarni ciklusi imaju samo
   liste (rezultat_kandidat može ostati prazan ili s kandidatima bez glasova, ovisno
   što CSV sadrži — dokumentiraj odluku).
4. Mirror + rebuild indeksa.
5. Verifikacija prije commita — RH-agregati protiv službenih rezultata (potvrdi
   brojeve na webu prije usporedbe; sidra po sjećanju): parlament-2016 HDZ 61 /
   Narodna koalicija 54 mandata; parlament-2015 Domoljubna 59 / Hrvatska raste 56 /
   Most 19; predsjednik-2014 krug 2 Grabar-Kitarović ~50.7 %. Odstupanja istraži.
6. Ažuriraj README (tablica ciklusa + napomena o CSV formatima po godinama).
7. Conventional commits, NE pushaj. Sažetak + verifikacijske brojke dopiši u
   docs/mirror_povijest_notes.md.
```

---

### S3 — Normalizacija stranaka i kandidata

```text
Radiš autonomno u repou /Users/ms/git/domovinatv/izbori.domovina.ai. Prvo pročitaj
CLAUDE.md, README.md, docs/mirror_povijest_notes.md. Preduvjet: baza sadrži cikluse
od ~2003 do 2025 (parlament, predsjednik, lokalni, euparlament, referendum).

Problem: stranke postoje samo kao stringovi naziva lista/koalicija (različiti po IJ
i godini), kandidati samo kao imena. Cilj: normalizacijski sloj koji omogućuje upite
"HDZ kroz sve cikluse" i "svi rezultati osobe X kroz godine".

Koraci:
1. Dizajniraj i dodaj u build_index.py (ili zaseban scripts/normalize.py koji radi
   nad gotovom bazom — odaberi i obrazloži) tablice:
   - stranka(id, kratica, puni_naziv) — kanonske stranke
   - stranka_alias(stranka_id, alias) — povijesni nazivi/pravopisi
   - lista_stranka(lista_id, stranka_id, pozicija) — parsirano iz
     rezultat_lista.naziv i .stranke ("; "-joined) — koalicijski sastav
   - osoba(id, kanonsko_ime) + kandidat_osoba(kandidat_id, osoba_id) — povezivanje
     istoimenih zapisa kroz cikluse
2. Parsiranje koalicija: nazivi tipa "HDZ, HSLS, HDS, HNS, HSU" se cijepaju po
   zarezu, ALI navodnici i nazivi s zarezom unutra ("DO i SIP") to lome — koristi
   polje `stranke` gdje postoji, naziv samo kao fallback. Kratice normaliziraj
   (HDZ = HRVATSKA DEMOKRATSKA ZAJEDNICA itd.). Seed listu kanonskih stranaka
   napravi iz frekvencijske analize baze, ručno mapiraj top ~60 po glasovima, ostalo
   označi kao nenormalizirano (ne izmišljaj mapiranja).
3. Povezivanje osoba: konzervativna heuristika — isto ime + ista stranka/koalicijska
   obitelj + ista/susjedna geografija → ista osoba; isto ime bez ikakvog preklapanja
   ostavi nepovezano i logiraj. Poznata zamka iz repoa: istoimeni kandidati u
   parlament-2024 disambiguirani su strankom (vidi git log). NIKAD ne spajaj
   agresivno — false merge je gori od false splita.
4. Verifikacija (obavezno): (a) HDZ ukupni glasovi po parlamentarnim ciklusima
   2003–2024 iz novog sloja — usporedi s poznatim rezultatima s weba; (b) izaberi 3
   poznata političara (npr. Plenković, Milanović, Grbin), ispiši njihove povezane
   zapise kroz cikluse i ručno provjeri smislenost; (c) postotak listi s potpuno
   normaliziranim sastavom — ispiši po ciklusu.
5. Dokumentiraj shemu + ograničenja metode u docs/normalizacija.md (hrvatski,
   uključi eksplicitno što NIJE pouzdano — npr. nepovezane istoimene osobe).
6. Conventional commits, NE pushaj.
```

---

### S4 — Longitudinalne analize (glavna vrijednost)

```text
Radiš autonomno u repou /Users/ms/git/domovinatv/izbori.domovina.ai. Prvo pročitaj
CLAUDE.md, README.md, docs/normalizacija.md, analiza_preferencijala_parlament-2024.md
(uzor za stil i metodološku razinu). Preduvjet: baza s ciklusima 2003–2025 +
normalizacijski sloj (stranka, osoba).

Zadatak: skripta scripts/analiza_longitudinalna.py + izvještaj
analiza_longitudinalna.md (hrvatski) s ovim analizama — svaka s jasno navedenom
metodologijom i ogradama:

1. TRENDOVI STRANAKA: udio glasova kanonskih stranaka po parlamentarnim ciklusima
   2003–2024, ukupno i po IJ. Za koalicijske liste udio se pripisuje koaliciji, a
   raspodjela po članicama samo ondje gdje je jednoznačna — inače prikaži koaliciju
   kao cjelinu i to jasno označi (ne izmišljaj ključeve raspodjele).
2. VOLATILNOST: Pedersenov indeks između uzastopnih parlamentarnih ciklusa, ukupno
   i po IJ/županiji. Interpretacija: gdje je biračko tijelo najnestabilnije?
3. DISPROPORCIONALNOST: Gallagherov indeks po ciklusu (glasovi vs. mandati) za sve
   parlamentarne cikluse; nastavak na postojeće fairness analize. Counterfactuali
   koje postojeći kod već radi za 2024 (jedinstvena IJ, D'Hondt) proširi na sve
   cikluse — refaktoriraj zajedničku D'Hondt logiku iz app.py i
   analiza_preferencijala.py u zajednički modul umjesto trećeg copy-pastea.
4. PREFERENCIJALI 2015→2024: evolucija preferencijalnog glasovanja kroz 4
   parlamentarna ciklusa — % birača koji koriste preferencijal, koliko je kandidata
   preskočilo listu (pravilo ≥10 %), po strankama i IJ. Ovo je izravan nastavak
   postojeće analize za 2024.
5. IZBORNA GEOGRAFIJA: uporišta (općine gdje stranka konzistentno > X %),
   swing općina 2020→2024, korelacija predsjedničkih i parlamentarnih rezultata po
   općinama (predsjednik-2019 vs parlament-2020; predsjednik-2024 vs parlament-2024).
   Pazi: šifre općina se mijenjaju kroz godine — spajaj po (županija, naziv) s
   dokumentiranim ručnim iznimkama, i navedi koliko općina nije upareno.
6. DIJASPORA I IJ 11: trend glasova inozemstva kroz cikluse, tko dobiva koliko.

Pravila rada:
- Svaku brojku koja ide u izvještaj generiraj skriptom (reproducibilno), ne ručno.
- Za 2-3 poznata slučaja po analizi napravi sanity-check protiv javno poznatih
  činjenica (provjeri na webu) i navedi ih u izvještaju kao verifikaciju.
- Metodološke ograde piši eksplicitno uz svaku analizu (npr. koalicijske raspodjele,
  neuparene općine, promjene izbornog zakona 2010/2015 — provjeri točne godine).
- Conventional commits po analizi, NE pushaj.
```

---

### S5 — Odaziv, nevažeći listići, BM-screening

```text
Radiš autonomno u repou /Users/ms/git/domovinatv/izbori.domovina.ai. Prvo pročitaj
CLAUDE.md i README.md. Preduvjet: baza s ciklusima 2003–2025 (BM-razina za JSON
cikluse sigurno postoji; za starije provjeri u bazi što ima).

Zadatak: scripts/analiza_odaziv.py + analiza_odaziv.md (hrvatski):

1. ODAZIV: trend po ciklusima i vrsti izbora; geografska raspodjela (županije,
   urbano vs. ruralno — kategorizaciju gradova/općina dokumentiraj); usporedba
   krug 1 vs krug 2 (predsjednički, lokalni).
2. NEVAŽEĆI LISTIĆI: udio po ciklusu/geografiji; izdvoji outliere (npr. poznati
   fenomen visokog udjela nevažećih na nekim izborima — provjeri i interpretiraj).
3. BM-SCREENING (statistički, s VELIKIM oprezom): na razini biračkih mjesta —
   distribucija odaziva (histogram, jesu li repovi anomalni), BM sa 100 % odaziva
   ili 100 % za jednu opciju, korelacija odaziva i udjela pobjednika po BM
   (klasični forenzički scatter), usporedba istog BM kroz cikluse.
   OBAVEZNO: ovo je screening, ne dokaz — svaki nalaz formuliraj kao "odstupanje
   koje zaslužuje pogled", navedi benigna objašnjenja (mala BM, domovi, dijaspora,
   spajanja BM) i NE koristi riječ "prijevara". Statistički testovi na malim BM
   imaju ogroman šum — navedi veličine uzoraka.
4. Ekstremi kao kuriozitet: najmanja/najveća BM, najtjesniji rezultati po
   općinama, BM gdje je pobjednik dobio najveći postotak.

Svaka brojka iz skripte, sanity-check 2-3 slučaja protiv javnih izvora,
metodološke ograde uz svaku sekciju. Conventional commits, NE pushaj.
```

---

### S6 — Refactor, testovi, app, dokumentacija

```text
Radiš autonomno u repou /Users/ms/git/domovinatv/izbori.domovina.ai. Prvo pročitaj
CLAUDE.md, README.md i sve docs/*.md + analiza_*.md. Preduvjet: S1–S4 završeni.

Zadatak — kodna higijena i izlaganje novih analiza u appu:

1. REFACTOR: izvuci zajedničku logiku u paket izbori/ (npr. izbori/db.py,
   izbori/mandati.py s D'Hondt + pravilo 10 % preferencijala, izbori/stranke.py).
   app.py i scripts/* je koriste; ponašanje NE smije se promijeniti — prije
   refactora snimi output analiza (md datoteke), poslije usporedi diff (mora biti
   prazan osim ev. whitespacea).
2. TESTOVI (pytest): unit testovi za D'Hondt (poznati službeni ishodi po IJ za
   parlament-2024 i 2020 kao fixture), pravilo 10 % preferencijala (poznati
   slučajevi preskakanja liste iz analiza_preferencijala_parlament-2024.md),
   parsiranje koalicijskih naziva, CSV parser (fixture datoteke u tests/fixtures/
   — par malih stvarnih CSV-ova). Testovi ne smiju ovisiti o data/izbori.sqlite.
3. APP: novi tabovi "📈 Trendovi" (stranke kroz cikluse, iz S4 podataka —
   računaj u SQL/pandas, ne hardkodiraj) i "🗺️ Usporedba ciklusa" (odabir dva
   ciklusa + razina → tablica/graf promjena po županijama). UI na hrvatskom.
   Streamlit na portu 8501 se NE restarta ručno (auto-rerun).
4. HIGIJENA: .DS_Store u .gitignore; requirements.txt s donjim granicama verzija
   provjerenim protiv instaliranog okruženja; README ažuriraj (novi ciklusi, paket,
   testovi — pokretanje: python3 -m pytest).
5. CLAUDE.md dopuni novim naredbama i konvencijama (kratko).

Conventional commits po logičkim koracima, NE pushaj.
```

---

## 5. Ideje izvan ovih 6 sessiona (backlog)

- **S7 kandidat: ekstrakcija izabrani/kandidatura PDF-ova** — za kandidacijske
  liste i službene dobitnike mandata NE postoji JSON/CSV, samo PDF (potvrđeno u
  DAO kodu: getDataIzabran/getDataKandidatura vraćaju link na PDF). PDF-ovi se
  mirroraju u S2; zaseban session bi ih pypdf-om (uzor: grep_pdf.py) parsirao u
  nove tablice (kandidatura, izabrani_pdf) — layout se mijenja po godinama pa
  treba verifikaciju po ciklusu protiv poznatih imena. Vrijednost: kandidatska
  razina za cikluse prije 2015 i čvršći ground-truth za S3/S4.
- **Dopunski/prijevremeni/manjinski izbori** — router arhive ima i
  `dopunski-*`, `prijevremeni-*`, `manjine-2003..2023` stanja; niša, ali potpunost.
- **Referendum 2019 (i eventualni drugi)** — `r_81_*` uzorak ne radi za 2019;
  treba pročitati njegov DAO.
- **Geo-vizualizacija** — choropleth karte po općinama (GeoJSON granica RH je
  javno dostupan) u Streamlitu.
- **Povezivanje s Domovina AI MCP-om** — spomeni političara u podcastima vs.
  njegov preferencijalni rezultat (media presence → glasovi).
- **Popis stanovništva (DZS)** — demografske korelacije (dob, obrazovanje) s
  rezultatima po općinama; oprez s ekološkom inferencijom.
- **Export/API sloj** — parquet exporti po ciklusu za dijeljenje analiza.
