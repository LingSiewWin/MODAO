import { LinkButton } from "@/components/ui/LinkButton";
import { LogoMark } from "@/components/brand/Logo";
import { MeshBackground } from "@/components/brand/MeshBackground";
import { Badge } from "@/components/ui/Badge";

export function HeroSection() {
  return (
    <section className="relative isolate overflow-hidden min-h-[88vh] flex items-center pt-24 pb-16">
      <MeshBackground />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
        <div className="max-w-4xl mx-auto text-center">
          <div className="rise flex justify-center">
            <Badge variant="brand" className="text-[11px] uppercase tracking-widest">
              <LogoMark size={14} />
              Futarchy on Monad
            </Badge>
          </div>

          <h1 className="rise rise-delay-1 mt-6 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05] text-fg">
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "var(--accent-gradient)" }}
            >
              Launch
            </span>{" "}
            an{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "var(--accent-gradient)" }}
            >
              ownership
            </span>{" "}
            coin.
          </h1>

          <p className="rise rise-delay-2 mt-6 text-lg sm:text-xl text-muted max-w-2xl mx-auto leading-relaxed">
            Raise capital while putting ownership in the hands of your earliest believers.
            Decisions priced by markets, not committees — settled in sub-second finality on Monad.
          </p>

          <div className="rise rise-delay-3 mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <LinkButton href="/create" variant="gradient" size="lg">
              Launch a Project
            </LinkButton>
            <LinkButton href="/proposals" variant="secondary" size="lg">
              Explore Proposals
            </LinkButton>
          </div>
        </div>
      </div>
    </section>
  );
}
