"""Streamlit app for browsing izbori.domovina.ai results.

Run:
    streamlit run app.py

Backed by data/izbori.sqlite — build it first with:
    python3 scripts/mirror.py <election>
    python3 scripts/build_index.py
"""
from __future__ import annotations

import sqlite3
from pathlib import Path

import pandas as pd
import plotly.express as px
import streamlit as st

DB_PATH = Path(__file__).parent / "data" / "izbori.sqlite"

ELECTION_LABELS = {
    "predsjednik-2024": "Predsjednički izbori 2024",
    "parlament-2024": "Parlamentarni izbori 2024",
    "lokalni-2025": "Lokalni izbori 2025",
    "euparlament-2024": "EU parlament 2024",
    "referendum-2013": "Referendum 2013",
}

# Lokalni 2025 race types — vrsta code → human label.
LOKALNI_VRSTE = {
    "06": "Županijska / Gradska skupština",
    "08": "Gradsko / općinsko vijeće",
    "15": "Župan / Gradonačelnik Zagreba",
    "17": "Gradonačelnik / Načelnik",
    "19": "Zamjenik župana (srpska n.m.)",
    "21": "Zamjenik gradonačelnika (man.)",
    "25": "Zamjenik načelnika (man.)",
    "27": "Zamjenik župana (češka n.m.)",
    "37": "Posebni izbor",
}

LEVEL_ORDER = {"rh": 0, "zup": 1, "grop": 2, "bm": 3, "ino_zup": 1, "ino_zup_bm": 3}

# Sabor 2024 — geographic IJs (D'Hondt counterfactual treats these as one pool).
PARLAMENT_GEO_IJ = ("001", "002", "003", "004", "005", "006", "007", "008",
                    "009", "010", "011")
PARLAMENT_IJ_SEATS = {f"{i:03d}": 14 for i in range(1, 11)}
PARLAMENT_IJ_SEATS["011"] = 3
PARLAMENT_IJ_LABELS = {
    "001": "I. (Zagreb sjever)",
    "002": "II. (Zagreb istok / Slavonija)",
    "003": "III. (Zagorje / Međimurje / Bjelovar)",
    "004": "IV. (Slavonija)",
    "005": "V. (Slavonski Brod / Posavina)",
    "006": "VI. (Zagreb zapad)",
    "007": "VII. (Karlovac / Sisak)",
    "008": "VIII. (Istra / Primorje)",
    "009": "IX. (Šibenik / Zadar / Lika)",
    "010": "X. (Split / Dalmacija)",
    "011": "XI. (inozemstvo)",
}


def dhondt(votes: dict[str, int], seats: int, threshold_pct: float) -> dict[str, int]:
    """Allocate `seats` to entries in `votes` using D'Hondt with a percent
    threshold computed against the total of `votes`. Below-threshold entries
    are excluded from allocation but still appear in the result with 0."""
    total = sum(v for v in votes.values() if v)
    awards = {n: 0 for n in votes}
    if total == 0 or seats == 0:
        return awards
    cutoff = total * threshold_pct / 100.0
    eligible = {n: v for n, v in votes.items() if (v or 0) >= cutoff}
    if not eligible:
        return awards
    for _ in range(seats):
        winner = max(eligible, key=lambda n: eligible[n] / (awards[n] + 1))
        awards[winner] += 1
    return awards


# ────────────────────────────────────────────────────────────────────────────
# Cached helpers
# ────────────────────────────────────────────────────────────────────────────

@st.cache_resource
def get_conn() -> sqlite3.Connection:
    if not DB_PATH.exists():
        st.error(
            f"Baza {DB_PATH} ne postoji. Pokreni:\n\n"
            f"```\npython3 scripts/mirror.py <slug>\npython3 scripts/build_index.py\n```"
        )
        st.stop()
    return sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True, check_same_thread=False)


@st.cache_data
def list_elections() -> list[str]:
    rows = get_conn().execute(
        "SELECT DISTINCT election FROM rezultat ORDER BY election"
    ).fetchall()
    return [r[0] for r in rows]


@st.cache_data
def list_rounds(election: str) -> list[int]:
    rows = get_conn().execute(
        "SELECT DISTINCT krug FROM rezultat WHERE election=? ORDER BY krug", (election,)
    ).fetchall()
    return [r[0] for r in rows]


