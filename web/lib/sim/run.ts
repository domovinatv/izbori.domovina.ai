/**
 * The simulation entry point: rules + scenario + baseline -> full result.
 *
 * Pure and synchronous. With ~11 units and ~20 lists each this runs in well
 * under a millisecond, which is what lets every slider recompute on input
 * rather than on release.
 *
 * Legal basis for each step: docs/izborni_sustav_cinjenice.md.
 */

import { allocate, diasporaSeats1999, passesThreshold } from "./allocate";
import {
  costRatio,
  deviationFromMean,
  effectiveParties,
  gallagher,
  loosemoreHanby,
} from "./metrics";
import { applyScenario } from "./swing";
import type {
  FamilyResult,
  MinorityResult,
  RawCycle,
  RawJedinica,
  Rules,
  Scenario,
  SeatEntry,
  SimResult,
  UnitResult,
} from "./types";

const DIJASPORA = "011";

/** Allocate seats within one unit under the given rules. */
function runUnit(
  u: RawJedinica,
  seats: number,
  rules: Rules,
  primijeniPrag: boolean,
): { unit: UnitResult; tie: boolean } {
  const vazeci = u.liste.reduce((a, l) => a + l.glasova, 0);
  const prag = primijeniPrag ? rules.prag : 0;

  const prosle = u.liste.map((l) => passesThreshold(l.glasova, vazeci, prag));
  const kandidati = u.liste
    .map((l, i) => ({ i, rbr: l.rbr, glasova: prosle[i] ? l.glasova : 0 }))
    .filter((x) => x.glasova > 0);

  const { mandata, tieBreakKorišten } = allocate(kandidati, seats, rules.metoda);

  const dodijeljeno = new Array<number>(u.liste.length).fill(0);
  kandidati.forEach((k, idx) => {
    dodijeljeno[k.i] = mandata[idx];
  });

  const liste: SeatEntry[] = u.liste.map((l, i) => ({
    rbr: l.rbr,
    naziv: l.naziv,
    kratki: l.kratki,
    obitelj: l.obitelj,
    glasova: l.glasova,
    posto: vazeci > 0 ? (100 * l.glasova) / vazeci : 0,
    mandata: dodijeljeno[i],
    prosla: prosle[i],
  }));

  return {
    unit: {
      code: u.code,
      label: u.label,
      mandata: seats,
      biraci: u.biraci,
      glasovalo: u.glasovalo,
      vazeci,
      liste,
      propaliIspodPraga: liste
        .filter((l) => !l.prosla)
        .reduce((a, l) => a + l.glasova, 0),
      propaliBezMandata: liste
        .filter((l) => l.mandata === 0)
        .reduce((a, l) => a + l.glasova, 0),
    },
    tie: tieBreakKorišten,
  };
}

/** ZIZHS čl. 46 — plurality, top N by votes. Block vote in the Serb sub-unit. */
function runMinorities(cycle: RawCycle): MinorityResult[] {
  return cycle.manjine.map((m) => ({
    vrsta: m.vrsta,
    manjina: m.manjina,
    mandata: m.mandata,
    izabrani: [...m.kandidati]
      .sort((a, b) => b.glasova - a.glasova || a.rbr - b.rbr)
      .slice(0, m.mandata)
      .map((k) => ({ naziv: k.naziv, glasova: k.glasova })),
  }));
}

/** Roll lists up to political families and compute per-family shares. */
function buildFamilies(
  units: UnitResult[],
  stvarni: Map<string, number>,
): FamilyResult[] {
  const glasovi = new Map<string, number>();
  const mandati = new Map<string, number>();
  for (const u of units) {
    for (const l of u.liste) {
      glasovi.set(l.obitelj, (glasovi.get(l.obitelj) ?? 0) + l.glasova);
      mandati.set(l.obitelj, (mandati.get(l.obitelj) ?? 0) + l.mandata);
    }
  }
  const ukupnoGlasova = [...glasovi.values()].reduce((a, x) => a + x, 0);
  const ukupnoMandata = [...mandati.values()].reduce((a, x) => a + x, 0);

  return [...glasovi.entries()]
    .map(([obitelj, g]) => {
      const m = mandati.get(obitelj) ?? 0;
      const pg = ukupnoGlasova > 0 ? (100 * g) / ukupnoGlasova : 0;
      const pm = ukupnoMandata > 0 ? (100 * m) / ukupnoMandata : 0;
      return {
        obitelj,
        glasova: g,
        postoGlasova: pg,
        mandata: m,
        postoMandata: pm,
        amplifikacija: pg > 0 ? pm / pg : 0,
        stvarniMandati: stvarni.get(obitelj) ?? 0,
      };
    })
    .sort((a, b) => b.glasova - a.glasova);
}

/** Seats each family won under the real system — the delta column's baseline. */
export function realFamilySeats(cycle: RawCycle): Map<string, number> {
  const m = new Map<string, number>();
  for (const u of cycle.jedinice) {
    for (const l of u.liste) {
      m.set(l.obitelj, (m.get(l.obitelj) ?? 0) + l.mandata_stvarni);
    }
  }
  return m;
}

