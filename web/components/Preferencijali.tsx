"use client";

import { useState } from "react";
import type { Preferencijali as Pref } from "@/lib/types";
import { partyColor } from "@/lib/palette";
import { fmtInt, fmtPct } from "@/lib/format";

/**
 * Top candidates by preferential votes (parlament-2024, general lists) with
 * the disparity teaser: fewest preferential votes among seated MPs vs. max.
 */
export function Preferencijali({ pref }: { pref: Pref }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...pref.top.map((t) => t.glasova), 1);
  const min = pref.min_pref_u_saboru;

  return (
    <div>
      {min ? (
        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-line bg-white p-5">
            <p className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">
              Najviše preferencijalnih glasova
            </p>
            <p className="tabular mt-2 font-serif text-3xl font-bold text-navy">
              {fmtInt(pref.top[0].glasova)}
            </p>
            <p className="mt-1 text-sm text-muted">
              {pref.top[0].naziv} · {pref.top[0].lista} · IJ {pref.top[0].ij}
            </p>
          </div>
          <div className="rounded-lg border border-line bg-white p-5">
            <p className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">
              Najmanje — a sjedi u Saboru
            </p>
            <p className="tabular mt-2 font-serif text-3xl font-bold text-navy">
              {fmtInt(min.glasova)}
            </p>
            <p className="mt-1 text-sm text-muted">
              {min.naziv} · {min.lista} · IJ {min.ij}
            </p>
          </div>
        </div>
      ) : null}

      <ol className="space-y-2.5">
        {pref.top.map((t, i) => {
          const w = Math.max(1, (t.glasova / max) * 100);
          const isHover = hover === i;
          return (
            <li
              key={t.naziv + i}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <div className="mb-1 flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-sm">
                  <span className="tabular mr-2 inline-block w-5 text-right text-muted">
                    {i + 1}.
                  </span>
                  <span className="font-medium text-ink">{t.naziv}</span>
                  <span className="ml-2 hidden text-xs text-muted sm:inline">
                    IJ {t.ij}
                  </span>
                </span>
                <span className="tabular shrink-0 text-sm text-muted">
                  {fmtInt(t.glasova)}
                </span>
              </div>
              <div className="ml-7 h-[14px] overflow-hidden rounded-[4px] bg-line/50">
                <div
                  className="h-full rounded-r-[4px] transition-[filter]"
                  style={{
                    width: `${w}%`,
                    background: partyColor(t.stranka),
                    filter: isHover ? "brightness(1.12)" : undefined,
                  }}
                />
              </div>
              {isHover ? (
                <p className="tabular mt-1 ml-7 text-xs text-muted">
                  {t.lista} · {fmtPct(t.posto_liste, 1)} glasova liste
                  {t.u_saboru ? " · trenutno u Saboru" : ""}
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>
      <p className="mt-4 text-xs text-muted">
        Preferencijalni glasovi na općim listama (izborne jedinice I.–X.),
        parlamentarni izbori 2024. Boja prati vodeću stranku liste.
      </p>
    </div>
  );
}