@st.cache_data
def list_vrste(election: str) -> list[str]:
    rows = get_conn().execute(
        "SELECT DISTINCT vrsta FROM rezultat WHERE election=? ORDER BY vrsta", (election,)
    ).fetchall()
    return [r[0] for r in rows]


@st.cache_data
def list_zupanije(election: str, krug: int, vrsta: str | None) -> pd.DataFrame:
    where = "election=? AND krug=? AND level IN ('zup','ino_zup')"
    params: list = [election, krug]
    if vrsta:
        where += " AND vrsta=?"
        params.append(vrsta)
    return pd.read_sql_query(
        f"""SELECT DISTINCT p1 AS code, zup_naziv AS naziv
            FROM rezultat WHERE {where} ORDER BY p1""",
        get_conn(), params=params,
    )


@st.cache_data
def list_grops(election: str, krug: int, vrsta: str | None, zup: str) -> pd.DataFrame:
    where = "election=? AND krug=? AND level IN ('grop','ino_zup') AND p1=?"
    params: list = [election, krug, zup]
    if vrsta:
        where += " AND vrsta=?"
        params.append(vrsta)
    return pd.read_sql_query(
        f"""SELECT DISTINCT p2 AS code, grop_naziv AS naziv
            FROM rezultat WHERE {where} AND p2 != '0000'
            ORDER BY grop_naziv""",
        get_conn(), params=params,
    )


@st.cache_data
def list_bms(election: str, krug: int, vrsta: str | None, zup: str, grop: str) -> pd.DataFrame:
    where = "election=? AND krug=? AND level IN ('bm','ino_zup_bm') AND p1=? AND p2=? AND p3 != '000'"
    params: list = [election, krug, zup, grop]
    if vrsta:
        where += " AND vrsta=?"
        params.append(vrsta)
    return pd.read_sql_query(
        f"""SELECT DISTINCT p3 AS code, bm_naziv AS naziv
            FROM rezultat WHERE {where}
            ORDER BY p3""",
        get_conn(), params=params,
    )


def fetch_rezultat(election: str, krug: int, vrsta: str | None,
                   p1: str, p2: str, p3: str) -> tuple[pd.Series, pd.DataFrame] | None:
    where = "election=? AND krug=? AND p1=? AND p2=? AND p3=?"
    params: list = [election, krug, p1, p2, p3]
    if vrsta:
        where += " AND vrsta=?"
        params.append(vrsta)
    rezultat = pd.read_sql_query(
        f"SELECT * FROM rezultat WHERE {where} LIMIT 1",
        get_conn(), params=params,
    )
    if rezultat.empty:
        return None
    rid = int(rezultat.iloc[0]["id"])
    lista = pd.read_sql_query(
        """SELECT rbr, naziv, stranke, predlagatelji, glasova, posto,
                  jedinstvena_sifra, COALESCE(mandata, 0) AS mandata
           FROM rezultat_lista WHERE rezultat_id=? ORDER BY rbr""",
        get_conn(), params=(rid,),
    )
    return rezultat.iloc[0], lista


# ────────────────────────────────────────────────────────────────────────────
# Parlament fairness analysis
# ────────────────────────────────────────────────────────────────────────────

