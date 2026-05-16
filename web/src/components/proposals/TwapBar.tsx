import { cn } from "@/lib/utils";

/**
 * Side-by-side visual of PASS vs FAIL TWAP. The wider side is winning.
 * Used in ProposalCard and ProposalDetail headers — the single most
 * scan-friendly representation of the futarchy market state.
 */
export function TwapBar({
  passTwap,
  failTwap,
  showLabels = true,
  className,
}: {
  passTwap: number;
  failTwap: number;
  showLabels?: boolean;
  className?: string;
}) {
  const total = passTwap + failTwap || 1;
  const passPct = (passTwap / total) * 100;
  const failPct = 100 - passPct;
  const passWinning = passTwap > failTwap;

  return (
    <div className={cn("w-full", className)}>
      {showLabels && (
        <div className="flex items-center justify-between mb-2 text-xs font-mono tabular">
          <span className={cn("flex items-center gap-1.5", passWinning ? "text-success" : "text-muted")}>
            <span className="size-1.5 rounded-full bg-success" />
            PASS {(passTwap * 100).toFixed(1)}%
          </span>
          <span className={cn("flex items-center gap-1.5", !passWinning ? "text-danger" : "text-muted")}>
            FAIL {(failTwap * 100).toFixed(1)}%
            <span className="size-1.5 rounded-full bg-danger" />
          </span>
        </div>
      )}
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className="absolute inset-y-0 left-0 bg-success transition-[width] duration-500"
          style={{ width: `${passPct}%` }}
        />
        <div
          className="absolute inset-y-0 right-0 bg-danger/80 transition-[width] duration-500"
          style={{ width: `${failPct}%` }}
        />
      </div>
    </div>
  );
}
