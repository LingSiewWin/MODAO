import { cn } from "@/lib/utils";
import type { Order } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

/** Compact order book — asks above, bids below, with a depth-bar background
 *  per row so the user can size up liquidity at a glance. */
export function OrderBook({
  asks,
  bids,
  side,
  className,
}: {
  asks: Order[];
  bids: Order[];
  side: "pass" | "fail";
  className?: string;
}) {
  const maxSize = Math.max(
    ...asks.map((o) => o.size),
    ...bids.map((o) => o.size),
    1,
  );
  const askTone = side === "pass" ? "text-success" : "text-danger";
  const askBg = side === "pass" ? "bg-success/10" : "bg-danger/10";

  const spread =
    asks.length && bids.length ? asks[asks.length - 1]!.price - bids[0]!.price : 0;

  return (
    <div className={cn("text-xs font-mono tabular", className)}>
      <div className="grid grid-cols-2 px-3 pb-2 text-faint text-[10px] uppercase tracking-widest">
        <span>Price</span>
        <span className="text-right">Size</span>
      </div>

      <div className="space-y-px">
        {asks.slice().reverse().map((o, i) => (
          <OrderRow key={`a-${i}`} order={o} maxSize={maxSize} tone={askTone} bg={askBg} align="ask" />
        ))}
      </div>

      <div className="my-1.5 mx-3 flex items-center justify-between rounded-[var(--radius-sm)] bg-surface-2 px-2 py-1 text-faint">
        <span>Spread</span>
        <span className="text-fg">{formatNumber(spread, 4)}</span>
      </div>

      <div className="space-y-px">
        {bids.map((o, i) => (
          <OrderRow key={`b-${i}`} order={o} maxSize={maxSize} tone="text-success" bg="bg-success/10" align="bid" />
        ))}
      </div>
    </div>
  );
}

function OrderRow({
  order,
  maxSize,
  tone,
  bg,
  align,
}: {
  order: Order;
  maxSize: number;
  tone: string;
  bg: string;
  align: "ask" | "bid";
}) {
  const widthPct = Math.max(4, (order.size / maxSize) * 100);
  return (
    <div className="relative grid grid-cols-2 px-3 py-1">
      <div
        className={cn("absolute inset-y-0 pointer-events-none", bg, align === "bid" ? "right-0" : "right-0")}
        style={{ width: `${widthPct}%`, right: 0 }}
        aria-hidden
      />
      <span className={cn("relative", tone)}>{formatNumber(order.price, 4)}</span>
      <span className="relative text-right text-muted">{formatNumber(order.size, 2)}</span>
    </div>
  );
}
