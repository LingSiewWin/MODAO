import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { ConditionalMarketCard } from "@/components/markets/ConditionalMarketCard";
import { TwapBar } from "@/components/proposals/TwapBar";
import { ProposalCountdown } from "@/components/proposals/ProposalCountdown";
import { Card } from "@/components/ui/Card";
import { StateBadge } from "@/components/ui/Badge";
import { MOCK_MARKETS, MOCK_PROPOSALS } from "@/lib/mock-data";
import { truncateAddress, formatUsd, cn } from "@/lib/utils";

/**
 * Single-market focus view. Reframed so the project — not the market — is
 * the hero. The market is the *side of a proposal* that the user is looking
 * at; everything else (companion market, full proposal link, plain-English
 * explainer) is one click away.
 */
export default async function MarketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const market = MOCK_MARKETS.find((m) => m.id === id);
  if (!market) notFound();

  const proposal = MOCK_PROPOSALS.find((p) => p.id === market.proposalId);
  const companion = MOCK_MARKETS.find(
    (m) => m.proposalId === market.proposalId && m.side !== market.side,
  );

  const isPass = market.side === "pass";
  const sideLabel = isPass ? "PASS" : "FAIL";
  const sideTone = isPass ? "text-success" : "text-danger";
  const projectName = proposal
    ? proposal.title.replace(/^Launch /, "").replace(/ on MoDAO$/, "")
    : market.proposalId;

  return (
    <AppShell>
      <div className="mb-6">
        <Link
          href="/markets"
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-fg font-medium"
        >
          <span aria-hidden>←</span> Markets
        </Link>
      </div>

      <header className="mb-8">
        <div className="flex items-center gap-2 text-xs text-faint">
          <span className={cn("font-semibold uppercase tracking-widest", sideTone)}>
            {sideLabel} market
          </span>
          {proposal && (
            <>
              <span aria-hidden>·</span>
              <Link
                href={`/proposals/${proposal.id}`}
                className="font-mono hover:text-fg"
              >
                Proposal #{proposal.number}
              </Link>
            </>
          )}
        </div>
        <h1 className="mt-2 text-3xl sm:text-4xl font-semibold text-fg tracking-tight">
          {projectName}
        </h1>
        {proposal && (
          <p className="mt-2 text-sm text-muted max-w-2xl leading-relaxed">
            {proposal.description}
          </p>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <ConditionalMarketCard
          side={market.side}
          twap={market.twap}
          winning={proposal ? market.twap > 0.5 : false}
        />

        <aside className="space-y-4">
          {/* What you're actually trading — the framing fix. */}
          <Card className="p-5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-faint mb-3">
              What this market is
            </h2>
            <p className="text-sm text-muted leading-relaxed">
              You're trading <span className="text-fg">conditional MODAO</span> against{" "}
              <span className="text-fg">conditional USDC</span>, in the
              world where this proposal{" "}
              <span className={cn("font-semibold", sideTone)}>
                {isPass ? "passes" : "fails"}
              </span>
              .
            </p>
            <p className="mt-2 text-sm text-muted leading-relaxed">
              {isPass
                ? `Buy ${sideLabel} if you think admitting ${projectName} makes MODAO more valuable.`
                : `Buy ${sideLabel} if you think rejecting ${projectName} is better for MODAO holders.`}
            </p>
            <p className="mt-3 text-[11px] text-faint leading-relaxed">
              If the proposal resolves the other way, all trades on this side
              are bricked and your conditional tokens become worthless. That's
              futarchy — the market with the higher TWAP wins.
            </p>
          </Card>

          {/* Proposal state — TWAP comparison + countdown */}
          {proposal && (
            <Card className="p-5">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-faint">
                  Proposal state
                </h2>
                <StateBadge state={proposal.state} />
              </div>
              <TwapBar passTwap={proposal.passTwap} failTwap={proposal.failTwap} />
              <dl className="mt-4 space-y-2 text-xs">
                <Row label="24h volume" value={formatUsd(market.volume24h)} />
                <Row label="AMM" value={truncateAddress(market.address)} mono />
                {proposal.state === "pending" && (
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted">Ends in</dt>
                    <dd>
                      <ProposalCountdown endsAt={proposal.endsAt} />
                    </dd>
                  </div>
                )}
              </dl>
              <Link
                href={`/proposals/${proposal.id}`}
                className="mt-4 inline-flex items-center gap-1.5 text-xs text-brand-3 hover:text-brand font-medium"
              >
                View full proposal <span aria-hidden>→</span>
              </Link>
            </Card>
          )}

          {/* Companion market — opposite side */}
          {companion && proposal && (
            <Link href={`/markets/${companion.id}`} className="block group">
              <Card interactive className="p-5">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-faint mb-2">
                  Other side
                </h2>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-fg group-hover:text-brand-3 transition-colors">
                      {projectName}{" "}
                      <span
                        className={cn(
                          "ml-1 text-[10px] font-semibold uppercase tracking-widest",
                          companion.side === "pass" ? "text-success" : "text-danger",
                        )}
                      >
                        {companion.side === "pass" ? "PASS" : "FAIL"}
                      </span>
                    </p>
                    <p className="text-[11px] text-faint mt-0.5">
                      {companion.side === "pass"
                        ? "Bet that admission is good for MODAO"
                        : "Bet that rejection is good for MODAO"}
                    </p>
                  </div>
                  <p className="font-mono tabular text-sm text-fg shrink-0">
                    {(companion.twap * 100).toFixed(1)}%
                  </p>
                </div>
              </Card>
            </Link>
          )}
        </aside>
      </div>
    </AppShell>
  );
}

function Row({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className={cn("text-fg", mono && "font-mono tabular")}>{value}</dd>
    </div>
  );
}
