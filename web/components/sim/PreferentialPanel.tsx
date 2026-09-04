"use client";

import { useMemo } from "react";
import { fmtDec, fmtInt, fmtPct } from "@/lib/format";
import { partyColor } from "@/lib/palette";
import { pairInversions, seatOrderWithinList } from "@/lib/sim/preferential";
import type { RawCycle, Rules, SimResult } from "@/lib/sim/types";
import { SourceBadge } from "./ui";

/**
 * Who actually enters parliament, by name.
 *
 * Real candidates and real preferential vote counts from the DIP archive.
 * Note the denominator trap: rezultat_kandidat.posto is a share of THAT
 * LIST's votes, which is what čl. 40 al. 2 uses — not a share of the unit.
 *
 * The list a candidate ran on carries only the coalition's leading party, so
 * this never claims to know anyone's party membership.
 */
export function PreferentialPanel({
  cycle,
  res,
  rules,
}: {
  cycle: RawCycle;
  res: SimResult;
  rules: Rules;
}) {
  const { parovi, preskocili, ukupnoIzabranih, ukupnoPreferencijalno } =
    useMemo(() => {
      type Osoba = { naziv: string; glasova: number; lista: string; ij: string };
      const seated: Osoba[] = [];
      const unseated: Osoba[] = [];
      const preskocili: {
        naziv: string;
        glasova: number;
        posto: number;
        rbr: number;
        mjesto: number;
        lista: string;
        obitelj: string;
        ij: string;
      }[] = [];
      let ukupnoPreferencijalno = 0;

      for (const u of res.jedinice) {
        const raw = cycle.jedinice.find((x) => x.code === u.code);
        if (!raw) continue;
        for (const l of u.liste) {
          const rl = raw.liste.find((x) => x.rbr === l.rbr && x.naziv === l.naziv);
          if (!rl || rl.kandidati.length === 0) continue;
          const izabrani = seatOrderWithinList(
            rl.kandidati,
            l.glasova,
            l.mandata,
            rules.pragPreferencijala,
          );
          const uSaboru = new Set(izabrani.map((s) => s.rbr));
          for (const s of izabrani) {
            seated.push({
              naziv: s.naziv,
              glasova: s.glasova,
              lista: l.kratki,
              ij: u.label.split(" ")[0],
            });
            if (s.preferencijalno) {
              ukupnoPreferencijalno++;
              // Someone who jumped ahead of their ballot position.
              if (s.rbr > s.mjesto) {
                preskocili.push({
                  naziv: s.naziv,
                  glasova: s.glasova,
                  posto: s.posto,
                  rbr: s.rbr,
                  mjesto: s.mjesto,
                  lista: l.kratki,
                  obitelj: l.obitelj,
                  ij: u.label.split(" ")[0],
                });
              }
            }
          }
          for (const [rbr, naziv, g] of rl.kandidati) {
            if (!uSaboru.has(rbr)) {
              unseated.push({
                naziv,
                glasova: g,
                lista: l.kratki,
                ij: u.label.split(" ")[0],
              });
            }
          }
        }
      }
      return {
        parovi: pairInversions(seated, unseated),
        preskocili: preskocili.sort((a, b) => b.glasova - a.glasova),
        ukupnoIzabranih: seated.length,
        ukupnoPreferencijalno,
      };
    }, [cycle, res, rules.pragPreferencijala]);

  const gubUk = parovi.reduce((a, p) => a + p.gubitnik.glasova, 0);
  const dobUk = parovi.reduce((a, p) => a + p.dobitnik.glasova, 0);

  return (
    <div className="grid h-full grid-cols-[1.15fr_1fr] gap-2 overflow-hidden">
      <section className="flex min-h-0 flex-col rounded-md border border-line bg-white">
        <header className="flex shrink-0 items-center gap-2 border-b border-line/70 px-3 py-1.5">
          <h3 className="text-[10px] font-bold tracking-[0.13em] text-muted uppercase">
            Gubitnici ↔ dobitnici
          </h3>
          <SourceBadge source="PODACI" />
          <span className="ml-auto text-[10px] text-muted">
            {parovi.length} parova do izjednačenja
          </span>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <table className="w-full border-collapse text-[10px]">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="border-b border-line text-[9px] tracking-[0.08em] text-muted uppercase">
                <th className="py-1 pr-1 pl-2 text-left font-bold">
                  Više glasova, bez mandata
                </th>
                <th className="py-1 pr-1 text-right font-bold">Gl.</th>
                <th className="py-1 pr-1 text-center font-bold">×</th>
                <th className="py-1 pr-1 text-right font-bold">Gl.</th>
                <th className="py-1 pr-2 text-left font-bold">
                  Manje glasova, u Saboru
                </th>
              </tr>
            </thead>
            <tbody>
              {parovi.map((p, i) => (
                <tr key={i} className="border-b border-line/40">
                  <td className="py-[3px] pr-1 pl-2">
                    <span className="block truncate" title={`${p.gubitnik.naziv} · ${p.gubitnik.lista}`}>
                      {p.gubitnik.naziv}
                    </span>
                    <span className="text-[8px] text-muted">{p.gubitnik.ij}</span>
                  </td>
                  <td className="tabular py-[3px] pr-1 text-right font-semibold text-[#B42318]">
                    {fmtInt(p.gubitnik.glasova)}
                  </td>
                  <td className="tabular py-[3px] pr-1 text-center text-muted">
                    {fmtDec(p.faktor, 1)}
                  </td>
                  <td className="tabular py-[3px] pr-1 text-right font-semibold text-[#1F6B33]">
                    {fmtInt(p.dobitnik.glasova)}
                  </td>
                  <td className="py-[3px] pr-2">
                    <span className="block truncate" title={`${p.dobitnik.naziv} · ${p.dobitnik.lista}`}>
                      {p.dobitnik.naziv}
                    </span>
                    <span className="text-[8px] text-muted">{p.dobitnik.ij}</span>
                  </td>
                </tr>
              ))}
              {parovi.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-2 py-3 text-center text-muted">
                    Nema inverzija pod ovim pragom.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        {parovi.length > 0 ? (
          <footer className="shrink-0 border-t border-line px-2 py-1.5 text-[9px] leading-relaxed text-muted">
            Zajedno: {fmtInt(gubUk)} preferencijalnih glasova bez ijednog mandata
            naspram {fmtInt(dobUk)} glasova koji su donijeli {parovi.length}{" "}
            mandata — omjer{" "}
            <span className="tabular font-semibold text-ink">
              {dobUk > 0 ? fmtDec(gubUk / dobUk, 2) : "–"}×
            </span>
            . Parovi se slažu najjači-bez-mandata protiv najslabijeg-s-mandatom,
            do točke izjednačenja.
          </footer>
        ) : null}
      </section>

      <section className="flex min-h-0 flex-col rounded-md border border-line bg-white">
        <header className="flex shrink-0 items-center gap-2 border-b border-line/70 px-3 py-1.5">
          <h3 className="text-[10px] font-bold tracking-[0.13em] text-muted uppercase">
            Preskočili redoslijed liste
          </h3>
          <SourceBadge source="ZAKON" title="ZIZHS čl. 40 al. 2–4" />
          <span className="ml-auto text-[10px] text-muted">
            prag {fmtPct(rules.pragPreferencijala, 1)}
          </span>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <table className="w-full border-collapse text-[10px]">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="border-b border-line text-[9px] tracking-[0.08em] text-muted uppercase">
                <th className="py-1 pr-1 pl-2 text-left font-bold">Kandidat</th>
                <th className="py-1 pr-1 text-right font-bold">Pref.</th>
                <th className="py-1 pr-1 text-right font-bold">% liste</th>
                <th className="py-1 pr-2 text-right font-bold" title="s pozicije na listi → na mjesto mandata">
                  Skok
                </th>
              </tr>
            </thead>
            <tbody>
              {preskocili.slice(0, 40).map((p, i) => (
                <tr key={i} className="border-b border-line/40">
                  <td className="py-[3px] pr-1 pl-2">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="inline-block h-2 w-2 shrink-0 rounded-[2px]"
                        style={{ background: partyColor(p.obitelj) }}
                        aria-hidden="true"
                      />
                      <span className="min-w-0">
                        <span className="block truncate" title={`${p.naziv} · ${p.lista}`}>
                          {p.naziv}
                        </span>
                        <span className="text-[8px] text-muted">{p.ij}</span>
                      </span>
                    </span>
                  </td>
                  <td className="tabular py-[3px] pr-1 text-right font-semibold text-navy">
                    {fmtInt(p.glasova)}
                  </td>
                  <td className="tabular py-[3px] pr-1 text-right">
                    {fmtPct(p.posto, 1)}
                  </td>
                  <td className="tabular py-[3px] pr-2 text-right text-[#1F6B33]">
                    {p.rbr} → {p.mjesto}
                  </td>
                </tr>
              ))}
              {preskocili.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-2 py-3 text-center text-muted">
                    Nitko ne prelazi prag preferencijala.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <footer className="shrink-0 border-t border-line px-2 py-1.5 text-[9px] leading-relaxed text-muted">
          {ukupnoPreferencijalno} od {ukupnoIzabranih} mandata dodijeljeno je
          preferencijalno; ostali su popunjeni redoslijedom s liste. Postotak je
          udio u glasovima <em>te liste u toj jedinici</em> — nazivnik koji
          propisuje čl. 40 al. 2.
        </footer>
      </section>
    </div>
  );
}
