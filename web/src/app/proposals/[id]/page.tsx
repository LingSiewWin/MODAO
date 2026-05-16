"use client";

import Link from "next/link";
import { use } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { StateBadge } from "@/components/ui/Badge";
import { TwapBar } from "@/components/proposals/TwapBar";
import { ProposalCountdown } from "@/components/proposals/ProposalCountdown";
import { ConditionalMarketCard } from "@/components/markets/ConditionalMarketCard";
import { PositionPanel } from "@/components/proposals/PositionPanel";
import { useProposal } from "@/hooks/use-proposals";
import { useProposalMarkets } from "@/hooks/use-proposal-markets";
import { MOCK_PROPOSALS } from "@/lib/mock-data";
import { formatUsd, cn } from "@/lib/utils";

export default function ProposalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { proposal: onchain, isLoading } = useProposal(id);
  const markets = useProposalMarkets(onchain ? id : undefined);
  // Fallback to mock if id matches a demo proposal — keeps the layout viewable
  // before any real proposals exist on chain.
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

  const passWinning = proposal.passTwap > proposal.failTwap;
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
            {proposal.slotEnqueued > 0 && (
              <>
                <span aria-hidden>·</span>
                <span>Slot {proposal.slotEnqueued.toLocaleString()}</span>
              </>
            )}
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
            <h2 className="text-xs font-semibold uppercase tracking-widest text-faint mb-3">
              Market state
            </h2>
            <TwapBar passTwap={proposal.passTwap} failTwap={proposal.failTwap} />
            <dl className="mt-5 space-y-2.5 text-xs">
              <Row label="Volume (24h)" value={formatUsd(proposal.volumeUsd)} />
              <Row label="Pass threshold" value={`${(proposal.passThresholdBps / 100).toFixed(2)}%`} />
              <Row label="Ends" value={new Date(proposal.endsAt).toLocaleString()} />
            </dl>
          </Card>

          <Card className="p-5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-faint mb-3">
              Proposer
            </h2>
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

          {markets.isOpen && markets.usdcVault !== "0x0000000000000000000000000000000000000000" && (
            <PositionPanel
              usdcVault={markets.usdcVault}
              modaoVault={markets.modaoVault}
            />
          )}

          <Card className="p-5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-faint mb-3">
              Execution payload
            </h2>
            <pre className="text-[11px] font-mono text-muted bg-surface-2 rounded-[var(--radius-md)] p-3 overflow-x-auto leading-relaxed">
{`LaunchFactory.deploy({
  name: "${proposal.title.replace("Launch ", "").split(" on")[0]}",
  symbol: "TBD",
  supply: 1_000_000e18,
  curve: "bonding",
})`}
            </pre>
          </Card>
        </aside>

        <div className="space-y-4">
          <ConditionalMarketCard
            side="pass"
            twap={markets.isOpen ? markets.pass.twap : proposal.passTwap}
            winning={passWinning}
            live={
              markets.isOpen && markets.pass.amm && markets.fail.amm
                ? {
                    reserve0: markets.pass.reserve0,
                    reserve1: markets.pass.reserve1,
                    spot: markets.pass.spot,
                    asks: markets.pass.asks,
                    bids: markets.pass.bids,
                    passAmm: markets.pass.amm,
                    failAmm: markets.fail.amm,
                    usdcVault: markets.usdcVault,
                    modaoVault: markets.modaoVault,
                  }
                : undefined
            }
          />
          <ConditionalMarketCard
            side="fail"
            twap={markets.isOpen ? markets.fail.twap : proposal.failTwap}
            winning={!passWinning}
            live={
              markets.isOpen && markets.pass.amm && markets.fail.amm
                ? {
                    reserve0: markets.fail.reserve0,
                    reserve1: markets.fail.reserve1,
                    spot: markets.fail.spot,
                    asks: markets.fail.asks,
                    bids: markets.fail.bids,
                    passAmm: markets.pass.amm,
                    failAmm: markets.fail.amm,
                    usdcVault: markets.usdcVault,
                    modaoVault: markets.modaoVault,
                  }
                : undefined
            }
          />

          <Card className="p-5">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-faint mb-2">
              How this resolves
            </h3>
            <p className="text-sm text-muted leading-relaxed">
              After the TWAP window closes, the side with the higher time-weighted average price wins.
              If <span className="text-success font-medium">PASS</span> wins, the launch executes and
              FAIL-side trades are bricked. If <span className="text-danger font-medium">FAIL</span> wins,
              nothing launches and PASS-side trades are bricked. Either way, winning-side holders redeem 1:1.
            </p>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="font-mono tabular text-fg text-right">{value}</dd>
    </div>
  );
}
