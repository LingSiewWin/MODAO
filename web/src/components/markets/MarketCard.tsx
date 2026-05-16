import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatUsd, cn } from "@/lib/utils";
import { MOCK_PROPOSALS } from "@/lib/mock-data";
import type { Market } from "@/lib/types";

/**
 * Compact row for the /markets listing.
 *
 * The market is shown *as a side of its parent proposal* — project name
 * leads, side is a coloured badge, and the AMM address is reduced to a
 * tertiary mono caption. Avoids the "looks like a token pair" framing.
 */
export function MarketCard({ market }: { market: Market }) {
  const parent = MOCK_PROPOSALS.find((p) => p.id === market.proposalId);
  const projectName = parent
    ? parent.title.replace(/^Launch /, "").replace(/ on MoDAO$/, "")
    : market.proposalId;

  const isPass = market.side === "pass";
  const sideTone = isPass ? "text-success" : "text-danger";

  return (
    <Link href={`/markets/${market.id}`} className="block group">
      <Card interactive className="p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex items-center gap-3">
            <span
              className={cn(
                "size-2 rounded-full shrink-0",
                isPass ? "bg-success" : "bg-danger",
              )}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-fg group-hover:text-brand-3 transition-colors truncate">
                  {projectName}
                </h3>
                <span className={cn("text-[10px] font-semibold uppercase tracking-widest", sideTone)}>
                  {isPass ? "PASS" : "FAIL"}
                </span>
              </div>
              <p className="text-[11px] text-faint mt-0.5">
                {parent
                  ? `Proposal #${parent.number} · ${isPass ? "trades up if admitted" : "trades up if rejected"}`
                  : "Conditional MODAO / USDC"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6 shrink-0">
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest text-faint">TWAP</p>
              <p className="font-mono tabular text-sm text-fg mt-0.5">
                {(market.twap * 100).toFixed(1)}%
              </p>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-[10px] uppercase tracking-widest text-faint">24h vol</p>
              <p className="font-mono tabular text-sm text-fg mt-0.5">
                {formatUsd(market.volume24h)}
              </p>
            </div>
            <Badge variant={isPass ? "passed" : "failed"} className="hidden md:inline-flex">
              {isPass ? "Pass" : "Fail"}
            </Badge>
          </div>
        </div>
      </Card>
    </Link>
  );
}
