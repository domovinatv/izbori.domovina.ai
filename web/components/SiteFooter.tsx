import Image from "next/image";

export function SiteFooter({ generatedAt }: { generatedAt: string }) {
  const datum = new Date(generatedAt);
  const fmt = new Intl.DateTimeFormat("hr-HR", { dateStyle: "long" }).format(datum);
  return (
    <footer className="border-t border-white/10 bg-navy-deep text-hero-ink">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="flex items-center gap-3">
          <Image src="/logo.svg" alt="DOMOVINA.ai logotip" width={40} height={40} />
          <div>
            <p className="font-serif text-lg font-bold text-white">
              Izbori · DOMOVINA<span className="text-accent">.ai</span>
            </p>
            <p className="text-sm">Podaci osvježeni: {fmt}</p>
          </div>
        </div>
        <div className="max-w-md text-sm leading-relaxed">
          <p>
            Izvor podataka:{" "}
            <a
              href="https://www.izbori.hr/arhiva-izbora/"
              className="underline decoration-hero-ink/40 underline-offset-2 hover:text-white"
            >
              arhiva izbora Državnog izbornog povjerenstva RH
            </a>
            . Kod i metodologija:{" "}
            <a
              href="https://github.com/domovinatv/izbori.domovina.ai"
              className="underline decoration-hero-ink/40 underline-offset-2 hover:text-white"
            >
              github.com/domovinatv/izbori.domovina.ai
            </a>
            .
          </p>
          <p className="mt-2 text-hero-ink/70">
            Neslužbeni prikaz. Mjerodavni su isključivo službeni rezultati DIP-a.
          </p>
        </div>
      </div>
    </footer>
  );
}
