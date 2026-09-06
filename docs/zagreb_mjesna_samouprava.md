# Zagreb: spoj biračkih mjesta i mjesne samouprave

Kako se rezultati DIP arhive za Grad Zagreb agregiraju na 218 mjesnih odbora i
17 gradskih četvrti, zašto to uopće radi, gdje spoj puca i što se pritom našlo
u izvorima. Provjereno 6.9.2026.

Kod: `scripts/export_zagreb_mo.py` · konfiguracija:
`sifarnici/zagreb_mjesna_samouprava.json` · izlazi: `data/zagreb/`

---

## 1. Zašto spoj postoji

DIP objavljuje rezultate do razine biračkog mjesta. Biračko mjesto u arhivi
nema ni adresu ni koordinatu — ima samo `bmNaziv`. Za većinu Hrvatske to je
naziv naselja, škole ili doma.

**Za Grad Zagreb `bmNaziv` je naziv mjesnog odbora.** Primjeri iz
`parlament-2024`: `REMETE`, `VOLOVČICA`, `SVETI DUH`, `ZRINJEVAC`, `JAKUŠEVEC`,
`ANDRIJA MEDULIĆ`, `KRALJ ZVONIMIR`. To nisu škole nego mjesni odbori — u
Donjem gradu su imenovani po povijesnim osobama, drugdje po naselju.

Posljedica: rezultat svake utrke u Zagrebu može se zbrojiti na mjesni odbor, a
odatle na gradsku četvrt, i položiti na poligone koje Grad objavljuje.

Ta razina ne postoji ni u jednom izvoru:

- **DIP** ne zna za mjesnu samoupravu; njegova najniža razina je biračko mjesto,
  a najviša za Zagreb cijeli grad.
- **Grad Zagreb** objavljuje tko sjedi u vijećima mjesnih odbora i gradskih
  četvrti, ali nijedan izborni rezultat.

## 2. Kako je provjereno

Tri neovisna popisa, svaki s 218 zapisa:

| Izvor | Što je | Poklapanje s ostala dva |
|---|---|---|
| `bmNaziv` u DIP arhivi (Zagreb, 15 utrka 2013.–2025.) | 218 različitih imena | 215 doslovno |
| `mjesni-odbori` (data.zagreb.hr, CSV) | 218 MO + GČ + površina + stanovnici | 215–216 doslovno |
| `geoportal-mjesna-samouprava` (data.zagreb.hr, GeoJSON) | 218 poligona | 216 doslovno |

Usporedba ide preko normalizacije imena (velika slova, bez dijakritike, bez
interpunkcije; `Đ→DJ` prije uklanjanja dijakritike jer NFD ne rastavlja `Đ`).

Nakon četiri ispravke imena (§4) spoj je **218/218 u svih 15 utrka**.

### Kontrola koja je važnija od imena

Poklapanje imena ne dokazuje da su brojke točne. Zato skripta zbroj po biračkim
mjestima uspoređuje sa službenim agregatom Grada Zagreba iz iste arhive:

- **13 od 15 utrka: 100,00 %** — na birača točno
- `predsjednik-2024` (oba kruga): 99,43 %
- `euparlament-2024`: 99,49 %

Manjak nije greška spoja nego poznata rupa arhive — DIP prijavi veći
`bmUkupno` nego što objavi datoteka i pojedina biračka mjesta vraćaju 404.
Puna tablica je u `data/zagreb/izvjestaj.md` i regenerira se sa svakim izvozom.

## 3. Gdje su zagrebačka biračka mjesta u arhivi

Zagreb je i županija (`21`) i grad (`1333`), a arhiva ga ne tretira dosljedno:

| Ciklus | `p1` | `p2` biračkih mjesta | Agregat |
|---|---|---|---|
| predsjednik, euparlament, referendum | `21` | `1333` | `r_{vrsta}_21_0000_000` |
| lokalni (skupština, gradonačelnik) | `21` | `0021` | `r_{vrsta}_21_0000_000` |
| parlament 2024. | `001`, `002`, `006` | `1331`, `1332`, `1336` | po izbornoj jedinici |
| parlament 2020. | `001`, `002`, `006`, `007` | `1333`, `2333`, `6333`, `7333` | po izbornoj jedinici |

**Kvirk koji je koštao podataka:** od ciklusa 2024. `r_{vrsta}_21_1333_000`
vraća 404, a datoteke pojedinih biračkih mjesta pod `1333` postoje. Kako
`mirror.py` `bmUkupno` čita iz grop-datoteke, širenje na biračka mjesta se
nikad nije pokrenulo i **zagrebačka biračka mjesta za `predsjednik-2024`,
`euparlament-2024` i `lokalni-2025` nisu bila preuzeta** iako su cijelo vrijeme
bila dostupna. Popravljeno: `jobs_standard` za grop `1333` uzima županijsku
datoteku kao roditelja, a djecu širi pod `p2=1333`. Za 2019. daje isti skup
datoteka kao i prije.

