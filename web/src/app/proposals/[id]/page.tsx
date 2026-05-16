"use client";

import Link from "next/link";
import { use } from "react";
import { zeroAddress } from "viem";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { StateBadge } from "@/components/ui/Badge";
import { ProposalCountdown } from "@/components/proposals/ProposalCountdown";
import { AgentVerdictPanel } from "@/components/proposals/AgentVerdictPanel";
import { CommitPanel } from "@/components/proposals/CommitPanel";
import { useProposal } from "@/hooks/use-proposals";
import { MOCK_PROPOSALS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

/**
 * Proposal detail page (v3 — commit-ICO model).
 * Shows AI verdict, the LaunchSale interaction panel, and a post-launch
 * governance CTA once the project has launched.
 */
export default function ProposalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { proposal: onchain, raw, isLoading } = useProposal(id);
  const fallback = MOCK_PROPOSALS.find((p) => p.id === id);
  const proposal = onchain ?? fallback;

  if (isLoading) {
    return (
      <AppShell>
        <div className="h-96 rounded-[var(--radius-lg)] border border-border bg-surface/40 animate-pulse" aria-busy />
      </AppShell>
    );
  }

  if (!proposal) {
    return (
      <AppShell>
        <div className="rounded-[var(--radius-lg)] border border-dashed border-border bg-surface/30 px-6 py-16 text-center">
          <h2 className="text-sm font-semibold text-fg">Proposal not found</h2>
          <p className="mt-1 text-xs text-muted">
            #{id} doesn't exist on chain (or hasn't been indexed yet).
          </p>
          <Link href="/proposals" className="mt-4 inline-flex text-xs text-brand-3 hover:text-brand font-medium">
            ← Back to proposals
          </Link>
        </div>
      </AppShell>
    );
  }

  const usingFallback = !onchain && !!fallback;

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between gap-3">
        <Link
          href="/proposals"
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-fg font-medium"
        >
          <span aria-hidden>←</span> Proposals
        </Link>
        {usingFallback && (
          <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-medium",
            "rounded-full px-2 py-0.5 border border-warning/30 bg-warning/5 text-warning")}>
            <span className="size-1.5 rounded-full bg-warning" />
            Demo data — not on chain
          </span>
        )}
      </div>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-mono text-faint">
            <span>Proposal #{proposal.number}</span>
            <span aria-hidden>·</span>
            <span>{proposal.symbol}</span>
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-semibold text-fg tracking-tight">
            {proposal.title}
          </h1>
          <p className="mt-2 text-sm text-muted max-w-2xl leading-relaxed">
            {proposal.description}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <StateBadge state={proposal.state} />
          {proposal.state === "pending" && (
            <ProposalCountdown endsAt={proposal.endsAt} />
          )}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <aside className="space-y-4">
          <Card className="p-5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-faint mb-3">Proposer</h2>
            <p className="font-mono text-sm text-fg break-all">{proposal.proposer}</p>
            {proposal.descriptionUrl && proposal.descriptionUrl !== "#" && (
              <a
                href={proposal.descriptionUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-xs text-brand-3 hover:text-brand font-medium"
              >
                View full description <span aria-hidden>↗</span>
              </a>
            )}
          </Card>
        </aside>

        <div className="space-y-4">
          <AgentVerdictPanel
            proposalId={proposal.id}
            outcome={
              proposal.state === "passed"
                ? "passed"
                : proposal.state === "failed"
                  ? "failed"
                  : "pending"
            }
          />

          {usingFallback ? (
            <Card className="p-5">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-faint mb-3">
                Launch sale
              </h2>
              <p className="text-sm text-muted leading-relaxed">
                Demo proposal — submit a real proposal at{" "}
                <Link href="/create" className="text-brand-3 hover:text-brand font-medium">
                  /create
                </Link>{" "}
                to test the commit flow on-chain.
              </p>
            </Card>
          ) : raw && raw.sale !== zeroAddress ? (
            <CommitPanel raw={raw} />
          ) : raw ? (
            <Card className="p-5">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-faint mb-3">
                Launch sale
              </h2>
              <p className="text-sm text-muted leading-relaxed">
                Awaiting AI verdict. Once{" "}
                <span className="font-mono text-fg">3-of-5</span> agents sign off on this
                proposal, the launch sale opens automatically.
              </p>
            </Card>
          ) : null}

          {proposal.state === "passed" && (
            <Card className="p-5 border-[#7c3aed]/30 bg-[#7c3aed]/5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-[#a78bfa]">
                    Post-launch governance
                  </span>
                  <h2 className="mt-1 text-sm font-semibold text-fg">
                    This project is live — token holders can now govern via futarchy
                  </h2>
                  <p className="mt-1 text-xs text-muted leading-relaxed">
                    Anyone can spin up a governance market for{" "}
                    <span className="font-mono text-fg">{proposal.symbol}</span>.
                    Holders trade pass/fail markets and the higher-TWAP side wins.
                  </p>
                </div>
                <Link
                  href={`/futarchy/create?project=${proposal.id}`}
                  className="shrink-0 inline-flex items-center justify-center px-3 py-2 text-xs font-medium rounded-[var(--radius-md)] bg-[#7c3aed] text-white hover:bg-[#6d28d9] transition-colors"
                >
                  Create proposal →
                </Link>
              </div>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}
