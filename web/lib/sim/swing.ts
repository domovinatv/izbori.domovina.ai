/**
 * Deterministic vote projection.
 *
 * A backtest replays recorded votes. A forward simulation ("what happens in
 * 2028?") needs a bridge from a national vote share to per-unit votes, and
 * that bridge is a modelling choice, not a fact. Both modes here are pure
 * functions of the baseline — no randomness, no sampling, no polling data.
 * Any result produced through them is a PROJEKCIJA and must be labelled so.
 */

import type { RawCycle, RawJedinica, Scenario } from "./types";

/** National votes per family in the baseline, across units I-XI. */
export function familyTotals(cycle: RawCycle): Map<string, number> {
  const m = new Map<string, number>();
  for (const u of cycle.jedinice) {
    for (const l of u.liste) {
      m.set(l.obitelj, (m.get(l.obitelj) ?? 0) + l.glasova);
    }
  }
  return m;
}

/** Families ordered by national votes desc — the swing panel's row order. */
export function rankedFamilies(cycle: RawCycle, limit = 10): string[] {
  return [...familyTotals(cycle).entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([k]) => k);
}

/**
 * Per-family multipliers that move national vote *shares* by the requested
 * percentage points.
 *
 * `proporcionalno` scales a family's votes uniformly in every unit, so its
 * regional profile is preserved and votes can never go negative. Families
 * with no slider absorb the opposite movement in proportion to their size,
 * which keeps the total constant.
 *
 * `uniformno` instead targets the same point change in every unit
 * independently — the classic uniform national swing. It can drive small
 * parties to zero in weak units, which is realistic but lossy, so the total
 * is renormalised afterwards.
 */
function multipliers(cycle: RawCycle, scenario: Scenario): Map<string, number> {
  const totals = familyTotals(cycle);
  const ukupno = [...totals.values()].reduce((a, x) => a + x, 0);
  const out = new Map<string, number>();
  if (ukupno <= 0) return out;

  const pomaknute = Object.entries(scenario.swing).filter(
    ([obitelj, d]) => d !== 0 && totals.has(obitelj),
  );
  if (pomaknute.length === 0) return out;

  // Target votes for each explicitly moved family.
  let deltaUkupno = 0;
  for (const [obitelj, d] of pomaknute) {
    const trenutno = totals.get(obitelj)!;
    const ciljUdio = (100 * trenutno) / ukupno + d;
    const cilj = Math.max(0, (ciljUdio / 100) * ukupno);
    out.set(obitelj, trenutno > 0 ? cilj / trenutno : 0);
    deltaUkupno += cilj - trenutno;
  }

  // The rest absorb the opposite movement, proportionally to their size.
  const ostatak = [...totals.entries()].filter(([k]) => !out.has(k));
  const ostatakUkupno = ostatak.reduce((a, [, v]) => a + v, 0);
  if (ostatakUkupno > 0) {
    const faktor = Math.max(0, (ostatakUkupno - deltaUkupno) / ostatakUkupno);
    for (const [k] of ostatak) out.set(k, faktor);
  }
  return out;
}

/**
 * Apply a scenario to a cycle, returning new unit data. The baseline is never
 * mutated — a neutral scenario returns the input unchanged, which is what
 * makes "⟲ stvarni sustav" exact.
 */
export function applyScenario(
  cycle: RawCycle,
  scenario: Scenario,
): RawJedinica[] {
  const hasSwing = Object.values(scenario.swing).some((d) => d !== 0);
  if (!hasSwing && scenario.odaziv == null) return cycle.jedinice;

  const mult = hasSwing ? multipliers(cycle, scenario) : new Map<string, number>();

  // Turnout scales every unit's votes by the same factor. It cannot change
  // who wins on its own — it exists so the "% of the electorate" framing
  // moves with it, and so low-turnout scenarios are visible.
  let turnoutFaktor = 1;
  if (scenario.odaziv != null && cycle.ukupno.biraci > 0) {
    const stvarni = (100 * cycle.ukupno.glasovalo) / cycle.ukupno.biraci;
    if (stvarni > 0) turnoutFaktor = scenario.odaziv / stvarni;
  }

  return cycle.jedinice.map((u) => {
    const liste = u.liste.map((l) => {
      const f = (mult.get(l.obitelj) ?? 1) * turnoutFaktor;
      return f === 1 ? l : { ...l, glasova: Math.round(l.glasova * f) };
    });
    const vazeci = liste.reduce((a, l) => a + l.glasova, 0);
    if (vazeci === u.vazeci) return { ...u, liste };
    // Keep turnout figures consistent with the recomputed ballot count.
    const omjer = u.vazeci > 0 ? vazeci / u.vazeci : 1;
    return {
      ...u,
      liste,
      vazeci,
      nevazeci: Math.round(u.nevazeci * omjer),
      glasovalo: Math.round(u.glasovalo * omjer),
    };
  });
}
