import Image from "next/image";
import Link from "next/link";
import type { CycleMeta } from "@/lib/types";
import { CountUp } from "./CountUp";
import { CycleSwitcher } from "./CycleSwitcher";

export interface HeroStat {
  label: string;
  value: number;
  decimals?: number;
  suffix?: string;
  sub?: string;
}

export function Hero({
  cycles,
  active,
  title,
  subtitle,
  stats,
}: {
  cycles: CycleMeta[];
  active: string;
  title: string;
  subtitle: string;
  stats: HeroStat[];
}) {
  return (
    <header className="relative overflow-hidden bg-navy-deep text-hero-ink">
      {/* Barely-visible šahovnica pattern in the hero background. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            "repeating-conic-gradient(#ffffff 0% 25%, transparent 0% 50%)",
          backgroundSize: "48px 48px",
        }}
      />
      <div className="relative mx-auto w-full max-w-6xl px-4 pt-6 pb-12 sm:px-6 md:pb-16">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo.svg"
              alt="DOMOVINA.ai logotip"
              width={44}
              height={44}
              priority
            />
            <span className="font-serif text-xl font-bold text-white">
              Izbori · DOMOVINA<span className="text-accent">.ai</span>
            </span>
          </Link>
          <a
            href="#metodologija"
            className="hidden text-sm text-hero-ink/80 underline-offset-4 hover:text-white hover:underline sm:block"
          >
            Metodologija
          </a>
        </div>

        <div className="mt-12 md:mt-16">
          <span className="tricolor-rule tricolor-rule--dark mb-5" aria-hidden="true" />
          <h1 className="max-w-3xl font-serif text-4xl leading-tight font-bold text-white md:text-6xl">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-base text-hero-ink md:text-lg">{subtitle}</p>
        </div>

        <div className="mt-8">
          <CycleSwitcher cycles={cycles} active={active} />
        </div>

        <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label}>
              <dt className="text-xs font-semibold tracking-[0.14em] text-hero-ink/70 uppercase">
                {s.label}
              </dt>
              <dd className="mt-1 text-3xl font-bold text-white md:text-4xl">
                <CountUp value={s.value} decimals={s.decimals ?? 0} suffix={s.suffix ?? ""} />
              </dd>
              {s.sub ? <p className="mt-1 text-sm text-hero-ink/80">{s.sub}</p> : null}
            </div>
          ))}
        </dl>
      </div>
    </header>
  );
}
