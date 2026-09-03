#!/usr/bin/env node
/**
 * Regression harness for the simulator engine.
 *
 * The site's standing rule (PLAN_UI.md §2) is that all election maths happens
 * in Python and the frontend only lays numbers out. The simulator necessarily
 * breaks that — an interactive recompute cannot go through a build step. This
 * file is what buys the exception: it proves the TypeScript engine reproduces
 * the official 2024 and 2020 allocations exactly, seat for seat, and hits the
 * reference metrics recorded in docs/izborni_sustav_cinjenice.md.
 *
 * Run:  node web/lib/sim/verify.mjs
 * Exits non-zero on any mismatch.
 */

import { readFileSync } from "node:fs";
import { register } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const WEB = join(HERE, "..", "..");
const DATA = join(WEB, "public", "data", "simulator");

// Node >= 22.6 strips TypeScript types on import, so the engine is tested
// exactly as the browser bundle sees it — no transpile step, no second copy.
// The hook only reconciles extensionless specifiers with Node's resolver.
register("./ts-loader.mjs", import.meta.url);

const { simulate } = await import("./run.ts");
const { ZAKONSKA_PRAVILA, NEUTRALNI_SCENARIJ } = await import("./types.ts");
const { seatOrderWithinList } = await import("./preferential.ts");
const { allocateHighestAverages, diasporaSeats1999 } = await import("./allocate.ts");

let failures = 0;
let checks = 0;

function ok(label, got, want, tol = 0) {
  checks++;
  const pass =
    tol > 0 ? Math.abs(got - want) <= tol : JSON.stringify(got) === JSON.stringify(want);
  if (!pass) {
    failures++;
    console.error(`  ✗ ${label}\n      dobiveno: ${JSON.stringify(got)}\n      očekivano: ${JSON.stringify(want)}${tol ? ` (±${tol})` : ""}`);
  }
  return pass;
}

function section(name) {
  console.log(`\n${name}`);
}

const load = (slug) => JSON.parse(readFileSync(join(DATA, `${slug}.json`), "utf-8"));

// ── 1. Unit-level formula properties ────────────────────────────────────────

section("Svojstva formule");

// Integer-exact D'Hondt on a textbook case.
{
  const e = [
    { rbr: 1, glasova: 100000 },
    { rbr: 2, glasova: 80000 },
    { rbr: 3, glasova: 30000 },
    { rbr: 4, glasova: 20000 },
  ];
  ok("D'Hondt 8 mandata", allocateHighestAverages(e, 8, "dhondt").mandata, [4, 3, 1, 0]);
  // Sainte-Laguë spreads the same 8 seats more evenly than D'Hondt: the
  // fourth list takes one instead of the leader taking a fourth.
  ok(
    "Sainte-Laguë 8 mandata",
    allocateHighestAverages(e, 8, "sainte-lague").mandata,
    [3, 3, 1, 1],
  );
}

// An exact tie must resolve deterministically and be reported.
{
  const e = [
    { rbr: 2, glasova: 1000 },
    { rbr: 1, glasova: 1000 },
  ];
  const r = allocateHighestAverages(e, 1, "dhondt");
  ok("izjednačenje: mandat ide manjem rednom broju", r.mandata, [0, 1]);
  ok("izjednačenje se prijavljuje", r.tieBreakKorišten, true);
}

// The "1000 vs 999" construction from the original brief.
{
  const e = [{ rbr: 1, glasova: 1000 }];
  for (let i = 0; i < 19; i++) e.push({ rbr: i + 2, glasova: 999 });
  const total = e.reduce((a, x) => a + x.glasova, 0);
  ok("konstrukcija 1000v999: ukupno glasova", total, 19981);
  ok("konstrukcija 1000v999: udio pobjednika", +((100 * 1000) / total).toFixed(4), 5.0048);
  // Only the first list clears 5%, so it takes all 14 seats.
  const r = allocateHighestAverages([e[0]], 14, "dhondt");
  ok("konstrukcija 1000v999: mandati", r.mandata, [14]);
}

// Pre-2010 diaspora formula.
ok("dijaspora 1999., zaokruživanje 0,5 naviše", diasporaSeats1999(1400, 105, 140), 11);
ok("dijaspora 1999., prazna baza", diasporaSeats1999(0, 100, 140), 0);

