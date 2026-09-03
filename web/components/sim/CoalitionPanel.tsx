"use client";

import { useMemo, useState } from "react";
import { partyColor } from "@/lib/palette";
import { fmtPct } from "@/lib/format";
import type { SimResult } from "@/lib/sim/types";
import { SourceBadge } from "./ui";

/**
 * Which combinations of families reach a majority under the simulated result.
 *
 * Arithmetic only. Nothing here says a coalition is politically possible —
 * plenty of these combinations would never sit in the same room, and the
 * simulator has no way to know that. Minority MPs are shown as one bloc
 * because that is how the seats are allocated (ZIZHS čl. 17), not because
 * they vote together.
 */
export function CoalitionPanel({ res }: { res: SimResult }) {
  const [odabrane, setOdabrane] = useState<Set<string>>(new Set());

  const obitelji = useMemo(
    () => res.obitelji.filter((f) => f.mandata > 0).sort((a, b) => b.mandata - a.mandata),
    [res],
  );

  const blokovi = useMemo(() => {
    const b = obitelji.map((f) => ({
      key: f.obitelj,
      label: f.obitelj === "MOŽEMO! - POLITIČKA PLATFORMA" ? "MOŽEMO!" : f.obitelj,
      mandata: f.mandata,
      color: partyColor(f.obitelj),
    }));
    if (res.manjinskiMandati > 0) {
      b.push({
        key: "MANJINE",
        label: "Manjine",
        mandata: res.manjinskiMandati,
        color: partyColor("MANJINE"),
      });
    }
    return b;
  }, [obitelji, res.manjinskiMandati]);

  const zbroj = blokovi
    .filter((b) => odabrane.has(b.key))
    .reduce((a, b) => a + b.mandata, 0);
  const vecina = res.vecina;
  const dvijeTrecine = Math.ceil((2 * res.ukupnoMandata) / 3);

  // Smallest majorities: enumerate subsets of the top blocs only, so this
  // stays instant even as the family count grows.
  const najmanje = useMemo(() => {
    const kandidati = blokovi.slice(0, 12);
    const out: { kljucevi: string[]; mandata: number }[] = [];
    const n = kandidati.length;
    for (let mask = 1; mask < 1 << n; mask++) {
      let m = 0;
      const keys: string[] = [];
      for (let i = 0; i < n; i++) {
        if (mask & (1 << i)) {
          m += kandidati[i].mandata;
          keys.push(kandidati[i].key);
        }
      }
      if (m < vecina) continue;
      // Minimal winning only: dropping any member must lose the majority.
      const minimalna = keys.every((k) => {
        const bez = m - (kandidati.find((x) => x.key === k)?.mandata ?? 0);
        return bez < vecina;
      });
      if (minimalna) out.push({ kljucevi: keys, mandata: m });
    }
    return out.sort((a, b) => a.kljucevi.length - b.kljucevi.length || a.mandata - b.mandata).slice(0, 14);
  }, [blokovi, vecina]);

  const toggle = (k: string) =>
    setOdabrane((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  const postotak = res.ukupnoMandata > 0 ? (100 * zbroj) / res.ukupnoMandata : 0;

  return (
    <div className="grid h-full grid-cols-[1fr_1fr] gap-2 overflow-hidden">
      <section className="flex min-h-0 flex-col rounded-md border border-line bg-white">
        <header className="flex shrink-0 items-center gap-2 border-b border-line/70 px-3 py-1.5">
          <h3 className="text-[10px] font-bold tracking-[0.13em] text-muted uppercase">
            Složi većinu
          </h3>
          <SourceBadge source="PODACI" />
          {odabrane.size > 0 ? (
            <button
              type="button"
              onClick={() => setOdabrane(new Set())}
              className="ml-auto text-[10px] text-muted underline-offset-2 hover:text-ink hover:underline"
            >
              očisti
            </button>
          ) : null}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          <div className="flex flex-wrap gap-1">
            {blokovi.map((b) => {
              const on = odabrane.has(b.key);
              return (
                <button
                  key={b.key}
                  type="button"
                  onClick={() => toggle(b.key)}
                  aria-pressed={on}
                  className={`flex items-center gap-1.5 rounded-[4px] border px-1.5 py-1 text-[10px] transition-colors ${
                    on ? "border-navy bg-navy/5 text-ink" : "border-line text-muted hover:border-navy/40"
                  }`}
                >
                  <span
                    className="inline-block h-2 w-2 rounded-[2px]"
                    style={{ background: b.color, opacity: on ? 1 : 0.45 }}
                    aria-hidden="true"
                  />
                  <span className="max-w-[110px] truncate">{b.label}</span>
                  <span className="tabular font-semibold">{b.mandata}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-3 rounded-md border border-line bg-surface px-3 py-2">
            <div className="flex items-baseline gap-2">
              <span className="tabular font-serif text-[32px] leading-none font-bold text-navy">
                {zbroj}
              </span>
              <span className="text-[11px] text-muted">
                od {res.ukupnoMandata} · {fmtPct(postotak, 1)}
              </span>
              <span
                className="ml-auto rounded-[3px] px-1.5 py-0.5 text-[10px] font-bold"
                style={{
                  background: zbroj >= vecina ? "#E0F1E5" : "#F8E2E0",
                  color: zbroj >= vecina ? "#1F6B33" : "#B42318",
                }}
              >
                {zbroj >= dvijeTrecine
                  ? "dvotrećinska"
                  : zbroj >= vecina
                    ? "većina"
                    : `nedostaje ${vecina - zbroj}`}
              </span>
            </div>
            <div className="relative mt-2 h-3 w-full overflow-hidden rounded-[3px] bg-line/50">
              <div
                className="absolute inset-y-0 left-0 transition-[width]"
                style={{
                  width: `${Math.min(100, postotak)}%`,
                  background: zbroj >= vecina ? "#1F6B33" : "#002F6C",
                }}
              />
              <div
                className="absolute inset-y-0 w-px bg-[#B42318]"
                style={{ left: `${(100 * vecina) / res.ukupnoMandata}%` }}
                title={`Većina: ${vecina}`}
              />
              <div
                className="absolute inset-y-0 w-px bg-navy/50"
                style={{ left: `${(100 * dvijeTrecine) / res.ukupnoMandata}%` }}
                title={`Dvije trećine: ${dvijeTrecine}`}
              />
            </div>
            <p className="mt-1.5 text-[9px] text-muted">
              Većina {vecina} · dvije trećine {dvijeTrecine}. Aritmetika, ne
              politička procjena — mnoge od ovih kombinacija ne bi nikad sjele
              zajedno.
            </p>
          </div>
        </div>
      </section>

      <section className="flex min-h-0 flex-col rounded-md border border-line bg-white">
        <header className="flex shrink-0 items-center gap-2 border-b border-line/70 px-3 py-1.5">
          <h3 className="text-[10px] font-bold tracking-[0.13em] text-muted uppercase">
            Najmanje moguće većine
          </h3>
          <span className="ml-auto text-[10px] text-muted">
            {najmanje.length} kombinacija
          </span>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-1.5">
          <ul className="flex flex-col gap-1" role="list">
            {najmanje.map((k, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => setOdabrane(new Set(k.kljucevi))}
                  className="flex w-full items-center gap-1.5 rounded-[4px] border border-line/70 px-1.5 py-1 text-left transition-colors hover:border-navy/40 hover:bg-surface"
                >
                  <span className="flex min-w-0 flex-wrap items-center gap-1">
                    {k.kljucevi.map((key) => {
                      const b = blokovi.find((x) => x.key === key)!;
                      return (
                        <span
                          key={key}
                          className="flex items-center gap-1 text-[10px] text-ink"
                        >
                          <span
                            className="inline-block h-2 w-2 rounded-[2px]"
                            style={{ background: b.color }}
                            aria-hidden="true"
                          />
                          <span className="max-w-[90px] truncate">{b.label}</span>
                        </span>
                      );
                    })}
                  </span>
                  <span className="tabular ml-auto shrink-0 text-[11px] font-semibold text-navy">
                    {k.mandata}
                  </span>
                </button>
              </li>
            ))}
            {najmanje.length === 0 ? (
              <li className="px-2 py-3 text-center text-[10px] text-muted">
                Nijedna kombinacija ne doseže većinu.
              </li>
            ) : null}
          </ul>
        </div>
        <footer className="shrink-0 border-t border-line px-2 py-1.5 text-[9px] leading-relaxed text-muted">
          Prikazane su samo <em>minimalne</em> pobjedničke koalicije — one u
          kojima izlazak bilo kojeg člana ruši većinu.
        </footer>
      </section>
    </div>
  );
}
