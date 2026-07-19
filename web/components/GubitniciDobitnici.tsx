"use client";

import { useState } from "react";
import type { FairnessKandidat } from "@/lib/types";
import { partyColor } from "@/lib/palette";
import { fmtInt, fmtPct } from "@/lib/format";

/**
 * Side-by-side: candidates with the MOST preferential votes who got neither a
 * mandate nor a Sabor seat, vs seated MPs with the FEWEST preferential votes.
 * Both columns share ONE vote scale — the asymmetry (thousands vs hundreds)
 * is the story. Data precomputed in scripts/export_web.py (fairness.json).
 *
 * The colored dot is the LEADING PARTY OF THE LIST (a label of the list, not
 * the person's membership — the DIP archive has no per-person membership).
 * For seated MPs the actual party comes from the sabor.hr seating snapshot.
 */

const SHOWN = 10;

function KandidatRow({
  k,
  max,
  side,
}: {
  k: FairnessKandidat;
  max: number;
  side: "gubitnik" | "dobitnik";
}) {
  const [hover, setHover] = useState(false);
  const w = Math.max(0.6, ((k.glasova ?? 0) / max) * 70);
  const color = side === "gubitnik" ? "#B42318" : "#2E8540";
  return (
    <li onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div className="mb-0.5 flex items-baseline justify-between gap-2">
        <span className="min-w-0 truncate text-sm font-medium text-ink">
          {k.naziv}
          <span className="ml-1.5 text-xs font-normal text-muted">IJ {k.ij}.</span>
        </span>
        {side === "dobitnik" ? (
          <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-[10px] font-semibold tracking-wide text-muted uppercase">
            {k.dhondt ? "D'Hondt mandat" : "Zamjenik"}
          </span>
        ) : null}
      </div>
      <div className="relative h-[13px] w-full overflow-hidden rounded-[4px] bg-line/40">
        <div
          className="absolute inset-y-0 left-0 rounded-r-[4px]"
          style={{
            width: `${w}%`,
            background: color,
            filter: hover ? "brightness(1.1)" : undefined,
          }}
        />
        <span
          className="tabular absolute top-1/2 -translate-y-1/2 text-[11px] leading-none text-ink"
          style={{ left: `calc(${w}% + 6px)` }}
        >
          {fmtInt(k.glasova)}
        </span>
      </div>
      <p className="mt-0.5 truncate text-xs text-muted">
        <span
          aria-hidden="true"
          className="mr-1 inline-block h-2 w-2 rounded-full align-baseline"
          style={{ background: partyColor(k.stranka) }}
        />
        lista: {k.lista}
        {side === "dobitnik" && k.sabor_stranka ? (
          <span className="text-ink"> · stranka: {k.sabor_stranka}</span>
        ) : null}
        {hover ? ` · ${fmtPct(k.posto_liste, 1)} liste` : ""}
      </p>
    </li>
  );
}

export function GubitniciDobitnici({
  gubitnici,
  namjestenici,
}: {
  gubitnici: FairnessKandidat[];
  namjestenici: FairnessKandidat[];
}) {
  const levi = gubitnici.slice(0, SHOWN);
  const desni = namjestenici.slice(0, SHOWN);
  // One shared scale across both columns — the point of the comparison.
  const max = Math.max(
    ...levi.map((k) => k.glasova ?? 0),
    ...desni.map((k) => k.glasova ?? 0),
    1,
  );

  return (
    <div className="rounded-lg border border-line bg-white p-5 md:p-6">
      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <h3 className="mb-1 font-semibold text-[#B42318]">
            Najviše preferencijalnih glasova — bez mjesta u Saboru
          </h3>
          <p className="mb-4 text-xs text-muted">
            Bez D&apos;Hondtova mandata i bez mjesta u aktualnom sazivu; najčešće
            jer lista nije prešla 5 % u izbornoj jedinici ili je mandat liste
            pripao kandidatu s još više preferencijala.
          </p>
          <ul className="space-y-3" role="list">
            {levi.map((k) => (
              <KandidatRow key={k.naziv + k.ij} k={k} max={max} side="gubitnik" />
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-1 font-semibold text-[#2E8540]">
            Najmanje preferencijalnih glasova — sjede u Saboru
          </h3>
          <p className="mb-4 text-xs text-muted">
            Ušli pozicijom na listi (D&apos;Hondt mandat) ili kao zamjenici
            zastupnika u mirovanju — ne izravnom potporom birača. Stupci dijele
            istu skalu s lijevim prikazom.
          </p>
          <ul className="space-y-3" role="list">
            {desni.map((k) => (
              <KandidatRow key={k.naziv + k.ij} k={k} max={max} side="dobitnik" />
            ))}
          </ul>
        </div>
      </div>
      <p className="mt-5 max-w-4xl text-xs leading-relaxed text-muted">
        Obojena točka označava vodeću stranku koalicijske liste, ne stranačku
        pripadnost kandidata (DIP arhiva ne bilježi članstvo pojedinca).
        „Stranka" uz zastupnike u Saboru dolazi iz interaktivne sabornice
        sabor.hr (aktualni saziv). Manjinski zastupnici biraju se na posebnim
        listama bez preferencijalnog glasovanja pa nisu dio ove usporedbe.
        Prikazano prvih {SHOWN}; potpune tablice su u analizi pravednosti niže
        na stranici.
      </p>
    </div>
  );
}
