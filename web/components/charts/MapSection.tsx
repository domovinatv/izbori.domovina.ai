"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import type { Zupanija, Zupan } from "@/lib/types";
import {
  partyColor,
  candidateColor,
  seqColor,
  SEQ_NAVY,
  OTHER_COLOR,
  DIVERGING,
} from "@/lib/palette";
import { fmtPct, fmtInt } from "@/lib/format";

type FeatureCollection = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: { code: string; name: string };
    geometry: GeoJSON.Geometry;
  }>;
};

export type MapMode = "pobjednik" | "odaziv";

interface CountyDatum {
  code: string;
  naziv: string | null;
  fillEntity: string; // winner entity for categorical fill
  fillValue: number | null; // turnout / share for sequential fill
  lines: string[]; // tooltip lines
}

function winnerFill(entity: string, kind: "party" | "candidate" | "referendum"): string {
  if (kind === "party") return partyColor(entity);
  if (kind === "candidate") return candidateColor(entity);
  return entity === "ZA" ? DIVERGING.za : entity === "PROTIV" ? DIVERGING.protiv : OTHER_COLOR;
}

export function MapSection({
  rounds,
  zupani,
  kind,
}: {
  /** County rows per round (predsjednik/eu/referendum). */
  rounds?: Record<string, Zupanija[]>;
  /** County-mayor rows (lokalni). */
  zupani?: Zupan[];
  kind: "party" | "candidate" | "referendum" | "zupani";
}) {
  const [geo, setGeo] = useState<FeatureCollection | null>(null);
  const [mode, setMode] = useState<MapMode>("pobjednik");
  const roundKeys = useMemo(() => Object.keys(rounds ?? {}).sort(), [rounds]);
  const [krug, setKrug] = useState<string>(roundKeys[roundKeys.length - 1] ?? "1");
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    lines: string[];
    title: string;
  } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    fetch("/data/zupanije.geojson")
      .then((r) => r.json())
      .then((g) => alive && setGeo(g))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const data: Map<string, CountyDatum> = useMemo(() => {
    const m = new Map<string, CountyDatum>();
    if (kind === "zupani" && zupani) {
      for (const z of zupani) {
        m.set(z.code, {
          code: z.code,
          naziv: z.naziv,
          fillEntity: z.pobjednik,
          fillValue: mode === "odaziv" ? z.odaziv_posto : z.pobjednik_posto,
          lines: [
            `${z.pobjednik} — ${fmtPct(z.pobjednik_posto, 1)}`,
            z.stranke ? z.stranke.split(";")[0].trim() : "",
            `${z.krug}. krug · odaziv ${fmtPct(z.odaziv_posto, 1)}`,
          ].filter(Boolean),
        });
      }
      return m;
    }
    const rows = rounds?.[krug] ?? [];
    for (const z of rows) {
      m.set(z.code, {
        code: z.code,
        naziv: z.naziv,
        fillEntity:
          kind === "party" ? z.pobjednik_stranka || z.pobjednik : z.pobjednik,
        fillValue: mode === "odaziv" ? z.odaziv_posto : (z.pobjednik_posto ?? null),
        lines: [
          `${z.pobjednik} — ${fmtPct(z.pobjednik_posto, 1)} (${fmtInt(z.pobjednik_glasova)})`,
          z.drugi ? `2. ${z.drugi} — ${fmtPct(z.drugi_posto, 1)}` : "",
          `Odaziv ${fmtPct(z.odaziv_posto, 1)}`,
        ].filter(Boolean),
      });
    }
    return m;
  }, [rounds, zupani, kind, krug, mode]);

  const turnoutDomain = useMemo(() => {
    const vals = [...data.values()]
      .map((d) => d.fillValue)
      .filter((v): v is number => v != null);
    return [Math.min(...vals), Math.max(...vals)] as const;
  }, [data]);

  const { paths, W, H } = useMemo(() => {
    const W = 720;
    const H = 560;
    if (!geo) return { paths: [], W, H };
    const projection = geoMercator().fitExtent(
      [
        [8, 8],
        [W - 8, H - 8],
      ],
      geo as never,
    );
    const path = geoPath(projection);
    return {
      W,
      H,
      paths: geo.features.map((f) => ({
        d: path(f as never) ?? "",
        code: f.properties.code,
        name: f.properties.name,
      })),
    };
  }, [geo]);

  const winnerLegend = useMemo(() => {
    const seen = new Map<string, string>();
    for (const d of data.values()) {
      const label =
        kind === "party" ? d.fillEntity : d.fillEntity;
      if (!seen.has(label))
        seen.set(
          label,
          winnerFill(d.fillEntity, kind === "zupani" ? "party" : kind),
        );
    }
    return [...seen.entries()];
  }, [data, kind]);

  const fillFor = (code: string): string => {
    const d = data.get(code);
    if (!d) return "#eef1f5";
    if (mode === "odaziv")
      return d.fillValue == null
        ? "#eef1f5"
        : seqColor(d.fillValue, turnoutDomain[0], turnoutDomain[1]);
    if (kind === "zupani") {
      // Local county races are candidate-per-county → color by backing party
      // is unreliable; use winner share in a single sequential hue instead of
      // 21 one-off categorical colors.
      return d.fillValue == null
        ? "#eef1f5"
        : seqColor(d.fillValue, turnoutDomain[0], turnoutDomain[1]);
    }
    return winnerFill(d.fillEntity, kind);
  };

  const onMove = (e: React.MouseEvent, code: string, name: string) => {
    const d = data.get(code);
    const box = wrapRef.current?.getBoundingClientRect();
    if (!d || !box) return;
    setTooltip({
      x: Math.min(e.clientX - box.left + 12, box.width - 230),
      y: e.clientY - box.top + 14,
      title: d.naziv ?? name,
      lines: d.lines,
    });
  };

  const showModeToggle = kind !== "referendum";
  const showRounds = roundKeys.length > 1;

  return (
    <figure>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {showRounds ? (
          <div role="group" aria-label="Krug" className="flex rounded-full border border-line bg-white p-0.5">
            {roundKeys.map((k) => (
              <button
                key={k}
                onClick={() => setKrug(k)}
                aria-pressed={krug === k}
                className={
                  "rounded-full px-3 py-1 text-sm transition-colors " +
                  (krug === k
                    ? "bg-navy font-semibold text-white"
                    : "text-muted hover:text-navy")
                }
              >
                {k}. krug
              </button>
            ))}
          </div>
        ) : null}
        {showModeToggle ? (
          <div role="group" aria-label="Prikaz" className="flex rounded-full border border-line bg-white p-0.5">
            {(
              [
                ["pobjednik", kind === "zupani" ? "Rezultat pobjednika" : "Pobjednik"],
                ["odaziv", "Odaziv"],
              ] as const
            ).map(([m, label]) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className={
                  "rounded-full px-3 py-1 text-sm transition-colors " +
                  (mode === m
                    ? "bg-navy font-semibold text-white"
                    : "text-muted hover:text-navy")
                }
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div ref={wrapRef} className="relative">
        {geo ? (
          <svg
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label="Karta Hrvatske po županijama"
            className="w-full"
          >
            {paths.map((p) => (
              <path
                key={p.code}
                d={p.d}
                fill={fillFor(p.code)}
                stroke="#FFFFFF"
                strokeWidth="1.2"
                tabIndex={0}
                aria-label={`${data.get(p.code)?.naziv ?? p.name}: ${(
                  data.get(p.code)?.lines ?? []
                ).join("; ")}`}
                onMouseMove={(e) => onMove(e, p.code, p.name)}
                onMouseLeave={() => setTooltip(null)}
                onFocus={(e) => {
                  const box = wrapRef.current?.getBoundingClientRect();
                  const r = (e.target as SVGPathElement).getBoundingClientRect();
                  const d = data.get(p.code);
                  if (!box || !d) return;
                  setTooltip({
                    x: Math.min(r.left - box.left + r.width / 2, box.width - 230),
                    y: r.top - box.top + r.height / 2,
                    title: d.naziv ?? p.name,
                    lines: d.lines,
                  });
                }}
                onBlur={() => setTooltip(null)}
                className="cursor-pointer outline-offset-2 hover:opacity-85 focus-visible:outline-2 focus-visible:outline-navy"
              />
            ))}
          </svg>
        ) : (
          <div className="flex aspect-[9/7] items-center justify-center text-sm text-muted">
            Učitavanje karte…
          </div>
        )}
        {tooltip ? (
          <div
            role="tooltip"
            className="pointer-events-none absolute z-10 w-[220px] rounded-md border border-line bg-white p-2.5 text-xs shadow-lg"
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            <p className="mb-1 font-semibold text-navy">{tooltip.title}</p>
            {tooltip.lines.map((l, i) => (
              <p key={i} className="tabular text-muted">
                {l}
              </p>
            ))}
          </div>
        ) : null}
      </div>

      <figcaption className="mt-3">
        {mode === "pobjednik" && kind !== "zupani" ? (
          <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm" role="list">
            {winnerLegend.map(([label, color]) => (
              <li key={label} className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="inline-block h-3 w-3 rounded-[3px]"
                  style={{ background: color }}
                />
                <span className="text-ink">{label}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex items-center gap-2 text-xs text-muted">
            <span className="tabular">{fmtPct(turnoutDomain[0], 1)}</span>
            <span
              aria-hidden="true"
              className="inline-block h-2.5 w-40 rounded-sm"
              style={{
                background: `linear-gradient(to right, ${SEQ_NAVY[0]}, ${SEQ_NAVY[SEQ_NAVY.length - 1]})`,
              }}
            />
            <span className="tabular">{fmtPct(turnoutDomain[1], 1)}</span>
            <span className="ml-1">
              {mode === "odaziv" ? "odaziv" : "udio pobjednika"}
            </span>
          </div>
        )}
      </figcaption>

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-muted hover:text-navy">
          Tablica: sve županije
        </summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left">
            <thead>
              <tr className="border-b border-line text-xs text-muted uppercase">
                <th className="py-1.5 pr-2 font-semibold">Županija</th>
                <th className="py-1.5 pr-2 font-semibold">Pobjednik</th>
                <th className="py-1.5 text-right font-semibold">Rezultat</th>
                <th className="py-1.5 text-right font-semibold">Odaziv</th>
              </tr>
            </thead>
            <tbody>
              {[...data.values()]
                .sort((a, b) => a.code.localeCompare(b.code))
                .map((d) => (
                  <tr key={d.code} className="border-b border-line/60">
                    <td className="py-1.5 pr-2">{d.naziv}</td>
                    <td className="py-1.5 pr-2">{d.fillEntity}</td>
                    <td className="tabular py-1.5 text-right">
                      {d.lines[0]?.split("—")[1]?.trim() ?? ""}
                    </td>
                    <td className="tabular py-1.5 text-right">
                      {fmtPct(
                        kind === "zupani"
                          ? (zupani?.find((z) => z.code === d.code)?.odaziv_posto ?? null)
                          : (rounds?.[krug]?.find((z) => z.code === d.code)
                              ?.odaziv_posto ?? null),
                        1,
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
