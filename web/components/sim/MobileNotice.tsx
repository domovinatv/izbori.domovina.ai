"use client";

import Link from "next/link";

/**
 * Small-screen placeholder.
 *
 * The simulator is a single-viewport dashboard: eleven electoral units, a
 * seat arc, a family table and a rules panel have to be visible at the same
 * time, because the whole point is watching the far column move when you drag
 * a slider in the near one. Reflowing that into a phone column would not be a
 * responsive version of the tool, it would be a different and worse tool.
 *
 * So below the breakpoint we show what the dashboard looks like and say
 * plainly where to open it. A responsive pass is deliberately deferred.
 */

function Skica() {
  // Layout sketch — mirrors the real grid: two full-height rails, header over
  // the centre column only.
  const box = "stroke-[#002F6C] fill-[#F5F7F9]";
  return (
    <svg
      viewBox="0 0 320 190"
      role="img"
      aria-label="Skica rasporeda: lijevi stupac s pravilima i scenarijem, sredina s pokazateljima, grafom Sabora i tablicom, desni stupac s cijenom mandata i izvorima"
      className="w-full"
    >
      {/* left rail */}
      <rect x="6" y="6" width="66" height="86" rx="4" className={box} strokeWidth="1.5" />
      <rect x="6" y="98" width="66" height="86" rx="4" className={box} strokeWidth="1.5" />
      <text x="39" y="52" textAnchor="middle" fontSize="8" fill="#002F6C" fontWeight="700">
        Pravila
      </text>
      <text x="39" y="144" textAnchor="middle" fontSize="8" fill="#002F6C" fontWeight="700">
        Scenarij
      </text>

      {/* centre: header, KPI, arcs, table */}
      <rect x="78" y="6" width="164" height="16" rx="4" fill="#002F6C" />
      <text x="160" y="17" textAnchor="middle" fontSize="7.5" fill="#FFFFFF" fontWeight="700">
        ciklus · scenarij
      </text>
      {[0, 1, 2, 3, 4].map((i) => (
        <rect
          key={i}
          x={78 + i * 33.2}
          y="27"
          width="30"
          height="20"
          rx="3"
          className={box}
          strokeWidth="1.2"
        />
      ))}
      <rect x="78" y="52" width="164" height="62" rx="4" className={box} strokeWidth="1.5" />
      {/* two seat arcs */}
      {[118, 202].map((cx) => (
        <g key={cx}>
          {Array.from({ length: 22 }).map((_, i) => {
            const a = Math.PI - (i * Math.PI) / 21;
            const r = 24;
            return (
              <circle
                key={i}
                cx={cx + Math.cos(a) * r}
                cy={102 - Math.sin(a) * r}
                r="2"
                fill={i < 9 ? "#2a78d6" : i < 15 ? "#cc2936" : "#008300"}
              />
            );
          })}
        </g>
      ))}
      <text x="160" y="106" textAnchor="middle" fontSize="7" fill="#5A6570">
        vs
      </text>
      <rect x="78" y="120" width="164" height="64" rx="4" className={box} strokeWidth="1.5" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect
          key={i}
          x="84"
          y={128 + i * 9}
          width={120 - i * 17}
          height="4"
          rx="1"
          fill="#002F6C"
          opacity={0.75 - i * 0.09}
        />
      ))}

      {/* right rail */}
      <rect x="248" y="6" width="66" height="108" rx="4" className={box} strokeWidth="1.5" />
      <rect x="248" y="120" width="66" height="64" rx="4" className={box} strokeWidth="1.5" />
      <text x="281" y="62" textAnchor="middle" fontSize="8" fill="#002F6C" fontWeight="700">
        Jedinice
      </text>
      <text x="281" y="155" textAnchor="middle" fontSize="8" fill="#002F6C" fontWeight="700">
        Izvori
      </text>
    </svg>
  );
}

export function MobileNotice() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-5 py-10 lg:hidden">
      <div className="w-full max-w-md">
        <span className="tricolor-rule mb-3" aria-hidden="true" />
        <p className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
          Izbori · DOMOVINA.ai
        </p>
        <h1 className="mt-1 font-serif text-2xl font-bold text-navy">
          Izborni simulator
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink">
          Simulator je namjerno napravljen za <strong>veliki ekran</strong> —
          otvori ga na računalu, u prozoru širokom barem 1280 px i visokom barem
          900 px.
        </p>
      </div>

      <figure className="w-full max-w-md rounded-lg border border-line bg-white p-3">
        <Skica />
        <figcaption className="mt-2 text-xs leading-relaxed text-muted">
          Sve stane u jedan ekran, bez scrollanja: pravila i scenarij lijevo,
          pokazatelji i sastav Sabora u sredini, cijena mandata po izbornim
          jedinicama desno.
        </figcaption>
      </figure>

      <div className="w-full max-w-md rounded-lg border border-line bg-white p-4">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
          Zašto ne na mobitelu
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink">
          Poanta alata je da <em>istovremeno</em> vidiš uzrok i posljedicu:
          povučeš prag lijevo i odmah gledaš kako se mandati premještaju u
          sredini, a cijena mandata mijenja desno. Kad se to složi u jedan
          stupac koji se skrola, ta veza se izgubi — nije riječ o responzivnoj
          verziji istog alata, nego o slabijem alatu.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Mobilni prikaz je na popisu, ali kao zaseban dizajn, ne kao stisnuti
          desktop.
        </p>
      </div>

      <Link
        href="/"
        className="text-sm text-navy underline-offset-2 hover:underline"
      >
        ← Natrag na izbori.domovina.ai
      </Link>
    </div>
  );
}
