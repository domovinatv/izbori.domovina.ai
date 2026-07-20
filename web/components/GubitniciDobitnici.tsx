"use client";

import { useState } from "react";
import type { EkstremKandidat, EkstremPar, FairnessEkstremi } from "@/lib/types";
import { partyColor } from "@/lib/palette";
import { fmtInt, fmtPct } from "@/lib/format";

/**
 * Full loser↔winner pairing, down to the mathematical breakeven: the i-th
 * best candidate WITHOUT a seat is paired with the i-th weakest seated MP,
 * for as long as the unseated one has strictly more preferential votes.
 * Every pair carries its vote ratio; the pair count itself is the objective
 * size of the distortion. All numbers precomputed in scripts/export_web.py
 * (fairness.json → ekstremi); this component only lays them out.
 *
 * Tornado layout: left bars grow right-to-left, right bars left-to-right,
 * factor between — rows align by construction. One shared vote scale.
 * The colored dot is the LEADING PARTY OF THE LIST (not the person's
 * membership); actual party of seated MPs comes from sabor.hr.
 */

const RED = "#B42318";
const GREEN = "#2E8540";

function StatTile({
  label,
  value,
  sub,
  tone = "navy",
}: {
  label: string;
  value: string;
  sub: React.ReactNode;
  tone?: "navy" | "red" | "green";
}) {
  const color =
    tone === "red" ? "text-[#B42318]" : tone === "green" ? "text-[#2E8540]" : "text-navy";
  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <p className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">{label}</p>
      <p className={`tabular mt-1.5 font-serif text-2xl font-bold ${color}`}>{value}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted">{sub}</p>
    </div>
  );
}

function PairSide({
  k,
  max,
  side,
  hover,
}: {
  k: EkstremKandidat;
  max: number;
  side: "gubitnik" | "dobitnik";
  hover: boolean;
}) {
  const left = side === "gubitnik";
  const w = Math.max(1, ((k.glasova ?? 0) / max) * 100);
  const align = left ? "text-right" : "text-left";
  return (
    <div className={`min-w-0 ${align}`}>
      <p className="truncate text-[13px] leading-tight font-medium text-ink sm:text-sm">
        {k.naziv} <span className="text-xs font-normal text-muted">IJ {k.ij}</span>
      </p>
      <div
        className={`relative mt-0.5 h-[11px] overflow-hidden rounded-[4px] bg-line/40`}
      >
        <div
          className={`absolute inset-y-0 ${left ? "right-0 rounded-l-[4px]" : "left-0 rounded-r-[4px]"}`}
          style={{
            width: `${w}%`,
            background: left ? RED : GREEN,
            filter: hover ? "brightness(1.1)" : undefined,
          }}
        />
      </div>
      <p className="tabular mt-0.5 truncate text-[11px] text-muted">
        <span className="font-semibold text-ink">{fmtInt(k.glasova)}</span>{" "}
        glasova · {fmtPct(k.pct_izaslo, 3)} izašlih · {fmtPct(k.pct_biraci, 3)}{" "}
        upisanih
      </p>
      <p className="truncate text-[11px] text-muted">
        <span
          aria-hidden="true"
          className="mr-1 inline-block h-2 w-2 rounded-full align-baseline"
          style={{ background: partyColor(k.stranka) }}
        />
        {left ? (
          <>
            lista: {k.lista} → <span className="font-semibold text-[#B42318]">0 % Sabora</span>
          </>
        ) : (
          <>
            {k.sabor_stranka ? <span className="text-ink">{k.sabor_stranka}</span> : k.lista}
            {" · "}
            {k.dhondt ? "D'Hondt mandat" : "zamjenik"} →{" "}
            <span
              className="tabular font-semibold text-[#2E8540]"
              title={`1 mandat = ${fmtPct(k.pct_sabora, 2)} Sabora; podijeljeno s udjelom osobe među izašlima odnosno svim upisanim biračima`}
            >
              {fmtPct(k.pct_sabora, 2)} Sabora = vlast ×{fmtInt(k.vlast_izaslo)} /
              ×{fmtInt(k.vlast_biraci)}
            </span>
          </>
        )}
      </p>
    </div>
  );
}

function PairRow({ p, max }: { p: EkstremPar; max: number }) {
  const [hover, setHover] = useState(false);
  return (
    <li
      className="grid grid-cols-[1fr_52px_1fr] items-center gap-2 border-b border-line/60 py-2.5 sm:gap-3"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <PairSide k={p.gubitnik} max={max} side="gubitnik" hover={hover} />
      <div className="text-center">
        <span
          className="tabular inline-block rounded-full border border-line bg-surface px-1.5 py-0.5 text-[11px] font-bold text-navy"
          title="koliko puta više glasova ima neizabrani nego izabrani u paru"
        >
          ×
          {p.faktor.toLocaleString("hr-HR", {
            minimumFractionDigits: p.faktor < 2 ? 2 : 0,
            maximumFractionDigits: p.faktor < 2 ? 2 : p.faktor < 10 ? 1 : 0,
          })}
        </span>
      </div>
      <PairSide k={p.dobitnik} max={max} side="dobitnik" hover={hover} />
    </li>
  );
}

