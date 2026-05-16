"use client";

import { useMemo, useState } from "react";
import { parseUnits } from "viem";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TwapDisplay } from "./TwapDisplay";
import { DepthLadder } from "./DepthLadder";
import { OrderBook } from "./OrderBook";
import { cn, formatNumber } from "@/lib/utils";
import { quoteTrade, type LadderRow } from "@/lib/amm-math";
import { MODAO_DECIMALS, USDC_DECIMALS } from "@/lib/contracts";
import type { Order } from "@/lib/types";

/**
 * One side of the conditional market. Two modes:
 *
 *   live (markets open on-chain): real reserves → spot, TWAP, depth ladder,
 *     quoted trade preview. Trade button is gated until the multi-step
 *     router lands (Phase 2).
 *
 *   demo (markets not yet open): mock order book + greyed-out form. Keeps the
 *     layout meaningful before any proposal has been admitted.
 */

const MOCK_ASKS: Order[] = [
  { price: 0.638, size: 1200, side: "ask" },
  { price: 0.632, size: 800, side: "ask" },
  { price: 0.628, size: 2500, side: "ask" },
  { price: 0.626, size: 600, side: "ask" },
];
const MOCK_BIDS: Order[] = [
  { price: 0.624, size: 1500, side: "bid" },
  { price: 0.62, size: 2200, side: "bid" },
  { price: 0.615, size: 900, side: "bid" },
  { price: 0.61, size: 3100, side: "bid" },
];

export interface ConditionalMarketCardProps {
  side: "pass" | "fail";
  twap: number;
  winning?: boolean;
  baseSymbol?: string;
  quoteSymbol?: string;
  // Live market state (omit for demo).
  live?: {
    reserve0: bigint;
    reserve1: bigint;
    spot: number;
    asks: LadderRow[];
    bids: LadderRow[];
  };
}

export function ConditionalMarketCard({
  side,
  twap,
  winning = false,
  baseSymbol = "MODAO",
  quoteSymbol = "USDC",
  live,
}: ConditionalMarketCardProps) {
  const [orderSide, setOrderSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");

  // Real quote against live reserves when amount + direction are set.
  const quote = useMemo(() => {
    if (!live || !amount || Number.isNaN(Number(amount))) return null;
    try {
      const inputDecimals = orderSide === "buy" ? USDC_DECIMALS : MODAO_DECIMALS;
      const amountIn = parseUnits(amount, inputDecimals);
      return quoteTrade({
        reserve0: live.reserve0,
        reserve1: live.reserve1,
        direction: orderSide,
        amountIn,
      });
    } catch {
      return null;
    }
  }, [live, amount, orderSide]);

  const tone = side === "pass" ? "success" : "danger";
  const label = side === "pass" ? "Pass market" : "Fail market";

  return (
    <Card
      className={cn(
        "overflow-hidden",
        winning
          ? side === "pass"
            ? "border-success/40 shadow-[0_0_30px_rgba(34,197,94,0.12)]"
            : "border-danger/40 shadow-[0_0_30px_rgba(239,68,68,0.12)]"
          : "",
      )}
    >
      <div className="p-5 sm:p-6 flex items-start justify-between gap-4 border-b border-border">
        <div>
          <p
            className={cn(
              "text-[10px] font-semibold uppercase tracking-widest",
              tone === "success" ? "text-success" : "text-danger",
            )}
          >
            {label}
            {winning && (
              <span className="ml-1.5 text-faint font-normal normal-case tracking-normal">
                · winning
              </span>
            )}
          </p>
          <h3 className="mt-1.5 font-mono text-fg text-sm">
            {baseSymbol}-{side.toUpperCase()} / {quoteSymbol}
          </h3>
          {live && (
            <p className="mt-1 text-[11px] font-mono tabular text-faint">
              spot {formatNumber(live.spot, 4)}
            </p>
          )}
        </div>
        <TwapDisplay
          twap={twap}
          trend={side === "pass" ? 0.012 : -0.012}
          side={side}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] divide-y lg:divide-y-0 lg:divide-x divide-border">
        <div className="p-4">
          {live ? (
            <DepthLadder asks={live.asks} bids={live.bids} spot={live.spot} side={side} />
          ) : (
            <OrderBook asks={MOCK_ASKS} bids={MOCK_BIDS} side={side} />
          )}
        </div>

        <div className="p-4 space-y-4">
          <div className="flex rounded-[var(--radius-md)] bg-surface-2 p-1 text-xs">
            <button
              type="button"
              onClick={() => setOrderSide("buy")}
              className={cn(
                "flex-1 h-8 rounded-[var(--radius-sm)] font-medium transition-colors",
                orderSide === "buy" ? "bg-success/15 text-success" : "text-muted",
              )}
            >
              Buy {side === "pass" ? "PASS" : "FAIL"}
            </button>
            <button
              type="button"
              onClick={() => setOrderSide("sell")}
              className={cn(
                "flex-1 h-8 rounded-[var(--radius-sm)] font-medium transition-colors",
                orderSide === "sell" ? "bg-danger/15 text-danger" : "text-muted",
              )}
            >
              Sell {side === "pass" ? "PASS" : "FAIL"}
            </button>
          </div>

          <Field
            label={orderSide === "buy" ? `You pay (${quoteSymbol})` : `You sell (${baseSymbol})`}
            suffix={orderSide === "buy" ? quoteSymbol : `${baseSymbol}-${side.toUpperCase()}`}
          >
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              inputMode="decimal"
              placeholder="0.000"
              className="w-full bg-transparent outline-none text-fg font-mono tabular placeholder:text-faint"
            />
          </Field>

          {/* Quote preview — only when we have live reserves and an input. */}
          {quote && (
            <div className="rounded-[var(--radius-md)] bg-surface-2 border border-border px-3 py-2.5 space-y-1.5 text-[11px] font-mono tabular">
              <Row
                label={`You receive`}
                value={
                  orderSide === "buy"
                    ? `${formatNumber(Number(quote.amountOut) / 10 ** MODAO_DECIMALS, 4)} ${baseSymbol}-${side.toUpperCase()}`
                    : `${formatNumber(Number(quote.amountOut) / 10 ** USDC_DECIMALS, 4)} ${quoteSymbol}`
                }
              />
              <Row label="Avg fill" value={formatNumber(quote.avgPrice, 4)} />
              <Row
                label="Price impact"
                value={`${(quote.slippageBps / 100).toFixed(2)}%`}
                tone={quote.slippageBps > 300 ? "warn" : undefined}
              />
            </div>
          )}

          <Button variant={orderSide === "buy" ? "success" : "danger"} className="w-full" disabled>
            {live ? "Trade router · coming soon" : "Markets not open yet"}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function Field({
  label,
  suffix,
  children,
}: {
  label: string;
  suffix?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-medium text-muted">{label}</span>
        {suffix && <span className="text-[10px] font-mono text-faint">{suffix}</span>}
      </div>
      <div className="flex items-center rounded-[var(--radius-md)] bg-surface-2 border border-border px-3 h-10 focus-within:border-brand">
        {children}
      </div>
    </label>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "warn";
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-faint">{label}</span>
      <span className={cn(tone === "warn" ? "text-warning" : "text-fg")}>{value}</span>
    </div>
  );
}
