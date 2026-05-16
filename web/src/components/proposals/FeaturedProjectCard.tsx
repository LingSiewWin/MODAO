import Link from "next/link";
import type { Proposal } from "@/lib/types";
import { ProjectArtwork } from "./ProjectArtwork";
import { StateBadge } from "@/components/ui/Badge";
import { ProposalCountdown } from "./ProposalCountdown";
import { LinkButton } from "@/components/ui/LinkButton";
import { truncateAddress, formatUsd, cn } from "@/lib/utils";

/**
 * MetaDAO-style featured launch card — large artwork on the left, project
 * details + progress + CTA on the right. Reads at-a-glance from the top of
 * the launchpad and is the only card with the prominent CTA.
 */
export function FeaturedProjectCard({ proposal }: { proposal: Proposal }) {
  const projectName = proposal.title
    .replace(/^Launch /, "")
    .replace(/ on MoDAO$/, "");
  const symbol = projectName.split(" ")[0]?.slice(0, 4).toUpperCase() ?? "";
  const passPct = proposal.passTwap * 100;
  const failPct = proposal.failTwap * 100;
  const passWinning = proposal.passTwap > proposal.failTwap;

  const ctaLabel =
    proposal.state === "passed"
      ? "Launched"
      : proposal.state === "failed"
        ? "Rejected"
        : "Trade markets";

  return (
    <div className="rounded-[var(--radius-xl)] border border-border bg-surface/60 backdrop-blur-sm overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr]">
        {/* Artwork */}
        <div className="relative aspect-[4/3] lg:aspect-auto min-h-[260px] lg:min-h-[360px]">
          <ProjectArtwork seed={proposal.id} symbol={symbol} className="absolute inset-0" />
          {/* State chip on the artwork, magazine-style */}
          <div className="absolute bottom-3 right-4 flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full",
                proposal.state === "pending" && "bg-warning/15 text-warning border border-warning/30",
                proposal.state === "passed" && "bg-success/15 text-success border border-success/30",
                proposal.state === "failed" && "bg-danger/15 text-danger border border-danger/30",
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  proposal.state === "pending" && "bg-warning",
                  proposal.state === "passed" && "bg-success",
                  proposal.state === "failed" && "bg-danger",
                )}
              />
              {proposal.state === "pending" ? "Live" : proposal.state === "passed" ? "Completed" : "Rejected"}
            </span>
          </div>
        </div>

        {/* Right column: project info */}
        <div className="p-6 lg:p-8 flex flex-col">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-mono text-faint">Proposed by</span>
            <span className="font-mono text-brand-3">{truncateAddress(proposal.proposer)}</span>
          </div>

          <h2 className="mt-4 text-3xl lg:text-4xl font-display tracking-tight text-fg leading-tight">
            {projectName}
          </h2>

          <p className="mt-3 text-sm text-muted leading-relaxed line-clamp-3">
            {proposal.description}
          </p>

          {/* Progress: pass vs fail TWAP — analogous to MetaDAO's "committed vs min raise" */}
          <div className="mt-6">
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className="absolute inset-y-0 left-0 bg-success transition-[width] duration-500"
                style={{ width: `${passPct}%` }}
              />
              <div
                className="absolute inset-y-0 right-0 bg-danger/85 transition-[width] duration-500"
                style={{ width: `${failPct}%` }}
              />
            </div>
            <div className="mt-3 flex items-end justify-between gap-3">
              <div>
                <p className={cn("text-2xl font-mono tabular", passWinning ? "text-success" : "text-fg")}>
                  {passPct.toFixed(1)}%
                </p>
                <p className="text-[11px] uppercase tracking-widest text-faint mt-0.5">
                  PASS · {passWinning ? "winning" : "trailing"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-mono tabular text-muted">
                  {formatUsd(proposal.volumeUsd)}
                </p>
                <p className="text-[11px] uppercase tracking-widest text-faint mt-0.5">
                  volume
                </p>
              </div>
            </div>
          </div>

          {/* Bottom row — CTA + countdown */}
          <div className="mt-auto pt-6 flex items-center justify-between gap-3">
            {proposal.state === "pending" ? (
              <ProposalCountdown endsAt={proposal.endsAt} />
            ) : (
              <StateBadge state={proposal.state} />
            )}
            <LinkButton
              href={`/proposals/${proposal.id}`}
              variant={proposal.state === "pending" ? "gradient" : "secondary"}
              size="lg"
              className="min-w-[160px] justify-center"
            >
              {ctaLabel}
            </LinkButton>
          </div>
        </div>
      </div>
    </div>
  );
}
