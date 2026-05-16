"use client";

import Link from "next/link";
import type { Address } from "viem";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAllFutarchyMarkets, useFutarchyMarket, factoryDeployed } from "@/hooks/use-futarchy";
import { useProposals } from "@/hooks/use-proposals";
import { FutarchyMarketCard } from "@/components/futarchy/FutarchyMarketCard";

/**
 * Governance markets list. Visually distinct from the ICO proposals list:
 *   - purple/violet accent (vs. brand teal for ICO)
 *   - explicit "post-launch governance" framing in the header
 *   - source projects come from launched proposals only
 */
export default function FutarchyListPage() {
  const { markets, isLoading } = useAllFutarchyMarkets();
  const { proposals } = useProposals();

  // Surface the launched projects so users can pick one to govern.
  const launchedProjects = proposals.filter((p) => p.state === "passed");

  return (
    <AppShell
      title="Governance markets"
      description="Futarchy proposals for projects that have already launched. Token holders trade pass/fail markets — the side with the higher TWAP wins. No AI gate, market wisdom decides."
      actions={
        launchedProjects.length > 0 && factoryDeployed ? (
          <Link href="/futarchy/create">
            <Button variant="gradient">Create governance proposal</Button>
          </Link>
        ) : null
      }
    >
      {!factoryDeployed && (
        <Card className="p-5 mb-6 border-warning/30 bg-warning/5">
          <h2 className="text-sm font-semibold text-warning">
            FutarchyMarketFactory not deployed yet
          </h2>
          <p className="mt-1 text-xs text-muted leading-relaxed">
            Run{" "}
            <code className="font-mono text-fg">
              forge script script/DeployFutarchy.s.sol:DeployFutarchyScript
            </code>
            , then paste the deployed factory address into{" "}
            <code className="font-mono text-fg">CONTRACTS.futarchyFactory</code> in{" "}
            <code className="font-mono text-fg">web/src/lib/contracts.ts</code>.
          </p>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section>
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-faint">
              All markets
            </h2>
            <span className="text-[11px] text-faint">
              {markets.length} {markets.length === 1 ? "market" : "markets"}
            </span>
          </div>
          {isLoading ? (
            <div className="grid gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-32 rounded-[var(--radius-lg)] bg-surface/40 animate-pulse" />
              ))}
            </div>
          ) : markets.length === 0 ? (
            <Card className="p-10 text-center border-dashed">
              <h3 className="text-sm font-semibold text-fg">No governance markets yet</h3>
              <p className="mt-1 text-xs text-muted max-w-md mx-auto leading-relaxed">
                Once a launched project's token holders want to vote on a treasury
                action, anyone can spin one up. Pick a launched project on the right
                to start.
              </p>
            </Card>
          ) : (
            <ul className="grid gap-3">
              {markets.map((m) => (
                <FutarchyMarketCard key={m.address} marketAddress={m.address} />
              ))}
            </ul>
          )}
        </section>

        <aside>
          <Card className="p-5 sticky top-20">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-faint">
              Launched projects
            </h2>
            <p className="mt-1 text-xs text-muted leading-relaxed">
              Only launched projects can have governance markets. Pick one to
              start a new proposal.
            </p>
            {launchedProjects.length === 0 ? (
              <p className="mt-4 text-xs text-faint italic">
                No launched projects yet. Submit one in{" "}
                <Link href="/create" className="text-brand-3 hover:text-brand">
                  Submit Project
                </Link>{" "}
                first.
              </p>
            ) : (
              <ul className="mt-4 space-y-2">
                {launchedProjects.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/futarchy/create?project=${p.id}`}
                      className="block rounded-[var(--radius-md)] border border-border bg-surface-2 px-3 py-2 hover:border-border-hover transition-colors"
                    >
                      <p className="text-sm font-medium text-fg truncate">{p.title}</p>
                      <p className="text-[10px] font-mono text-faint truncate">
                        {p.symbol}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </aside>
      </div>
    </AppShell>
  );
}