// Preferential reordering: a 10% candidate at the bottom jumps the leader.
{
  const kandidati = [
    [1, "NOSITELJ", 50],
    [2, "DRUGI", 10],
    [3, "SKOČIO", 300],
  ];
  const seated = seatOrderWithinList(kandidati, 1000, 2, 10);
  ok("preferencijal: tko ulazi", seated.map((s) => s.naziv), ["SKOČIO", "NOSITELJ"]);
  ok("preferencijal: oznaka preskoka", seated[0].preferencijalno, true);
  ok("preferencijal: dopuna po redoslijedu", seated[1].preferencijalno, false);
  // 4.9% must be invisible to the reordering even if it outpolls everyone else.
  const ispod = seatOrderWithinList(
    [
      [1, "NOSITELJ", 10],
      [2, "BLIZU", 99],
    ],
    1000,
    1,
    10,
  );
  ok("preferencijal: 9,9 % ne preslaguje", ispod.map((s) => s.naziv), ["NOSITELJ"]);
}

// ── 2. Backtest: the engine must reproduce the official results ─────────────

/** Official per-unit seats for the biggest family, from DIP. */
const OCEKIVANO = {
  "parlament-2024": {
    geografskiMandati: 143,
    ukupnoMandata: 151,
    hdzPoJedinici: [5, 6, 5, 7, 7, 4, 7, 4, 7, 6, 3],
    obitelji: { HDZ: 61, SDP: 42, DP: 14, MOST: 11, "MOŽEMO! - POLITIČKA PLATFORMA": 10 },
    gallagher: 7.04,
    loosemoreHanby: 12.62,
    enpGlasovi: 4.79,
    enpMandati: 3.46,
    biracaPoMandatuOmjer: 1.064,
    glasovaPoMandatuOmjer: 1.333,
    maxOdstupanje: 3.32, // IJ V, -3,32 % — najveće po apsolutnoj vrijednosti
    propaliIspodPragaPosto: 11.32,
    propaliBezMandataPosto: 13.13,
  },
  "parlament-2020": {
    geografskiMandati: 143,
    ukupnoMandata: 151,
    hdzPoJedinici: [5, 6, 5, 8, 8, 6, 6, 4, 8, 7, 3],
    obitelji: { HDZ: 66, SDP: 41, "DOMOVINSKI POKRET": 16, MOST: 8 },
    gallagher: 7.42,
    loosemoreHanby: 13.01,
    enpGlasovi: 4.44,
    enpMandati: 3.19,
    biracaPoMandatuOmjer: 1.311,
    glasovaPoMandatuOmjer: 1.381,
    maxOdstupanje: 14.21, // IJ IV, -14,21 %
    propaliIspodPragaPosto: null,
    propaliBezMandataPosto: null,
  },
};

