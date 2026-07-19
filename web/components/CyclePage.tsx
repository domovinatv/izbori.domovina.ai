import { notFound } from "next/navigation";
import {
  getCycle,
  getPreferencijali,
  getTrends,
} from "@/lib/data";
import type { CycleData, Manifest, Zupanija } from "@/lib/types";
import { fmtDatum, fmtInt, TYPE_LABELS } from "@/lib/format";
import { Hero, type HeroStat } from "./Hero";
import { Section } from "./Section";
import { SiteFooter } from "./SiteFooter";
import { BarResults } from "./charts/BarResults";
import { SeatArc } from "./charts/SeatArc";
import { MapSection } from "./charts/MapSection";
import { TurnoutTrend } from "./charts/TurnoutTrend";
import { PartyTrends } from "./charts/PartyTrends";
import { Preferencijali } from "./Preferencijali";
import { Jedinice } from "./Jedinice";

function heroStats(c: CycleData): HeroStat[] {
  const stats: HeroStat[] = [];
  const k1 = c.krugovi?.["1"];
  const lastKrug = c.krugovi
    ? c.krugovi[String(Math.max(...Object.keys(c.krugovi).map(Number)))]
    : undefined;

  if (c.tip === "parlament" && c.sabor && k1) {
    const najveca = c.sabor.liste.reduce((a, b) => (b.mandata > a.mandata ? b : a));
    stats.push(
      { label: "Odaziv", value: k1.summary.odaziv_posto ?? 0, decimals: 2, suffix: " %" },
      { label: "Glasovalo birača", value: k1.summary.glasovalo ?? 0 },
      { label: "Zastupnika u Saboru", value: c.sabor.ukupno },
      {
        label: "Najviše mandata",
        value: najveca.mandata,
        sub: najveca.kratki,
      },
    );
  } else if (c.tip === "lokalni" && c.zupani) {
    const uDrugom = c.zupani.filter((z) => z.krug === 2).length;
    stats.push(
      { label: "Županijskih utrka", value: c.zupani.length },
      { label: "Odlučeno u 2. krugu", value: uDrugom },
      {
        label: "Najbolji rezultat",
        value:
          c.zupani.reduce(
            (m, z) => Math.max(m, z.pobjednik_posto ?? 0),
            0,
          ),
        decimals: 1,
        suffix: " %",
        sub: c.zupani.reduce((a, b) =>
          (b.pobjednik_posto ?? 0) > (a.pobjednik_posto ?? 0) ? b : a,
        ).pobjednik,
      },
    );
  } else if (k1) {
    const winner = (lastKrug ?? k1).liste[0];
    stats.push(
      { label: "Odaziv (1. krug)", value: k1.summary.odaziv_posto ?? 0, decimals: 2, suffix: " %" },
      { label: "Glasovalo birača", value: k1.summary.glasovalo ?? 0 },
    );
    if (lastKrug && lastKrug !== k1) {
      stats.push({
        label: "Odaziv (2. krug)",
        value: lastKrug.summary.odaziv_posto ?? 0,
        decimals: 2,
        suffix: " %",
      });
    }
    if (winner?.posto != null) {
      stats.push({
        label: c.tip === "referendum" ? "Glasova ZA" : "Pobjednički rezultat",
        value: winner.posto,
        decimals: 2,
        suffix: " %",
        sub: winner.kratki,
      });
    }
  }
  return stats.slice(0, 4);
}

function subtitleFor(c: CycleData): string {
  const objava = c.krugovi?.["1"]?.summary.datum_objave;
  const base: Record<string, string> = {
    parlament:
      "Mandati po izbornim jedinicama, sastav Sabora i preferencijalni glasovi — iz službene arhive Državnog izbornog povjerenstva.",
    predsjednik:
      "Rezultati po kandidatima i županijama, oba kruga — iz službene arhive Državnog izbornog povjerenstva.",
    euparlament:
      "Rezultati lista i raspodjela po županijama — iz službene arhive Državnog izbornog povjerenstva.",
    lokalni:
      "Županske utrke po županijama — iz službene arhive Državnog izbornog povjerenstva.",
    referendum:
      "Rezultati referenduma po županijama — iz službene arhive Državnog izbornog povjerenstva.",
  };
  const s = base[c.tip] ?? "Iz službene arhive Državnog izbornog povjerenstva.";
  return objava ? `${s} Objava rezultata: ${fmtDatum(objava)}` : s;
}