export function simulate(
  cycle: RawCycle,
  rules: Rules,
  scenario: Scenario,
): SimResult {
  const jedinice = applyScenario(cycle, scenario);
  const napomene: string[] = [];
  let tie = false;

  const domace = jedinice.filter((u) => u.code !== DIJASPORA);
  const dijaspora = jedinice.find((u) => u.code === DIJASPORA);

  const units: UnitResult[] = [];

  if (rules.jedinstvenaJedinica) {
    // Counterfactual: one national constituency.
    //
    // Lists are merged by FAMILY, not by name. Merging by name — which is what
    // export_web.py's kontrafaktual does — splits a coalition that ran under
    // slightly different names in different units into several sub-5% lists,
    // and then wipes it out. DP 2024 would show 0 seats on 9.6% of the vote,
    // which is an artefact of the naming, not a property of the system. A real
    // single constituency would have one list per family.
    const spojene = new Map<string, { rbr: number; naziv: string; kratki: string; obitelj: string; glasova: number }>();
    let rbr = 0;
    for (const u of domace) {
      for (const l of u.liste) {
        const cur = spojene.get(l.obitelj);
        if (cur) cur.glasova += l.glasova;
        else
          spojene.set(l.obitelj, {
            rbr: ++rbr,
            naziv: l.obitelj,
            kratki: l.obitelj,
            obitelj: l.obitelj,
            glasova: l.glasova,
          });
      }
    }
    const seats = rules.mandataPoJedinici * 10;
    const virtual: RawJedinica = {
      code: "RH",
      label: "Jedinstvena izborna jedinica",
      mandata: seats,
      biraci: domace.reduce((a, u) => a + u.biraci, 0),
      glasovalo: domace.reduce((a, u) => a + u.glasovalo, 0),
      vazeci: domace.reduce((a, u) => a + u.vazeci, 0),
      nevazeci: domace.reduce((a, u) => a + u.nevazeci, 0),
      liste: [...spojene.values()].map((l) => ({ ...l, mandata_stvarni: 0, kandidati: [] })),
    };
    const r = runUnit(virtual, seats, rules, true);
    units.push(r.unit);
    tie ||= r.tie;
    napomene.push(
      "Jedinstvena izborna jedinica je kontrafaktual — zakon (ZIZHS čl. 38) propisuje deset jedinica.",
    );
  } else {
    for (const u of domace) {
      const r = runUnit(u, rules.mandataPoJedinici, rules, true);
      units.push(r.unit);
      tie ||= r.tie;
    }
  }

  // XI. izborna jedinica.
  if (dijaspora && rules.dijaspora !== "bez") {
    const vazeciDomaci = units.reduce((a, u) => a + u.vazeci, 0);
    const domacihMandata = units.reduce((a, u) => a + u.mandata, 0);
    const vazeciXI = dijaspora.liste.reduce((a, l) => a + l.glasova, 0);
    const seats =
      rules.dijaspora === "model1999"
        ? diasporaSeats1999(vazeciDomaci, vazeciXI, domacihMandata)
        : 3;
    if (rules.dijaspora === "model1999") {
      napomene.push(
        `Model iz 1999.: ${vazeciXI.toLocaleString("hr-HR")} važećih u XI. ÷ prosječnu cijenu mandata → ${seats} mandata.`,
      );
    }
    if (seats > 0) {
      const r = runUnit(dijaspora, seats, rules, rules.pragUDijaspori);
      units.push(r.unit);
      tie ||= r.tie;
    }
  }

  // Counterfactual national compensatory pool, on top of the unit seats.
  //
  // These are LEVELLING seats, not a second parallel election: the target is
  // the proportional distribution of (unit seats + pool), and the pool is
  // handed to whoever falls short of that target. Allocating the pool in
  // parallel by D'Hondt would reward the same large parties the unit-level
  // D'Hondt already rewarded and make disproportionality slightly worse.
  if (rules.kompenzacijskiMandati > 0) {
    const glasovi = new Map<string, { rbr: number; glasova: number }>();
    const osvojeno = new Map<string, number>();
    let rbr = 0;
    for (const u of units) {
      for (const l of u.liste) {
        osvojeno.set(l.obitelj, (osvojeno.get(l.obitelj) ?? 0) + l.mandata);
        if (!l.prosla) continue;
        const cur = glasovi.get(l.obitelj);
        if (cur) cur.glasova += l.glasova;
        else glasovi.set(l.obitelj, { rbr: ++rbr, glasova: l.glasova });
      }
    }

    const keys = [...glasovi.keys()];
    const ukupnoSaKompenzacijom =
      units.reduce((a, u) => a + u.mandata, 0) + rules.kompenzacijskiMandati;

    // Proportional target over the enlarged parliament.
    const { mandata: cilj } = allocate(
      keys.map((k) => glasovi.get(k)!),
      ukupnoSaKompenzacijom,
      rules.metoda,
    );

    // Shortfall against that target, largest first.
    const manjak = keys
      .map((k, i) => ({
        obitelj: k,
        rbr: glasovi.get(k)!.rbr,
        manjak: Math.max(0, cilj[i] - (osvojeno.get(k) ?? 0)),
      }))
      .filter((x) => x.manjak > 0);

    const dodijeljeno = new Map<string, number>();
    let preostalo = rules.kompenzacijskiMandati;
    // Hand out one seat at a time to the largest remaining shortfall, so an
    // undersized pool is spread over the worst-treated families rather than
    // exhausted on the first one.
    while (preostalo > 0) {
      const red = manjak
        .map((x) => ({
          ...x,
          preostaliManjak: x.manjak - (dodijeljeno.get(x.obitelj) ?? 0),
        }))
        .filter((x) => x.preostaliManjak > 0)
        .sort((a, b) => b.preostaliManjak - a.preostaliManjak || a.rbr - b.rbr);
      if (red.length === 0) break;
      dodijeljeno.set(red[0].obitelj, (dodijeljeno.get(red[0].obitelj) ?? 0) + 1);
      preostalo--;
    }

    const podijeljeno = rules.kompenzacijskiMandati - preostalo;
    const pool: UnitResult = {
      code: "KOMP",
      label: "Kompenzacijski mandati",
      mandata: podijeljeno,
      biraci: 0,
      glasovalo: 0,
      vazeci: 0,
      liste: [...dodijeljeno.entries()].map(([k, m], i) => ({
        rbr: i + 1,
        naziv: k,
        kratki: k,
        obitelj: k,
        glasova: 0,
        posto: 0,
        mandata: m,
        prosla: true,
      })),
      propaliIspodPraga: 0,
      propaliBezMandata: 0,
    };
    units.push(pool);
    napomene.push(
      "Kompenzacijski mandati su kontrafaktual — hrvatski zakon ih ne poznaje. " +
        "Raspodjeljuju se korektivno, onima koji zaostaju za razmjernim udjelom.",
    );
  }

  if (rules.metoda !== "dhondt") {
    napomene.push(
      `Metoda „${rules.metoda}“ je kontrafaktual — ZIZHS čl. 40 propisuje D'Hondta.`,
    );
  }
  if (rules.mandataPoJedinici !== 14 && !rules.jedinstvenaJedinica) {
    napomene.push("ZIZHS čl. 38 propisuje 14 mandata po jedinici.");
  }
  if (rules.dijaspora !== "fiksno3") {
    napomene.push(
      "Broj dijasporskih mandata je ustavna kategorija (Ustav čl. 45 st. 2) — promjena traži dvotrećinsku većinu.",
    );
  }
  if (tie) {
    napomene.push(
      "Izjednačeni kvocijenti razriješeni su pretpostavkom simulatora — zakon o tome šuti.",
    );
  }

  const obitelji = buildFamilies(units, realFamilySeats(cycle));
  const manjine = rules.ukljuciManjine ? runMinorities(cycle) : [];

  const geografskiMandati = units.reduce((a, u) => a + u.mandata, 0);
  const manjinskiMandati = manjine.reduce((a, m) => a + m.mandata, 0);
  const ukupnoMandata = geografskiMandati + manjinskiMandati;

  // Malapportionment is only meaningful over the ten territorial units.
  const teritorijalne = units.filter(
    (u) => u.code !== DIJASPORA && u.code !== "KOMP" && u.biraci > 0,
  );
  const ukupnoVazeci = units.reduce((a, u) => a + u.vazeci, 0);
  const propaliIspodPraga = units.reduce((a, u) => a + u.propaliIspodPraga, 0);
  const propaliBezMandata = units.reduce((a, u) => a + u.propaliBezMandata, 0);
  const najveca = obitelji.reduce(
    (best, f) => (f.mandata > 0 && f.amplifikacija > best.amplifikacija ? f : best),
    { amplifikacija: 0, obitelj: "—" } as { amplifikacija: number; obitelj: string },
  );

  return {
    slug: cycle.slug,
    jedinice: units,
    obitelji,
    manjine,
    geografskiMandati,
    manjinskiMandati,
    ukupnoMandata,
    vecina: Math.floor(ukupnoMandata / 2) + 1,
    napomene,
    metrike: {
      gallagher: gallagher(obitelji),
      loosemoreHanby: loosemoreHanby(obitelji),
      enpGlasovi: effectiveParties(obitelji.map((f) => f.postoGlasova)),
      enpMandati: effectiveParties(obitelji.map((f) => f.postoMandata)),
      maxAmplifikacija: najveca.amplifikacija,
      maxAmplifikacijaObitelj: najveca.obitelj,
      biracaPoMandatuOmjer: costRatio(teritorijalne, "biraci"),
      glasovaPoMandatuOmjer: costRatio(teritorijalne, "vazeci"),
      maxOdstupanjeOdProsjeka: deviationFromMean(teritorijalne),
      propaliIspodPraga,
      propaliIspodPragaPosto:
        ukupnoVazeci > 0 ? (100 * propaliIspodPraga) / ukupnoVazeci : 0,
      propaliBezMandata,
      propaliBezMandataPosto:
        ukupnoVazeci > 0 ? (100 * propaliBezMandata) / ukupnoVazeci : 0,
      ukupnoVazeci,
    },
  };
}
