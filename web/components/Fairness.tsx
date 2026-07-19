"use client";

import { useState } from "react";
import type { Fairness as FairnessData, FairnessKandidat } from "@/lib/types";
import { partyColor, SEQ_NAVY } from "@/lib/palette";
import { fmtInt, fmtPct } from "@/lib/format";

/**
 * "Analiza pravednosti" — port of the internal Streamlit analysis. All
 * numbers precomputed in scripts/export_web.py (fairness.json); this
 * component only lays them out.
 */

function StatCard({
  label,
  value,
  sub,
  tone = "navy",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "navy" | "red";
}) {
  return (
    <div className="rounded-lg border border-line bg-white p-5">
      <p className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">{label}</p>
      <p
        className={`tabular mt-2 font-serif text-3xl font-bold ${
          tone === "red" ? "text-[#B42318]" : "text-navy"
        }`}
      >
        {value}
      </p>
      {sub ? <p className="mt-1 text-sm text-muted">{sub}</p> : null}
    </div>
  );
}

function DeltaBadge({ delta }: { delta: number }) {
  if (delta === 0) return <span className="text-muted">0</span>;
  return (
    <span
      className={`tabular font-semibold ${delta > 0 ? "text-[#2E8540]" : "text-[#B42318]"}`}
    >
      {delta > 0 ? `+${delta}` : delta}
    </span>
  );
}

const KANDIDAT_TABS = [
  {
    key: "gubitnici",
    label: "Najveći gubitnici",
    opis: "Najviše preferencijalnih glasova, a bez mandata i bez mjesta u Saboru — najčešće jer lista nije prešla 5 % u izbornoj jedinici.",
  },
  {
    key: "odbili",
    label: "Odbili mandat",
    opis: "Osvojili mandat po D'Hondtu, ali ne sjede u Saboru: premijer, ministri, gradonačelnici, MEP-ovi… Zamjenjuju ih sljedeći s liste.",
  },
  {
    key: "namjestenici",
    label: "Najmanje preferencijala u Saboru",
    opis: "Sjede u Saboru s najmanje preferencijalnih glasova — ušli su pozicijom na listi ili kao zamjenici, ne izravnom potporom birača.",
  },
] as const;