export async function CyclePage({
  slug,
  manifest,
}: {
  slug: string;
  manifest: Manifest;
}) {
  const cycle = await getCycle(slug);
  if (!cycle) notFound();
  const [pref, trends] = await Promise.all([getPreferencijali(), getTrends()]);

  const tipLabel = TYPE_LABELS[cycle.tip] ?? cycle.tip;
  const k1 = cycle.krugovi?.["1"];
  const kruskeKeys = Object.keys(cycle.krugovi ?? {}).sort();
  const mapRounds: Record<string, Zupanija[]> = {};
  for (const k of kruskeKeys) {
    const z = cycle.krugovi?.[k]?.zupanije;
    if (z && z.length) mapRounds[k] = z;
  }
  const hasMap = Object.keys(mapRounds).length > 0 || (cycle.zupani?.length ?? 0) > 0;
  const barMode =
    cycle.tip === "predsjednik"
      ? "candidate"
      : cycle.tip === "referendum"
        ? "referendum"
        : "party";

  return (
    <>
      <Hero
        cycles={manifest.cycles}
        active={slug}
        title={`${tipLabel} izbori ${cycle.godina}.`}
        subtitle={subtitleFor(cycle)}
        stats={heroStats(cycle)}
      />
      <main>
        {k1 ? (
          <Section
            id="rezultati"
            kicker="Rezultati"
            title={
              cycle.tip === "referendum"
                ? "Kako je Hrvatska glasovala"
                : "Rezultati na razini Hrvatske"
            }
          >
            <div className="rounded-lg border border-line bg-white p-5 md:p-6">
              {kruskeKeys.map((k) => (
                <div key={k} className={k !== "1" ? "mt-8" : ""}>
                  {kruskeKeys.length > 1 ? (
                    <h3 className="mb-3 font-semibold text-navy">{k}. krug</h3>
                  ) : null}
                  <BarResults liste={cycle.krugovi![k].liste} mode={barMode} />
                </div>
              ))}
              <p className="mt-4 text-xs text-muted">
                Nevažećih listića (1. krug): {fmtInt(k1.summary.nevazeci)} ·
                upisanih birača: {fmtInt(k1.summary.biraci_ukupno)}
              </p>
            </div>
          </Section>
        ) : null}

        {cycle.sabor ? (
          <Section id="sabor" kicker="Sastav Sabora" title="Raspored 151 zastupničkog mjesta">
            <div className="rounded-lg border border-line bg-white p-5 md:p-6">
              <SeatArc sabor={cycle.sabor} />
            </div>
          </Section>
        ) : null}

        {hasMap ? (
          <Section
            id="karta"
            kicker="Zemljovid"
            title={
              cycle.tip === "lokalni"
                ? "Župani po županijama"
                : "Rezultati po županijama"
            }
          >
            <div className="rounded-lg border border-line bg-white p-5 md:p-6">
              <MapSection
                rounds={cycle.zupani ? undefined : mapRounds}
                zupani={cycle.zupani ?? undefined}
                kind={
                  cycle.tip === "lokalni"
                    ? "zupani"
                    : cycle.tip === "predsjednik"
                      ? "candidate"
                      : cycle.tip === "referendum"
                        ? "referendum"
                        : "party"
                }
              />
            </div>
          </Section>
        ) : null}

        {cycle.jedinice?.length ? (
          <Section
            id="jedinice"
            kicker="Izborne jedinice"
            title="Mandati po izbornim jedinicama"
          >
            <Jedinice jedinice={cycle.jedinice} />
            <p className="mt-3 text-xs text-muted">
              XI. izborna jedinica — birači izvan Hrvatske. Raspodjela D&apos;Hondtovom
              metodom izračunata je iz službenih rezultata pri izgradnji lokalnog
              indeksa.
            </p>
          </Section>
        ) : null}

        {trends && trends.odaziv.length > 1 ? (
          <Section id="trendovi" kicker="Trendovi" title="Kroz izborne cikluse">
            {Object.keys(trends.stranke).length > 0 ? (
              <div className="mb-6">
                <PartyTrends trends={trends} />
              </div>
            ) : null}
            <div className="rounded-lg border border-line bg-white p-5 md:p-6">
              <h3 className="mb-3 font-semibold text-navy">Odaziv birača</h3>
              <TurnoutTrend trends={trends} />
            </div>
          </Section>
        ) : null}

        {pref && cycle.tip === "parlament" && pref.election === cycle.slug ? (
          <Section
            id="preferencijali"
            kicker="Preferencijalni glasovi"
            title="Koga su birači zaokružili"
          >
            <Preferencijali pref={pref} />
          </Section>
        ) : null}

        <Section id="metodologija" kicker="Metodologija" title="Odakle podaci">
          <div className="max-w-3xl space-y-3 text-[15px] leading-relaxed text-ink">
            <p>
              Svi rezultati dolaze iz javne{" "}
              <a
                href="https://www.izbori.hr/arhiva-izbora/"
                className="text-navy underline decoration-line underline-offset-2 hover:decoration-navy"
              >
                arhive izbora Državnog izbornog povjerenstva RH
              </a>
              , koja rezultate poslužuje kao statične JSON/CSV datoteke. Arhiva je
              zrcaljena lokalno, indeksirana u SQLite bazu te agregirana skriptom{" "}
              <code className="rounded bg-line/60 px-1 py-0.5 text-[13px]">
                scripts/export_web.py
              </code>{" "}
              — svi izračuni (uključujući D&apos;Hondtovu raspodjelu mandata) rade se u
              tom koraku, a ova stranica ih samo prikazuje.
            </p>
            <p>
              Manjinski zastupnici biraju se na posebnim listama gdje je lista ujedno
              i kandidat. Sabor ima 151 zastupnika: 140 iz deset izbornih jedinica,
              3 iz XI. jedinice (dijaspora) i 8 predstavnika nacionalnih manjina.
            </p>
            <p>
              Prikaz je neslužben i informativan; mjerodavni su isključivo službeni
              rezultati DIP-a. Uočite li nesklad, otvorite issue na{" "}
              <a
                href="https://github.com/domovinatv/izbori.domovina.ai"
                className="text-navy underline decoration-line underline-offset-2 hover:decoration-navy"
              >
                GitHubu
              </a>
              .
            </p>
          </div>
        </Section>
      </main>
      <SiteFooter generatedAt={manifest.generated_at} />
    </>
  );
}
