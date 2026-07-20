export interface Manifest {
  generated_at: string;
  cycles: CycleMeta[];
  has_preferencijali: boolean;
  has_trends: boolean;
}

export interface CycleMeta {
  slug: string;
  type: CycleType;
  godina: number;
  label: string;
  sections: string[];
  file: string;
}

export type CycleType =
  | "parlament"
  | "predsjednik"
  | "euparlament"
  | "lokalni"
  | "referendum"
  | "ostalo";

export interface RoundSummary {
  biraci_ukupno: number | null;
  glasovalo: number | null;
  odaziv_posto: number | null;
  vazeci: number | null;
  nevazeci: number | null;
  datum_objave: string | null;
}

export interface Lista {
  naziv: string;
  kratki: string;
  stranka: string;
  glasova: number | null;
  posto: number | null;
  mandata: number | null;
}

export interface Zupanija {
  code: string;
  naziv: string | null;
  odaziv_posto: number | null;
  pobjednik: string;
  pobjednik_stranka: string;
  pobjednik_posto: number | null;
  pobjednik_glasova: number | null;
  drugi: string | null;
  drugi_posto: number | null;
}

export interface Krug {
  summary: RoundSummary;
  liste: Lista[];
  zupanije?: Zupanija[];
}

export interface SaborSeats {
  opci_mandati: number;
  manjinski_mandati: number;
  ukupno: number;
  liste: { naziv: string; kratki: string; stranka: string; mandata: number }[];
  manjine: { naziv: string; manjina: string; glasova: number; mandata: number }[];
}

export interface Jedinica {
  code: string;
  label: string;
  odaziv_posto: number | null;
  mandati: { stranka: string; kratki: string; mandata: number; posto: number | null }[];
}

export interface Zupan {
  code: string;
  naziv: string | null;
  krug: number;
  odaziv_posto: number | null;
  pobjednik: string;
  stranke: string | null;
  pobjednik_posto: number | null;
  pobjednik_glasova: number | null;
}

export interface CycleData {
  slug: string;
  tip: CycleType;
  godina: number;
  label: string;
  krugovi?: Record<string, Krug>;
  sabor?: SaborSeats;
  jedinice?: Jedinica[];
  zupani?: Zupan[];
}

export interface Preferencijali {
  election: string;
  top: {
    naziv: string;
    glasova: number;
    posto_liste: number | null;
    ij: number;
    lista: string;
    stranka: string;
    u_saboru: number;
  }[];
  min_pref_u_saboru: { naziv: string; glasova: number; ij: number; lista: string } | null;
}

export interface FairnessJedinica {
  code: string;
  label: string;
  biraci: number;
  glasovalo: number | null;
  izlaznost: number | null;
  vazeci: number;
  mandata: number;
  biraca_po_mandatu: number | null;
  glasova_po_mandatu: number | null;
  pct_iskoristeni: number | null;
  pct_propali: number | null;
  pct_zastupljenih: number | null;
}

export interface KontraLista {
  naziv: string;
  kratki: string;
  stranka: string;
  glasova: number;
  posto: number;
  stvarno: number;
  jedinstvena: number;
  delta: number;
}

export interface FairnessKandidat {
  rang: number;
  naziv: string;
  rbr: number | null;
  dhondt: boolean;
  redni_br: number | null;
  u_saboru: number;
  /** Leading party of the LIST (heuristic) — NOT the person's membership. */
  stranka: string;
  ij: number;
  glasova: number | null;
  posto_liste: number | null;
  lista: string;
  /** Actual party of a seated MP per sabor.hr snapshot (namjestenici only). */
  sabor_stranka?: string | null;
  sabor_klub?: string | null;
}

export interface FairnessBrojkeRow {
  tip: "obitelj" | "manjine" | "propali";
  label: string;
  glasova: number;
  mandata: number;
  pct_biraci: number | null;
  pct_sabor: number | null;
}

export interface FairnessBrojke {
  denominatori: {
    biraci: number;
    sabor: number;
    geo_mandata: number;
    manjinski_mandata: number;
  };
  redovi: FairnessBrojkeRow[];
  ostatak: { glasova: number; pct_biraci: number | null };
}

