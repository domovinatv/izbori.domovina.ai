"use client";

import { useEffect, useMemo, useState } from "react";
import type { CycleType, GropFile, GropIndex } from "@/lib/types";
import { BarResults } from "./charts/BarResults";
import { fmtInt, fmtPct } from "@/lib/format";

const VRSTA_LABELS: Record<string, string> = {
  "02": "Zastupnici u Sabor",
  "08": "Gradsko / općinsko vijeće",
  "17": "Gradonačelnik / načelnik",
};

/**
 * Drill-down to town/municipality results. Lazily fetches
 * /data/grop/{slug}/index.json, then the selected unit file.
 */
export function GropExplorer({ slug, tip }: { slug: string; tip: CycleType }) {
  const [index, setIndex] = useState<GropIndex | null>(null);
  const [unit, setUnit] = useState<string>("");
  const [file, setFile] = useState<GropFile | null>(null);
  const [grop, setGrop] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`/data/grop/${slug}/index.json`)
      .then((r) => r.json())
      .then((idx: GropIndex) => {
        if (!alive) return;
        setIndex(idx);
        if (idx.jedinice.length) setUnit(idx.jedinice[0].code);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [slug]);

  useEffect(() => {
    if (!unit) return;
    let alive = true;
    setLoading(true);
    fetch(`/data/grop/${slug}/${unit}.json`)
      .then((r) => r.json())
      .then((f: GropFile) => {
        if (!alive) return;
        setFile(f);
        setGrop(f.gropovi[0]?.code ?? "");
        setLoading(false);
      })
      .catch(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [slug, unit]);

  const entry = useMemo(
    () => file?.gropovi.find((g) => g.code === grop) ?? null,
    [file, grop],
  );

  const barMode =
    tip === "predsjednik" ? "candidate" : tip === "referendum" ? "referendum" : "party";
  const unitLabel = tip === "parlament" ? "Izborna jedinica" : "Županija";

  if (!index) {
    return <p className="text-sm text-muted">Učitavanje…</p>;
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold tracking-[0.14em] text-muted uppercase">
            {unitLabel}
          </span>
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="rounded-md border border-line bg-white px-3 py-1.5 text-sm text-ink"
          >
            {index.jedinice.map((j) => (
              <option key={j.code} value={j.code}>
                {j.naziv}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold tracking-[0.14em] text-muted uppercase">
            Grad / općina
          </span>
          <select
            value={grop}
            onChange={(e) => setGrop(e.target.value)}
            disabled={!file || loading}
            className="min-w-[220px] rounded-md border border-line bg-white px-3 py-1.5 text-sm text-ink disabled:opacity-50"
          >
            {(file?.gropovi ?? []).map((g) => (
              <option key={g.code} value={g.code}>
                {g.naziv ?? g.code}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <p className="text-sm text-muted">Učitavanje…</p>
      ) : entry ? (
        <div className="space-y-8">
          {entry.utrke.map((u, i) => (
            <div key={i}>
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-semibold text-navy">
                  {VRSTA_LABELS[u.vrsta] ??
                    (tip === "predsjednik"
                      ? "Predsjednički izbori"
                      : tip === "referendum"
                        ? "Referendum"
                        : "Rezultati")}
                  {entry.utrke.filter((x) => x.vrsta === u.vrsta).length > 1 ||
                  (tip !== "lokalni" && entry.utrke.length > 1)
                    ? ` — ${u.krug}. krug`
                    : tip === "lokalni" && u.krug > 1
                      ? ` — ${u.krug}. krug`
                      : ""}
                </h3>
                <p className="tabular text-xs text-muted">
                  odaziv {fmtPct(u.odaziv_posto, 1)} · glasovalo {fmtInt(u.glasovalo)} od{" "}
                  {fmtInt(u.biraci)} · nevažećih {fmtInt(u.nevazeci)}
                </p>
              </div>
              <BarResults liste={u.liste.slice(0, 12)} mode={barMode} />
              {u.liste.length > 12 ? (
                <details className="mt-2 text-sm">
                  <summary className="cursor-pointer text-muted hover:text-navy">
                    Sve liste ({u.liste.length})
                  </summary>
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full min-w-[480px] text-left">
                      <thead>
                        <tr className="border-b border-line text-xs text-muted uppercase">
                          <th className="py-1.5 pr-2 font-semibold">Lista</th>
                          <th className="py-1.5 pr-2 text-right font-semibold">Glasova</th>
                          <th className="py-1.5 text-right font-semibold">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {u.liste.map((l) => (
                          <tr key={l.naziv} className="border-b border-line/60">
                            <td className="py-1.5 pr-2">{l.naziv}</td>
                            <td className="tabular py-1.5 pr-2 text-right">{fmtInt(l.glasova)}</td>
                            <td className="tabular py-1.5 text-right">{fmtPct(l.posto, 2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">Nema podataka za odabranu kombinaciju.</p>
      )}
    </div>
  );
}
