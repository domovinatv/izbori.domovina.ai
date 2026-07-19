import { promises as fs } from "fs";
import path from "path";
import type { CycleData, Fairness, Manifest, Preferencijali, Trends } from "./types";

const DATA_DIR = path.join(process.cwd(), "public", "data");

async function readJson<T>(name: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, name), "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function getManifest(): Promise<Manifest> {
  const m = await readJson<Manifest>("manifest.json");
  if (!m) throw new Error("manifest.json missing — run scripts/export_web.py");
  return m;
}

export async function getCycle(slug: string): Promise<CycleData | null> {
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  return readJson<CycleData>(`${slug}.json`);
}

export async function getPreferencijali(): Promise<Preferencijali | null> {
  return readJson<Preferencijali>("preferencijali.json");
}

export async function getTrends(): Promise<Trends | null> {
  return readJson<Trends>("trends.json");
}

export async function getFairness(): Promise<Fairness | null> {
  return readJson<Fairness>("fairness.json");
}

/** Default cycle shown on the landing page: newest parlament, else newest. */
export function defaultSlug(manifest: Manifest): string {
  const parl = manifest.cycles.find((c) => c.type === "parlament");
  return (parl ?? manifest.cycles[0]).slug;
}