def render_parlament_fairness(rezultat: pd.Series, lista: pd.DataFrame, p1: str) -> None:
    """Show wasted-vote breakdown, per-IJ disparity, and a unified-RH
    counterfactual D'Hondt allocation. Renders only for parlament-2024 at
    RH or IJ level."""
    is_rh = rezultat["level"] == "rh"

    st.divider()
    st.subheader("⚖️ Analiza pravednosti")

    # ── Effective vs. wasted votes (within current view) ────────────────────
    glasova_total = int((lista["glasova"].fillna(0)).sum())
    glasova_uspjesni = int(lista.loc[lista["mandata"] > 0, "glasova"].fillna(0).sum())
    glasova_propali = glasova_total - glasova_uspjesni
    pct_uspjesni = 100 * glasova_uspjesni / glasova_total if glasova_total else 0
    pct_propali = 100 - pct_uspjesni

    if is_rh:
        st.markdown(
            "**Glasovi koji su sudjelovali u raspodjeli mandata** — sve liste koje su negdje "
            "prešle 5 % unutar svoje izborne jedinice. **Propali glasovi** su one koje "
            "se nigdje nisu kvalificirale i tako nisu pretvorene u mandat."
        )
    else:
        ij = PARLAMENT_IJ_LABELS.get(p1, p1)
        st.markdown(
            f"**Glasovi za izbornu jedinicu {ij}** — koji su prešli 5 % praga i ušli u "
            f"raspodjelu, te koji su propali (lista <5 % unutar IJ)."
        )

    c1, c2, c3 = st.columns(3)
    c1.metric("Iskorišteni glasovi", f"{glasova_uspjesni:,}".replace(",", "."),
              delta=f"{pct_uspjesni:.2f} %")
    c2.metric("Propali glasovi (<5 %)", f"{glasova_propali:,}".replace(",", "."),
              delta=f"{pct_propali:.2f} %", delta_color="inverse")
    c3.metric("Ukupno glasova", f"{glasova_total:,}".replace(",", "."))

    # Compact pie of effective vs wasted
    pie = px.pie(
        names=["Iskorišteni", "Propali"],
        values=[glasova_uspjesni, glasova_propali],
        hole=0.55,
        color_discrete_sequence=["#1f77b4", "#d62728"],
    )
    pie.update_layout(height=260, margin=dict(l=10, r=10, t=10, b=10),
                      showlegend=True, legend=dict(orientation="h"))
    st.plotly_chart(pie, use_container_width=True)

    if not is_rh:
        return

    # ── Per-IJ disparity: votes per seat ────────────────────────────────────
    st.markdown("---")
    st.markdown(
        "### 📐 Disparitet izbornih jedinica\n"
        "Svaka geografska IJ dobiva fiksan broj mandata bez obzira na broj birača "
        "(IJ 1–10 = 14, IJ 11 = 3). Zato glas u manjoj/manje izlaznoj IJ ima veću "
        "težinu — manje listića po dobivenom mandatu."
    )

    krug = int(rezultat["krug"])
    ij_df = pd.read_sql_query(
        """SELECT r.p1 AS ij, r.biraci_ukupno, r.biraci_glasovalo,
                  r.biraci_glasovalo_posto, r.listici_vazeci,
                  COALESCE(SUM(CASE WHEN l.mandata > 0 THEN l.glasova ELSE 0 END), 0) AS glasova_uspjesni
           FROM rezultat r LEFT JOIN rezultat_lista l ON l.rezultat_id = r.id
           WHERE r.election='parlament-2024' AND r.krug=? AND r.vrsta='02'
             AND r.level='zup' AND r.p1 IN ('001','002','003','004','005',
                                            '006','007','008','009','010','011')
           GROUP BY r.id ORDER BY r.p1""",
        get_conn(), params=(krug,),
    )
    ij_df["mandata"] = ij_df["ij"].map(PARLAMENT_IJ_SEATS)
    ij_df["IJ"] = ij_df["ij"].map(lambda i: f"{i} · {PARLAMENT_IJ_LABELS.get(i, '')}")
    ij_df["glasova_po_mandatu"] = (ij_df["glasova_uspjesni"] / ij_df["mandata"]).round(0).astype(int)
    ij_df["birača_po_mandatu"] = (ij_df["biraci_ukupno"] / ij_df["mandata"]).round(0).astype(int)

    show = ij_df[["IJ", "biraci_ukupno", "biraci_glasovalo",
                  "biraci_glasovalo_posto", "listici_vazeci",
                  "mandata", "birača_po_mandatu", "glasova_po_mandatu"]].rename(columns={
        "biraci_ukupno": "Birači",
        "biraci_glasovalo": "Glasovalo",
        "biraci_glasovalo_posto": "Izlaznost %",
        "listici_vazeci": "Važeći listići",
        "mandata": "Mandata",
        "birača_po_mandatu": "Birača/mandat",
        "glasova_po_mandatu": "Iskoristivi glasovi/mandat",
    })
    st.dataframe(show, use_container_width=True, hide_index=True)

    fig = px.bar(
        ij_df,
        x="IJ",
        y="glasova_po_mandatu",
        text="glasova_po_mandatu",
        labels={"glasova_po_mandatu": "Iskoristivi glasovi / mandat", "IJ": ""},
        color="biraci_glasovalo_posto",
        color_continuous_scale="Viridis",
    )
    fig.update_traces(texttemplate="%{text:,d}".replace(",", "."), textposition="outside")
    fig.update_layout(
        height=400, margin=dict(l=10, r=10, t=10, b=10),
        coloraxis_colorbar=dict(title="Izlaznost %"),
        xaxis=dict(tickangle=-30),
    )
    st.plotly_chart(fig, use_container_width=True)

    min_ij = ij_df.loc[ij_df["glasova_po_mandatu"].idxmin()]
    max_ij = ij_df.loc[ij_df["glasova_po_mandatu"].idxmax()]
    ratio = max_ij["glasova_po_mandatu"] / max(min_ij["glasova_po_mandatu"], 1)
    st.info(
        f"Najmanji broj glasova po mandatu — **{min_ij['IJ']}** "
        f"({int(min_ij['glasova_po_mandatu']):,} glasova/mandat). "
        f"Najveći — **{max_ij['IJ']}** ({int(max_ij['glasova_po_mandatu']):,} glasova/mandat). "
        f"Omjer: glas u najpovoljnijoj IJ vrijedi **{ratio:.2f}×** više od glasa u najnepovoljnijoj.".replace(",", ".")
    )

    # ── Counterfactual: RH as a single constituency ─────────────────────────
    st.markdown("---")
    st.markdown(
        "### 🇭🇷 Kontrafaktual: RH kao jedna izborna jedinica\n"
        "Što bi se dogodilo da se 143 geografska mandata (IJ 1–11) raspodijele "
        "**D'Hondtovom metodom nad cijelim RH** s **5 % nacionalnim pragom**, "
        "kao što je organiziran izbor za Europski parlament. Manjinske mandate "
        "(8 mjesta iz IJ 12) ovaj scenarij ostavlja netaknute."
    )

    nat_df = pd.read_sql_query(
        """SELECT l.naziv,
                  SUM(COALESCE(l.glasova, 0)) AS glasova,
                  SUM(COALESCE(l.mandata, 0)) AS mandata_stvarno
           FROM rezultat_lista l JOIN rezultat r ON r.id = l.rezultat_id
           WHERE r.election='parlament-2024' AND r.krug=? AND r.vrsta='02'
             AND r.level='zup' AND r.p1 IN ('001','002','003','004','005',
                                            '006','007','008','009','010','011')
           GROUP BY l.naziv""",
        get_conn(), params=(krug,),
    )
    total_glasova = int(nat_df["glasova"].sum())
    nat_df["posto"] = (100 * nat_df["glasova"] / total_glasova).round(2)
    awards = dhondt(dict(zip(nat_df["naziv"], nat_df["glasova"])), seats=143, threshold_pct=5.0)
    nat_df["mandata_jedinstvena_IJ"] = nat_df["naziv"].map(awards).fillna(0).astype(int)
    nat_df["razlika"] = nat_df["mandata_jedinstvena_IJ"] - nat_df["mandata_stvarno"]
    nat_df = nat_df.sort_values(
        ["mandata_jedinstvena_IJ", "mandata_stvarno", "glasova"],
        ascending=[False, False, False],
    )

    show = nat_df.rename(columns={
        "naziv": "Lista",
        "glasova": "Glasova",
        "posto": "%",
        "mandata_stvarno": "Mandata (stvarno, po IJ)",
        "mandata_jedinstvena_IJ": "Mandata (jedinstvena IJ, 5 %)",
        "razlika": "Δ",
    })
    show = show[show["Glasova"] > 0]
    st.dataframe(show, use_container_width=True, hide_index=True)

    delta_loosers = nat_df[nat_df["razlika"] < 0].copy()
    delta_winners = nat_df[nat_df["razlika"] > 0].copy()
    if not delta_loosers.empty or not delta_winners.empty:
        c1, c2 = st.columns(2)
        with c1:
            st.markdown("**Liste koje bi izgubile mandate**")
            if not delta_loosers.empty:
                st.dataframe(
                    delta_loosers[["naziv", "razlika"]]
                    .rename(columns={"naziv": "Lista", "razlika": "Δ"}),
                    use_container_width=True, hide_index=True,
                )
            else:
                st.write("—")
        with c2:
            st.markdown("**Liste koje bi dobile mandate**")
            if not delta_winners.empty:
                st.dataframe(
                    delta_winners[["naziv", "razlika"]]
                    .rename(columns={"naziv": "Lista", "razlika": "Δ"}),
                    use_container_width=True, hide_index=True,
                )
            else:
                st.write("—")

    # National wasted votes count under unified-IJ rule
    nat_eligible_total = int(nat_df.loc[nat_df["mandata_jedinstvena_IJ"] > 0, "glasova"].sum())
    nat_wasted = total_glasova - nat_eligible_total
    pct_wasted_nat = 100 * nat_wasted / total_glasova if total_glasova else 0
    st.caption(
        f"Pri jedinstvenoj IJ s 5 % nacionalnog praga propalo bi "
        f"**{nat_wasted:,}** glasova (**{pct_wasted_nat:.2f} %**). "
        f"U trenutnom sustavu propalo je **{glasova_propali:,}** ({pct_propali:.2f} %).".replace(",", ".")
    )


