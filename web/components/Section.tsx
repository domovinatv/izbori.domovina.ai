import { Reveal } from "./Reveal";

export function Section({
  id,
  title,
  kicker,
  children,
}: {
  id: string;
  title: string;
  kicker?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 md:py-16">
      <Reveal>
        <span className="tricolor-rule mb-4" aria-hidden="true" />
        {kicker ? (
          <p className="mb-1 text-xs font-semibold tracking-[0.14em] text-muted uppercase">
            {kicker}
          </p>
        ) : null}
        <h2 className="font-serif text-2xl font-bold text-navy md:text-3xl">{title}</h2>
      </Reveal>
      <div className="mt-6">{children}</div>
    </section>
  );
}
