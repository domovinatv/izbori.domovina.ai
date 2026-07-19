"use client";

import { useState } from "react";
import type { FairnessBrojke, FairnessBrojkeRow } from "@/lib/types";
import { partyColor, PARTY_COLORS } from "@/lib/palette";
import { fmtInt, fmtPct } from "@/lib/format";

/**
 * "Pravednost u brojkama" — for every seat-holding coalition family (plus
 * national minorities and wasted votes) a pair of horizontal bars: share of
 * the ELECTORATE (votes as % of all registered voters, IJ I.–XI.) vs share
 * of the SABOR (% of all 151 seats). All numbers precomputed in
 * scripts/export_web.py; this component only lays them out.
 *
 * Color follows the entity (party family); the electorate bar is the same
 * hue at reduced opacity, the Sabor bar solid — one hue per entity, two
 * shades per measure. Direct labels on every bar (palette mitigation), plus
 * a table view in <details>.
 */

const PROPALI_COLOR = "#B42318"; // same red as the propali figures elsewhere

function rowColor(r: FairnessBrojkeRow): string {
  if (r.tip === "propali") return PROPALI_COLOR;
  if (r.tip === "manjine") return PARTY_COLORS.MANJINE;
  return partyColor(r.label);
}

function shortLabel(label: string): string {
  // "MOŽEMO! - POLITIČKA PLATFORMA" → "MOŽEMO!"
  return label.split(" - ")[0].trim();
}

function omjer(r: FairnessBrojkeRow): number | null {
  if (!r.pct_biraci || r.pct_sabor == null) return null;
  return r.pct_sabor / r.pct_biraci;
}

function Bar({
  w,
  color,
  label,
  faded,
  hover,
}: {
  w: number;
  color: string;
  label: string;
  faded?: boolean;
  hover?: boolean;
}) {
  // Long bars carry their label inside (right-aligned, white); short bars to
  // the right of the data end — never past the track edge on small screens.
  const inside = w > 52 && !faded;
  return (
    <div className="relative h-[12px] w-full overflow-hidden rounded-[4px] bg-line/40">
      <div
        className="absolute inset-y-0 left-0 rounded-r-[4px]"
        style={{
          width: `${w}%`,
          background: color,
          opacity: faded ? 0.32 : undefined,
          filter: hover ? "brightness(1.08)" : undefined,
        }}
      />
      <span
        className={`tabular absolute top-1/2 -translate-y-1/2 leading-none whitespace-nowrap text-[11px] ${
          inside ? "text-white" : faded ? "text-muted" : "text-ink"
        }`}
        style={
          inside
            ? { right: `calc(${100 - w}% + 6px)` }
            : { left: `calc(${w}% + 6px)` }
        }
      >
        {label}
      </span>
    </div>
  );
}

