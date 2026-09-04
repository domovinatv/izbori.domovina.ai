import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Izborni simulator",
  description:
    "Deterministički simulator hrvatskog izbornog sustava — promijeni pravila, " +
    "vidi tko dobiva mandate. Backtest nad rezultatima 2020. i 2024.",
};

/**
 * Route wrapper for the simulator.
 *
 * The full-viewport overlay lives in SimShell (lg and up) rather than here, so
 * that the small-screen notice below that breakpoint can scroll normally. The
 * root layout's `min-h-screen` on body is left alone — changing globals.css
 * would break the nine scrolling cycle pages.
 */
export default function SimulatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The dashboard itself is a fixed full-viewport overlay; below `lg` that
  // wrapper is dropped so MobileNotice can scroll like an ordinary page.
  return <>{children}</>;
}