for (const [slug, exp] of Object.entries(OCEKIVANO)) {
  section(`Backtest ${slug}`);
  const cycle = load(slug);
  const res = simulate(cycle, ZAKONSKA_PRAVILA, NEUTRALNI_SCENARIJ);

  ok("geografskih mandata", res.geografskiMandati, exp.geografskiMandati);
  ok("manjinskih mandata", res.manjinskiMandati, 8);
  ok("ukupno mandata", res.ukupnoMandata, exp.ukupnoMandata);
  ok("većina", res.vecina, 76);
  ok("broj jedinica", res.jedinice.length, 11);

  // Every unit must allocate exactly its statutory seats.
  for (const u of res.jedinice) {
    const zbroj = u.liste.reduce((a, l) => a + l.mandata, 0);
    ok(`IJ ${u.code}: dodijeljeno == propisano`, zbroj, u.mandata);
  }

  // The decisive test: seat-for-seat identity with the recorded result.
  let odstupanja = 0;
  for (let i = 0; i < cycle.jedinice.length; i++) {
    const raw = cycle.jedinice[i];
    const sim = res.jedinice[i];
    for (const l of raw.liste) {
      const s = sim.liste.find((x) => x.naziv === l.naziv && x.rbr === l.rbr);
      if (!s || s.mandata !== l.mandata_stvarni) odstupanja++;
    }
  }
  ok("odstupanja od službenog rezultata (po listi, po jedinici)", odstupanja, 0);

  // Per-unit seats for the largest family.
  const hdz = res.jedinice.map((u) =>
    u.liste.filter((l) => l.obitelj === "HDZ").reduce((a, l) => a + l.mandata, 0),
  );
  ok("HDZ po jedinicama", hdz, exp.hdzPoJedinici);

  for (const [obitelj, mandata] of Object.entries(exp.obitelji)) {
    const f = res.obitelji.find((x) => x.obitelj === obitelj);
    ok(`obitelj ${obitelj}`, f ? f.mandata : null, mandata);
  }

  const m = res.metrike;
  ok("Gallagher", +m.gallagher.toFixed(2), exp.gallagher, 0.01);
  ok("Loosemore–Hanby", +m.loosemoreHanby.toFixed(2), exp.loosemoreHanby, 0.01);
  ok("ENP glasovi", +m.enpGlasovi.toFixed(2), exp.enpGlasovi, 0.01);
  ok("ENP mandati", +m.enpMandati.toFixed(2), exp.enpMandati, 0.01);
  ok("birača/mandat omjer", +m.biracaPoMandatuOmjer.toFixed(3), exp.biracaPoMandatuOmjer, 0.001);
  ok("glasova/mandat omjer", +m.glasovaPoMandatuOmjer.toFixed(3), exp.glasovaPoMandatuOmjer, 0.001);
  ok("max odstupanje od prosjeka", +m.maxOdstupanjeOdProsjeka.toFixed(2), exp.maxOdstupanje, 0.01);
  if (exp.propaliIspodPragaPosto != null) {
    ok("propali ispod praga %", +m.propaliIspodPragaPosto.toFixed(2), exp.propaliIspodPragaPosto, 0.01);
    ok("propali bez mandata %", +m.propaliBezMandataPosto.toFixed(2), exp.propaliBezMandataPosto, 0.01);
  }
  // Below-threshold votes are a subset of zero-seat votes, always.
  ok(
    "propali ispod praga <= propali bez mandata",
    m.propaliIspodPraga <= m.propaliBezMandata,
    true,
  );

  // Minority seats: fixed statutory partition (ZIZHS čl. 17).
  ok(
    "manjinske podjedinice",
    res.manjine.map((x) => x.mandata),
    [3, 1, 1, 1, 1, 1],
  );
  for (const mn of res.manjine) {
    ok(`manjina ${mn.vrsta}: izabranih`, mn.izabrani.length, mn.mandata);
  }
}

// ── 3. Rule changes must move the result in the right direction ─────────────

