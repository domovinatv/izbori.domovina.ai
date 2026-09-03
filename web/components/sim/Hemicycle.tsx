"use client";

import { useMemo } from "react";
import { partyColor, PARTY_COLORS } from "@/lib/palette";
import type { SimResult } from "@/lib/sim/types";

/**
 * Seat arc.
 *
 * seatSlots() is lifted from components/charts/SeatArc.tsx so the simulator
 * draws the same chamber as the rest of the site. The white 2px stroke is the
 * surface gap the palette validator requires between adjacent marks — keep it.
 */
function seatSlots(total: number) {
  const rows = Math.ceil(Math.sqrt(total / 2.5));
  const r0 = 0.42;
  const slots: { x: number; y: number; angle: number; row: number }[] = [];
  const perRow: number[] = [];
  const weights: number[] = [];
  let weightSum = 0;
  for (let r = 0; r < rows; r++) {
    const radius = r0 + (r * (1 - r0)) / Math.max(1, rows - 1);
    weights.push(radius);
    weightSum += radius;
  }
  let assigned = 0;
  for (let r = 0; r < rows; r++) {
    const n =
      r === rows - 1 ? total - assigned : Math.round((weights[r] / weightSum) * total);
    perRow.push(n);
    assigned += n;
  }
  for (let r = 0; r < rows; r++) {
    const radius = r0 + (r * (1 - r0)) / Math.max(1, rows - 1);
    const n = perRow[r];
    for (let i = 0; i < n; i++) {
      const angle = n === 1 ? Math.PI / 2 : Math.PI - (i * Math.PI) / (n - 1);
      slots.push({
        x: Math.cos(angle) * radius,
        y: -Math.sin(angle) * radius,
        angle,
        row: r,
      });
    }
  }
  slots.sort((a, b) => b.angle - a.angle || a.row - b.row);
  return slots;
}

export interface SeatGroup {
  key: string;
  label: string;
  seats: number;
  color: string;
}

export function seatGroups(res: SimResult): SeatGroup[] {
  const groups: SeatGroup[] = res.obitelji
    .filter((f) => f.mandata > 0)
    .map((f) => ({
      key: f.obitelj,
      label: f.obitelj === "MOŽEMO! - POLITIČKA PLATFORMA" ? "MOŽEMO!" : f.obitelj,
      seats: f.mandata,
      color: partyColor(f.obitelj),
    }))
    .sort((a, b) => b.seats - a.seats);
  if (res.manjinskiMandati > 0) {
    groups.push({
      key: "MANJINE",
      label: "Manjine",
      seats: res.manjinskiMandati,
      color: PARTY_COLORS.MANJINE,
    });
  }
  return groups;
}

export function Hemicycle({
  res,
  naslov,
  hover,
  onHover,
  height = 200,
}: {
  res: SimResult;
  naslov: string;
  hover: string | null;
  onHover: (k: string | null) => void;
  height?: number;
}) {
  const groups = useMemo(() => seatGroups(res), [res]);
  const total = groups.reduce((a, g) => a + g.seats, 0);
  const slots = useMemo(() => seatSlots(total), [total]);

  const seatColors = useMemo(() => {
    const out: { key: string; color: string; label: string }[] = [];
    for (const g of groups) {
      for (let i = 0; i < g.seats; i++) {
        out.push({ key: g.key, color: g.color, label: `${g.label}: ${g.seats}` });
      }
    }
    return out;
  }, [groups]);

  const W = 620;
  const H = 330;
  const cx = W / 2;
  const cy = H - 16;
  const R = 288;
  const seatR = total > 160 ? 6.4 : 7.2;

  return (
    <figure className="flex min-h-0 flex-col items-center">
      <figcaption className="mb-0.5 text-[10px] font-bold tracking-[0.12em] text-muted uppercase">
        {naslov}
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${naslov}: ${groups.map((g) => `${g.label} ${g.seats}`).join(", ")}, ukupno ${total} zastupnika`}
        style={{ height, width: "auto" }}
      >
        {slots.map((s, i) => {
          const seat = seatColors[i];
          if (!seat) return null;
          const dim = hover !== null && hover !== seat.key;
          return (
            <circle
              key={i}
              cx={cx + s.x * R}
              cy={cy + s.y * R}
              r={seatR}
              fill={seat.color}
              opacity={dim ? 0.18 : 1}
              stroke="#FFFFFF"
              strokeWidth="2"
              onMouseEnter={() => onHover(seat.key)}
              onMouseLeave={() => onHover(null)}
            >
              <title>{seat.label}</title>
            </circle>
          );
        })}
        <text
          x={cx}
          y={cy - 34}
          textAnchor="middle"
          className="fill-navy font-serif"
          style={{ fontSize: 40, fontWeight: 700 }}
        >
          {total}
        </text>
        <text
          x={cx}
          y={cy - 14}
          textAnchor="middle"
          fill="#5A6570"
          style={{ fontSize: 12 }}
        >
          zastupnika · većina {Math.floor(total / 2) + 1}
        </text>
      </svg>
    </figure>
  );
}
