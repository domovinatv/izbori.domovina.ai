"use client";

import { fmtPct } from "@/lib/format";
import { ZAKONSKA_PRAVILA } from "@/lib/sim/types";
import type { DiasporaMode, Method, Rules } from "@/lib/sim/types";
import { Choice, Slider, Toggle } from "./ui";

/**
 * The rules of the election, as editable controls.
 *
 * Every control that has a value prescribed by law shows it, so a departure
 * is always visible. Which article fixes what is in
 * docs/izborni_sustav_cinjenice.md §2-§7.
 */
export function RulesPanel({
  rules,
  onChange,
}: {
  rules: Rules;
  onChange: (r: Rules) => void;
}) {
  const set = <K extends keyof Rules>(k: K, v: Rules[K]) =>
    onChange({ ...rules, [k]: v });

  return (
    <div className="flex flex-col gap-2 px-3 py-2">
      <Slider
        label="Izborni prag"
        value={rules.prag}
        min={0}
        max={10}
        step={0.1}
        onChange={(v) => set("prag", v)}
        format={(v) => fmtPct(v, 1)}
        zakonska={ZAKONSKA_PRAVILA.prag}
      />
      <Slider
        label="Prag preferencijala"
        value={rules.pragPreferencijala}
        min={0}
        max={15}
        step={0.5}
        onChange={(v) => set("pragPreferencijala", v)}
        format={(v) => fmtPct(v, 1)}
        zakonska={ZAKONSKA_PRAVILA.pragPreferencijala}
      />
      <Slider
        label={
          rules.jedinstvenaJedinica ? "Mandata (×10 za nacionalnu IJ)" : "Mandata po jedinici"
        }
        value={rules.mandataPoJedinici}
        min={5}
        max={25}
        step={1}
        onChange={(v) => set("mandataPoJedinici", v)}
        format={(v) => String(v)}
        zakonska={ZAKONSKA_PRAVILA.mandataPoJedinici}
      />

      <hr className="border-line/70" />

      <Choice<DiasporaMode>
        label="XI. jedinica (dijaspora)"
        value={rules.dijaspora}
        onChange={(v) => set("dijaspora", v)}
        options={[
          { value: "fiksno3", label: "3 fiksno", hint: "Ustav čl. 45 st. 2 — na snazi" },
          {
            value: "model1999",
            label: "model 1999.",
            hint: "Razmjerno odazivu, kako je bilo prije 2010.",
          },
          { value: "bez", label: "bez", hint: "Kontrafaktual: bez zastupljenosti dijaspore" },
        ]}
      />
      <Toggle
        label="Prag vrijedi i u XI."
        checked={rules.pragUDijaspori}
        onChange={(v) => set("pragUDijaspori", v)}
        hint="Tekstualno da, ali izričita uputnica na čl. 41 obrisana je 2015. Nikad nije bilo ishodovno važno."
      />

      <hr className="border-line/70" />

      <Choice<Method>
        label="Metoda raspodjele"
        value={rules.metoda}
        onChange={(v) => set("metoda", v)}
        options={[
          { value: "dhondt", label: "D'Hondt", hint: "ZIZHS čl. 40 — jedina zakonska" },
          {
            value: "sainte-lague",
            label: "Sainte-Laguë",
            hint: "Djelitelji 1, 3, 5… — manje nagrađuje najveću listu",
          },
          {
            value: "hare-niemeyer",
            label: "Hare",
            hint: "Najveći ostatak s Hareovom kvotom",
          },
        ]}
      />

      <hr className="border-line/70" />

      <Toggle
        label="Jedna nacionalna izborna jedinica"
        checked={rules.jedinstvenaJedinica}
        onChange={(v) => set("jedinstvenaJedinica", v)}
        hint="Kontrafaktual. Liste se spajaju po obitelji jer bi u takvom sustavu svaka nastupila jednom."
      />
      <Slider
        label="Kompenzacijski mandati"
        value={rules.kompenzacijskiMandati}
        min={0}
        max={40}
        step={1}
        onChange={(v) => set("kompenzacijskiMandati", v)}
        format={(v) => (v === 0 ? "isključeno" : String(v))}
        zakonska={0}
      />
      <Toggle
        label="Uključi 8 manjinskih mandata"
        checked={rules.ukljuciManjine}
        onChange={(v) => set("ukljuciManjine", v)}
        hint="ZIZHS čl. 17 — fiksna podjela, većinski izbor, bez preferencijala."
      />
    </div>
  );
}
