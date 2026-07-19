import type { Jedinica } from "@/lib/types";
import { partyColor } from "@/lib/palette";
import { fmtPct } from "@/lib/format";

/**
 * Seats per electoral unit (D'Hondt, computed in the export) — small
 * multiples of seat squares, color per party entity, direct counts.
 */
export function Jedinice({ jedinice }: { jedinice: Jedinica[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {jedinice.map((j) => (
        <div key={j.code} className="rounded-lg border border-line bg-white p-4">
          <div className="flex items-baseline justify-between">
            <h3 className="font-semibold text-navy">{j.label}</h3>
            <span className="tabular text-xs text-muted">
              odaziv {fmtPct(j.odaziv_posto, 1)}
            </span>
          </div>
          <ul className="mt-3 space-y-1.5" role="list">
            {j.mandati.map((m) => (
              <li key={m.kratki} className="flex items-center gap-2 text-sm">
                <span className="flex gap-[2px]" aria-hidden="true">
                  {Array.from({ length: m.mandata }).map((_, i) => (
                    <span
                      key={i}
                      className="inline-block h-3 w-3 rounded-[3px]"
                      style={{ background: partyColor(m.stranka) }}
                    />
                  ))}
                </span>
                <span className="tabular font-semibold text-ink">{m.mandata}</span>
                <span className="min-w-0 truncate text-muted">{m.kratki}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