export function GubitniciDobitnici({ ekstremi }: { ekstremi: FairnessEkstremi }) {
  const { parovi, prag, gubitnici_ukupno: gub, dobitnici_ukupno: dob } = ekstremi;
  const max = Math.max(
    ...parovi.map((p) => Math.max(p.gubitnik.glasova ?? 0, p.dobitnik.glasova ?? 0)),
    1,
  );
  const me = ekstremi.max_ekstrem;

  return (
    <div>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label={`${gub.n} gubitnika ukupno`}
          value={`${fmtInt(gub.glasova)} glasova`}
          tone="red"
          sub={
            <>
              {fmtPct(gub.pct_izaslo, 2)} izašlih birača ({fmtPct(gub.pct_biraci, 2)}{" "}
              biračkog tijela) →{" "}
              <strong className="text-[#B42318]">0 mandata = 0 % Sabora</strong> —
              vlast ×0
            </>
          }
        />
        <StatTile
          label={`${dob.n} dobitnika ukupno`}
          value={`${fmtInt(dob.glasova)} glasova`}
          tone="green"
          sub={
            <>
              {fmtPct(dob.pct_izaslo, 2)} izašlih birača ({fmtPct(dob.pct_biraci, 2)}{" "}
              biračkog tijela) →{" "}
              <strong className="text-[#2E8540]">
                {dob.mandata} mandata = {fmtPct(dob.pct_sabora, 1)} Sabora
              </strong>{" "}
              — vlast ×{(dob.vlast_izaslo ?? 0).toLocaleString("hr-HR")} naspram
              izašlih, ×{(dob.vlast_biraci ?? 0).toLocaleString("hr-HR")} naspram
              svih upisanih
            </>
          }
        />
        <StatTile
          label="Ukupni omjer"
          value={`×${(ekstremi.omjer_ukupno ?? 0).toLocaleString("hr-HR")}`}
          sub={
            <>
              gubitnici su skupili {(ekstremi.omjer_ukupno ?? 0).toLocaleString("hr-HR")}×
              više preferencijalnih glasova od dobitnika — a nemaju nijedan od{" "}
              {ekstremi.denominatori.sabor} mandata
            </>
          }
        />
        {me ? (
          <StatTile
            label="Najveći ekstrem"
            value={`×${(me.vlast_faktor ?? 0).toLocaleString("hr-HR")}`}
            sub={
              <>
                {me.naziv}: {fmtInt(me.glasova)} glasova ={" "}
                {fmtPct(me.pct_izaslo, 3)} izašlih ({fmtPct(me.pct_biraci, 3)}{" "}
                biračkog tijela), a drži 1 od {ekstremi.denominatori.sabor}{" "}
                mandata = {fmtPct(me.pct_sabora_mandata, 2)} Sabora —{" "}
                <strong>
                  ×{(me.vlast_izaslo_faktor ?? 0).toLocaleString("hr-HR")} veći
                  udio vlasti nego udio među izašlima, ×
                  {(me.vlast_faktor ?? 0).toLocaleString("hr-HR")} naspram svih
                  upisanih
                </strong>{" "}
                — četiri godine
              </>
            }
          />
        ) : null}
      </div>

      <div className="rounded-lg border border-line bg-white p-5 md:p-6">
        <div className="mb-1 grid grid-cols-[1fr_52px_1fr] items-end gap-2 sm:gap-3">
          <h3 className="text-right text-sm font-semibold text-[#B42318] sm:text-base">
            Bez mjesta u Saboru
          </h3>
          <span className="text-center text-[11px] font-semibold text-muted">omjer</span>
          <h3 className="text-sm font-semibold text-[#2E8540] sm:text-base">
            Sjede u Saboru
          </h3>
        </div>
        <p className="mb-3 text-center text-xs text-muted">
          {prag.parova} parova do matematičkog preloma — u svakom paru neizabrani
          ima više preferencijalnih glasova od izabranog. Sve pruge dijele istu
          skalu.
        </p>
        <ol className="list-none">
          {parovi.map((p) => (
            <PairRow key={p.gubitnik.naziv + p.gubitnik.ij} p={p} max={max} />
          ))}
        </ol>
        <p className="tabular mt-3 rounded-md border border-line bg-surface p-3 text-center text-xs text-muted">
          <strong className="text-navy">Prelom nakon {prag.parova}. para:</strong>{" "}
          zadnji vrijedeći par je {fmtInt(prag.gubitnik_min)} &gt;{" "}
          {fmtInt(prag.dobitnik_max)} glasova
          {prag.crossover ? (
            <>
              ; sljedeći bi bio {prag.crossover.gubitnik.naziv} (
              {fmtInt(prag.crossover.gubitnik.glasova)}) protiv{" "}
              {prag.crossover.dobitnik.naziv} (
              {fmtInt(prag.crossover.dobitnik.glasova)}) — tu neizabrani prvi put
              ima manje glasova, pa usporedba staje.
            </>
          ) : (
            "."
          )}
        </p>

        <details className="mt-4 text-sm">
          <summary className="cursor-pointer text-muted hover:text-navy">
            Tablica: svi parovi s listama, udjelima i statusom
          </summary>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[1080px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-line text-xs text-muted uppercase">
                  <th className="py-1.5 pr-2 text-right font-semibold">#</th>
                  <th className="py-1.5 pr-2 font-semibold">Bez Sabora</th>
                  <th className="py-1.5 pr-2 text-right font-semibold">Glasova</th>
                  <th className="py-1.5 pr-2 text-right font-semibold">% izašlih</th>
                  <th className="py-1.5 pr-2 text-right font-semibold">% upisanih</th>
                  <th className="py-1.5 pr-2 text-center font-semibold">Omjer</th>
                  <th className="py-1.5 pr-2 font-semibold">U Saboru</th>
                  <th className="py-1.5 pr-2 text-right font-semibold">Glasova</th>
                  <th className="py-1.5 pr-2 text-right font-semibold">% izašlih</th>
                  <th className="py-1.5 pr-2 text-right font-semibold">% upisanih</th>
                  <th className="py-1.5 pr-2 text-right font-semibold">Vlast ×izašli/×upisani</th>
                  <th className="py-1.5 font-semibold">Stranka (sabor.hr) · status</th>
                </tr>
              </thead>
              <tbody>
                {parovi.map((p, i) => (
                  <tr key={p.gubitnik.naziv + p.gubitnik.ij} className="border-b border-line/60">
                    <td className="tabular py-1.5 pr-2 text-right text-muted">{i + 1}</td>
                    <td className="py-1.5 pr-2">
                      {p.gubitnik.naziv}{" "}
                      <span className="text-xs text-muted">
                        IJ {p.gubitnik.ij} · {p.gubitnik.lista}
                      </span>
                    </td>
                    <td className="tabular py-1.5 pr-2 text-right">{fmtInt(p.gubitnik.glasova)}</td>
                    <td className="tabular py-1.5 pr-2 text-right">{fmtPct(p.gubitnik.pct_izaslo, 3)}</td>
                    <td className="tabular py-1.5 pr-2 text-right">{fmtPct(p.gubitnik.pct_biraci, 3)}</td>
                    <td className="tabular py-1.5 pr-2 text-center font-semibold text-navy">
                      ×{p.faktor.toLocaleString("hr-HR")}
                    </td>
                    <td className="py-1.5 pr-2">
                      {p.dobitnik.naziv}{" "}
                      <span className="text-xs text-muted">
                        IJ {p.dobitnik.ij} · {p.dobitnik.lista}
                      </span>
                    </td>
                    <td className="tabular py-1.5 pr-2 text-right">{fmtInt(p.dobitnik.glasova)}</td>
                    <td className="tabular py-1.5 pr-2 text-right">{fmtPct(p.dobitnik.pct_izaslo, 3)}</td>
                    <td className="tabular py-1.5 pr-2 text-right">{fmtPct(p.dobitnik.pct_biraci, 3)}</td>
                    <td className="tabular py-1.5 pr-2 text-right font-semibold text-[#2E8540]">
                      ×{fmtInt(p.dobitnik.vlast_izaslo)} / ×{fmtInt(p.dobitnik.vlast_biraci)}
                    </td>
                    <td className="py-1.5">
                      {p.dobitnik.sabor_stranka ?? "—"} ·{" "}
                      {p.dobitnik.dhondt ? "D'Hondt" : "zamjenik"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>

        <p className="mt-4 max-w-4xl text-xs leading-relaxed text-muted">
          Denominatori: {fmtInt(ekstremi.denominatori.biraci)} upisanih birača
          (IJ I.–XI.), {fmtInt(ekstremi.denominatori.izaslo)} izašlo na izbore.
          „Vlast" = udio jednog mandata u Saboru (
          {fmtPct(ekstremi.denominatori.pct_sabora_mandat, 2)}) podijeljen s
          udjelom osobe među izašlim biračima odnosno svim upisanima — koliko
          je puta glas te osobe „teži" od prosječnog birača kojeg predstavlja.
          „Bez mjesta u Saboru" = bez D&apos;Hondtova mandata i bez mjesta u
          aktualnom sazivu (kandidati koji su mandat osvojili pa odbili — npr.
          ministri — nisu gubitnici i nisu u usporedbi). „Sjede u Saboru" ={" "}
          {ekstremi.denominatori.geo_u_sazivu} zastupnika iz geografskih IJ u
          aktualnom sazivu prema snimci sabornice sabor.hr; njihova stranka
          dolazi iz te snimke, a obojena točka označava vodeću stranku
          koalicijske liste (DIP ne bilježi članstvo pojedinca). Manjinski
          zastupnici biraju se bez preferencijalnog glasovanja pa nisu dio
          usporedbe.
        </p>
      </div>
    </div>
  );
}
