import { promises as fs } from "fs";
import path from "path";
import { SimShell } from "@/components/sim/SimShell";
import type { RawCycle } from "@/lib/sim/types";

const DATA_DIR = path.join(process.cwd(), "public", "data", "simulator");
const CYCLES = ["parlament-2024", "parlament-2020"];

/**
 * Both cycles are ~90 KB each, so they are read at build time and inlined
 * rather than fetched. That is what makes every slider a synchronous
 * recompute with no loading state.
 */
async function loadCycles(): Promise<RawCycle[]> {
  const out: RawCycle[] = [];
  for (const slug of CYCLES) {
    const raw = await fs.readFile(path.join(DATA_DIR, `${slug}.json`), "utf-8");
    out.push(JSON.parse(raw) as RawCycle);
  }
  return out;
}

export default async function SimulatorPage() {
  const cycles = await loadCycles();
  return <SimShell cycles={cycles} />;
}
