"use client";

import type { Source } from "@/lib/sim/types";

/**
 * Shared primitives for the simulator dashboard.
 *
 * Everything here is sized for a single 16:9 viewport with no scrolling, so
 * type is smaller and padding tighter than the rest of the site.
 */

const SOURCE_STYLE: Record<Source, { bg: string; fg: string; naslov: string }> = {
  ZAKON: {
    bg: "#E4EAF3",
    fg: "#002F6C",
    naslov: "Propisano zakonom",
  },
  PODACI: {
    bg: "#E0F1E5",
    fg: "#1F6B33",
    naslov: "Izračunato iz službenih rezultata DIP-a",
  },
  KONTRAFAKTUAL: {
    bg: "#EAE6F7",
    fg: "#413089",
    naslov: "Stvarni glasovi, pravilo koje hrvatski zakon ne poznaje",
  },
  PRETPOSTAVKA: {
    bg: "#FDF1E0",
    fg: "#8A5A0B",
    naslov: "Odluka simulatora — zakon o tome šuti",
  },
  KONSTRUKCIJA: {
    bg: "#F3E8F5",
    fg: "#6B2D78",
    naslov: "Konstruiran primjer — nije se dogodio",
  },
};

/** Provenance badge. Every number on screen can be traced to one of these. */
export function SourceBadge({
  source,
  children,
  title,
}: {
  source: Source;
  children?: React.ReactNode;
  title?: string;
}) {
  const s = SOURCE_STYLE[source];
  return (
    <span
      className="inline-flex items-center rounded-[3px] px-1.5 py-px text-[9px] font-bold tracking-[0.08em] uppercase"
      style={{ background: s.bg, color: s.fg }}
      title={title ?? s.naslov}
    >
      {children ?? source}
    </span>
  );
}

export function Panel({
  title,
  badge,
  right,
  children,
  className = "",
  bodyClassName = "",
}: {
  title?: string;
  badge?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={`flex min-h-0 flex-col rounded-md border border-line bg-white ${className}`}
    >
      {title ? (
        <header className="flex shrink-0 items-center gap-2 border-b border-line/70 px-3 py-1.5">
          <h2 className="text-[10px] font-bold tracking-[0.13em] text-muted uppercase">
            {title}
          </h2>
          {badge}
          <div className="ml-auto flex items-center gap-2">{right}</div>
        </header>
      ) : null}
      <div className={`min-h-0 flex-1 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

/** Compact labelled slider. Shows the legal value so departures are obvious. */
export function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
  zakonska,
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
  /** The value current law prescribes, if any. */
  zakonska?: number;
  disabled?: boolean;
}) {
  const odstupa = zakonska != null && value !== zakonska;
  return (
    <label className={`block ${disabled ? "opacity-40" : ""}`}>
      <span className="flex items-baseline justify-between gap-2">
        <span className="truncate text-[11px] text-ink">{label}</span>
        <span className="flex shrink-0 items-baseline gap-1">
          {odstupa ? (
            <span className="text-[9px] text-muted line-through">
              {format(zakonska!)}
            </span>
          ) : null}
          <span
            className={`tabular text-[11px] font-semibold ${odstupa ? "text-accent" : "text-navy"}`}
          >
            {format(value)}
          </span>
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-0.5 h-1 w-full cursor-pointer accent-navy"
        aria-label={label}
      />
    </label>
  );
}

export function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; hint?: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="shrink-0 text-[11px] text-ink">{label}</span>
      <div className="flex flex-wrap justify-end gap-1" role="group" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            title={o.hint}
            aria-pressed={value === o.value}
            className={`rounded-[4px] border px-1.5 py-0.5 text-[10px] transition-colors ${
              value === o.value
                ? "border-navy bg-navy text-white"
                : "border-line bg-white text-muted hover:border-navy/40 hover:text-ink"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2" title={hint}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3 w-3 accent-navy"
      />
      <span className="text-[11px] text-ink">{label}</span>
    </label>
  );
}
