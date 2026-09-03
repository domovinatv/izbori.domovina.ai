/**
 * Preferential-vote seat order within a list — ZIZHS čl. 40 al. 2-4.
 *
 * Ported from scripts/export_web.py::_seat_order_within_list (line 449), with
 * one difference: ties on preferential votes are broken explicitly by ballot
 * order, which is what čl. 40 al. 3 actually says ("odlučujući je poredak na
 * listi kandidata"). The Python version relies on the stability of its input
 * sort instead, which is order-dependent.
 *
 * Not applicable to minority seats (čl. 16 st. 3); applicable to the diaspora
 * unit (čl. 44 al. 2-4).
 */

import type { RawKandidat } from "./types";

export interface SeatedCandidate {
  rbr: number;
  naziv: string;
  glasova: number;
  /** % of THAT list's votes in THAT unit — the čl. 40 al. 2 denominator. */
  posto: number;
  /** Did the 10% rule put them here, or did they inherit the ballot order? */
  preferencijalno: boolean;
  /** 1-based order in which the seat was taken. */
  mjesto: number;
}

/**
 * Who takes the `mandata` seats a list won in one unit.
 *
 * 1. Candidates with `pref >= prag% of the list's votes` sort by votes desc,
 *    ties by ballot order asc — they take seats first.
 * 2. Any remaining seats go down the ballot order, skipping those already in.
 */
export function seatOrderWithinList(
  kandidati: RawKandidat[],
  glasoviListe: number,
  mandata: number,
  pragPosto: number,
): SeatedCandidate[] {
  if (mandata <= 0 || kandidati.length === 0) return [];

  const cutoff = pragPosto <= 0 ? 0 : (glasoviListe * pragPosto) / 100;
  const pct = (g: number) => (glasoviListe > 0 ? (100 * g) / glasoviListe : 0);

  const kvalificirani = kandidati
    .filter(([, , g]) => (pragPosto <= 0 ? g > 0 : g >= cutoff))
    .sort((a, b) => b[2] - a[2] || a[0] - b[0]);

  const out: SeatedCandidate[] = [];
  const uzeti = new Set<number>();

  for (const [rbr, naziv, g] of kvalificirani) {
    if (out.length >= mandata) break;
    uzeti.add(rbr);
    out.push({
      rbr,
      naziv,
      glasova: g,
      posto: pct(g),
      preferencijalno: true,
      mjesto: out.length + 1,
    });
  }

  if (out.length < mandata) {
    const poRedu = [...kandidati].sort((a, b) => a[0] - b[0]);
    for (const [rbr, naziv, g] of poRedu) {
      if (out.length >= mandata) break;
      if (uzeti.has(rbr)) continue;
      uzeti.add(rbr);
      out.push({
        rbr,
        naziv,
        glasova: g,
        posto: pct(g),
        preferencijalno: false,
        mjesto: out.length + 1,
      });
    }
  }

  return out;
}

export interface Inversion {
  /** Higher preferential votes, no seat. */
  gubitnik: { naziv: string; glasova: number; lista: string; ij: string };
  /** Fewer preferential votes, took a seat. */
  dobitnik: { naziv: string; glasova: number; lista: string; ij: string };
  /** gubitnik.glasova / dobitnik.glasova */
  faktor: number;
}

/**
 * Pair unseated candidates against seated ones, best-unseated vs
 * weakest-seated, stopping at the crossover. Mirrors the pairing already
 * used in export_web.py::export_fairness (60 pairs for 2024, breakeven
 * 1.620 > 1.569) so the simulator and the site tell the same story.
 */
export function pairInversions(
  seated: { naziv: string; glasova: number; lista: string; ij: string }[],
  unseated: { naziv: string; glasova: number; lista: string; ij: string }[],
): Inversion[] {
  const gub = [...unseated].sort((a, b) => b.glasova - a.glasova);
  const dob = [...seated].sort((a, b) => a.glasova - b.glasova);
  const out: Inversion[] = [];
  const n = Math.min(gub.length, dob.length);
  for (let i = 0; i < n; i++) {
    if (gub[i].glasova <= dob[i].glasova) break;
    out.push({
      gubitnik: gub[i],
      dobitnik: dob[i],
      faktor: dob[i].glasova > 0 ? gub[i].glasova / dob[i].glasova : Infinity,
    });
  }
  return out;
}