export interface EkstremKandidat extends FairnessKandidat {
  pct_biraci: number | null;
  pct_izaslo: number | null;
  /** One seat's share of the Sabor (0 for the unseated). */
  pct_sabora: number;
  /** Sabor share ÷ share of the turnout / electorate (seated only). */
  vlast_izaslo?: number | null;
  vlast_biraci?: number | null;
}

export interface EkstremPar {
  gubitnik: EkstremKandidat;
  dobitnik: EkstremKandidat;
  faktor: number;
}

export interface EkstremTotals {
  n: number;
  glasova: number;
  pct_biraci: number | null;
  pct_izaslo: number | null;
  mandata: number;
  pct_sabora?: number | null;
  vlast_izaslo?: number | null;
  vlast_biraci?: number | null;
}

export interface FairnessEkstremi {
  denominatori: {
    biraci: number;
    izaslo: number;
    sabor: number;
    geo_u_sazivu: number;
    pct_sabora_mandat: number | null;
  };
  parovi: EkstremPar[];
  prag: {
    parova: number;
    gubitnik_min: number | null;
    dobitnik_max: number | null;
    crossover: {
      gubitnik: { naziv: string; glasova: number };
      dobitnik: { naziv: string; glasova: number };
    } | null;
  };
  gubitnici_ukupno: EkstremTotals;
  dobitnici_ukupno: EkstremTotals;
  omjer_ukupno: number | null;
  max_ekstrem: {
    naziv: string;
    glasova: number;
    pct_biraci: number | null;
    pct_izaslo: number | null;
    pct_sabora_mandata: number | null;
    vlast_faktor: number | null;
    vlast_izaslo_faktor: number | null;
  } | null;
}

export interface Fairness {
  election: string;
  propali_rh: {
    ukupno: number;
    iskoristeni: number;
    propali: number;
    pct_iskoristeni: number | null;
    pct_propali: number | null;
  };
  disparitet: {
    jedinice: FairnessJedinica[];
    min: { label: string; glasova_po_mandatu: number };
    max: { label: string; glasova_po_mandatu: number };
    omjer: number;
    nacionalno: {
      biraci: number;
      vazeci: number;
      iskoristeni: number;
      propali: number;
      pct_zastupljenih: number | null;
      pct_propali: number | null;
    };
  };
  kontrafaktual: {
    liste: KontraLista[];
    gubitnici: KontraLista[];
    dobitnici: KontraLista[];
    propalo_jedinstvena: number;
    pct_propalo_jedinstvena: number | null;
  };
  obitelji: {
    stranka: string;
    partneri: string;
    broj_lista: number;
    glasova: number;
    pct: number;
    stvarno: number;
    jedinstvena: number;
  }[];
  brojke: FairnessBrojke;
  gubitnici: FairnessKandidat[];
  odbili: { ukupno: number; od: number; kandidati: FairnessKandidat[] };
  namjestenici: FairnessKandidat[];
  ekstremi: FairnessEkstremi;
  sabor_po_pref: {
    preklapanje: number;
    novi: number;
    gube: number;
    rollup: { stranka: string; po_pref: number; stvarno: number; delta: number }[];
  };
}

export interface GropUtrka {
  vrsta: string;
  krug: number;
  biraci: number | null;
  glasovalo: number | null;
  odaziv_posto: number | null;
  nevazeci: number | null;
  liste: Lista[];
}

export interface GropEntry {
  code: string;
  naziv: string | null;
  utrke: GropUtrka[];
}

export interface GropFile {
  slug: string;
  p1: string;
  naziv: string;
  gropovi: GropEntry[];
}

export interface GropIndex {
  slug: string;
  jedinice: { code: string; naziv: string }[];
}

export interface Trends {
  odaziv: {
    slug: string;
    label: string;
    godina: number;
    tip: string;
    odaziv_posto: number;
    glasovalo: number | null;
  }[];
  stranke: Record<string, { stranka: string; po_ciklusu: Record<string, number> }[]>;
}
