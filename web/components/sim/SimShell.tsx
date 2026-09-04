"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { TIE_BREAK_ASSUMPTION } from "@/lib/sim/allocate";
import { applyPreset, PRESETS } from "@/lib/sim/presets";
import { realFamilySeats, simulate } from "@/lib/sim/run";
import { NEUTRALNI_SCENARIJ, ZAKONSKA_PRAVILA } from "@/lib/sim/types";
import type { RawCycle, Rules, Scenario } from "@/lib/sim/types";
import { CoalitionPanel } from "./CoalitionPanel";
import { MobileNotice } from "./MobileNotice";
import { Hemicycle } from "./Hemicycle";
import { KpiStrip } from "./KpiStrip";
import { ListDeltaTable } from "./ListDeltaTable";
import { PreferentialPanel } from "./PreferentialPanel";
import { RulesPanel } from "./RulesPanel";
import { SwingPanel } from "./SwingPanel";
import { UnitTable } from "./UnitTable";
import { Panel, SourceBadge } from "./ui";

type Tab = "mandati" | "preferencijali" | "koalicije";

const TABS: { id: Tab; label: string }[] = [
  { id: "mandati", label: "Mandati" },
  { id: "preferencijali", label: "Preferencijali" },
  { id: "koalicije", label: "Koalicije" },
];

/**
 * The simulator dashboard.
 *
 * Desktop-only and deliberately fixed to one viewport: three columns, no page
 * scroll, individual panels scroll internally. Every number recomputes
 * synchronously from the engine in lib/sim — nothing is fetched and nothing is
 * precomputed, so the "⟲ stvarni sustav" button reproduces the official result
 * exactly rather than reloading a cached copy of it.
 */
