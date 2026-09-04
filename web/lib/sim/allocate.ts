/**
 * Seat-allocation formulas — integer-exact and order-independent.
 *
 * The repo's existing dhondt() (scripts/build_index.py:317) divides in
 * floating point and resolves ties by whichever key max() happens to see
 * first, which is SQL row order. That is fine for a one-off build step but
 * not for a simulator, where a slider can land exactly on a tie. Here every
 * comparison is a cross-multiplication of integers.
 *
 * Legal basis: ZIZHS čl. 40 (D'Hondt, divisors 1..14). Sainte-Laguë and
 * Hare-Niemeyer are counterfactuals — Croatian law does not know them.
 * See docs/izborni_sustav_cinjenice.md §4.
 */

import type { Method } from "./types";

/**
 * The law is SILENT on equal D'Hondt quotients. The 1999 rule ("the list with
 * more votes wins") was deleted by NN 19/15, and ždrijeb/žrijeb appears
 * nowhere in the current text. This is therefore OUR rule, and the UI must
 * label it as an assumption rather than as law.
 */
export const TIE_BREAK_ASSUMPTION =
  "Zakon ne propisuje razrješenje izjednačenih kvocijenata — pravilo iz 1999. " +
  "(„više glasova pobjeđuje“) obrisano je izmjenama NN 19/15. Simulator " +
  "primjenjuje: veći kvocijent → više ukupnih glasova → manji redni broj liste.";

export interface AllocInput {
  /** Ballot order number — the final, purely conventional tie-break. */
  rbr: number;
  glasova: number;
}

export interface AllocOutput {
  /** Seats per input, index-aligned with the input array. */
  mandata: number[];
  /** True if the tie-break was actually exercised (UI should say so). */
  tieBreakKorišten: boolean;
}

/** Divisor for the (s+1)-th seat under a divisor method. Always an integer. */
function divisor(method: Method, seats: number): number {
  // Sainte-Laguë: 1, 3, 5, 7… ; D'Hondt: 1, 2, 3, 4…
  return method === "sainte-lague" ? 2 * seats + 1 : seats + 1;
}

/**
 * Highest-averages allocation (D'Hondt or Sainte-Laguë).
 *
 * Picks the largest quotient `votes / divisor(seats)` `seats` times. Compares
 * a/da vs b/db as a*db vs b*da — exact in integers. Magnitudes here are at
 * most ~7e5 * 287, far inside the safe-integer range.
 */
export function allocateHighestAverages(
  entries: AllocInput[],
  seats: number,
  method: Method = "dhondt",
): AllocOutput {
  const n = entries.length;
  const mandata = new Array<number>(n).fill(0);
  if (seats <= 0 || n === 0) return { mandata, tieBreakKorišten: false };

  let tieBreakKorišten = false;

  for (let round = 0; round < seats; round++) {
    let best = -1;
    for (let i = 0; i < n; i++) {
      if (entries[i].glasova <= 0) continue;
      if (best === -1) {
        best = i;
        continue;
      }
      const di = divisor(method, mandata[i]);
      const db = divisor(method, mandata[best]);
      // entries[i].glasova / di  vs  entries[best].glasova / db
      const lhs = entries[i].glasova * db;
      const rhs = entries[best].glasova * di;
      if (lhs > rhs) {
        best = i;
      } else if (lhs === rhs) {
        tieBreakKorišten = true;
        // Assumption, not law: more total votes wins, then lower ballot number.
        if (
          entries[i].glasova > entries[best].glasova ||
          (entries[i].glasova === entries[best].glasova &&
            entries[i].rbr < entries[best].rbr)
        ) {
          best = i;
        }
      }
    }
    if (best === -1) break; // nobody left with votes
    mandata[best]++;
  }
  return { mandata, tieBreakKorišten };
}

/**
 * Largest-remainder allocation with the Hare quota — a counterfactual only.
 * Ties on the remainder fall back to the same assumption as above.
 */
export function allocateLargestRemainder(
  entries: AllocInput[],
  seats: number,
): AllocOutput {
  const n = entries.length;
  const mandata = new Array<number>(n).fill(0);
  if (seats <= 0 || n === 0) return { mandata, tieBreakKorišten: false };

  const total = entries.reduce((s, e) => s + Math.max(0, e.glasova), 0);
  if (total <= 0) return { mandata, tieBreakKorišten: false };

  // Integer quota arithmetic: floor(votes * seats / total).
  const rem: { i: number; num: number }[] = [];
  let assigned = 0;
  for (let i = 0; i < n; i++) {
    const v = Math.max(0, entries[i].glasova);
    const base = Math.floor((v * seats) / total);
    mandata[i] = base;
    assigned += base;
    rem.push({ i, num: v * seats - base * total });
  }

  let tieBreakKorišten = false;
  rem.sort((a, b) => {
    if (b.num !== a.num) return b.num - a.num;
    tieBreakKorišten = true;
    const ea = entries[a.i];
    const eb = entries[b.i];
    if (eb.glasova !== ea.glasova) return eb.glasova - ea.glasova;
    return ea.rbr - eb.rbr;
  });

  for (let k = 0; assigned < seats && k < rem.length; k++, assigned++) {
    mandata[rem[k].i]++;
  }
  return { mandata, tieBreakKorišten };
}

/** Dispatch on the configured method. */
export function allocate(
  entries: AllocInput[],
  seats: number,
  method: Method,
): AllocOutput {
  return method === "hare-niemeyer"
    ? allocateLargestRemainder(entries, seats)
    : allocateHighestAverages(entries, seats, method);
}

/**
 * ZIZHS čl. 41 — which lists may take part in the division, per unit.
 * Base is valid votes in that unit; the comparison is inclusive (>=), matching
 * scripts/build_index.py.
 */
export function passesThreshold(
  glasova: number,
  ukupnoVazeci: number,
  pragPosto: number,
): boolean {
  if (ukupnoVazeci <= 0) return false;
  if (pragPosto <= 0) return glasova > 0;
  return glasova >= (ukupnoVazeci * pragPosto) / 100;
}

/**
 * Pre-2010 diaspora seat count (ZIZHS 1999 čl. 44): the national price of a
 * seat is the divisor, and the result is rounded half up.
 */
export function diasporaSeats1999(
  vazeciDomaci: number,
  vazeciDijaspora: number,
  domacihMandata: number,
): number {
  if (vazeciDomaci <= 0 || domacihMandata <= 0) return 0;
  const kvocijent = vazeciDomaci / domacihMandata;
  return Math.floor(vazeciDijaspora / kvocijent + 0.5);
}