# ────────────────────────────────────────────────────────────────────────────
# UI
# ────────────────────────────────────────────────────────────────────────────

st.set_page_config(page_title="Izbori — arhiva", layout="wide", page_icon="🗳️")
st.title("🗳️ Arhiva izbora — vizualizacija")
st.caption(
    "Lokalna kopija javne arhive `izbori.hr/arhiva-izbora`. "
    "Izvor: [github.com/domovinatv/izbori.domovina.ai](https://github.com/domovinatv/izbori.domovina.ai)"
)

tab_browse, tab_search, tab_about = st.tabs(["📊 Pregled rezultata", "🔍 Pretraga kandidata", "ℹ️ O bazi"])


# ── Tab 1: Browse ───────────────────────────────────────────────────────────

with tab_browse:
    sb = st.sidebar
    sb.header("Filteri")

    avail_elections = list_elections()
    if not avail_elections:
        st.warning("Baza je prazna. Pokreni `scripts/mirror.py` i `scripts/build_index.py`.")
        st.stop()

    election = sb.selectbox(
        "Izbori",
        options=avail_elections,
        format_func=lambda s: ELECTION_LABELS.get(s, s),
    )

    rounds = list_rounds(election)
    krug = sb.selectbox("Krug", options=rounds) if len(rounds) > 1 else rounds[0]

    # Vrsta is meaningful only for lokalni; for everything else it's a single value we ignore in filters.
    vrsta_opts = list_vrste(election)
    if election == "lokalni-2025" and len(vrsta_opts) > 1:
        vrsta = sb.selectbox(
            "Vrsta izbora",
            options=vrsta_opts,
            format_func=lambda v: f"{v} — {LOKALNI_VRSTE.get(v, '?')}",
        )
    else:
        vrsta = vrsta_opts[0] if vrsta_opts else None

    sb.divider()
    sb.subheader("Geografija")
    zups = list_zupanije(election, krug, vrsta)
    zup_choice = sb.selectbox(
        "Razina",
        options=["— RH (ukupno)"] + [f"{r['code']} · {r['naziv']}" for _, r in zups.iterrows()],
    )
    if zup_choice.startswith("—"):
        p1, p2, p3 = "00", "0000", "000"
    else:
        p1 = zup_choice.split(" · ")[0]
        grops = list_grops(election, krug, vrsta, p1)
        if grops.empty:
            p2, p3 = "0000", "000"
        else:
            grop_choice = sb.selectbox(
                "Grad / općina",
                options=["— svi (zbroj županije)"]
                + [f"{r['code']} · {r['naziv']}" for _, r in grops.iterrows()],
            )
            if grop_choice.startswith("—"):
                p2, p3 = "0000", "000"
            else:
                p2 = grop_choice.split(" · ")[0]
                bms = list_bms(election, krug, vrsta, p1, p2)
                if bms.empty:
                    p3 = "000"
                else:
                    bm_choice = sb.selectbox(
                        "Biračko mjesto",
                        options=["— svi (zbroj općine)"]
                        + [f"{r['code']} · {r['naziv'] or '(bez naziva)'}" for _, r in bms.iterrows()],
                    )
                    p3 = "000" if bm_choice.startswith("—") else bm_choice.split(" · ")[0]

    # ── Result rendering ────────────────────────────────────────────────────
    res = fetch_rezultat(election, krug, vrsta, p1, p2, p3)
    if not res:
        st.warning("Nema podataka za ovu kombinaciju.")
        st.stop()

    rezultat, lista = res
    title_parts = [rezultat["zup_naziv"], rezultat["grop_naziv"], rezultat["bm_naziv"]]
    title = " · ".join(p for p in title_parts if p) or "Republika Hrvatska"
    st.header(title)
    st.caption(f"{rezultat['izbori_naziv']} · {rezultat['datum'] or ''} {rezultat['vrijeme'] or ''} · krug {krug}")

    # Turnout / seat summary cards
    has_seats = election == "parlament-2024" and lista["mandata"].sum() > 0
    if has_seats:
        c1, c2, c3, c4, c5 = st.columns(5)
    else:
        c1, c2, c3, c4 = st.columns(4)

    c1.metric("Birača", f"{int(rezultat['biraci_ukupno'] or 0):,}".replace(",", "."))
    c2.metric(
        "Glasovalo",
        f"{int(rezultat['biraci_glasovalo'] or 0):,}".replace(",", "."),
        delta=f"{rezultat['biraci_glasovalo_posto']:.2f} %" if rezultat['biraci_glasovalo_posto'] else None,
    )
    c3.metric("Važeći listići", f"{int(rezultat['listici_vazeci'] or 0):,}".replace(",", "."))
    c4.metric("Nevažeći", f"{int(rezultat['listici_nevazeci'] or 0):,}".replace(",", "."))
    if has_seats:
        c5.metric("Mandata", int(lista["mandata"].sum()))

    if lista.empty:
        st.info("Nema lista u rezultatu.")
        st.stop()

    if has_seats:
        st.caption(
            "🪑 **D'Hondtova metoda · 5 % prag unutar izborne jedinice.** "
            "Geografske IJ 1–10 dijele po 14 mandata, IJ 11 (inozemstvo) 3 mandata; "
            "IJ 12 (manjine) — 8 mandata, top‑N kandidata po manjini, bez praga."
        )

    # Bar chart
    chart_df = lista.copy()
    chart_df["label"] = chart_df.apply(
        lambda r: (
            (f"🪑 {int(r['mandata'])}× — " if has_seats and r['mandata'] else "")
            + (r["naziv"] if not r["stranke"] else f"{r['naziv']}  ({r['stranke'][:60]})")
        ),
        axis=1,
    )
    chart_df = chart_df.sort_values("glasova", ascending=True).tail(15)
    chart_df["hover_mandata"] = chart_df["mandata"].astype(int)

    fig = px.bar(
        chart_df,
        x="glasova",
        y="label",
        orientation="h",
        text="posto",
        labels={"glasova": "Glasova", "label": ""},
        height=max(420, 32 * len(chart_df) + 100),
        hover_data={"hover_mandata": True, "label": False, "posto": ":.2f"},
        color=chart_df["mandata"] if has_seats else None,
        color_continuous_scale="Blues" if has_seats else None,
    )
    fig.update_traces(texttemplate="%{text:.2f} %", textposition="outside")
    fig.update_layout(margin=dict(l=10, r=10, t=10, b=10))
    if has_seats:
        fig.update_layout(coloraxis_colorbar=dict(title="mandata"))
    st.plotly_chart(fig, use_container_width=True)

    with st.expander("📋 Tablica liste (sve)"):
        cols = ["rbr", "naziv", "stranke", "predlagatelji", "glasova", "posto"]
        if has_seats:
            cols.append("mandata")
        show = lista[cols].copy()
        if has_seats:
            show = show.sort_values(["mandata", "glasova"], ascending=[False, False])
        st.dataframe(show, use_container_width=True, hide_index=True)

    # ── Parlament-only fairness analysis ────────────────────────────────────
    if election == "parlament-2024" and rezultat["level"] in ("rh", "zup", "ino_zup"):
        render_parlament_fairness(rezultat, lista, p1)

    with st.expander("🛠 Tehnički detalji"):
        st.code(
            f"election = {election}\n"
            f"krug     = {krug}\n"
            f"vrsta    = {vrsta}\n"
            f"p1/p2/p3 = {p1} / {p2} / {p3}\n"
            f"level    = {rezultat['level']}\n"
            f"source   = {rezultat['source_file']}",
            language="text",
        )