export function SimShell({ cycles }: { cycles: RawCycle[] }) {
  const [slug, setSlug] = useState(cycles[0].slug);
  const [rules, setRules] = useState<Rules>(ZAKONSKA_PRAVILA);
  const [scenario, setScenario] = useState<Scenario>(NEUTRALNI_SCENARIJ);
  const [tab, setTab] = useState<Tab>("mandati");
  const [hover, setHover] = useState<string | null>(null);
  const [presetId, setPresetId] = useState("zakon");

  const cycle = useMemo(
    () => cycles.find((c) => c.slug === slug) ?? cycles[0],
    [cycles, slug],
  );

  const res = useMemo(
    () => simulate(cycle, rules, scenario),
    [cycle, rules, scenario],
  );

  // The untouched baseline, for the side-by-side arc and the delta column.
  const stvarni = useMemo(
    () => simulate(cycle, ZAKONSKA_PRAVILA, NEUTRALNI_SCENARIJ),
    [cycle],
  );

  const izmijenjeno =
    JSON.stringify(rules) !== JSON.stringify(ZAKONSKA_PRAVILA) ||
    Object.values(scenario.swing).some((v) => v !== 0) ||
    scenario.odaziv != null;

  const reset = () => {
    setRules(ZAKONSKA_PRAVILA);
    setScenario(NEUTRALNI_SCENARIJ);
    setPresetId("zakon");
  };

  const ucitajPreset = (id: string) => {
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    const { rules: r, scenario: s } = applyPreset(p);
    setRules(r);
    setScenario(s);
    setPresetId(id);
    if (p.ciklus && cycles.some((c) => c.slug === p.ciklus)) setSlug(p.ciklus);
  };

  const preset = PRESETS.find((p) => p.id === presetId);

  // Seat totals for the delta headline in the arc column.
  const stvarniPoObitelji = useMemo(() => realFamilySeats(cycle), [cycle]);
  const promjene = useMemo(() => {
    const out: { obitelj: string; delta: number }[] = [];
    for (const f of res.obitelji) {
      const d = f.mandata - (stvarniPoObitelji.get(f.obitelj) ?? 0);
      if (d !== 0) out.push({ obitelj: f.obitelj, delta: d });
    }
    return out
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 6);
  }, [res, stvarniPoObitelji]);

  return (
    <>
      <MobileNotice />
      <div className="fixed inset-0 hidden overflow-hidden bg-surface lg:block">
        <div className="grid h-full w-full grid-cols-[286px_minmax(0,1fr)_330px] gap-2 p-2 text-ink">
          {/* ── Left rail — full height, above where the header would be ───── */}
          <div className="grid min-h-0 grid-rows-[minmax(0,1fr)_minmax(0,1.06fr)] gap-2">
            <Panel
              title="Pravila sustava"
              badge={<SourceBadge source="ZAKON" />}
              bodyClassName="overflow-y-auto"
            >
              <RulesPanel rules={rules} onChange={setRules} />
            </Panel>
            <Panel
              title="Scenarij glasova"
              badge={
                <SourceBadge
                  source="KONSTRUKCIJA"
                  title="Pretpostavka koju zadaješ ti — nije prognoza"
                />
              }
              bodyClassName="overflow-y-auto"
            >
              <SwingPanel
                cycle={cycle}
                res={res}
                scenario={scenario}
                onChange={setScenario}
              />
            </Panel>
          </div>

          {/* ── Centre — header sits only over this column ─────────────────── */}
          <div className="flex min-h-0 flex-col gap-2">
            <header className="flex h-[46px] shrink-0 items-center gap-3 rounded-md bg-navy-deep px-3 text-hero-ink">
              <Link
                href="/"
                className="shrink-0 font-serif text-[15px] font-bold text-white transition-opacity hover:opacity-80"
                title="Natrag na izbori.domovina.ai"
              >
                Izborni simulator
              </Link>

              <span className="h-4 w-px bg-hero-ink/25" aria-hidden="true" />

              <label className="flex items-center gap-1.5">
                <span className="text-[10px] tracking-[0.1em] text-hero-ink/70 uppercase">
                  Ciklus
                </span>
                <select
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="rounded-[4px] border border-hero-ink/25 bg-navy px-1.5 py-0.5 text-[11px] text-white"
                >
                  {cycles.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex min-w-0 items-center gap-1.5">
                <span className="text-[10px] tracking-[0.1em] text-hero-ink/70 uppercase">
                  Scenarij
                </span>
                <select
                  value={presetId}
                  onChange={(e) => ucitajPreset(e.target.value)}
                  className="max-w-[230px] rounded-[4px] border border-hero-ink/25 bg-navy px-1.5 py-0.5 text-[11px] text-white"
                >
                  {PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.naziv}
                    </option>
                  ))}
                </select>
              </label>

              {preset ? (
                <span className="flex min-w-0 flex-1 items-center gap-1.5">
                  <SourceBadge source={preset.oznaka} />
                  {/* Two lines fit inside the 46px bar; the full text stays in
                      the tooltip. Without flex-1 + min-w-0 on both the wrapper
                      and the text, this grew past its share of the row and ran
                      under the neighbouring select. */}
                  <span
                    className="line-clamp-2 min-w-0 text-[10px] leading-tight text-hero-ink/75"
                    title={preset.opis}
                  >
                    {preset.opis}
                  </span>
                </span>
              ) : null}
            </header>

            <KpiStrip res={res} />

            <div className="flex shrink-0 items-center gap-1">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  aria-pressed={tab === t.id}
                  className={`rounded-[4px] border px-2.5 py-1 text-[11px] transition-colors ${
                    tab === t.id
                      ? "border-navy bg-navy text-white"
                      : "border-line bg-white text-muted hover:border-navy/40 hover:text-ink"
                  }`}
                >
                  {t.label}
                </button>
              ))}
              {res.napomene.length > 0 ? (
                <span className="ml-2 flex min-w-0 flex-1 items-center gap-1.5">
                  <SourceBadge source="PRETPOSTAVKA" />
                  <span
                    className="truncate text-[10px] text-muted"
                    title={res.napomene.join("\n")}
                  >
                    {res.napomene[0]}
                  </span>
                </span>
              ) : null}

              <button
                type="button"
                onClick={reset}
                disabled={!izmijenjeno}
                title="Vrati sva pravila i pomake na zakonsko stanje — rezultat je tada identičan službenom."
                className="ml-auto shrink-0 rounded-[4px] border px-2.5 py-1 text-[11px] transition-colors enabled:border-accent/40 enabled:text-accent enabled:hover:border-accent enabled:hover:bg-accent enabled:hover:text-white disabled:border-line disabled:text-muted disabled:opacity-45"
              >
                ⟲ stvarni sustav
              </button>
            </div>

            <div className="min-h-0 flex-1">
              {tab === "mandati" ? (
                <div className="grid h-full grid-rows-[minmax(0,auto)_minmax(0,1fr)] gap-2">
                  <Panel bodyClassName="flex items-start justify-around gap-4 px-3 py-2">
                    <Hemicycle
                      res={stvarni}
                      naslov={`Stvarni rezultat ${cycle.godina}.`}
                      hover={hover}
                      onHover={setHover}
                      height={172}
                    />
                    <div className="flex min-w-[132px] flex-col justify-center gap-1 self-center">
                      <p className="text-[9px] font-bold tracking-[0.12em] text-muted uppercase">
                        Promjena
                      </p>
                      {promjene.length === 0 ? (
                        <p className="text-[11px] text-muted">
                          Nema promjene — pravila su zakonska.
                        </p>
                      ) : (
                        <ul className="flex flex-col gap-0.5" role="list">
                          {promjene.map((p) => (
                            <li
                              key={p.obitelj}
                              className="flex items-baseline gap-1.5 text-[11px]"
                            >
                              <span
                                className="tabular w-7 shrink-0 text-right font-bold"
                                style={{
                                  color: p.delta > 0 ? "#1F6B33" : "#B42318",
                                }}
                              >
                                {p.delta > 0 ? `+${p.delta}` : p.delta}
                              </span>
                              <span
                                className="truncate text-muted"
                                title={p.obitelj}
                              >
                                {p.obitelj === "MOŽEMO! - POLITIČKA PLATFORMA"
                                  ? "MOŽEMO!"
                                  : p.obitelj}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {preset?.pogledaj ? (
                        <p className="mt-1.5 border-t border-line/70 pt-1.5 text-[9px] leading-relaxed text-muted">
                          {preset.pogledaj}
                        </p>
                      ) : null}
                    </div>
                    <Hemicycle
                      res={res}
                      naslov={
                        izmijenjeno ? "Simulacija" : "Simulacija (bez izmjena)"
                      }
                      hover={hover}
                      onHover={setHover}
                      height={172}
                    />
                  </Panel>

                  <Panel
                    title="Rezultat po političkim obiteljima"
                    right={
                      <span className="text-[9px] text-muted">
                        Δ prema stvarnom rezultatu {cycle.godina}.
                      </span>
                    }
                    bodyClassName="overflow-hidden"
                  >
                    <ListDeltaTable
                      res={res}
                      hover={hover}
                      onHover={setHover}
                    />
                  </Panel>
                </div>
              ) : null}

              {tab === "preferencijali" ? (
                <PreferentialPanel cycle={cycle} res={res} rules={rules} />
              ) : null}

              {tab === "koalicije" ? <CoalitionPanel res={res} /> : null}
            </div>
          </div>

          {/* Right rail */}
          <div className="grid min-h-0 grid-rows-[minmax(0,1fr)_minmax(0,auto)] gap-2">
            <Panel
              title="Cijena mandata"
              badge={<SourceBadge source="PODACI" />}
              bodyClassName="overflow-hidden"
            >
              <UnitTable res={res} />
            </Panel>

            <Panel title="Izvori i ograničenja" bodyClassName="overflow-y-auto">
              <div className="flex flex-col gap-1.5 px-3 py-2 text-[9px] leading-relaxed text-muted">
                <p>
                  <SourceBadge source="ZAKON" /> ZIZHS čl. 38 (10 × 14), čl. 8 i
                  Ustav čl. 45 (dijaspora 3), čl. 41 (prag 5 %), čl. 40
                  (D&apos;Hondt, preferencijali 10 %), čl. 17 i 46 (8
                  manjinskih, većinski).
                </p>
                <p>
                  <SourceBadge source="PODACI" /> DIP arhiva, mirrorana lokalno.
                  Odaziv i birači obuhvaćaju IJ I–XI; javno citirani odaziv
                  uključuje i XII. pa je nešto viši.
                </p>
                <p>
                  <SourceBadge source="PRETPOSTAVKA" /> {TIE_BREAK_ASSUMPTION}
                </p>
                <p className="border-t border-line/70 pt-1.5">
                  <strong className="text-ink">Obitelj</strong> je vodeća
                  stranka koalicijske liste, ne stranačka pripadnost osobe. Ista
                  koalicija nastupala je pod različitim nazivima u različitim
                  jedinicama, pa se ovdje spaja po vodećoj stranci.
                </p>
                <p>
                  <strong className="text-ink">Što ovo ne radi:</strong> ne
                  predviđa glasove, ne modelira kampanju i ne zna koje su
                  koalicije politički moguće. Pomak glasova je pretpostavka koju
                  zadaješ ti.
                </p>
                <p>
                  Puna činjenična osnova s citatima:{" "}
                  <code className="text-ink">
                    docs/izborni_sustav_cinjenice.md
                  </code>
                </p>
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </>
  );
}
