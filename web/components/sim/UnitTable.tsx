"use client";

import { fmtDec, fmtInt, fmtPct } from "@/lib/format";
import type { SimResult } from "@/lib/sim/types";

/**
 * Cost of a seat, per electoral unit.
 *
 * Two columns that look similar and are not: `birača/mandat` is the LEGAL
 * malapportionment test (ZIZHS čl. 39, ZIJ čl. 14 — ±5 % from the mean), while
 * `glasova/mandat` is the effective price and moves mostly with turnout.
 * Calling the second one gerrymandering would be false, so they are labelled
 * and coloured separately.
 */
export function UnitTable({ res }: { res: SimResult }) {
  const jedinice = res.jedinice.filter((u) => u.mandata > 0);
  const teritorijalne = jedinice.filter((u) => u.biraci > 0 && u.code !== "011");
  const prosjek =
    teritorijalne.length > 0
      ? teritorijalne.reduce((a, u) => a + u.biraci, 0) / teritorijalne.length
      : 0;

  const cijene = jedinice.filter((u) => u.vazeci > 0).map((u) => u.vazeci / u.mandata);
  const maxCijena = cijene.length ? Math.max(...cijene) : 1;

  return (
    <div className="h-full overflow-y-auto">
      <table className="w-full border-collapse text-[10px]">
        <thead className="sticky top-0 z-10 bg-white">
          <tr className="border-b border-line text-[9px] tracking-[0.08em] text-muted uppercase">
            <th className="py-1 pr-1 pl-2 text-left font-bold">IJ</th>
            <th className="py-1 pr-1 text-right font-bold">Mand.</th>
            <th
              className="py-1 pr-1 text-right font-bold"
              title="Upisanih birača po mandatu — zakonski test neujednačenosti"
            >
              Birača/m
            </th>
            <th
              className="py-1 pr-1 text-right font-bold"
              title="Odstupanje od prosjeka upisanih birača (ZIJ čl. 14: ±5 %)"
            >
              Odst.
            </th>
            <th
              className="py-1 pr-2 text-right font-bold"
              title="Važećih glasova po mandatu — stvarna cijena, ovisi o odazivu"
            >
              Glas./m
            </th>
          </tr>
        </thead>
        <tbody>
          {jedinice.map((u) => {
            const bpm = u.mandata > 0 && u.biraci > 0 ? u.biraci / u.mandata : null;
            const gpm = u.mandata > 0 && u.vazeci > 0 ? u.vazeci / u.mandata : null;
            const odst =
              prosjek > 0 && u.biraci > 0 && u.code !== "011"
                ? ((u.biraci - prosjek) / prosjek) * 100
                : null;
            const izvan = odst != null && Math.abs(odst) > 5;
            const sirina = gpm ? (gpm / maxCijena) * 100 : 0;
            return (
              <tr key={u.code} className="border-b border-line/40">
                <td className="py-[3px] pr-1 pl-2 whitespace-nowrap">
                  <span title={u.label}>{u.label.split(" ")[0]}</span>
                </td>
                <td className="tabular py-[3px] pr-1 text-right font-semibold text-navy">
                  {u.mandata}
                </td>
                <td className="tabular py-[3px] pr-1 text-right">
                  {bpm ? fmtInt(Math.round(bpm)) : "–"}
                </td>
                <td
                  className="tabular py-[3px] pr-1 text-right"
                  style={{ color: izvan ? "#B42318" : "#5A6570" }}
                >
                  {odst == null
                    ? "–"
                    : `${odst > 0 ? "+" : ""}${fmtDec(odst, 1)} %`}
                </td>
                <td className="py-[3px] pr-2 text-right">
                  <span className="flex items-center justify-end gap-1.5">
                    <span className="relative h-[7px] w-[46px] overflow-hidden rounded-[2px] bg-line/50">
                      <span
                        className="absolute inset-y-0 left-0 rounded-[2px] bg-navy/60"
                        style={{ width: `${sirina}%` }}
                      />
                    </span>
                    <span className="tabular w-[42px] text-right">
                      {gpm ? fmtInt(Math.round(gpm)) : "–"}
                    </span>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="border-t border-line px-2 py-1.5 text-[9px] leading-relaxed text-muted">
        <p>
          <strong className="text-ink">Birača/m</strong> je zakonski test
          neujednačenosti — omjer{" "}
          <span className="tabular">
            {fmtDec(res.metrike.biracaPoMandatuOmjer, 3)}×
          </span>
          , najveće odstupanje{" "}
          <span className="tabular">
            {fmtDec(res.metrike.maxOdstupanjeOdProsjeka, 2)} %
          </span>{" "}
          (dopušteno ±5 %).
        </p>
        <p className="mt-1">
          <strong className="text-ink">Glas./m</strong> je stvarna cijena mandata —
          omjer{" "}
          <span className="tabular">
            {fmtDec(res.metrike.glasovaPoMandatuOmjer, 3)}×
          </span>
          . Razlika između ta dva broja dolazi iz <em>odaziva</em>, ne iz granica
          jedinica.
        </p>
        <p className="mt-1">
          Ukupno važećih:{" "}
          <span className="tabular">{fmtInt(res.metrike.ukupnoVazeci)}</span> · bez
          mandata{" "}
          <span className="tabular">
            {fmtPct(res.metrike.propaliBezMandataPosto, 1)}
          </span>
          .
        </p>
      </div>
    </div>
  );
}