# ── Tab 2: Search ───────────────────────────────────────────────────────────

with tab_search:
    st.subheader("Pretraga po imenu kandidata ili stranke")
    q = st.text_input("Upit (FTS5 sintaksa)", placeholder="npr. plenković ili \"selak raspudić\" ili možemo")

    where_election = st.multiselect(
        "Suzi na izbore",
        options=list_elections(),
        format_func=lambda s: ELECTION_LABELS.get(s, s),
        default=list_elections(),
    )
    only_top_levels = st.checkbox("Prikaži samo RH/županija razinu", value=True)

    if not q:
        st.info("Upiši ime za pretragu. Primjeri: `milanović`, `\"andrej plenković\"`, `možemo`.")
        st.stop()

    election_filter = ""
    params: list = [q]
    if where_election:
        ph = ",".join("?" for _ in where_election)
        election_filter = f" AND r.election IN ({ph})"
        params.extend(where_election)
    level_filter = " AND r.level IN ('rh','zup')" if only_top_levels else ""

    # Try kandidat FTS first, then lista FTS
    sql_kand = f"""
        SELECT r.election, r.krug, r.zup_naziv, r.grop_naziv, r.bm_naziv,
               l.naziv AS lista, k.naziv AS kandidat,
               k.glasova, k.posto, r.level
        FROM rezultat_kandidat_fts fts
        JOIN rezultat_kandidat k ON k.id = fts.rowid
        JOIN rezultat_lista l ON l.id = k.lista_id
        JOIN rezultat r ON r.id = l.rezultat_id
        WHERE rezultat_kandidat_fts MATCH ?
        {election_filter}{level_filter}
        ORDER BY k.glasova DESC
        LIMIT 200
    """
    df_k = pd.read_sql_query(sql_kand, get_conn(), params=params)

    sql_lista = f"""
        SELECT r.election, r.krug, r.zup_naziv, r.grop_naziv, r.bm_naziv,
               l.naziv AS lista, l.stranke,
               l.glasova, l.posto, r.level
        FROM rezultat_lista_fts fts
        JOIN rezultat_lista l ON l.id = fts.rowid
        JOIN rezultat r ON r.id = l.rezultat_id
        WHERE rezultat_lista_fts MATCH ?
        {election_filter}{level_filter}
        ORDER BY l.glasova DESC
        LIMIT 200
    """
    df_l = pd.read_sql_query(sql_lista, get_conn(), params=params)

    st.write(f"**Kandidati** (unutar stranačkih lista) — {len(df_k)} pogodaka")
    if not df_k.empty:
        df_k["election"] = df_k["election"].map(lambda s: ELECTION_LABELS.get(s, s))
        st.dataframe(df_k, use_container_width=True, hide_index=True)

    st.write(f"**Liste / stranke / predsjednički kandidati** — {len(df_l)} pogodaka")
    if not df_l.empty:
        df_l["election"] = df_l["election"].map(lambda s: ELECTION_LABELS.get(s, s))
        st.dataframe(df_l, use_container_width=True, hide_index=True)


