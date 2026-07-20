const nf = new Intl.NumberFormat("hr-HR");
const nf1 = new Intl.NumberFormat("hr-HR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const nf2 = new Intl.NumberFormat("hr-HR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const nf3 = new Intl.NumberFormat("hr-HR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 3,
});

export function fmtInt(n: number | null | undefined): string {
  return n == null ? "–" : nf.format(n);
}

export function fmtPct(n: number | null | undefined, digits: 1 | 2 | 3 = 1): string {
  if (n == null) return "–";
  const f = digits === 1 ? nf1 : digits === 2 ? nf2 : nf3;
  return `${f.format(n)} %`;
}

/** "29.04.2024." → "29. 4. 2024." (already Croatian-ish; keep as-is). */
export function fmtDatum(d: string | null | undefined): string {
  return d ? d.replace(/\.$/, "") + "." : "";
}

export const TYPE_LABELS: Record<string, string> = {
  parlament: "Parlamentarni",
  predsjednik: "Predsjednički",
  euparlament: "Europski parlament",
  lokalni: "Lokalni",
  referendum: "Referendum",
};
