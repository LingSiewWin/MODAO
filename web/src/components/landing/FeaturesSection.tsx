/* 2×2 feature grid. Icons inlined as SVG so we don't depend on lucide-react
   being installed. All icons share the same stroke/size for visual rhythm. */

import { Card } from "@/components/ui/Card";

const features = [
  {
    title: "Fair launch, every time",
    body: "Bonding curves replace VC allocations. Every buyer pays the same curve price — no early-insider discount, no token unlocks crashing the chart on day 30.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-6">
        <path d="M3 17l6-6 4 4 8-8" />
        <path d="M14 7h7v7" />
      </svg>
    ),
  },
  {
    title: "Transparent by default",
    body: "Every verdict, every trade, every TWAP observation lives on-chain. No backroom token deals. No private order flow. The audit trail is the product.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-6">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
  {
    title: "Raise more, with rug protection",
    body: "Treasury releases gated by ongoing futarchy markets. If the project drifts, the market shorts it — and unspent funds stay protected for holders.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-6">
        <path d="M12 22s8-4 8-12V5l-8-3-8 3v5c0 8 8 12 8 12z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
  },
  {
    title: "Real alignment",
    body: "Legal structure binds the launching entity to the token's success. AI agents pre-screen for scams; markets keep teams honest after launch.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-6">
        <path d="M12 3v18M5 8l7-5 7 5M3 21h18" />
        <path d="M7 21V11h10v10" />
      </svg>
    ),
  },
];

export function FeaturesSection() {
  return (
    <section className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold text-brand-3 uppercase tracking-widest">
            Why MoDAO
          </p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-fg">
            A launchpad with skin in the game
          </h2>
          <p className="mt-4 text-muted leading-relaxed">
            Most launchpads are gatekept by humans, paid in fees, and walk away after token-generation event.
            MoDAO replaces the gatekeeper with an AI agent swarm and binds outcomes to live prediction markets.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4">
          {features.map((f) => (
            <Card key={f.title} className="p-6">
              <div className="flex size-11 items-center justify-center rounded-[var(--radius-md)] bg-brand/10 text-brand-3 border border-brand/20">
                {f.icon}
              </div>
              <h3 className="mt-5 text-lg font-semibold text-fg">{f.title}</h3>
              <p className="mt-2 text-sm text-muted leading-relaxed">{f.body}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
