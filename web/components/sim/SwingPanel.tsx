"use client";

import { partyColor } from "@/lib/palette";
import { fmtDec, fmtPct } from "@/lib/format";
import type { RawCycle, Scenario, SimResult, SwingMode } from "@/lib/sim/types";
import { rankedFamilies, familyTotals } from "@/lib/sim/swing";
import { Choice, Slider } from "./ui";

/**
 * Vote-side controls.
 *
 * Anything produced here is a PROJEKCIJA — a deterministic consequence of an
 * assumption the user typed in, not a forecast. There is no polling data and
 * no model of how opinion moves; the sliders simply restate "suppose this
 * family had N points more or fewer" and the engine works out the seats.
 */
export function SwingPanel({
  cycle,
  res,
  scenario,
  onChange,
}: {
  cycle: RawCycle;
  res: SimResult;
  scenario: Scenario;
  onChange: (s: Scenario) => void;
}) {
  const obitelji = rankedFamilies(cycle, 6);
  const totals = familyTotals(cycle);
  const ukupno = [...totals.values()].reduce((a, x) => a + x, 0);

  const stvarniOdaziv =
    cycle.ukupno.biraci > 0
      ? (100 * cycle.ukupno.glasovalo) / cycle.ukupno.biraci
      : 0;

  const setSwing = (obitelj: string, v: number) =>
    onChange({ ...scenario, swing: { ...scenario.swing, [obitelj]: v } });

  return (
    <div className="flex flex-col gap-1.5 px-3 py-2">
      <Choice<SwingMode>
        label="Model pomaka"
        value={scenario.mode}
        onChange={(v) => onChange({ ...scenario, mode: v })}
        options={[
          {
            value: "proporcionalno",
            label: "proporcionalno",
            hint: "Množi glasove u svakoj jedinici istim faktorom — čuva regionalni profil.",
          },
          {
            value: "uniformno",
            label: "uniformno",
            hint: "Isti pomak u postotnim bodovima u svakoj jedinici.",
          },
        ]}
      />

      <div className="flex flex-col gap-1">
        {obitelji.map((o) => {
          const bazniUdio = ukupno > 0 ? (100 * (totals.get(o) ?? 0)) / ukupno : 0;
          const d = scenario.swing[o] ?? 0;
          const sim = res.obitelji.find((f) => f.obitelj === o);
          return (
            <div key={o}>
              <span className="flex items-baseline justify-between gap-1">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span
                    className="inline-block h-2 w-2 shrink-0 rounded-[2px]"
                    style={{ background: partyColor(o) }}
                    aria-hidden="true"
                  />
                  <span className="truncate text-[11px] text-ink" title={o}>
                    {o === "MOŽEMO! - POLITIČKA PLATFORMA" ? "MOŽEMO!" : o}
                  </span>
                </span>
                <span className="tabular shrink-0 text-[10px] text-muted">
                  {fmtPct(bazniUdio, 1)}
                  {d !== 0 ? (
                    <span
                      className="ml-1 font-semibold"
                      style={{ color: d > 0 ? "#1F6B33" : "#B42318" }}
                    >
                      {d > 0 ? "+" : ""}
                      {fmtDec(d, 1)}
                    </span>
                  ) : null}
                  {sim ? (
                    <span className="ml-1 font-semibold text-navy">
                      {sim.mandata}m
                    </span>
                  ) : null}
                </span>
              </span>
              <input
                type="range"
                min={-15}
                max={15}
                step={0.5}
                value={d}
                onChange={(e) => setSwing(o, Number(e.target.value))}
                className="h-1 w-full cursor-pointer accent-navy"
                aria-label={`Pomak za ${o}, u postotnim bodovima`}
              />
            </div>
          );
        })}
      </div>

      <hr className="border-line/70" />

      <Slider
        label="Odaziv"
        value={scenario.odaziv ?? stvarniOdaziv}
        min={20}
        max={90}
        step={0.5}
        onChange={(v) => onChange({ ...scenario, odaziv: v })}
        format={(v) => fmtPct(v, 1)}
        zakonska={Math.round(stvarniOdaziv * 10) / 10}
      />
      <p
        className="text-[9px] leading-tight text-muted"
        title="Odaziv množi glasove svih lista istim faktorom, pa se raspodjela mandata ne mijenja. Mijenja se koliki udio biračkog tijela stoji iza svakog mandata."
      >
        Ne mijenja raspodjelu mandata, nego udio biračkog tijela iza njih.
      </p>

      {Object.values(scenario.swing).some((v) => v !== 0) ||
      scenario.odaziv != null ? (
        <button
          type="button"
          onClick={() =>
            onChange({ mode: scenario.mode, swing: {}, odaziv: null })
          }
          className="mt-0.5 rounded-[4px] border border-line px-2 py-1 text-[10px] text-muted transition-colors hover:border-navy/40 hover:text-ink"
        >
          Poništi pomake
        </button>
      ) : null}
    </div>
  );
}
