import Link from "next/link";
import type { CycleMeta } from "@/lib/types";
import { TYPE_LABELS } from "@/lib/format";

export function CycleSwitcher({
  cycles,
  active,
}: {
  cycles: CycleMeta[];
  active: string;
}) {
  return (
    <nav aria-label="Izborni ciklusi" className="flex flex-wrap gap-2">
      {cycles.map((c) => {
        const isActive = c.slug === active;
        return (
          <Link
            key={c.slug}
            href={`/${c.slug}`}
            aria-current={isActive ? "page" : undefined}
            className={
              "rounded-full border px-3.5 py-1.5 text-sm transition-colors " +
              (isActive
                ? "border-white/80 bg-white text-navy-deep font-semibold"
                : "border-hero-ink/30 text-hero-ink hover:border-hero-ink/70 hover:text-white")
            }
          >
            {TYPE_LABELS[c.type] ?? c.type} {c.godina}.
          </Link>
        );
      })}
    </nav>
  );
}
