#!/usr/bin/env python3
"""Generate a Markdown report contrasting two groups from parlament-2024:

  A) Sitting MPs with the *fewest* preferential votes
  B) Candidates with the *most* preferential votes who did not win a mandate

Two orthogonal views are produced:

  - "Trenutno u Saboru" view: uses the `u_saboru` flag (current seating),
    which excludes elected MPs that took a dormant mandate (vlada / gradonačelnik).
  - "Osvojio mandat na izborima" view: re-computes the original winner per
    list using the Croatian preferential rule (candidates with ≥10 % of
    list votes are reordered by preferentials; the rest stay in `rbr` order;
    top `mandata` win).

Output: `analiza_preferencijala_parlament-2024.md` at the repo root.
"""
from __future__ import annotations

import sqlite3
from dataclasses import dataclass
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
DB = REPO / "data" / "izbori.sqlite"
OUT = REPO / "analiza_preferencijala_parlament-2024.md"

PREF_THRESHOLD_PCT = 10.0
TOP_N = 50


@dataclass
class Candidate:
    cand_id: int
    list_id: int
    rbr: int
    naziv: str
    glasova: int
    posto: float
    u_saboru: int
    lista: str
    mandata: int
    ij: str
    osvojio_mandat: int = 0  # filled in below


def load_candidates(conn: sqlite3.Connection) -> list[Candidate]:
    rows = conn.execute(
        """
        SELECT k.id, l.id, k.rbr, k.naziv, k.glasova, k.posto, k.u_saboru,
               l.naziv, l.mandata, r.p1
        FROM rezultat r
        JOIN rezultat_lista l ON l.rezultat_id = r.id
        JOIN rezultat_kandidat k ON k.lista_id = l.id
        WHERE r.election = 'parlament-2024'
          AND r.level = 'zup'
          AND r.vrsta = '02'
        """
    ).fetchall()
    return [Candidate(*row) for row in rows]


def compute_original_winners(cands: list[Candidate]) -> None:
    """Mark the top-`mandata` candidates per list as original winners.

    Croatian rule: candidates with ≥10 % of list votes are sorted by
    preferential votes desc; the rest stay in the order they were submitted
    (`rbr` asc). Concatenate the two groups and take the first `mandata`.
    """
    by_list: dict[int, list[Candidate]] = {}
    for c in cands:
        by_list.setdefault(c.list_id, []).append(c)

    for list_id, lc in by_list.items():
        if not lc or lc[0].mandata == 0:
            continue
        boosted = sorted(
            (c for c in lc if c.posto >= PREF_THRESHOLD_PCT),
            key=lambda c: (-c.glasova, c.rbr),
        )
        rest = sorted(
            (c for c in lc if c.posto < PREF_THRESHOLD_PCT),
            key=lambda c: c.rbr,
        )
        ordered = boosted + rest
        for c in ordered[: lc[0].mandata]:
            c.osvojio_mandat = 1


def hr_int(n: int) -> str:
    """Format integer with `.` as thousand separator (Croatian convention)."""
    return f"{n:,}".replace(",", ".")


def status(c: Candidate) -> str:
    """Four-color status icon.

    🟢 osvojio mandat *i* sjedi u Saboru (čisti slučaj)
    🔵 nije osvojio mandat na izborima, ali sjedi kao zamjenik
    🟡 osvojio mandat, ali u mirovanju (vlada / izvršne funkcije)
    🔴 nije osvojio mandat i ne sjedi u Saboru
    """
    if c.u_saboru == 1 and c.osvojio_mandat == 1:
        return "🟢"
    if c.u_saboru == 1 and c.osvojio_mandat == 0:
        return "🔵"
    if c.u_saboru == 0 and c.osvojio_mandat == 1:
        return "🟡"
    return "🔴"


def fmt_row(c: Candidate) -> str:
    return (
        f"| {status(c)} | {c.naziv} | {hr_int(c.glasova):>5} | {c.posto:>5.2f} | "
        f"IJ {int(c.ij)} | {c.rbr} | {c.lista[:60]} | {c.mandata} |"
    )


HEADER = (
    "| Status | Kandidat | Pref. glasova | % | IJ | rbr | Lista (skraćeno) | Mandata liste |\n"
    "|:---:|---|---:|---:|:---:|---:|---|---:|"
)


