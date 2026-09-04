"use client";

import { partyColor } from "@/lib/palette";
import { fmtDec, fmtInt, fmtPct } from "@/lib/format";
import type { SimResult } from "@/lib/sim/types";

/**
 * Per-family votes, seats and the delta against the real result.
 *
 * "Obitelj" is the leading_party() roll-up: the first named party of a
 * coalition list. It is a property of the LIST, never of a person — see
 * docs/web_ui_notes.md. Coalitions that ran under several names are merged
 * here, which is what makes a swing slider meaningful.
 */
export function ListDeltaTable({
  res,
  hover,
  onHover,
}: {
  res: SimResult;
  hover: string | null;
  onHover: (k: string | null) => void;
}) {
  const redovi = res.obitelji.filter((f) => f.mandata > 0 || f.postoGlasova >= 0.8);
  const ostalo = res.obitelji.filter(
    (f) => f.mandata === 0 && f.postoGlasova < 0.8,
  );
  const ostaloGlasova = ostalo.reduce((a, f) => a + f.glasova, 0);
  const ostaloPosto = ostalo.reduce((a, f) => a + f.postoGlasova, 0);

  return (
    <div className="h-full overflow-y-auto">
      <table className="w-full border-collapse text-[11px]">
        <thead className="sticky top-0 z-10 bg-white">
          <tr className="border-b border-line text-[9px] tracking-[0.1em] text-muted uppercase">
            <th className="py-1 pr-2 pl-3 text-left font-bold">Obitelj</th>
            <th className="py-1 pr-2 text-right font-bold">Glasova</th>
            <th className="py-1 pr-2 text-right font-bold">% gl.</th>
            <th className="py-1 pr-2 text-right font-bold">Mand.</th>
            <th className="py-1 pr-2 text-right font-bold">% mand.</th>
            <th className="py-1 pr-2 text-right font-bold" title="% mandata ÷ % glasova">
              Ampl.
            </th>
            <th
              className="py-1 pr-3 text-right font-bold"
              title="Razlika prema stvarnom rezultatu tog ciklusa"
            >
              Δ
            </th>
          </tr>
        </thead>
        <tbody>
          {redovi.map((f) => {
            const delta = f.mandata - f.stvarniMandati;
            const dim = hover !== null && hover !== f.obitelj;
            return (
              <tr
                key={f.obitelj}
                onMouseEnter={() => onHover(f.obitelj)}
                onMouseLeave={() => onHover(null)}
                className="border-b border-line/50 transition-opacity"
                style={{ opacity: dim ? 0.35 : 1 }}
              >
                <td className="py-[3px] pr-2 pl-3">
                  <span className="flex items-center gap-1.5">
                    <span
                      className="inline-block h-2 w-2 shrink-0 rounded-[2px]"
                      style={{ background: partyColor(f.obitelj) }}
                      aria-hidden="true"
                    />
                    <span className="truncate" title={f.obitelj}>
                      {f.obitelj === "MOŽEMO! - POLITIČKA PLATFORMA"
                        ? "MOŽEMO!"
                        : f.obitelj}
                    </span>
                  </span>
                </td>
                <td className="tabular py-[3px] pr-2 text-right text-muted">
                  {fmtInt(f.glasova)}
                </td>
                <td className="tabular py-[3px] pr-2 text-right">
                  {fmtPct(f.postoGlasova, 2)}
                </td>
                <td className="tabular py-[3px] pr-2 text-right font-semibold text-navy">
                  {f.mandata}
                </td>
                <td className="tabular py-[3px] pr-2 text-right">
                  {fmtPct(f.postoMandata, 2)}
                </td>
                <td
                  className="tabular py-[3px] pr-2 text-right"
                  style={{
                    color:
                      f.amplifikacija > 1.15
                        ? "#B42318"
                        : f.amplifikacija < 0.85 && f.mandata > 0
                          ? "#1F6B33"
                          : "#5A6570",
                  }}
                >
                  {f.mandata > 0 ? `${fmtDec(f.amplifikacija, 2)}×` : "–"}
                </td>
                <td
                  className="tabular py-[3px] pr-3 text-right font-semibold"
                  style={{
                    color: delta > 0 ? "#1F6B33" : delta < 0 ? "#B42318" : "#c6cdd6",
                  }}
                >
                  {delta === 0 ? "—" : delta > 0 ? `+${delta}` : delta}
                </td>
              </tr>
            );
          })}
          {ostalo.length > 0 ? (
            <tr className="border-b border-line/50 text-muted">
              <td className="py-[3px] pr-2 pl-3">
                <span className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2 w-2 shrink-0 rounded-[2px] bg-[#8b95a5]"
                    aria-hidden="true"
                  />
                  Ostali ({ostalo.length})
                </span>
              </td>
              <td className="tabular py-[3px] pr-2 text-right">
                {fmtInt(ostaloGlasova)}
              </td>
              <td className="tabular py-[3px] pr-2 text-right">
                {fmtPct(ostaloPosto, 2)}
              </td>
              <td className="tabular py-[3px] pr-2 text-right">0</td>
              <td className="tabular py-[3px] pr-2 text-right">0,00 %</td>
              <td className="tabular py-[3px] pr-2 text-right">–</td>
              <td className="tabular py-[3px] pr-3 text-right">—</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
