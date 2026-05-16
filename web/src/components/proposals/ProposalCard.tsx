import Link from "next/link";
import type { Proposal } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { StateBadge } from "@/components/ui/Badge";
import { TwapBar } from "./TwapBar";
import { ProposalCountdown } from "./ProposalCountdown";
import { truncateAddress, formatUsd } from "@/lib/utils";

export function ProposalCard({ proposal }: { proposal: Proposal }) {
  return (
    <Link href={`/proposals/${proposal.id}`} className="block group">
      <Card interactive className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-mono text-faint">
              <span>#{proposal.number}</span>
              <span aria-hidden>·</span>
              <span className="truncate">{truncateAddress(proposal.proposer)}</span>
            </div>
            <h3 className="mt-2 text-lg font-semibold text-fg group-hover:text-brand-3 transition-colors leading-tight">
              {proposal.title}
            </h3>
          </div>
          <StateBadge state={proposal.state} />
        </div>

        <p className="mt-3 text-sm text-muted line-clamp-2 leading-relaxed">
          {proposal.description}
        </p>

        <div className="mt-5">
          <TwapBar passTwap={proposal.passTwap} failTwap={proposal.failTwap} />
        </div>

        <div className="mt-5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-4 font-mono text-faint">
            <span className="tabular">
              Volume <span className="text-muted">{formatUsd(proposal.volumeUsd)}</span>
            </span>
          </div>
          {proposal.state === "pending" ? (
            <ProposalCountdown endsAt={proposal.endsAt} />
          ) : (
            <span className="font-mono text-faint tabular">
              Slot {proposal.slotEnqueued.toLocaleString()}
            </span>
          )}
        </div>
      </Card>
    </Link>
  );
}
