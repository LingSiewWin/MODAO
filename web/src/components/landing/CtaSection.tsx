import { LinkButton } from "@/components/ui/LinkButton";

export function CtaSection() {
  return (
    <section className="relative py-24 sm:py-32 border-t border-border overflow-hidden">
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{ background: "var(--accent-gradient)" }}
        aria-hidden
      />
      <div className="absolute inset-0 grid-overlay opacity-50 pointer-events-none" aria-hidden />

      <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-fg leading-tight">
          Ready to launch on Monad?
        </h2>
        <p className="mt-5 text-lg text-muted leading-relaxed">
          Submit your project. Let the AI swarm and the markets decide.
          Sub-second finality, near-zero gas, fully on-chain audit trail.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <LinkButton href="/create" variant="gradient" size="lg">
            Start Your Project
          </LinkButton>
          <LinkButton href="/proposals" variant="secondary" size="lg">
            Browse Live Markets
          </LinkButton>
        </div>
      </div>
    </section>
  );
}
