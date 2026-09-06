# Licenca podataka

Kod u ovom repozitoriju je pod [MIT licencom](./LICENSE). Podaci nisu isto što i
kod i imaju vlastite uvjete, koji ovise o tome tko je izvor.

## Ono što ovaj repozitorij proizvodi

**Izvedeni skupovi, agregati i pokazatelji koje generiraju skripte iz
`scripts/` — uključujući izlaze iz `scripts/export_zagreb_mo.py`
(`zagreb_mo_odaziv.csv`, `zagreb_gc_odaziv.csv`, `zagreb_mo_liste.csv`,
`zagreb_mo.geojson`) — objavljuju se pod [Creative Commons Attribution 4.0
International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/deed.hr).**

Traženo navođenje:

> Izvor: izbori.domovina.ai (CC BY 4.0), izvedeno iz arhive izbora DIP-a i
> otvorenih podataka Grada Zagreba.

Atribucija izvornih registara ne nestaje time — ide uz našu, ne umjesto nje.

## Ono što dolazi iz tuđih izvora

| Izvor | Što daje | Uvjeti |
|---|---|---|
| **DIP** — [arhiva izbora](https://www.izbori.hr/arhiva-izbora/) | rezultati po biračkim mjestima, listama i kandidatima, 2003.– | javno objavljeni službeni rezultati; navođenje izvora |
| **Hrvatski sabor** — [interaktivna sabornica](https://www.sabor.hr/) | raspored zastupnika u aktualnom sazivu | javni podatak tijela vlasti; navođenje izvora |
| **data.zagreb.hr** — `mjesni-odbori`, `geoportal-mjesna-samouprava` | naziv, sjedište, gradska četvrt, površina i broj stanovnika mjesnih odbora; poligoni mjesnih odbora | „Otvorena dozvola (OD)" — dopušta korištenje i preradu uz navođenje izvora |

Nijedan od tih izvora nema share-alike odredbu, pa izvedeni skupovi mogu ići
pod CC BY 4.0.

## Što je izvedeno, a što preuzeto

`data/` nije u repozitoriju (`.gitignore`) — to je lokalna kopija tuđih
datoteka i preuzima se ponovno skriptama iz `scripts/`. Ono što ovaj
repozitorij *dodaje* su šifrarnici u `sifarnici/`, spojevi i agregati koje rade
skripte, te tekstovi u `docs/`.

**Spoj biračkih mjesta i mjesne samouprave nije preuzet ni iz jednog izvora.**
Nastaje u `scripts/export_zagreb_mo.py`, a tablica ispravaka imena i
obrazloženje svakog uparivanja su u `sifarnici/zagreb_mjesna_samouprava.json`.
