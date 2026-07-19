"use client";

import { useState } from "react";
import type { Trends } from "@/lib/types";
import Link from "next/link";
import { fmtInt, fmtPct, TYPE_LABELS } from "@/lib/format";

/**
 * Turnout across all indexed cycles — single measure, single hue (brand navy),
 * horizontal bars in chronological order. One series → no legend (title names it).
 */
export function TurnoutTrend({ trends }: { trends: Trends }) {
  const [hover, setHover] = useState<string | null>(null);
  const rows = trends.odaziv;
  if (!rows.length) return null;
  const max = Math.max(...rows.map((r) => r.odaziv_posto), 1);

  return (
    <div>
      <ul className="space-y-3" role="list">
        {rows.map((r) => {
          const w = Math.max(1, (r.odaziv_posto / max) * 100);
          const isHover = hover === r.slug;
          return (
            <li
              key={r.slug}
              onMouseEnter={() => setHover(r.slug)}
              onMouseLeave={() => setHover(null)}
            >
              <div className="mb-1 flex items-baseline justify-between gap-3">
                <Link
                  href={`/${r.slug}`}
                  className="text-sm font-medium text-ink underline-offset-2 hover:text-navy hover:underline"
                >
                  {TYPE_LABELS[r.tip] ?? r.tip} {r.godina}.
                </Link>
                <span className="tabular text-sm text-muted">
                  {fmtPct(r.odaziv_posto, 1)}
                </span>
              </div>
              <div className="h-[18px] w-full overflow-hidden rounded-[4px] bg-line/50">
                <div
                  className="h-full rounded-r-[4px] bg-navy transition-[filter]"
                  style={{
                    width: `${w}%`,
                    filter: isHover ? "brightness(1.35)" : undefined,
                  }}
                />
              </div>
              {isHover && r.glasovalo != null ? (
                <p className="tabular mt-1 text-xs text-muted">
                  {fmtInt(r.glasovalo)} birača izašlo na izbore (1. krug)
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-muted">
        Odaziv u 1. krugu, na razini RH. Lokalni izbori nemaju jedinstveni
        RH-agregat pa nisu prikazani.
      </p>
    </div>
  );
}