section("Osjetljivost na promjenu pravila");
{
  const cycle = load("parlament-2024");
  const base = simulate(cycle, ZAKONSKA_PRAVILA, NEUTRALNI_SCENARIJ);

  const bezPraga = simulate(cycle, { ...ZAKONSKA_PRAVILA, prag: 0 }, NEUTRALNI_SCENARIJ);
  ok("prag 0 %: i dalje 143 geografska mandata", bezPraga.geografskiMandati, 143);
  ok("prag 0 %: nema propalih ispod praga", bezPraga.metrike.propaliIspodPraga, 0);
  // Key empirical finding, not an assumption: in 14-seat units the EFFECTIVE
  // threshold (~5,5-6,5 %) is already above the legal 5 %, so abolishing the
  // legal threshold changes no seat at all. Votes below 5 % stop counting as
  // "wasted by the threshold", but they still elect nobody.
  ok(
    "prag 0 %: raspodjela mandata je identična zakonskoj",
    bezPraga.obitelji.map((f) => [f.obitelj, f.mandata]),
    base.obitelji.map((f) => [f.obitelj, f.mandata]),
  );
  ok(
    "prag 0 %: Gallagher nepromijenjen",
    +bezPraga.metrike.gallagher.toFixed(4),
    +base.metrike.gallagher.toFixed(4),
  );
  ok(
    "prag 0 %: glasovi bez mandata ostaju",
    bezPraga.metrike.propaliBezMandata,
    base.metrike.propaliBezMandata,
  );

  const visokPrag = simulate(cycle, { ...ZAKONSKA_PRAVILA, prag: 10 }, NEUTRALNI_SCENARIJ);
  ok(
    "prag 10 %: više propalih glasova",
    visokPrag.metrike.propaliIspodPraga > base.metrike.propaliIspodPraga,
    true,
  );

  const jedna = simulate(
    cycle,
    { ...ZAKONSKA_PRAVILA, jedinstvenaJedinica: true },
    NEUTRALNI_SCENARIJ,
  );
  ok("jedinstvena IJ: 140 + 3 mandata", jedna.geografskiMandati, 143);
  ok("jedinstvena IJ: jedna teritorijalna + dijaspora", jedna.jedinice.length, 2);
  // Lists merge by family, so a coalition that ran under different names per
  // unit is not fragmented below the threshold and wiped out.
  const dpJedna = jedna.obitelji.find((f) => f.obitelj === "DP");
  ok("jedinstvena IJ: DP nije izbrisan fragmentacijom naziva", dpJedna.mandata > 0, true);

  const bezDijaspore = simulate(
    cycle,
    { ...ZAKONSKA_PRAVILA, dijaspora: "bez" },
    NEUTRALNI_SCENARIJ,
  );
  ok("bez dijaspore: 140 geografskih", bezDijaspore.geografskiMandati, 140);

  const model1999 = simulate(
    cycle,
    { ...ZAKONSKA_PRAVILA, dijaspora: "model1999" },
    NEUTRALNI_SCENARIJ,
  );
  // 40.412 valid votes in XI against a national price of ~14.860 per seat.
  ok("model 1999. na brojkama iz 2024. daje 3 mandata", model1999.geografskiMandati, 143);

  const komp = simulate(
    cycle,
    { ...ZAKONSKA_PRAVILA, kompenzacijskiMandati: 20 },
    NEUTRALNI_SCENARIJ,
  );
  ok("kompenzacijski: 143 + 20", komp.geografskiMandati, 163);
  ok(
    "kompenzacijski smanjuju nerazmjernost",
    komp.metrike.gallagher < base.metrike.gallagher,
    true,
  );
}

// ── 4. Scenario engine must be neutral when it should be ───────────────────

section("Scenariji");
{
  const cycle = load("parlament-2024");
  const base = simulate(cycle, ZAKONSKA_PRAVILA, NEUTRALNI_SCENARIJ);

  const prazan = simulate(
    cycle,
    ZAKONSKA_PRAVILA,
    { mode: "proporcionalno", swing: { HDZ: 0 }, odaziv: null },
  );
  ok(
    "nulti swing ne mijenja ništa",
    prazan.obitelji.map((f) => f.mandata),
    base.obitelji.map((f) => f.mandata),
  );

  const pad = simulate(
    cycle,
    ZAKONSKA_PRAVILA,
    { mode: "proporcionalno", swing: { HDZ: -10 }, odaziv: null },
  );
  const hdzBase = base.obitelji.find((f) => f.obitelj === "HDZ");
  const hdzPad = pad.obitelji.find((f) => f.obitelj === "HDZ");
  ok("HDZ −10 pp: gubi mandate", hdzPad.mandata < hdzBase.mandata, true);
  ok("HDZ −10 pp: udio glasova pao ~10 pp", +(hdzBase.postoGlasova - hdzPad.postoGlasova).toFixed(1), 10, 0.3);
  ok("HDZ −10 pp: ukupno i dalje 143", pad.geografskiMandati, 143);

  const odaziv = simulate(
    cycle,
    ZAKONSKA_PRAVILA,
    { mode: "proporcionalno", swing: {}, odaziv: 40 },
  );
  ok(
    "sam odaziv ne mijenja raspodjelu mandata",
    odaziv.obitelji.map((f) => f.mandata),
    base.obitelji.map((f) => f.mandata),
  );
  ok("odaziv 40 %: manje važećih glasova", odaziv.metrike.ukupnoVazeci < base.metrike.ukupnoVazeci, true);
}

// ── Summary ────────────────────────────────────────────────────────────────

console.log(
  `\n${failures === 0 ? "✓" : "✗"} ${checks - failures}/${checks} provjera prošlo`,
);
process.exit(failures === 0 ? 0 : 1);
