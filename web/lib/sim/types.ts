/**
 * Types for the deterministic Croatian parliamentary election simulator.
 *
 * Legal basis for every rule is documented in
 * docs/izborni_sustav_cinjenice.md — read it before changing defaults.
 */

/**
 * Where a number in the UI comes from. Every displayed figure carries one.
 *
 * - ZAKON         — prescribed by statute, with an article
 * - PODACI        — computed from the official DIP results
 * - KONTRAFAKTUAL — real votes, a rule Croatian law does not have
 * - PRETPOSTAVKA  — our decision, because the law is silent
 * - KONSTRUKCIJA  — invented numbers, to show a mechanism
 */
export type Source =
  | "ZAKON"
  | "PODACI"
  | "KONTRAFAKTUAL"
  | "PRETPOSTAVKA"
  | "KONSTRUKCIJA";

// ── Raw export shape (scripts/export_simulator.py) ──────────────────────────

/** [rbr, naziv, preferential votes] — packed to keep the payload small. */
export type RawKandidat = [number, string, number];

export interface RawLista {
  rbr: number;
  naziv: string;
  kratki: string;
  /** leading_party() roll-up — a list's leading party, never a person's. */
  obitelj: string;
  glasova: number;
  mandata_stvarni: number;
  kandidati: RawKandidat[];
}

export interface RawJedinica {
  code: string;
  label: string;
  mandata: number;
  biraci: number;
  glasovalo: number;
  vazeci: number;
  nevazeci: number;
  liste: RawLista[];
}

export interface RawManjinaKandidat {
  rbr: number;
  naziv: string;
  glasova: number;
  mandata_stvarni: number;
}

export interface RawManjina {
  vrsta: string;
  manjina: string;
  mandata: number;
  biraci: number;
  glasovalo: number;
  vazeci: number;
  nevazeci: number;
  kandidati: RawManjinaKandidat[];
}

export interface RawCycle {
  slug: string;
  godina: number;
  label: string;
  jedinice: RawJedinica[];
  manjine: RawManjina[];
  ukupno: {
    biraci: number;
    glasovalo: number;
    vazeci: number;
    nevazeci: number;
    biraci_domaci: number;
    glasovalo_domaci: number;
    vazeci_domaci: number;
  };
}

// ── Rules ───────────────────────────────────────────────────────────────────

/** Seat-allocation formula. Only D'Hondt is law (ZIZHS čl. 40). */
export type Method = "dhondt" | "sainte-lague" | "hare-niemeyer";

/**
 * XI. izborna jedinica.
 * - `fiksno3`   — current law: 3 seats (Ustav čl. 45 st. 2)
 * - `model1999` — pre-2010: seats proportional to turnout (ZIZHS 1999 čl. 44)
 * - `bez`       — counterfactual: no diaspora representation
 */
export type DiasporaMode = "fiksno3" | "model1999" | "bez";

export interface Rules {
  /** ZIZHS čl. 41 — % of valid votes, per unit. Legal value 5.0. */
  prag: number;
  /** ZIZHS čl. 40 al. 2 — % of the list's votes in that unit. Legal value 10.0. */
  pragPreferencijala: number;
  /** ZIZHS čl. 38 — 14 by law, for units I–X. */
  mandataPoJedinici: number;
  dijaspora: DiasporaMode;
  /** Whether čl. 41 applies in XI. Textually yes; cross-reference deleted 2015. */
  pragUDijaspori: boolean;
  metoda: Method;
  /** Counterfactual: one national constituency instead of ten. */
  jedinstvenaJedinica: boolean;
  /** Counterfactual: national compensatory pool, 0 = off. */
  kompenzacijskiMandati: number;
  /** Include the 8 minority seats (ZIZHS čl. 17) in the totals. */
  ukljuciManjine: boolean;
}

/** Current law, exactly. `⟲ stvarni sustav` resets to this. */
export const ZAKONSKA_PRAVILA: Rules = {
  prag: 5.0,
  pragPreferencijala: 10.0,
  mandataPoJedinici: 14,
  dijaspora: "fiksno3",
  pragUDijaspori: true,
  metoda: "dhondt",
  jedinstvenaJedinica: false,
  kompenzacijskiMandati: 0,
  ukljuciManjine: true,
};

// ── Scenario (vote-side changes) ────────────────────────────────────────────

/**
 * How a swing is applied to a family's votes in every unit.
 * - `proporcionalno` — multiply each unit's votes by a factor (never negative,
 *   preserves regional structure). Default.
 * - `uniformno`      — add the same percentage-point delta in every unit.
 */
export type SwingMode = "proporcionalno" | "uniformno";

export interface Scenario {
  mode: SwingMode;
  /** obitelj -> percentage-point delta on national vote share. */
  swing: Record<string, number>;
  /** Override turnout %, or null to keep the real one. */
  odaziv: number | null;
}

export const NEUTRALNI_SCENARIJ: Scenario = {
  mode: "proporcionalno",
  swing: {},
  odaziv: null,
};

// ── Results ─────────────────────────────────────────────────────────────────

export interface SeatEntry {
  rbr: number;
  naziv: string;
  kratki: string;
  obitelj: string;
  glasova: number;
  /** % of valid votes in this unit. */
  posto: number;
  mandata: number;
  /** Did it clear the threshold in this unit? */
  prosla: boolean;
}

export interface UnitResult {
  code: string;
  label: string;
  mandata: number;
  biraci: number;
  glasovalo: number;
  vazeci: number;
  liste: SeatEntry[];
  /** Votes for lists below the threshold. */
  propaliIspodPraga: number;
  /** Votes for lists that won no seat (superset of the above). */
  propaliBezMandata: number;
}

export interface FamilyResult {
  obitelj: string;
  glasova: number;
  postoGlasova: number;
  mandata: number;
  postoMandata: number;
  /** % seats ÷ % votes. >1 over-represented. */
  amplifikacija: number;
  /** Seats under the real system, for the delta column. */
  stvarniMandati: number;
}

export interface Metrics {
  /** Gallagher least-squares index. >5 is high for a PR system. */
  gallagher: number;
  loosemoreHanby: number;
  enpGlasovi: number;
  enpMandati: number;
  /** Highest family amplification. */
  maxAmplifikacija: number;
  maxAmplifikacijaObitelj: string;
  /** Registered voters per seat, max ÷ min over units I–X. The legal test. */
  biracaPoMandatuOmjer: number;
  /** Valid votes per seat, max ÷ min. Driven by turnout, NOT by boundaries. */
  glasovaPoMandatuOmjer: number;
  /** Largest deviation from the mean voter count, in % (ZIJ čl. 14). */
  maxOdstupanjeOdProsjeka: number;
  propaliIspodPraga: number;
  propaliIspodPragaPosto: number;
  propaliBezMandata: number;
  propaliBezMandataPosto: number;
  ukupnoVazeci: number;
}

export interface MinorityResult {
  vrsta: string;
  manjina: string;
  mandata: number;
  izabrani: { naziv: string; glasova: number }[];
}

export interface SimResult {
  slug: string;
  jedinice: UnitResult[];
  obitelji: FamilyResult[];
  manjine: MinorityResult[];
  metrike: Metrics;
  /** Geographic seats actually allocated (140 + diaspora under current law). */
  geografskiMandati: number;
  manjinskiMandati: number;
  ukupnoMandata: number;
  /** Seats needed for a simple majority of the seats actually allocated. */
  vecina: number;
  /** Non-fatal notes the UI must surface (e.g. tie-break was exercised). */
  napomene: string[];
}
