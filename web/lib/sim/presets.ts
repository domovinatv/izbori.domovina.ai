/**
 * Preset scenarios.
 *
 * Every preset declares where its content comes from, and the UI shows that
 * badge next to the result. A construction is never presented as something
 * that happened, and a projection is never presented as a forecast.
 */

import { ZAKONSKA_PRAVILA, NEUTRALNI_SCENARIJ } from "./types";
import type { Rules, Scenario, Source } from "./types";

export interface Preset {
  id: string;
  naziv: string;
  /** One sentence: what the user is about to look at. */
  opis: string;
  oznaka: Source;
  rules: Partial<Rules>;
  scenario?: Partial<Scenario>;
  /** Which cycle this preset is written against, if it only makes sense there. */
  ciklus?: string;
  /** What to look at once it loads. */
  pogledaj?: string;
}

export const PRESETS: Preset[] = [
  {
    id: "zakon",
    naziv: "Stvarni sustav",
    opis: "Zakon kakav jest. Simulator reproducira službeni rezultat, mandat za mandat.",
    oznaka: "ZAKON",
    rules: {},
    pogledaj:
      "Gallagherov indeks 7,0 — za razmjeran sustav to je visoka nerazmjernost.",
  },
  {
    id: "prag-nula",
    naziv: "Bez izbornog praga",
    opis:
      "Isti glasovi, prag spušten na 0 %. Pokazuje koliko zakonski prag zapravo mijenja.",
    oznaka: "PODACI",
    rules: { prag: 0 },
    pogledaj:
      "Raspodjela mandata je identična. U jedinici s 14 mandata efektivni prag " +
      "je ~5,5–6,5 %, dakle već viši od zakonskih 5 % — ukidanje praga ne bi " +
      "promijenilo nijedan mandat.",
  },
  {
    id: "prag-deset",
    naziv: "Prag 10 %",
    opis: "Dvostruko viši prag — jedini smjer u kojem prag stvarno djeluje.",
    oznaka: "KONTRAFAKTUAL",
    rules: { prag: 10 },
    pogledaj:
      "Nerazmjernost skače sa 7,0 na 11,5; dvije velike liste uzimaju gotovo 80 % mandata.",
  },
  {
    id: "jedinstvena",
    naziv: "Jedna izborna jedinica",
    opis:
      "Cijela RH kao jedna jedinica sa 140 mandata, umjesto deset po 14. Liste se " +
      "spajaju po obitelji, jer bi u takvom sustavu svaka obitelj nastupila jednom.",
    oznaka: "KONTRAFAKTUAL",
    rules: { jedinstvenaJedinica: true },
    pogledaj:
      "Manje stranke dobivaju bliže svojem udjelu, ali propada znatno više glasova " +
      "jer prag od 5 % sada djeluje nacionalno.",
  },
  {
    id: "kompenzacijski",
    naziv: "Kompenzacijski mandati",
    opis:
      "Dvadeset dodatnih mandata koji se dodjeljuju korektivno — onima koji " +
      "zaostaju za svojim razmjernim udjelom.",
    oznaka: "KONTRAFAKTUAL",
    rules: { kompenzacijskiMandati: 20 },
    pogledaj: "Nerazmjernost pada sa 7,0 na ~5,2 bez ijedne druge promjene pravila.",
  },
  {
    id: "dijaspora-1999",
    naziv: "Dijaspora po modelu iz 1999.",
    opis:
      "Nefiksni broj dijasporskih mandata, razmjeran odazivu — model koji je " +
      "premijer u svibnju 2026. najavio kao moguć povratak.",
    oznaka: "KONTRAFAKTUAL",
    rules: { dijaspora: "model1999" },
    pogledaj:
      "Na brojkama iz 2024. daje tri mandata — praktički isto kao danas. " +
      "Model sam po sebi ne mijenja ništa; mijenja ga tek veći odaziv dijaspore.",
  },
  {
    id: "sainte-lague",
    naziv: "Sainte-Laguë umjesto D'Hondta",
    opis:
      "Djelitelji 1, 3, 5, 7… umjesto 1, 2, 3, 4. Formula koja sustavno manje " +
      "nagrađuje najveću listu.",
    oznaka: "KONTRAFAKTUAL",
    rules: { metoda: "sainte-lague" },
    pogledaj: "Usporedi stupac Δ — gdje točno najveća obitelj gubi mandate.",
  },
  {
    id: "fragmentacija",
    naziv: "Fragmentirana oporba",
    opis:
      "Hipoteza, ne prognoza: velika oporbena obitelj gubi 8 postotnih bodova, " +
      "koji se rasprše po manjim listama.",
    oznaka: "KONSTRUKCIJA",
    rules: {},
    scenario: { swing: { SDP: -8 } },
    ciklus: "parlament-2024",
    pogledaj:
      "Najveća stranka dobiva mandate iako joj glasovi nisu porasli — " +
      "raspodjela se seli, ne biračko tijelo.",
  },
];

export function applyPreset(p: Preset): { rules: Rules; scenario: Scenario } {
  return {
    rules: { ...ZAKONSKA_PRAVILA, ...p.rules },
    scenario: {
      ...NEUTRALNI_SCENARIJ,
      ...p.scenario,
      swing: { ...(p.scenario?.swing ?? {}) },
    },
  };
}

/**
 * The "1000 vs 999" construction from the original brief, kept as a worked
 * example rather than a simulator preset — it is not Croatian data and would
 * be misleading loaded into a cycle. Verified independently: 1.000 votes out
 * of 19.981 is 5,0048 %, the only list over 5 %, so it takes all 14 seats
 * while 95 % of the votes elect nobody.
 */
export const KONSTRUKCIJA_1000_999 = {
  naziv: "1000 naspram 999",
  oznaka: "KONSTRUKCIJA" as Source,
  pobjednik: 1000,
  ostali: 999,
  brojOstalih: 19,
  ukupno: 19981,
  udioPobjednika: 5.0048,
  mandata: 14,
  propaloPosto: 95.0,
  opis:
    "Dvadeset lista: jedna ima 1.000 glasova, devetnaest ih ima po 999. " +
    "Pobjednik ima 5,0048 % — jedini iznad praga — i uzima svih 14 mandata. " +
    "Preostalih 95 % glasova ne bira nikoga. Konstruiran primjer, nije se dogodio.",
};
