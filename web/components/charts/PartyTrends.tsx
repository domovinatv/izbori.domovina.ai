"use client";

import { useState } from "react";
import type { Trends } from "@/lib/types";
import { partyColor } from "@/lib/palette";
import { fmtPct, TYPE_LABELS } from "@/lib/format";

/**
 * Party vote share across same-type cycles — slope chart per election type.
 * Color follows the party entity; every endpoint is direct-labeled, so
 * identity never rides on color alone.
 */
export function PartyTrends({ trends }: { trends: Trends }) {
  const [hover, setHover] = useState<string | null>(null);
  const types = Object.entries(trends.stranke).filter(([, v]) => v.length > 0);
  if (!types.length) return null;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {types.map(([tip, series]) => {
        const slugs = [
          ...new Set(series.flatMap((s) => Object.keys(s.po_ciklusu))),
        ].sort();
        const years = slugs.map((s) => s.match(/\d{4}/)?.[0] ?? s);
        const max = Math.max(
          ...series.flatMap((s) => Object.values(s.po_ciklusu)),
          1,
        );
        const W = 460;
        const H = 300;
        const padL = 16;
        const padR = 150;
        const padT = 16;
        const padB = 32;
        const x = (i: number) =>
          padL + (i * (W - padL - padR)) / Math.max(1, slugs.length - 1);
        const y = (v: number) => padT + (1 - v / max) * (H - padT - padB);

        return (
          <figure key={tip} className="rounded-lg border border-line bg-white p-5">
            <figcaption className="mb-3 font-semibold text-navy">
              {TYPE_LABELS[tip] ?? tip} — udio glasova
            </figcaption>
            <svg
              viewBox={`0 0 ${W} ${H}`}
              role="img"
              aria-label={`${TYPE_LABELS[tip] ?? tip}: kretanje udjela glasova po strankama`}
              className="w-full"
            >
              {/* recessive gridlines at 10% steps */}
              {Array.from({ length: Math.floor(max / 10) + 1 }).map((_, i) => (
                <line
                  key={i}
                  x1={padL}
                  x2={W - padR + 8}
                  y1={y(i * 10)}
                  y2={y(i * 10)}
                  stroke="#E1E5EA"
                  strokeWidth="1"
                />
              ))}
              {slugs.map((s, i) => (
                <text
                  key={s}
                  x={x(i)}
                  y={H - 8}
                  textAnchor="middle"
                  fill="#5A6570"
                  style={{ fontSize: 13 }}
                >
                  {years[i]}.
                </text>
              ))}
              {series.map((s) => {
                const pts = slugs
                  .map((slug, i) =>
                    s.po_ciklusu[slug] != null
                      ? ([x(i), y(s.po_ciklusu[slug]), s.po_ciklusu[slug]] as const)
                      : null,
                  )
                  .filter(Boolean) as (readonly [number, number, number])[];
                const color = partyColor(s.stranka);
                const key = tip + s.stranka;
                const dim = hover !== null && hover !== key;
                const label =
                  s.stranka === "MOŽEMO! - POLITIČKA PLATFORMA"
                    ? "MOŽEMO!"
                    : s.stranka;
                const last = pts[pts.length - 1];
                return (
                  <g
                    key={key}
                    opacity={dim ? 0.25 : 1}
                    onMouseEnter={() => setHover(key)}
                    onMouseLeave={() => setHover(null)}
                  >
                    <polyline
                      points={pts.map(([px, py]) => `${px},${py}`).join(" ")}
                      fill="none"
                      stroke={color}
                      strokeWidth="2"
                    />
                    {pts.map(([px, py, v], i) => (
                      <circle key={i} cx={px} cy={py} r="4.5" fill={color} stroke="#FFFFFF" strokeWidth="2">
                        <title>{`${label} ${years[i]}.: ${fmtPct(v, 1)}`}</title>
                      </circle>
                    ))}
                    <text
                      x={last[0] + 10}
                      y={last[1] + 4}
                      fill="#0f2136"
                      style={{ fontSize: 13, fontWeight: 600 }}
                    >
                      {label}
                      <tspan fill="#5A6570" fontWeight="400">
                        {" "}
                        {fmtPct(last[2], 1)}
                      </tspan>
                    </text>
                  </g>
                );
              })}
            </svg>
          </figure>
        );
      })}
    </div>
  );
}