@dataclass
class BreakevenStats:
    breakeven_rank: int       # first rank with no contradiction (1-indexed)
    contradicting: int        # all rank-pairs where loser-prefs > winner-prefs
    real_injustice: int       # loser is 🔴 — never seated, never won
    resolved_by_zamjenik: int # loser is 🔵 — sits as replacement
    dormant_loser: int        # loser is 🟡 — won mandate but dormant
    sum_real_robbed: int      # Σ prefs of 🔴 losers in contradictions
    sum_real_placed: int      # Σ prefs of winners paired with 🔴 losers
    total_mandates: int


def breakeven_table(
    winners_asc: list[Candidate],
    nonwin_desc: list[Candidate],
    total_mandates: int,
) -> tuple[str, BreakevenStats]:
    """Pair `i`-th lowest winner with `i`-th highest non-winner. Marker:

      ❌ stvarna nepravda — loser is 🔴 (nije osvojio mandat, ne sjedi)
      🔵 riješeno zamjenom — loser is 🔵 (sjedi kao zamjenik)
      🟡 dobio mandat (mirovanje) — loser is 🟡 (osvojio mandat, drži ga u mirovanju)
      ✅ nema kontradikcije (dobitnik ima ≥ preferencijala)
    """
    n = min(len(winners_asc), len(nonwin_desc))
    rows: list[str] = []
    breakeven = -1
    contradicting = 0
    real = 0
    resolved = 0
    dormant = 0
    sum_real_r = 0
    sum_real_p = 0
    for i in range(n):
        w = winners_asc[i]
        l = nonwin_desc[i]
        contradicts = l.glasova > w.glasova
        if contradicts:
            contradicting += 1
            loser_status = status(l)
            if loser_status == "🔵":
                resolved += 1
                marker = "🔵"
            elif loser_status == "🟡":
                dormant += 1
                marker = "🟡"
            else:
                # 🔴 — true voter injustice
                real += 1
                sum_real_r += l.glasova
                sum_real_p += w.glasova
                marker = "❌"
        else:
            marker = "✅"
        if not contradicts and breakeven == -1:
            breakeven = i + 1
        rows.append(
            f"| {i + 1} | {marker} | {status(l)} {l.naziv} | {hr_int(l.glasova)} | "
            f"{status(w)} {w.naziv} | {hr_int(w.glasova)} | "
            f"{l.glasova - w.glasova:+d} |"
        )
        if breakeven != -1 and i + 1 >= breakeven + 4:
            break
    header = (
        "| # | Tip | "
        "Gubitnik (više glasova) | Glasova | "
        "Dobitnik (manje glasova) | Glasova | Razlika |\n"
        "|---:|:---:|---|---:|---|---:|---:|"
    )
    stats = BreakevenStats(
        breakeven_rank=breakeven,
        contradicting=contradicting,
        real_injustice=real,
        resolved_by_zamjenik=resolved,
        dormant_loser=dormant,
        sum_real_robbed=sum_real_r,
        sum_real_placed=sum_real_p,
        total_mandates=total_mandates,
    )
    return header + "\n" + "\n".join(rows), stats


def section(title: str, rows: list[Candidate]) -> str:
    body = "\n".join(fmt_row(c) for c in rows)
    total = sum(c.glasova for c in rows)
    return (
        f"_{title}_\n\n"
        f"{HEADER}\n{body}\n\n"
        f"**Kumulativno preferencijalnih glasova ovih {len(rows)} kandidata: "
        f"{hr_int(total)}**\n"
    )