Preuzeto 6.9.2026.: 1.212 datoteka za `predsjednik-2024`, 606 za
`euparlament-2024`, 1.815 za `lokalni-2025`. **Indeks (`build_index.py`) nakon
toga nije ponovo građen** — `export_zagreb_mo.py` čita JSON izravno, ali
Streamlit aplikacija i `export_web.py` te datoteke vide tek nakon rebuilda.

## 4. Ispravke imena i kako su uparene

| Kanonski naziv (`mjesni-odbori`) | DIP | Geoportal |
|---|---|---|
| Matija Gubec | `DONJA KUSTOŠIJA` | = |
| Oton Župančič | `JANKO MATKO` | Janko Matko |
| Sasinovec | = | Sasinovec Šija Vrh |
| Vugrovec Donji | `VUGROVEC` | = |

- **Matija Gubec / Donja Kustošija** — uparen eliminacijom, ne izvorom. Svih
  osam mjesnih odbora u Črnomercu ima svoje biračko mjesto, pa Donja Kustošija
  ne može biti ondje; jedini MO u gradu koji ostaje bez biračkog mjesta je
  „Matija Gubec" (Stenjevec, Lermanova 51, područje Kustošije). Jedini par u
  tablici koji nije potvrđen dokumentom — ako se ikad nađe izvor koji tvrdi
  drugačije, provjeriti prvo ovaj.
- **Oton Župančič / Janko Matko** — isti mjesni odbor ima **dva imena u dva
  skupa Grada**. Ista adresa sjedišta (Ul. Franje Horvata Kiša 12,
  Peščenica – Žitnjak) dokazuje da je riječ o istom tijelu. Tko spaja ta dva
  gradska skupa po imenu, tiho gubi jedan MO.
- **Sasinovec**, **Vugrovec Donji** — varijante pisanja, nedvojbene.

Kanonski je uzet naziv iz skupa `mjesni-odbori` jer taj skup nosi gradsku
četvrt i broj stanovnika.

## 5. Zamke pri korištenju izlaza

- **Mjesni odbori su vrlo nejednaki**: od 56 do 12.249 birača, medijan 2.418.
  Postotni ekstremi bez filtra po veličini su besmisleni — MO od 56 birača
  „vodi" u odazivu jer je 45 ljudi izašlo. Izvještaj zato navodi ekstreme među
  MO-ovima s ≥ 1.000 birača, a apsolutni ekstrem uz broj birača.
- **Stanovništvo je iz 2011.** Zbroj stupca *Broj stanovnika* u skupu
  `mjesni-odbori` je 790.017, što je točno popis 2011. za Grad Zagreb (2021:
  767.131). Skup nigdje ne kaže na koju se godinu odnosi. Svaki pokazatelj
  *po stanovniku* nosi tu ogradu.
- **Nazivi lista nisu nazivi stranaka.** DIP ih vodi po nositelju
  („TOMISLAV TOMAŠEVIĆ – nositelj kandidacijske liste"). Normalizacija na
  stranke je zaseban posao (S3 iz `PLAN_POBOLJSANJA.md`).
- **`datum` za `lokalni-2025` je isti za oba kruga** (27.06.2025.) i nije dan
  glasanja — očito je datum objave/potvrde rezultata. Ne citirati ga kao datum
  izbora. Za `lokalni-2021` datumi su ispravni (30.05. i 15.06.2021.).
- **Granice MO kroz vrijeme** nisu provjerene. Spoj koristi današnji popis
  mjesnih odbora za sve cikluse od 2013.; longitudinalne tvrdnje to
  pretpostavljaju.

## 6. Što se odmah vidi

Odaziv, `parlament-2024` (Zagreb 67,87 %):

- gradske četvrti: 62,23 % (Sesvete) → 72,20 % (Maksimir)
- mjesni odbori ≥ 1.000 birača: 48,3 % (Kozari Putevi) → 75,2 % (Cvjetnica)

**Kozari Putevi su najniži odaziv u 11 od 15 utrka** (među MO-ovima s ≥ 1.000
birača), a ni u preostale četiri nisu lošiji od četvrtog s dna — od 16,5 %
(europski 2019.) do 48,3 % (saborski 2024.). Nije stvar jednih izbora.

Razlika u mobilizaciji između vrsta izbora, po mjesnom odboru, ide do 55
postotnih bodova: Glavničica je 2024. na saborskim imala 68,1 %, na europskim
12,7 %.

Rezultat po listama raslojava se jednako: na izborima za Gradsku skupštinu
2025. lista nositelja Tomislava Tomaševića ide od 7,3 % (Resnik) do 61,7 %
(Samoborček).

## 7. Vezano

- Prijava na natječaj Grada Zagreba za otvorene podatke 2026. koja stoji na
  ovom spoju: `../karta-hrvatske/docs/natjecaj-otvoreni-podaci-zg-2026/projekt-c-mjesni-odbori.md`
- Poligoni gradskih četvrti i mjesnih odbora u kartografskom obliku:
  `../karta-hrvatske/apps/data-pipeline/data/hr_kvartovi.geojson`
