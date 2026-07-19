import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCycle, getManifest } from "@/lib/data";
import { CyclePage } from "@/components/CyclePage";
import { TYPE_LABELS } from "@/lib/format";

export async function generateStaticParams() {
  const manifest = await getManifest();
  return manifest.cycles.map((c) => ({ slug: c.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cycle = await getCycle(slug);
  if (!cycle) return {};
  const tip = TYPE_LABELS[cycle.tip] ?? cycle.tip;
  return {
    title: `${tip} izbori ${cycle.godina}.`,
    description: `Rezultati: ${cycle.label} — glasovi, mandati i karte po županijama iz službene arhive DIP-a.`,
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const manifest = await getManifest();
  if (!manifest.cycles.some((c) => c.slug === slug)) notFound();
  return <CyclePage slug={slug} manifest={manifest} />;
}