# ── Tab 3: About ────────────────────────────────────────────────────────────

with tab_about:
    st.subheader("Što je u bazi")
    counts = pd.read_sql_query(
        """SELECT election AS izbori, level AS razina, COUNT(*) AS rezultata
           FROM rezultat GROUP BY election, level ORDER BY 1, 2""",
        get_conn(),
    )
    counts["izbori"] = counts["izbori"].map(lambda s: ELECTION_LABELS.get(s, s))
    st.dataframe(counts, use_container_width=True, hide_index=True)

    totals = pd.read_sql_query(
        """SELECT 'rezultat' AS tablica, COUNT(*) n FROM rezultat
           UNION ALL SELECT 'rezultat_lista', COUNT(*) FROM rezultat_lista
           UNION ALL SELECT 'rezultat_kandidat', COUNT(*) FROM rezultat_kandidat""",
        get_conn(),
    )
    st.dataframe(totals, use_container_width=True, hide_index=True)

    st.markdown(
        """
**Razine** — `rh` ukupno RH · `zup` županija · `grop` grad/općina · `bm` biračko mjesto · `ino_zup`/`ino_zup_bm` inozemstvo.

Podaci su preuzeti iz javne arhive Državnog izbornog povjerenstva
(`izbori.hr/arhiva-izbora`). Sav kod, šifrarnici i upute za ponovni mirror
su u repozitoriju [`domovinatv/izbori.domovina.ai`](https://github.com/domovinatv/izbori.domovina.ai).
        """
    )
