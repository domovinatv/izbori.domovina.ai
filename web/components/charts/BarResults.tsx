"use client";

import { useState } from "react";
import type { Lista } from "@/lib/types";
import { partyColor, candidateColor, OTHER_COLOR } from "@/lib/palette";
import { fmtInt, fmtPct } from "@/lib/format";

/**
 * Horizontal bar chart of list/candidate results. One measure (% of votes),
 * one axis; color follows the entity (party / candidate), never rank.
 * Direct value labels on every bar (relief for sub-3:1 series colors).
 */
export function BarResults({
  liste,
  mode,
}: {
  liste: Lista[];
  mode: "party" | "candidate" | "referendum";
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...liste.map((l) => l.posto ?? 0), 1);

  const colorFor = (l: Lista): string => {
    if (l.naziv === "Ostali") return OTHER_COLOR;
    if (mode === "party") return partyColor(l.stranka);
    if (mode === "candidate") return candidateColor(l.naziv);
    return l.naziv === "ZA" ? "#2a78d6" : l.naziv === "PROTIV" ? "#cc2936" : OTHER_COLOR;
  };

  return (
    <div>
      <ul className="space-y-3" role="list">
        {liste.map((l, i) => {
          const pct = l.posto ?? 0;
          const w = Math.max(0.5, (pct / max) * 100);
          const isHover = hover === i;
          return (
            <li
              key={l.naziv + i}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              className="group"
            >
              <div className="mb-1 flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-sm font-medium text-ink">
                  {l.kratki}
                </span>
                <span className="tabular shrink-0 text-sm text-muted">
                  {fmtPct(l.posto, 2)}
                  {l.mandata != null && l.mandata > 0 ? (
                    <span className="ml-2 font-semibold text-navy">
                      {l.mandata} {l.mandata === 1 ? "mandat" : "mandata"}
                    </span>
                  ) : null}
                </span>
              </div>
              <div className="relative h-[18px] w-full overflow-hidden rounded-[4px] bg-line/50">
                <div
                  className="absolute inset-y-0 left-0 rounded-r-[4px] transition-[filter]"
                  style={{
                    width: `${w}%`,
                    background: colorFor(l),
                    filter: isHover ? "brightness(1.12)" : undefined,
                  }}
                />
              </div>
              {isHover ? (
                <p className="tabular mt-1 text-xs text-muted">
                  {fmtInt(l.glasova)} glasova
                  {l.naziv !== l.kratki ? ` · ${l.naziv}` : ""}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
