import { cn, formatNumber } from "@/lib/utils";
import type { LadderRow } from "@/lib/amm-math";

/**
 * Symmetric L2-style depth ladder synthesized from a CP-AMM's reserves.
 *   asks above (red gradient — buyer pays to push price up)
 *   spot row in the middle
 *   bids below (green gradient — seller pushes price down)
 *
 * Each row's depth bar is sized against the max cumulative size on its side.
 * It's a *visualisation* of where liquidity sits, not a real book — but for
 * users coming from CEX/CLOB UIs, the metaphor reads at a glance.
 */
export function DepthLadder({
  asks,
  bids,
  spot,
  side,
  className,
}: {
  asks: LadderRow[];
  bids: LadderRow[];
  spot: number;
  /** Which conditional market this is — colors the spot accent. */
  side: "pass" | "fail";
  className?: string;
}) {
  const empty = asks.length === 0 && bids.length === 0;
  if (empty) {
    return (
      <div
        className={cn(
          "text-xs font-mono text-faint flex items-center justify-center py-10",
          className,
        )}
      >
        No liquidity yet
      </div>
    );
  }

  const maxAsk = asks.reduce((m, r) => (r.sizeQuote > m ? r.sizeQuote : m), 0n);
  const maxBid = bids.reduce((m, r) => (r.sizeQuote > m ? r.sizeQuote : m), 0n);
  const spotTone = side === "pass" ? "text-success" : "text-danger";

  return (
    <div className={cn("text-xs font-mono tabular", className)}>
      <div className="grid grid-cols-[1fr_1fr_1fr] px-3 pb-2 text-faint text-[10px] uppercase tracking-widest">
        <span>Price</span>
        <span className="text-right">MODAO</span>
        <span className="text-right">USDC</span>
      </div>

      {/* Asks: highest price at top, descending towards spot */}
      <div className="space-y-px">
        {[...asks].reverse().map((row, i) => (
          <Row key={`a-${i}`} row={row} max={maxAsk} tone="text-danger" bg="bg-danger/10" />
        ))}
      </div>

      {/* Spot marker */}
      <div className="my-1.5 mx-3 grid grid-cols-[1fr_1fr_1fr] items-center rounded-[var(--radius-sm)] bg-surface-2 px-2 py-1.5">
        <span className={cn("flex items-center gap-1.5", spotTone)}>
          <span className="size-1 rounded-full bg-current" />
          <span>{spot ? formatNumber(spot, 4) : "—"}</span>
        </span>
        <span className="text-right text-faint text-[10px] uppercase tracking-widest">
          spot
        </span>
        <span className="text-right text-faint text-[10px] uppercase tracking-widest">
          mark
        </span>
      </div>

      {/* Bids: highest (nearest spot) at top, descending */}
      <div className="space-y-px">
        {bids.map((row, i) => (
          <Row key={`b-${i}`} row={row} max={maxBid} tone="text-success" bg="bg-success/10" />
        ))}
      </div>
    </div>
  );
}

function Row({
  row,
  max,
  tone,
  bg,
}: {
  row: LadderRow;
  max: bigint;
  tone: string;
  bg: string;
}) {
  // Depth bar width proportional to cumulative USDC at this level.
  const widthPct = max > 0n
    ? Math.max(4, Number((row.sizeQuote * 100n) / max))
    : 0;
  // Human-readable amounts.
  const modao = Number(row.sizeBase) / 1e18;
  const usdc = Number(row.sizeQuote) / 1e6;

  return (
    <div className="relative grid grid-cols-[1fr_1fr_1fr] px-3 py-1">
      <div
        className={cn("absolute inset-y-0 right-0 pointer-events-none", bg)}
        style={{ width: `${widthPct}%` }}
        aria-hidden
      />
      <span className={cn("relative", tone)}>{formatNumber(row.price, 4)}</span>
      <span className="relative text-right text-muted">{formatNumber(modao, 2)}</span>
      <span className="relative text-right text-muted">{formatNumber(usdc, 2)}</span>
    </div>
  );
}
