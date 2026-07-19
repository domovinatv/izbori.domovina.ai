"use client";

import { useMemo, useState } from "react";
import type { SaborSeats } from "@/lib/types";
import { partyColor, PARTY_COLORS } from "@/lib/palette";
import { fmtInt } from "@/lib/format";

interface Group {
  key: string;
  label: string;
  seats: number;
  color: string;
}

/** Group general lists by leading party + one group for minority MPs. */
function buildGroups(sabor: SaborSeats): Group[] {
  const byParty = new Map<string, number>();
  for (const l of sabor.liste) {
    const key = l.stranka || l.kratki;
    byParty.set(key, (byParty.get(key) ?? 0) + l.mandata);
  }
  const groups: Group[] = [...byParty.entries()]
    .map(([key, seats]) => ({
      key,
      label: key === "MOŽEMO! - POLITIČKA PLATFORMA" ? "MOŽEMO!" : key,
      seats,
      color: partyColor(key),
    }))
    .sort((a, b) => b.seats - a.seats);
  if (sabor.manjinski_mandati > 0) {
    groups.push({
      key: "MANJINE",
      label: "Manjine",
      seats: sabor.manjinski_mandati,
      color: PARTY_COLORS.MANJINE,
    });
  }
  return groups;
}

/** Seat slots on a semicircle: rows of increasing radius, sorted by angle. */
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
      r === rows - 1
        ? total - assigned
        : Math.round((weights[r] / weightSum) * total);
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

export function SeatArc({ sabor }: { sabor: SaborSeats }) {
  const groups = useMemo(() => buildGroups(sabor), [sabor]);
  const [hover, setHover] = useState<string | null>(null);

  const total = groups.reduce((s, g) => s + g.seats, 0);
  const slots = useMemo(() => seatSlots(total), [total]);

  const seatColors: { color: string; key: string; label: string }[] = [];
  for (const g of groups) {
    for (let i = 0; i < g.seats; i++)
      seatColors.push({ color: g.color, key: g.key, label: g.label });
  }

  const W = 640;
  const H = 340;
  const cx = W / 2;
  const cy = H - 28;
  const R = 280;
  const seatR = 7.2;

  return (
    <figure>
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`Sastav Sabora: ${groups.map((g) => `${g.label} ${g.seats}`).join(", ")}, ukupno ${total} zastupnika`}
          className="w-full"
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
                opacity={dim ? 0.22 : 1}
                stroke="#FFFFFF"
                strokeWidth="2"
              >
                <title>{seat.label}</title>
              </circle>
            );
          })}
          <text
            x={cx}
            y={cy - 30}
            textAnchor="middle"
            className="fill-navy font-serif"
            style={{ fontSize: 44, fontWeight: 700 }}
          >
            {total}
          </text>
          <text
            x={cx}
            y={cy - 8}
            textAnchor="middle"
            fill="#5A6570"
            style={{ fontSize: 14 }}
          >
            zastupnika
          </text>
        </svg>
      </div>

      <figcaption>
        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2" role="list">
          {groups.map((g) => (
            <li
              key={g.key}
              onMouseEnter={() => setHover(g.key)}
              onMouseLeave={() => setHover(null)}
              className="flex cursor-default items-center gap-2 text-sm"
            >
              <span
                aria-hidden="true"
                className="inline-block h-3 w-3 rounded-full"
                style={{ background: g.color }}
              />
              <span className="font-medium text-ink">{g.label}</span>
              <span className="tabular text-muted">{g.seats}</span>
            </li>
          ))}
        </ul>
      </figcaption>

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-muted hover:text-navy">
          Tablica: mandati po listama i manjinski zastupnici
        </summary>
        <div className="mt-3 grid gap-6 md:grid-cols-2">
          <table className="w-full text-left">
            <caption className="mb-1 text-left font-semibold text-navy">
              Opće liste ({sabor.opci_mandati})
            </caption>
            <thead>
              <tr className="border-b border-line text-xs text-muted uppercase">
                <th className="py-1.5 pr-2 font-semibold">Lista</th>
                <th className="py-1.5 text-right font-semibold">Mandata</th>
              </tr>
            </thead>
            <tbody>
              {sabor.liste.map((l) => (
                <tr key={l.naziv} className="border-b border-line/60">
                  <td className="py-1.5 pr-2">{l.kratki}</td>
                  <td className="tabular py-1.5 text-right">{l.mandata}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <table className="w-full text-left">
            <caption className="mb-1 text-left font-semibold text-navy">
              Manjinski zastupnici ({sabor.manjinski_mandati})
            </caption>
            <thead>
              <tr className="border-b border-line text-xs text-muted uppercase">
                <th className="py-1.5 pr-2 font-semibold">Zastupnik</th>
                <th className="py-1.5 pr-2 font-semibold">Manjina</th>
                <th className="py-1.5 text-right font-semibold">Glasova</th>
              </tr>
            </thead>
            <tbody>
              {sabor.manjine.map((m) => (
                <tr key={m.naziv} className="border-b border-line/60">
                  <td className="py-1.5 pr-2">{m.naziv}</td>
                  <td className="py-1.5 pr-2 text-muted">{m.manjina}</td>
                  <td className="tabular py-1.5 text-right">{fmtInt(m.glasova)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
