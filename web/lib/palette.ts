/**
 * Data-viz palette, validated with domovina-stats dataviz validator
 * (scripts/validate_palette.js) on 2026-07-20, light mode, surface #FFFFFF:
 *   PASS lightness band, chroma floor, normal-vision floor (worst 20.0);
 *   CVD worst adjacent ΔE 7.0 (6–8 band → mitigated with 2px surface gaps
 *   between marks + direct labels); contrast WARN on #58a854/#eda100 →
 *   mitigated with visible labels and table views next to every chart.
 * Categorical color follows the ENTITY (party), never rank; fixed order.
 */
export const PARTY_COLORS: Record<string, string> = {
  HDZ: "#2a78d6",
  SDP: "#cc2936",
  DP: "#2d4da3",
  MOST: "#0d94ad",
  "MOŽEMO!": "#008300",
  MANJINE: "#d55181",
  IDS: "#58a854",
  NPS: "#4a3aa7",
  FOKUS: "#eda100",
};

export const OTHER_COLOR = "#8b95a5"; // "Ostali" — deliberately recessive gray

/** Resolve a party label (leading party of a list) to its entity color. */
const PARTY_ALIASES: Record<string, string> = {
  "DOMOVINSKI POKRET": "DP",
  MOŽEMO: "MOŽEMO!",
};

export function partyColor(stranka: string): string {
  if (!stranka) return OTHER_COLOR;
  let key = stranka.toUpperCase();
  for (const [alias, canonical] of Object.entries(PARTY_ALIASES)) {
    if (key.startsWith(alias)) key = canonical;
  }
  for (const [name, color] of Object.entries(PARTY_COLORS)) {
    if (key === name || key.startsWith(name)) return color;
  }
  return OTHER_COLOR;
}

/**
 * Sequential ramp for magnitude (turnout choropleth): single hue derived from
 * brand navy #002F6C, light→dark, lightness-monotone.
 */
export const SEQ_NAVY = [
  "#dce5f1",
  "#b9c9e2",
  "#93aed3",
  "#6d92c3",
  "#4677b2",
  "#245b97",
  "#0d4478",
  "#002F6C",
];

export function seqColor(value: number, min: number, max: number): string {
  if (!isFinite(value) || max <= min) return SEQ_NAVY[0];
  const t = (value - min) / (max - min);
  const i = Math.min(SEQ_NAVY.length - 1, Math.max(0, Math.floor(t * SEQ_NAVY.length)));
  return SEQ_NAVY[i];
}

/** Diverging pair for referendum ZA/PROTIV (blue ↔ red, gray midpoint). */
export const DIVERGING = { za: "#2a78d6", protiv: "#cc2936", mid: "#f0efec" };

/** Presidential 2024 candidate colors (entity-bound, backed-by convention). */
export const CANDIDATE_COLORS: Record<string, string> = {
  "ZORAN MILANOVIĆ": "#cc2936",
  "DRAGAN PRIMORAC": "#2a78d6",
  "MARIJA SELAK RASPUDIĆ": "#4a3aa7",
  "IVANA KEKIN": "#008300",
  "MIRO BULJ": "#0d94ad",
  "KOLINDA GRABAR-KITAROVIĆ": "#2a78d6",
  "MIROSLAV ŠKORO": "#eda100",
  "MISLAV KOLAKUŠIĆ": "#4a3aa7",
};

export function candidateColor(name: string, fallbackIndex = 0): string {
  const c = CANDIDATE_COLORS[name.toUpperCase()];
  if (c) return c;
  return OTHER_COLOR ?? String(fallbackIndex);
}

/** Chart chrome (light content sections). */
export const CHROME = {
  grid: "#E1E5EA",
  axis: "#c6cdd6",
  inkPrimary: "#0f2136",
  inkSecondary: "#5A6570",
  surface: "#FFFFFF",
};
