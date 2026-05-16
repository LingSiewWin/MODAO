import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { truncateAddress, formatUsd } from "@/lib/utils";
import type { Market } from "@/lib/types";

export function MarketCard({ market }: { market: Market }) {
  const isPass = market.name.includes("PASS");
  return (
    <Link href={`/markets/${market.id}`} className="block group">
      <Card interactive className="p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex items-center gap-3">
            <span
              className="size-2 rounded-full shrink-0"
              style={{ background: isPass ? "var(--success)" : "var(--danger)" }}
            />
            <div className="min-w-0">
              <h3 className="font-mono text-sm text-fg group-hover:text-brand-3 transition-colors truncate">
                {market.name}
              </h3>
              <p className="text-[11px] font-mono text-faint mt-0.5">
                {truncateAddress(market.address)}
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