def main() -> None:
    conn = sqlite3.connect(DB)
    cands = load_candidates(conn)
    compute_original_winners(cands)

    sitting_mps = [c for c in cands if c.u_saboru == 1]
    not_sitting = [c for c in cands if c.u_saboru == 0]
    won_mandate = [c for c in cands if c.osvojio_mandat == 1]
    no_mandate = [c for c in cands if c.osvojio_mandat == 0]

    low_sitting = sorted(sitting_mps, key=lambda c: c.glasova)[:TOP_N]
    low_winners = sorted(won_mandate, key=lambda c: c.glasova)[:TOP_N]
    high_not_sitting = sorted(not_sitting, key=lambda c: -c.glasova)[:TOP_N]
    high_no_mandate = sorted(no_mandate, key=lambda c: -c.glasova)[:TOP_N]

    sum_low_sit = sum(c.glasova for c in low_sitting)
    sum_high_nosit = sum(c.glasova for c in high_not_sitting)
    sum_low_win = sum(c.glasova for c in low_winners)
    sum_high_nowin = sum(c.glasova for c in high_no_mandate)

    # Break-even pairing: full ranges so we always reach the cross-over.
    all_winners_asc = sorted(won_mandate, key=lambda c: c.glasova)
    all_nonwin_desc = sorted(no_mandate, key=lambda c: -c.glasova)
    all_sit_asc = sorted(sitting_mps, key=lambda c: c.glasova)
    all_nonsit_desc = sorted(not_sitting, key=lambda c: -c.glasova)

    total_mandates = sum(c.osvojio_mandat for c in cands)
    total_seated = len(sitting_mps)

    be_opt2_md, be_opt2 = breakeven_table(
        all_winners_asc, all_nonwin_desc, total_mandates
    )
    be_opt1_md, be_opt1 = breakeven_table(
        all_sit_asc, all_nonsit_desc, total_seated
    )

    # Counts for legend
    n_green = sum(
        1 for c in cands if c.u_saboru == 1 and c.osvojio_mandat == 1
    )
    n_blue = sum(
        1 for c in cands if c.u_saboru == 1 and c.osvojio_mandat == 0
    )
    n_yellow = sum(
        1 for c in cands if c.u_saboru == 0 and c.osvojio_mandat == 1
    )
    n_red = sum(
        1 for c in cands if c.u_saboru == 0 and c.osvojio_mandat == 0
    )

    def pct(num: int, den: int) -> str:
        return f"{(num / den * 100):.1f} %" if den else "—"

    # ---------- Indeksi pravednosti ----------
    by_status: dict[str, list[Candidate]] = {"🟢": [], "🔵": [], "🟡": [], "🔴": []}
    for c in cands:
        by_status[status(c)].append(c)

    prefs_green = sum(c.glasova for c in by_status["🟢"])
    prefs_blue = sum(c.glasova for c in by_status["🔵"])
    prefs_yellow = sum(c.glasova for c in by_status["🟡"])
    prefs_red = sum(c.glasova for c in by_status["🔴"])
    total_prefs = prefs_green + prefs_blue + prefs_yellow + prefs_red

    def avg(rows: list[Candidate]) -> int:
        return sum(c.glasova for c in rows) // len(rows) if rows else 0

    def median(rows: list[Candidate]) -> int:
        if not rows:
            return 0
        vs = sorted(c.glasova for c in rows)
        m = len(vs) // 2
        return vs[m] if len(vs) % 2 else (vs[m - 1] + vs[m]) // 2

    avg_g, avg_b, avg_y, avg_r = (
        avg(by_status[k]) for k in ("🟢", "🔵", "🟡", "🔴")
    )
    med_g, med_b, med_y, med_r = (
        median(by_status[k]) for k in ("🟢", "🔵", "🟡", "🔴")
    )

    # Index A — bait-and-switch (zamjena izabranih izvršnom funkcijom)
    elected_pref_strength = prefs_green + prefs_yellow
    seated_pref_strength = prefs_green + prefs_blue
    pref_deficit = elected_pref_strength - seated_pref_strength
    deficit_ratio = (
        seated_pref_strength / elected_pref_strength
        if elected_pref_strength else 0
    )

    # Index B — zastupnici bez podrške
    n_blue_under_500 = sum(1 for c in by_status["🔵"] if c.glasova < 500)
    n_blue_under_1000 = sum(1 for c in by_status["🔵"] if c.glasova < 1000)
    # Lowest pref vote among "legitimately elected" 🟢 — anyone seated with
    # fewer than this is below the floor of voter-validated representation.
    floor_green = min(c.glasova for c in by_status["🟢"]) if by_status["🟢"] else 0
    n_blue_below_green_floor = sum(
        1 for c in by_status["🔵"] if c.glasova < floor_green
    )

    # Voter-fate of every preferential vote cast on IJ general lists:
    #   prefs to 🟢 → voter's choice sat
    #   prefs to 🔵 → voter's choice sat (eventually, low-prob)
    #   prefs to 🟡 → voter's choice was elected but doesn't sit
    #   prefs to 🔴 → voter's choice didn't make it
    rep_rate = (prefs_green + prefs_blue) / total_prefs if total_prefs else 0
    bait_rate = prefs_yellow / total_prefs if total_prefs else 0
    lost_rate = prefs_red / total_prefs if total_prefs else 0

    md = f"""# Disparitet preferencijalnih glasova — Parlamentarni izbori 2024.

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

Granica popisa: TOP {TOP_N} u svakoj skupini.

### Legenda statusa kandidata

| Ikona | Značenje | Broj kandidata |
|:---:|---|---:|
| 🟢 | **Izabran i sjedi** — osvojio mandat na izborima i sjedi u Saboru | {n_green} |
| 🔵 | **Zamjenik** — nije izvorno osvojio mandat, ali sjedi u Saboru kao zamjena nekoga tko je preuzeo izvršnu funkciju ili dao ostavku | {n_blue} |
| 🟡 | **Mandat u mirovanju** — osvojio mandat na izborima ali ga drži u mirovanju (vlada / izvršne funkcije) | {n_yellow} |
| 🔴 | **Bez mandata** — nije osvojio mandat na izborima i ne sjedi kao zamjenik | {n_red} |

> 🟢 + 🔵 zajedno čine 142 trenutno sjedećih zastupnika u Saboru.
> 🟢 + 🟡 zajedno čine 143 osvojenih mandata 17. travnja 2024.

---

## Optika 1 — Trenutno u Saboru (`u_saboru`)

#### A. {TOP_N} zastupnika s najmanje preferencijalnih glasova

Najmanje glasova na ovom popisu ima **{low_sitting[0].naziv}** ({hr_int(low_sitting[0].glasova)} preferencijalnih glasova).

{section("Najniži preferencijal — sjede u Saboru", low_sitting)}

#### B. {TOP_N} kandidata s najviše preferencijalnih glasova koji **nisu** trenutno u Saboru

Najviše glasova ima **{high_not_sitting[0].naziv}** ({hr_int(high_not_sitting[0].glasova)} preferencijalnih glasova).

> Napomena: ovaj popis sadrži i izvorne dobitnike mandata koji su preuzeli
> izvršne funkcije (premijer, ministri, gradonačelnici) — formalno mandat
> imaju, ali ne sjede u Saboru.

{section("Najviši preferencijal — nisu trenutno u Saboru", high_not_sitting)}

#### C. Kumulativna usporedba (Optika 1)

| Skupina | Broj kandidata | Σ preferencijalnih glasova |
|---|---:|---:|
| {TOP_N} zastupnika s najnižim preferencijalom | {len(low_sitting)} | **{hr_int(sum_low_sit)}** |
| {TOP_N} kandidata s najvišim preferencijalom (nisu u Saboru) | {len(high_not_sitting)} | **{hr_int(sum_high_nosit)}** |
| Omjer | | ≈ **{sum_high_nosit / max(sum_low_sit, 1):.1f}×** |

#### D. Break-even (Optika 1) — gdje prestaje kontradikcija

Sparujem `i`-tog gubitnika s najviše preferencijala (nije u Saboru) s `i`-tim
zastupnikom s najmanje preferencijala (sjedi u Saboru). Kontradikcija postoji
dok gubitnik ima više glasova od zastupnika.

**Prelom: rang #{be_opt1.breakeven_rank}** — od ovog ranga nadalje, sjedeći
zastupnik ima više preferencijala od najboljeg neuključenog gubitnika koji
mu se pridružuje u paru.

**Indeks zaobilaženja birača — Optika 1:**

| Mjera | Vrijednost |
|---|---:|
| Mandata u Saboru (sjedeći) | {be_opt1.total_mandates} |
| Svih kontradiktornih parova (gubitnik > sjedeći) | {be_opt1.contradicting} |
| ❌ **Stvarne nepravde** (loser je 🔴 — bez mandata, ne sjedi) | **{be_opt1.real_injustice}** |
| 🟡 Loser dobio mandat ali u mirovanju (vlada / izvršne f.) | {be_opt1.dormant_loser} |
| 🔵 Riješeno zamjenikom (loser je 🔵 — sjedi kao zamjena) | {be_opt1.resolved_by_zamjenik} |
| **Udio mandata gdje volja birača nije ispoštovana (samo ❌)** | **{pct(be_opt1.real_injustice, be_opt1.total_mandates)}** |

> Optika 1 je metodološki "bučnija" jer "nije u Saboru" uključuje ministre i
> druge nositelje izvršne vlasti koji jesu osvojili mandat (🟡). Žuti redovi
> u tablici ispod pokazuju upravo te slučajeve. Za čistu sliku samo izborne
> matematike vidi Optika 2 / sekcija D dolje.

{be_opt1_md}

---

## Optika 2 — Osvojio mandat na izborima

Ova optika ignorira tko trenutno sjedi i fokusira se na to **tko je dobio
mandat odlukom birača i liste 17. travnja 2024**.

#### A. {TOP_N} dobitnika mandata s najmanje preferencijalnih glasova

Najmanje glasova ima **{low_winners[0].naziv}** ({hr_int(low_winners[0].glasova)} preferencijalnih glasova).

{section("Najniži preferencijal — osvojili mandat", low_winners)}

#### B. {TOP_N} kandidata s najviše preferencijalnih glasova koji **nisu** osvojili mandat

Najviše glasova ima **{high_no_mandate[0].naziv}** ({hr_int(high_no_mandate[0].glasova)} preferencijalnih glasova).

{section("Najviši preferencijal — bez mandata", high_no_mandate)}

#### C. Kumulativna usporedba (Optika 2)

| Skupina | Broj kandidata | Σ preferencijalnih glasova |
|---|---:|---:|
| {TOP_N} dobitnika mandata s najnižim preferencijalom | {len(low_winners)} | **{hr_int(sum_low_win)}** |
| {TOP_N} kandidata s najvišim preferencijalom (bez mandata) | {len(high_no_mandate)} | **{hr_int(sum_high_nowin)}** |
| Omjer | | ≈ **{sum_high_nowin / max(sum_low_win, 1):.1f}×** |

#### D. Break-even (Optika 2) — gdje prestaje kontradikcija

Sparujem `i`-tog gubitnika s najviše preferencijala s `i`-tim dobitnikom
mandata s najmanje preferencijala. Kontradikcija postoji dok gubitnik ima
više preferencijalnih glasova od dobitnika; pravilo D'Hondta + ≥ 10 % praga
ovo dopušta jer mandat ovisi o **listi** i **redoslijedu na listi**, a ne o
apsolutnom broju preferencijala.

**Prelom: rang #{be_opt2.breakeven_rank}** — od ovog ranga nadalje, dobitnik
mandata ima više (ili isto) preferencijala od najjačeg gubitnika koji mu se
pridružuje u paru.

**Indeks zaobilaženja birača — Optika 2:**

| Mjera | Vrijednost |
|---|---:|
| Ukupno mandata na izborima | {be_opt2.total_mandates} |
| Svih kontradiktornih parova (gubitnik > dobitnik) | {be_opt2.contradicting} |
| ❌ **Stvarnih nepravdi** (loser je 🔴 — nikad nije ušao u Sabor) | **{be_opt2.real_injustice}** |
| 🔵 Riješeno zamjenikom (loser je 🔵 — kasnije ušao kao zamjena) | {be_opt2.resolved_by_zamjenik} |
| 🟡 Loser dobio mandat (mirovanje) — N/A za Optiku 2 | {be_opt2.dormant_loser} |
| **Udio mandata raspoređenih protivno preferencijalnoj volji (samo stvarne nepravde)** | **{pct(be_opt2.real_injustice, be_opt2.total_mandates)}** |
| Σ preferencijala "robbed" (samo 🔴 gubitnici) | {hr_int(be_opt2.sum_real_robbed)} |
| Σ preferencijala "placed" (dobitnici nasuprot 🔴) | {hr_int(be_opt2.sum_real_placed)} |
| **Udio neispoštovane preferencijalne podrške u stvarnim nepravdama** | **{pct(be_opt2.sum_real_robbed, be_opt2.sum_real_robbed + be_opt2.sum_real_placed)}** |
| Omjer "robbed" : "placed" preferencijala (stvarne nepravde) | **{be_opt2.sum_real_robbed / max(be_opt2.sum_real_placed, 1):.2f} : 1** |

Drugim riječima:

- U **{pct(be_opt2.real_injustice, be_opt2.total_mandates)}** mandata (
  {be_opt2.real_injustice} od {be_opt2.total_mandates}) preferencijalno jači
  kandidat **nikad nije ušao u Sabor** — to je čista nepravda gdje izborna
  matematika (D'Hondt + redoslijed na listi) nadjačava preferencijalnu volju
  birača i nema kasnijeg "ispravljanja" kroz zamjenike.
- Dodatnih {be_opt2.resolved_by_zamjenik} kontradikcija je
  **kasnije riješeno** zamjenikom — preferencijalno jači kandidat ipak je
  ušao u Sabor jer je jedan od izvornih dobitnika preuzeo izvršnu funkciju
  ili dao ostavku, pa se lista pomaknula. Nije idealna, ali tu sustav
  zapravo "popravi" matematiku kroz kasniju realokaciju.
- U stvarnim nepravdama, birači su preferencijalno iskazali **{pct(be_opt2.sum_real_robbed, be_opt2.sum_real_robbed + be_opt2.sum_real_placed)}**
  podrške ljudima koji su ostali izvan Sabora — više od **{be_opt2.sum_real_robbed / max(be_opt2.sum_real_placed, 1):.1f}×**
  nego što su ih dali ljudima koji su sjeli na te mandate.

{be_opt2_md}

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
| Mandata u mirovanju (🟡) | {n_yellow} od {total_mandates} = **{pct(n_yellow, total_mandates)}** mandata |
| Σ preferencijala koji su otišli na 🟡 (bait) | {hr_int(prefs_yellow)} |
| Σ svih preferencijala na općim listama | {hr_int(total_prefs)} |
| **Udio preferencijalne podrške koja je "preusmjerena"** | **{pct(prefs_yellow, total_prefs)}** |
| Σ preferencijala 🟡 (izvorno izabranih) | {hr_int(prefs_yellow)} |
| Σ preferencijala 🔵 (zamjenika koji su sjeli umjesto njih) | {hr_int(prefs_blue)} |
| **Omjer "obećana" : "isporučena" preferencijalna snaga** | **{prefs_yellow / max(prefs_blue, 1):.1f} : 1** |
| Prosjek pref. po 🟡 | {hr_int(avg_y)} |
| Prosjek pref. po 🔵 | {hr_int(avg_b)} |

Interpretacija (deskriptivna):

- **{pct(n_yellow, total_mandates)}** mandata u trenutnom Saboru izvorno je
  osvojila osoba koja sada **ne sjedi** — mandat drži u mirovanju zbog
  izvršne funkcije. U te {n_yellow} situacije birači su za prepoznato ime
  dali ukupno {hr_int(prefs_yellow)} preferencijalnih glasova, a u Sabor su
  na njihova mjesta sjeli zamjenici koji su, zbrojeno, dobili
  {hr_int(prefs_blue)} preferencijala — **{prefs_yellow / max(prefs_blue, 1):.1f}×** manje.
- Drugim riječima, preferencijalna podrška na ovih {n_yellow} mandata
  realizirana je u Saboru na razini **{deficit_ratio * 100:.1f} %** od one
  koja je iskazana na izborima.

### B. Indeks reprezentativnog deficita

Mjera u kojoj zastupnici u trenutnom Saboru imaju (ili nemaju) preferencijalnu
podršku birača iza sebe.

| Skupina | Broj | Σ preferencijala | Prosjek | Medijan |
|---|---:|---:|---:|---:|
| 🟢 Izabran i sjedi | {n_green} | {hr_int(prefs_green)} | {hr_int(avg_g)} | {hr_int(med_g)} |
| 🔵 Zamjenik (sjedi bez izvornog mandata) | {n_blue} | {hr_int(prefs_blue)} | {hr_int(avg_b)} | {hr_int(med_b)} |
| 🟡 Mandat u mirovanju | {n_yellow} | {hr_int(prefs_yellow)} | {hr_int(avg_y)} | {hr_int(med_y)} |
| 🔴 Bez mandata | {n_red} | {hr_int(prefs_red)} | {hr_int(avg_r)} | {hr_int(med_r)} |

| Mjera | Vrijednost |
|---|---:|
| Prosječni preferencijal 🔵 zamjenika | {hr_int(avg_b)} |
| Prosječni preferencijal 🟢 (legitimno izabranih i sjede) | {hr_int(avg_g)} |
| **Omjer "podrška 🟢 : podrška 🔵"** | **{avg_g / max(avg_b, 1):.1f} : 1** |
| Najmanje preferencijala kod 🟢 (donja granica izborne legitimnosti) | {hr_int(floor_green)} |
| Broj 🔵 zamjenika **ispod** te granice | **{n_blue_below_green_floor} od {n_blue}** ({pct(n_blue_below_green_floor, n_blue)}) |
| Broj 🔵 s manje od 1.000 preferencijala | {n_blue_under_1000} od {n_blue} ({pct(n_blue_under_1000, n_blue)}) |
| Broj 🔵 s manje od 500 preferencijala | {n_blue_under_500} od {n_blue} ({pct(n_blue_under_500, n_blue)}) |
| **Udio sjedećih zastupnika koji nisu izvorno osvojili mandat** | **{pct(n_blue, n_blue + n_green)}** |

Interpretacija (deskriptivna):

- **{pct(n_blue, n_blue + n_green)}** trenutnog Sabora ({n_blue} od {n_blue + n_green}
  zastupnika) čine osobe koje **nisu** osvojile mandat odlukom birača na
  izborima — sjede kao zamjenici izvorno izabranih.
- Prosječni 🔵 zamjenik ima **{avg_g / max(avg_b, 1):.1f}×** manje preferencijalnih
  glasova od prosječnog 🟢 izabranog koji sjedi.
- **{n_blue_below_green_floor} od {n_blue}** ({pct(n_blue_below_green_floor, n_blue)})
  zamjenika sjedi u Saboru s **manje** preferencijala od najslabijeg 🟢 izvornog
  zastupnika ({hr_int(floor_green)}). Drugim riječima, postoji skupina sjedećih
  zastupnika koji individualno nisu prešli "donji prag" izborne potvrde.

### C. Voter-fate svake preferencijalne ruke

Svaki preferencijalni glas birača na općim listama može se pratiti do
ishoda. Distribucija {hr_int(total_prefs)} preferencijalnih glasova
ukupno:

| Ishod glasa za kandidata | Σ glasova | Udio |
|---|---:|---:|
| 🟢 Kandidat sjedi u Saboru (izabran direktno) | {hr_int(prefs_green)} | **{pct(prefs_green, total_prefs)}** |
| 🔵 Kandidat sjedi kao zamjenik | {hr_int(prefs_blue)} | {pct(prefs_blue, total_prefs)} |
| 🟡 Kandidat osvojio mandat ali ne sjedi (izvršna f.) | {hr_int(prefs_yellow)} | {pct(prefs_yellow, total_prefs)} |
| 🔴 Kandidat nije osvojio mandat i ne sjedi | {hr_int(prefs_red)} | {pct(prefs_red, total_prefs)} |
| **Glas birača "došao" do osobe u Saboru (🟢 + 🔵)** | {hr_int(prefs_green + prefs_blue)} | **{pct(prefs_green + prefs_blue, total_prefs)}** |
| **Glas birača nije rezultirao zastupljenošću (🟡 + 🔴)** | {hr_int(prefs_yellow + prefs_red)} | **{pct(prefs_yellow + prefs_red, total_prefs)}** |

Drugim riječima: od svakih 100 preferencijalnih glasova na općim listama,
**{prefs_green / total_prefs * 100:.0f}** je pogodilo osobu koja danas sjedi
u Saboru kao izvorni izabranik, **{prefs_blue / total_prefs * 100:.0f}**
osobu koja sjedi kao zamjenik, **{prefs_yellow / total_prefs * 100:.0f}**
osobu koja je izabrana ali drži mandat u mirovanju, a
**{prefs_red / total_prefs * 100:.0f}** preferencijala dano je osobama koje
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
"""

    OUT.write_text(md, encoding="utf-8")
    print(f"Wrote {OUT}")
    print(f"  Statusi: 🟢 {n_green}  🔵 {n_blue}  🟡 {n_yellow}  🔴 {n_red}")
    print(
        f"  Optika 1 break-even rang #{be_opt1.breakeven_rank}: "
        f"❌ {be_opt1.real_injustice}  🟡 {be_opt1.dormant_loser}  "
        f"🔵 {be_opt1.resolved_by_zamjenik} "
        f"→ stvarna nepravda {pct(be_opt1.real_injustice, be_opt1.total_mandates)}"
    )
    print(
        f"  Optika 2 break-even rang #{be_opt2.breakeven_rank}: "
        f"❌ {be_opt2.real_injustice}  🔵 {be_opt2.resolved_by_zamjenik} "
        f"→ stvarna nepravda {pct(be_opt2.real_injustice, be_opt2.total_mandates)}"
    )


if __name__ == "__main__":
    main()
