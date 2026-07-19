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