function KandidatTable({ rows, showDhondt }: { rows: FairnessKandidat[]; showDhondt?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-line text-xs text-muted uppercase">
            <th className="py-1.5 pr-2 font-semibold">Kandidat</th>
            <th className="py-1.5 pr-2 font-semibold">Vodeća stranka liste</th>
            <th className="py-1.5 pr-2 font-semibold">IJ</th>
            <th className="py-1.5 pr-2 text-right font-semibold">Pref. glasova</th>
            <th className="py-1.5 pr-2 text-right font-semibold">% liste</th>
            {showDhondt ? (
              <th className="py-1.5 pr-2 text-center font-semibold">Mandat / u Saboru</th>
            ) : null}
            <th className="py-1.5 font-semibold">Lista</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((k) => (
            <tr key={k.naziv + k.ij} className="border-b border-line/60">
              <td className="py-1.5 pr-2 font-medium">{k.naziv}</td>
              <td className="py-1.5 pr-2">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ background: partyColor(k.stranka) }}
                  />
                  {k.stranka}
                </span>
              </td>
              <td className="py-1.5 pr-2 text-muted">IJ {k.ij}</td>
              <td className="tabular py-1.5 pr-2 text-right">{fmtInt(k.glasova)}</td>
              <td className="tabular py-1.5 pr-2 text-right">{fmtPct(k.posto_liste, 1)}</td>
              {showDhondt ? (
                <td className="py-1.5 pr-2 text-center">
                  {k.dhondt ? "🪑" : "—"} {k.u_saboru ? "✅" : ""}
                </td>
              ) : null}
              <td className="py-1.5 text-muted">{k.lista}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Fairness({ data }: { data: FairnessData }) {
  const [tab, setTab] = useState<(typeof KANDIDAT_TABS)[number]["key"]>("gubitnici");
  const d = data.disparitet;
  const kf = data.kontrafaktual;
  const maxGpm = Math.max(...d.jedinice.map((j) => j.glasova_po_mandatu ?? 0), 1);
  const kandidatRows =
    tab === "gubitnici"
      ? data.gubitnici
      : tab === "odbili"
        ? data.odbili.kandidati
        : data.namjestenici;

  return (
    <div className="space-y-10">
      {/* ── Iskorišteni vs propali glasovi ─────────────────────────────── */}
      <div>
        <h3 className="mb-1 font-semibold text-navy">Iskorišteni i propali glasovi</h3>
        <p className="mb-4 max-w-3xl text-sm text-muted">
          Glas je „iskorišten" ako je lista negdje osvojila barem jedan mandat;
          „propao" je ako se lista nigdje nije kvalificirala (ispod 5 % u izbornoj
          jedinici) pa nije pretvoren u zastupničko mjesto.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Iskorišteni glasovi"
            value={fmtPct(data.propali_rh.pct_iskoristeni, 2)}
            sub={`${fmtInt(data.propali_rh.iskoristeni)} glasova`}
          />
          <StatCard
            label="Propali glasovi"
            value={fmtPct(data.propali_rh.pct_propali, 2)}
            sub={`${fmtInt(data.propali_rh.propali)} glasova`}
            tone="red"
          />
          <StatCard
            label="Zastupljeni birači (IJ 1–11)"
            value={fmtPct(d.nacionalno.pct_zastupljenih, 2)}
            sub="udio svih upisanih birača čiji izabrani zastupnik sjedi u Saboru"
          />
        </div>
        <div
          className="mt-4 flex h-[22px] w-full overflow-hidden rounded-[4px]"
          role="img"
          aria-label={`Iskorišteni ${fmtPct(data.propali_rh.pct_iskoristeni, 2)}, propali ${fmtPct(data.propali_rh.pct_propali, 2)}`}
        >
          <div
            className="bg-navy"
            style={{ width: `${data.propali_rh.pct_iskoristeni ?? 0}%` }}
          />
          <div className="w-[2px] bg-white" aria-hidden="true" />
          <div className="flex-1 bg-[#B42318]" />
        </div>
        <p className="tabular mt-1 text-xs text-muted">
          {fmtInt(data.propali_rh.iskoristeni)} iskorišteno ·{" "}
          {fmtInt(data.propali_rh.propali)} propalo
        </p>
      </div>

      {/* ── Disparitet IJ ──────────────────────────────────────────────── */}
      <div>
        <h3 className="mb-1 font-semibold text-navy">Disparitet izbornih jedinica</h3>
        <p className="mb-4 max-w-3xl text-sm text-muted">
          Svaka geografska izborna jedinica dobiva fiksan broj mandata (I.–X. po
          14, XI. tri) bez obzira na broj birača — pa glas u manjoj jedinici
          „vrijedi" više. Stupci: iskoristivi glasovi po osvojenom mandatu.
        </p>
        <ul className="space-y-2.5" role="list">
          {d.jedinice.map((j) => (
            <li key={j.code}>
              <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                <span className="font-medium text-ink">{j.label}</span>
                <span className="tabular text-muted">
                  {fmtInt(j.glasova_po_mandatu)} glasova/mandat · izlaznost{" "}
                  {fmtPct(j.izlaznost, 1)}
                </span>
              </div>
              <div className="h-[14px] w-full overflow-hidden rounded-[4px] bg-line/50">
                <div
                  className="h-full rounded-r-[4px]"
                  style={{
                    width: `${((j.glasova_po_mandatu ?? 0) / maxGpm) * 100}%`,
                    background: SEQ_NAVY[5],
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 rounded-md border border-line bg-surface p-3 text-sm">
          Najpovoljnija jedinica: <strong>{d.min.label}</strong> (
          <span className="tabular">{fmtInt(d.min.glasova_po_mandatu)}</span>{" "}
          glasova po mandatu); najnepovoljnija: <strong>{d.max.label}</strong> (
          <span className="tabular">{fmtInt(d.max.glasova_po_mandatu)}</span>).
          Glas u najpovoljnijoj vrijedi <strong>{d.omjer.toLocaleString("hr-HR")}×</strong>{" "}
          više.
        </p>
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-muted hover:text-navy">
            Tablica: sve jedinice (birači, izlaznost, % iskorišteni/propali/zastupljeni)
          </summary>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-line text-xs text-muted uppercase">
                  <th className="py-1.5 pr-2 font-semibold">IJ</th>
                  <th className="py-1.5 pr-2 text-right font-semibold">Birači</th>
                  <th className="py-1.5 pr-2 text-right font-semibold">Izlaznost</th>
                  <th className="py-1.5 pr-2 text-right font-semibold">Mandata</th>
                  <th className="py-1.5 pr-2 text-right font-semibold">Birača/mandat</th>
                  <th className="py-1.5 pr-2 text-right font-semibold">Glasova/mandat</th>
                  <th className="py-1.5 pr-2 text-right font-semibold">% iskorišteni</th>
                  <th className="py-1.5 pr-2 text-right font-semibold">% propali</th>
                  <th className="py-1.5 text-right font-semibold">% zastupljenih</th>
                </tr>
              </thead>
              <tbody>
                {d.jedinice.map((j) => (
                  <tr key={j.code} className="border-b border-line/60">
                    <td className="py-1.5 pr-2">{j.label}</td>
                    <td className="tabular py-1.5 pr-2 text-right">{fmtInt(j.biraci)}</td>
                    <td className="tabular py-1.5 pr-2 text-right">{fmtPct(j.izlaznost, 1)}</td>
                    <td className="tabular py-1.5 pr-2 text-right">{j.mandata}</td>
                    <td className="tabular py-1.5 pr-2 text-right">{fmtInt(j.biraca_po_mandatu)}</td>
                    <td className="tabular py-1.5 pr-2 text-right">{fmtInt(j.glasova_po_mandatu)}</td>
                    <td className="tabular py-1.5 pr-2 text-right">{fmtPct(j.pct_iskoristeni, 1)}</td>
                    <td className="tabular py-1.5 pr-2 text-right">{fmtPct(j.pct_propali, 1)}</td>
                    <td className="tabular py-1.5 text-right">{fmtPct(j.pct_zastupljenih, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>

      {/* ── Kontrafaktual ──────────────────────────────────────────────── */}
      <div>
        <h3 className="mb-1 font-semibold text-navy">
          Kontrafaktual: Hrvatska kao jedna izborna jedinica
        </h3>
        <p className="mb-4 max-w-3xl text-sm text-muted">
          Da se 143 geografska mandata dijele D&apos;Hondtom nad cijelom RH s 5 %
          nacionalnim pragom (kao izbori za EU parlament), uz manjinska mjesta
          netaknuta. Entiteti su koalicijske liste kako su prijavljene po
          jedinicama — glasove unutar koalicije nije moguće razdvojiti po
          strankama.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs text-muted uppercase">
                <th className="py-1.5 pr-2 font-semibold">Lista</th>
                <th className="py-1.5 pr-2 text-right font-semibold">Glasova</th>
                <th className="py-1.5 pr-2 text-right font-semibold">%</th>
                <th className="py-1.5 pr-2 text-right font-semibold">Stvarno</th>
                <th className="py-1.5 pr-2 text-right font-semibold">Jedna IJ</th>
                <th className="py-1.5 text-right font-semibold">Δ</th>
              </tr>
            </thead>
            <tbody>
              {kf.liste
                .filter((l) => l.stvarno > 0 || l.jedinstvena > 0 || l.posto >= 1)
                .map((l) => (
                  <tr key={l.naziv} className="border-b border-line/60">
                    <td className="py-1.5 pr-2">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          aria-hidden="true"
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ background: partyColor(l.stranka) }}
                        />
                        {l.kratki}
                      </span>
                    </td>
                    <td className="tabular py-1.5 pr-2 text-right">{fmtInt(l.glasova)}</td>
                    <td className="tabular py-1.5 pr-2 text-right">{fmtPct(l.posto, 2)}</td>
                    <td className="tabular py-1.5 pr-2 text-right">{l.stvarno}</td>
                    <td className="tabular py-1.5 pr-2 text-right">{l.jedinstvena}</td>
                    <td className="py-1.5 text-right">
                      <DeltaBadge delta={l.delta} />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-muted">
          Pri jedinstvenoj izbornoj jedinici propalo bi{" "}
          <span className="tabular">{fmtInt(kf.propalo_jedinstvena)}</span> glasova (
          {fmtPct(kf.pct_propalo_jedinstvena, 2)}); u stvarnom sustavu propalo je{" "}
          <span className="tabular">{fmtInt(data.propali_rh.propali)}</span> (
          {fmtPct(data.propali_rh.pct_propali, 2)}).
        </p>
      </div>

      {/* ── Kandidati: gubitnici / odbili / namještenici ───────────────── */}
      <div>
        <h3 className="mb-1 font-semibold text-navy">Kandidati u ekstremima</h3>
        <div
          role="group"
          aria-label="Vrsta popisa"
          className="mb-3 inline-flex flex-wrap rounded-full border border-line bg-white p-0.5"
        >
          {KANDIDAT_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              aria-pressed={tab === t.key}
              className={
                "rounded-full px-3 py-1 text-sm transition-colors " +
                (tab === t.key ? "bg-navy font-semibold text-white" : "text-muted hover:text-navy")
              }
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="mb-3 max-w-3xl text-sm text-muted">
          {KANDIDAT_TABS.find((t) => t.key === tab)?.opis}
          {tab === "odbili" ? (
            <>
              {" "}
              Ukupno: <strong>{data.odbili.ukupno} / {data.odbili.od}</strong>{" "}
              geografskih mandata.
            </>
          ) : null}
        </p>
        <KandidatTable rows={kandidatRows} showDhondt={tab === "namjestenici"} />
      </div>

      {/* ── Sabor po preferencijalnim glasovima ────────────────────────── */}
      <div>
        <h3 className="mb-1 font-semibold text-navy">
          Što ako se Sabor bira kao predsjednik?
        </h3>
        <p className="mb-4 max-w-3xl text-sm text-muted">
          Misaoni eksperiment: bez lista, koalicija i izbornih jedinica — top 143
          kandidata po preferencijalnim glasovima ulaze u Sabor. Preferencijali
          nisu apsolutna mjera popularnosti (birač označava kandidata samo unutar
          svoje liste), ali pokazuju tko je najizravnije izabran.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Preklapanje sa stvarnim"
            value={`${data.sabor_po_pref.preklapanje} / 143`}
          />
          <StatCard label="Novi zastupnici" value={String(data.sabor_po_pref.novi)} />
          <StatCard label="Gube mjesto" value={String(data.sabor_po_pref.gube)} tone="red" />
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs text-muted uppercase">
                <th className="py-1.5 pr-2 font-semibold">Vodeća stranka</th>
                <th className="py-1.5 pr-2 text-right font-semibold">Po preferencijalima</th>
                <th className="py-1.5 pr-2 text-right font-semibold">Stvarno (geog. IJ)</th>
                <th className="py-1.5 text-right font-semibold">Δ</th>
              </tr>
            </thead>
            <tbody>
              {data.sabor_po_pref.rollup.map((r) => (
                <tr key={r.stranka} className="border-b border-line/60">
                  <td className="py-1.5 pr-2">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        aria-hidden="true"
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ background: partyColor(r.stranka) }}
                      />
                      {r.stranka}
                    </span>
                  </td>
                  <td className="tabular py-1.5 pr-2 text-right">{r.po_pref}</td>
                  <td className="tabular py-1.5 pr-2 text-right">{r.stvarno}</td>
                  <td className="py-1.5 text-right">
                    <DeltaBadge delta={r.delta} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