export function PravednostBrojke({ brojke }: { brojke: FairnessBrojke }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(
    ...brojke.redovi.flatMap((r) => [r.pct_biraci ?? 0, r.pct_sabor ?? 0]),
    1,
  );
  // Longest bar takes ~70% of the track so direct labels fit to its right.
  const w = (pct: number | null) => Math.max(0.4, ((pct ?? 0) / max) * 70);

  return (
    <div className="rounded-lg border border-line bg-white p-5 md:p-6">
      <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block h-2.5 w-5 rounded-[2px] bg-navy opacity-30"
          />
          udio biračkog tijela (glasovi kao % svih {fmtInt(brojke.denominatori.biraci)}{" "}
          upisanih birača, IJ I.–XI.)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block h-2.5 w-5 rounded-[2px] bg-navy"
          />
          udio u Saboru (% svih {brojke.denominatori.sabor} mandata)
        </span>
      </div>

      <ul className="space-y-4" role="list">
        {brojke.redovi.map((r, i) => {
          const color = rowColor(r);
          const o = omjer(r);
          const isHover = hover === i;
          return (
            <li
              key={r.label}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <div className="mb-1 flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-sm font-medium text-ink">
                  {r.tip === "obitelj" ? shortLabel(r.label) : r.label}
                  {r.tip === "obitelj" ? (
                    <span className="ml-1.5 text-xs font-normal text-muted">
                      i partneri na listama
                    </span>
                  ) : null}
                </span>
                {r.tip === "propali" ? (
                  <span className="tabular shrink-0 text-xs font-semibold text-[#B42318]">
                    0 mandata
                  </span>
                ) : o != null ? (
                  <span
                    className="tabular shrink-0 text-xs text-muted"
                    title="udio u Saboru podijeljen s udjelom biračkog tijela"
                  >
                    zastupljenost{" "}
                    <span className={`font-semibold ${o >= 1 ? "text-navy" : "text-[#B42318]"}`}>
                      ×{o.toLocaleString("hr-HR", { maximumFractionDigits: 1 })}
                    </span>
                  </span>
                ) : null}
              </div>
              <div className="space-y-[2px]">
                <Bar
                  w={w(r.pct_biraci)}
                  color={color}
                  faded
                  hover={isHover}
                  label={`${fmtPct(r.pct_biraci, 1)} birača`}
                />
                <Bar
                  w={w(r.pct_sabor)}
                  color={color}
                  hover={isHover}
                  label={`${fmtPct(r.pct_sabor, 1)} Sabora${r.mandata > 0 ? ` · ${r.mandata} mand.` : ""}`}
                />
              </div>
              {isHover ? (
                <p className="tabular mt-1 text-xs text-muted">
                  {fmtInt(r.glasova)} glasova
                  {r.tip === "obitelj" ? ` · liste: ${r.label}` : ""}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>

      <p className="mt-5 max-w-3xl text-xs leading-relaxed text-muted">
        Redovi su koalicijske obitelji (liste s osvojenim mandatima, grupirane
        po vodećoj stranci liste — DIP ne bilježi stranačku pripadnost
        pojedinaca). „Propali glasovi" su birači čije liste nisu osvojile
        nijedan mandat. Preostalih {fmtPct(brojke.ostatak.pct_biraci, 1)}{" "}
        biračkog tijela ({fmtInt(brojke.ostatak.glasova)} birača) nije izašlo
        na izbore ili je glasovalo nevažeće. Sabor:{" "}
        {brojke.denominatori.geo_mandata} geografskih +{" "}
        {brojke.denominatori.manjinski_mandata} manjinskih ={" "}
        {brojke.denominatori.sabor} mandata.
      </p>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-muted hover:text-navy">
          Tablica: glasovi, mandati i udjeli po redovima
        </summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left">
            <thead>
              <tr className="border-b border-line text-xs text-muted uppercase">
                <th className="py-1.5 pr-2 font-semibold">Red</th>
                <th className="py-1.5 pr-2 text-right font-semibold">Glasova</th>
                <th className="py-1.5 pr-2 text-right font-semibold">% biračkog tijela</th>
                <th className="py-1.5 pr-2 text-right font-semibold">Mandata</th>
                <th className="py-1.5 pr-2 text-right font-semibold">% Sabora</th>
                <th className="py-1.5 text-right font-semibold">Zastupljenost</th>
              </tr>
            </thead>
            <tbody>
              {brojke.redovi.map((r) => {
                const o = omjer(r);
                return (
                  <tr key={r.label} className="border-b border-line/60">
                    <td className="py-1.5 pr-2">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          aria-hidden="true"
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ background: rowColor(r) }}
                        />
                        {r.label}
                      </span>
                    </td>
                    <td className="tabular py-1.5 pr-2 text-right">{fmtInt(r.glasova)}</td>
                    <td className="tabular py-1.5 pr-2 text-right">{fmtPct(r.pct_biraci, 2)}</td>
                    <td className="tabular py-1.5 pr-2 text-right">{r.mandata}</td>
                    <td className="tabular py-1.5 pr-2 text-right">{fmtPct(r.pct_sabor, 2)}</td>
                    <td className="tabular py-1.5 text-right">
                      {r.tip === "propali"
                        ? "—"
                        : o != null
                          ? `×${o.toLocaleString("hr-HR", { maximumFractionDigits: 2 })}`
                          : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
