import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Izborni simulator",
  description:
    "Deterministički simulator hrvatskog izbornog sustava — promijeni pravila, " +
    "vidi tko dobiva mandate. Backtest nad rezultatima 2020. i 2024.",
};

/**
 * Full-viewport shell for the simulator.
 *
 * The root layout gives body `min-h-screen` and the site's scrolling pages
 * depend on that, so this route opts out with a fixed overlay instead of
 * changing globals.css. Desktop-only by design (16:9, no scrolling) — the
 * responsive pass is deliberately deferred.
 */
export default function SimulatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 overflow-hidden bg-surface">{children}</div>
  );
}
