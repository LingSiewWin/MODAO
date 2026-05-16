"use client";

import Link from "next/link";
import type { Address } from "viem";
import { formatUnits } from "viem";
import { Card } from "@/components/ui/Card";
import { useFutarchyMarket, describeOutcome } from "@/hooks/use-futarchy";
import { cn } from "@/lib/utils";

const PRICE_SCALE = 10n ** 18n;

export function FutarchyMarketCard({ marketAddress }: { marketAddress: Address }) {
  const { market, isLoading } = useFutarchyMarket(marketAddress);

  if (isLoading || !market) {
    return <li className="h-32 rounded-[var(--radius-lg)] bg-surface/40 animate-pulse" />;
  }

  const status = describeOutcome(market.state, market.outcome, market.tradingEndsAt);
  const endsIn = market.tradingEndsAt - Date.now();
  const passNum = Number(market.passTwap) / 1e18;
  const failNum = Number(market.failTwap) / 1e18;
  const total = passNum + failNum || 1;
  const passShare = passNum / total;

  return (
    <Link href={`/futarchy/${market.marketId.toString()}`}>
      <Card className="p-5 group" interactive>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-mono text-faint">
              <span className="px-1.5 py-0.5 rounded bg-[#7c3aed]/15 text-[#a78bfa] font-medium">
                FUTARCHY
              </span>
              <span>#{market.marketId.toString()}</span>
              <span aria-hidden>·</span>
              <span className="truncate">{market.projectToken.slice(0, 10)}…</span>
            </div>
            <h3 className="mt-2 text-base font-semibold text-fg group-hover:text-brand-3 transition-colors line-clamp-2">
              {market.description}
            </h3>
          </div>
          <StatusPill status={status} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <TwapStat
            label="Pass TWAP"
            tone="success"
            value={market.seeded ? passNum.toFixed(4) : "—"}
            isLead={market.seeded && passNum >= failNum}
          />
          <TwapStat
            label="Fail TWAP"
            tone="danger"
            value={market.seeded ? failNum.toFixed(4) : "—"}
            isLead={market.seeded && failNum > passNum}
          />
        </div>

        {market.seeded && (
          <div className="mt-3 h-1 rounded-full overflow-hidden bg-surface-2 flex">
            <div
              className="h-full bg-success"
              style={{ width: `${Math.min(100, Math.max(0, passShare * 100))}%` }}
            />
            <div
              className="h-full bg-danger"
              style={{ width: `${Math.min(100, Math.max(0, (1 - passShare) * 100))}%` }}
            />
          </div>
        )}

        <div className="mt-3 flex items-center justify-between text-[11px] text-faint">
          <span>
            Proposer{" "}
            <span className="font-mono text-muted">
              {market.proposer.slice(0, 6)}…{market.proposer.slice(-4)}
            </span>
          </span>
          <span>
            {status === "trading"
              ? `Ends in ${fmtDuration(endsIn)}`
              : status === "ready-to-resolve"
                ? "Ready to resolve"
                : status === "passed"
                  ? `Passed · TWAP ${passNum.toFixed(4)}`
                  : `Failed · TWAP ${failNum.toFixed(4)}`}
          </span>
        </div>
      </Card>
    </Link>
  );
}

function TwapStat({
  label,
  tone,
  value,
  isLead,
}: {
  label: string;
  tone: "success" | "danger";
  value: string;
  isLead: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-md)] border px-3 py-2",
        tone === "success" && "border-success/30 bg-success/5",
        tone === "danger" && "border-danger/30 bg-danger/5",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-faint">{label}</span>
        {isLead && <span className="text-[9px] font-mono text-fg uppercase">lead</span>}
      </div>
      <p
        className={cn(
          "mt-0.5 font-mono tabular text-sm font-semibold",
          tone === "success" ? "text-success" : "text-danger",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function StatusPill({ status }: { status: ReturnType<typeof describeOutcome> }) {
  const map: Record<typeof status, { label: string; cls: string }> = {
    trading: { label: "Trading", cls: "border-brand/30 bg-brand/5 text-brand-3" },
    "ready-to-resolve": {
      label: "Ready to resolve",
      cls: "border-warning/30 bg-warning/5 text-warning",
    },
    passed: { label: "Passed", cls: "border-success/30 bg-success/5 text-success" },
    failed: { label: "Failed", cls: "border-danger/30 bg-danger/5 text-danger" },
  };
  const m = map[status];
  return (
    <span
      className={cn(
        "shrink-0 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium border",
        m.cls,
      )}
    >
      {m.label}
    </span>
  );
}

function fmtDuration(ms: number) {
  if (ms <= 0) return "0m";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
