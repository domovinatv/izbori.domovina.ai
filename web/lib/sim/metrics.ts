/**
 * Disproportionality and malapportionment measures.
 *
 * None of these existed in the repo before the simulator — PLAN_POBOLJSANJA.md
 * carries the Gallagher index as backlog item S4. Reference values computed
 * from the local DB are in docs/izborni_sustav_cinjenice.md §10 and are
 * asserted by web/lib/sim/verify.mjs.
 */

import type { FamilyResult, UnitResult } from "./types";

/**
 * Gallagher least-squares index: sqrt(0.5 * Σ(vote% - seat%)²).
 * Conventional reading: <2 very proportional, 2-5 moderate, >5 high.
 * Croatia sits at ~7.0, which is high for a proportional system.
 */
export function gallagher(f: FamilyResult[]): number {
  const s = f.reduce(
    (acc, x) => acc + (x.postoGlasova - x.postoMandata) ** 2,
    0,
  );
  return Math.sqrt(0.5 * s);
}

/** Loosemore-Hanby: 0.5 * Σ|vote% - seat%|. Total misrepresentation. */
export function loosemoreHanby(f: FamilyResult[]): number {
  return (
    0.5 * f.reduce((acc, x) => acc + Math.abs(x.postoGlasova - x.postoMandata), 0)
  );
}

/** Laakso-Taagepera effective number of parties: 1 / Σ(share²). */
export function effectiveParties(shares: number[]): number {
  const s = shares.reduce((acc, x) => acc + (x / 100) ** 2, 0);
  return s > 0 ? 1 / s : 0;
}

/**
 * Ratio of the most to the least expensive seat.
 *
 * Call with `biraci` for the LEGAL malapportionment test (ZIZHS čl. 39 /
 * ZIJ čl. 14) and with `vazeci` for the effective price of a seat. They are
 * different quantities: the second is driven mostly by turnout, so labelling
 * it "gerrymandering" would be wrong. See docs §10.
 */
export function costRatio(
  units: UnitResult[],
  field: "biraci" | "vazeci",
): number {
  const per = units
    .filter((u) => u.mandata > 0)
    .map((u) => u[field] / u.mandata)
    .filter((x) => x > 0);
  if (per.length < 2) return 1;
  return Math.max(...per) / Math.min(...per);
}

/**
 * Largest deviation from the mean voter count, in percent — the ZIJ čl. 14
 * test. Pass only the ten territorial units; the diaspora unit has no
 * electoral roll and would distort it.
 */
export function deviationFromMean(units: UnitResult[]): number {
  const b = units.map((u) => u.biraci).filter((x) => x > 0);
  if (b.length === 0) return 0;
  const mean = b.reduce((a, x) => a + x, 0) / b.length;
  if (mean <= 0) return 0;
  return Math.max(...b.map((x) => Math.abs((x - mean) / mean) * 100));
}
