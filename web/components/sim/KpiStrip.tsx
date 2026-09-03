"use client";

import { fmtDec, fmtInt, fmtPct } from "@/lib/format";
import type { SimResult } from "@/lib/sim/types";
import { SourceBadge } from "./ui";

/**
 * Headline metrics.
 *
 * The alarm thresholds here are OUR editorial choice, not legal criteria, and
 * they are calibrated on the observed Croatian range rather than on round
 * numbers: real amplification tops out at 1,24x, so an alarm set at 1,8x would
 * never fire on real data. Each tile says which denominator it uses, because
 * several defensible ones exist (docs §9).
 */

type Ton = "neutral" | "pazi" | "alarm";

const TON: Record<Ton, { fg: string; bg: string }> = {
  neutral: { fg: "#002F6C", bg: "#FFFFFF" },
  pazi: { fg: "#8A5A0B", bg: "#FEFAF3" },
  alarm: { fg: "#B42318", bg: "#FDF4F3" },
};

function Tile({
  label,
  value,
  sub,
  ton = "neutral",
  title,
}: {
  label: string;
  value: string;
  sub: string;
  ton?: Ton;
  title?: string;
}) {
  const t = TON[ton];
  return (
    <div
      className="flex min-w-0 flex-1 flex-col justify-center rounded-md border border-line px-3 py-2"
      style={{ background: t.bg }}
      title={title}
    >
      <p className="truncate text-[9px] font-bold tracking-[0.12em] text-muted uppercase">
        {label}
      </p>
      <p
        className="tabular font-serif text-[22px] leading-tight font-bold"
        style={{ color: t.fg }}
      >
        {value}
      </p>
      <p className="truncate text-[10px] leading-tight text-muted">{sub}</p>
    </div>
  );
}

export function KpiStrip({ res }: { res: SimResult }) {
  const m = res.metrike;

  // Gallagher bands are the conventional reading of the index, not a Croatian
  // legal standard: <2 very proportional, 2-5 moderate, >5 high.
  const lsqTon: Ton = m.gallagher > 10 ? "alarm" : m.gallagher > 5 ? "pazi" : "neutral";

  return (
    <div className="flex shrink-0 gap-2">
      <Tile
        label="Gallagher (LSq)"
        value={fmtDec(m.gallagher, 2)}
        sub={
          m.gallagher > 5
            ? "visoka nerazmjernost (>5)"
            : m.gallagher > 2
              ? "umjerena (2–5)"
              : "vrlo razmjerno (<2)"
        }
        ton={lsqTon}
        title="Korijen iz polovice zbroja kvadrata razlika (% glasova − % mandata). Uobičajeno čitanje: <2 vrlo razmjerno, 2–5 umjereno, >5 visoko."
      />
      <Tile
        label="Glasovi bez mandata"
        value={fmtPct(m.propaliBezMandataPosto, 1)}
        sub={`${fmtInt(m.propaliBezMandata)} glasova nikoga ne bira`}
        ton={m.propaliBezMandataPosto > 15 ? "alarm" : m.propaliBezMandataPosto > 10 ? "pazi" : "neutral"}
        title="Glasovi za liste koje u svojoj jedinici nisu osvojile nijedan mandat. Šira i stroža definicija od „ispod praga”."
      />
      <Tile
        label="Ispod praga"
        value={fmtPct(m.propaliIspodPragaPosto, 1)}
        sub={`${fmtInt(m.propaliIspodPraga)} glasova ispod praga`}
        title="Glasovi za liste ispod izbornog praga u svojoj jedinici. Podskup gornjeg broja."
      />
      <Tile
        label="Najveća amplifikacija"
        value={`${fmtDec(m.maxAmplifikacija, 2)}×`}
        sub={m.maxAmplifikacijaObitelj}
        ton={m.maxAmplifikacija > 1.5 ? "alarm" : m.maxAmplifikacija > 1.3 ? "pazi" : "neutral"}
        title="% mandata ÷ % glasova za najnagrađeniju obitelj. Stvarni maksimum u RH 2020./2024. je 1,24×."
      />
      <Tile
        label="Birača po mandatu"
        value={`${fmtDec(m.biracaPoMandatuOmjer, 3)}×`}
        sub={`odstupanje do ${fmtDec(m.maxOdstupanjeOdProsjeka, 2)} % · zakonski test`}
        ton={m.maxOdstupanjeOdProsjeka > 5 ? "alarm" : m.maxOdstupanjeOdProsjeka > 4 ? "pazi" : "neutral"}
        title="Omjer najskuplje i najjeftinije jedinice po UPISANIM biračima. Ovo je zakonski test neujednačenosti (ZIZHS čl. 39, ZIJ čl. 14: ±5 % od prosjeka)."
      />
      <Tile
        label="Glasova po mandatu"
        value={`${fmtDec(m.glasovaPoMandatuOmjer, 3)}×`}
        sub="razlika u odazivu, ne u granicama"
        title="Omjer najskuplje i najjeftinije jedinice po VAŽEĆIM glasovima. Razlika prema gornjem broju dolazi iz odaziva, a ne iz granica jedinica — zato ovo nije mjera gerrymanderinga."
      />
      <div className="flex flex-col justify-center gap-1 rounded-md border border-line bg-white px-3 py-2">
        <p className="text-[9px] font-bold tracking-[0.12em] text-muted uppercase">
          Mandata
        </p>
        <p className="tabular font-serif text-[22px] leading-tight font-bold text-navy">
          {res.ukupnoMandata}
        </p>
        <p className="text-[10px] leading-tight text-muted">
          {res.geografskiMandati} + {res.manjinskiMandati} manjinskih · većina{" "}
          {res.vecina}
        </p>
      </div>
      <div className="flex flex-col justify-center rounded-md border border-line bg-white px-2 py-2">
        <SourceBadge source="PODACI" />
      </div>
    </div>
  );
}
