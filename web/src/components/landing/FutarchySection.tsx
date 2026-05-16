const pillars = [
  {
    n: "01",
    title: "Conditional markets",
    body: "For every proposal, two markets open: PASS and FAIL. Traders price the same outcome under each scenario — the spread is the decision.",
  },
  {
    n: "02",
    title: "Price-based resolution",
    body: "After a TWAP window, the higher-priced market wins. Losing-side trades brick. No vote-buying, no apathy discount.",
  },
  {
    n: "03",
    title: "Skin in the game",
    body: "Make the right call, grow your portfolio. The traders most informed about a project are the ones whose capital decides its fate.",
  },
];

export function FutarchySection() {
  return (
    <section className="relative py-24 sm:py-32 border-t border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <p className="text-xs font-semibold text-brand-3 uppercase tracking-widest">
            Futarchy, explained
          </p>
          <h2 className="mt-3 text-4xl sm:text-5xl font-bold tracking-tight text-fg">
            We don&apos;t vote.{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "var(--accent-gradient)" }}
            >
              We trade.
            </span>
          </h2>
          <p className="mt-5 text-lg text-muted leading-relaxed">
            Voting rewards loud opinions. Markets reward correct ones.
            MoDAO turns every governance question into a price — and lets capital settle the answer.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-px bg-border rounded-[var(--radius-lg)] overflow-hidden border border-border">
          {pillars.map((p) => (
            <div key={p.n} className="bg-bg p-8 sm:p-10">
              <div className="font-mono text-sm text-brand-3">{p.n}</div>
              <h3 className="mt-4 text-xl font-semibold text-fg">{p.title}</h3>
              <p className="mt-3 text-sm text-muted leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
