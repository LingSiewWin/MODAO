"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TwapDisplay } from "./TwapDisplay";
import { OrderBook } from "./OrderBook";
import { cn, formatNumber } from "@/lib/utils";
import type { Order } from "@/lib/types";

const mockAsks: Order[] = [
  { price: 0.638, size: 1200, side: "ask" },
  { price: 0.632, size: 800, side: "ask" },
  { price: 0.628, size: 2500, side: "ask" },
  { price: 0.626, size: 600, side: "ask" },
];
const mockBids: Order[] = [
  { price: 0.624, size: 1500, side: "bid" },
  { price: 0.620, size: 2200, side: "bid" },
  { price: 0.615, size: 900, side: "bid" },
  { price: 0.610, size: 3100, side: "bid" },
];

/**
 * One side of the conditional market — pass or fail. Header shows the TWAP,
 * left column is the order book, right column is the order form. The whole
 * card is bordered in the side's color to make winner/loser obvious at a glance.
 */
export function ConditionalMarketCard({
  side,
  twap,
  winning = false,
  baseSymbol = "MODAO",
  quoteSymbol = "USDC",
}: {
  side: "pass" | "fail";
  twap: number;
  winning?: boolean;
  baseSymbol?: string;
  quoteSymbol?: string;
}) {
  const [orderSide, setOrderSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");

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
          <p className={cn("text-[10px] font-semibold uppercase tracking-widest", tone === "success" ? "text-success" : "text-danger")}>
            {label}
            {winning && <span className="ml-1.5 text-faint font-normal normal-case tracking-normal">· winning</span>}
          </p>
          <h3 className="mt-1.5 font-mono text-fg text-sm">
            {baseSymbol}-{side.toUpperCase()} / {quoteSymbol}
          </h3>
        </div>
        <TwapDisplay twap={twap} trend={side === "pass" ? 0.012 : -0.012} side={side} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] divide-y lg:divide-y-0 lg:divide-x divide-border">
        <div className="p-4">
          <OrderBook asks={mockAsks} bids={mockBids} side={side} />
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

          <Field label="Price" suffix={quoteSymbol}>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              inputMode="decimal"
              placeholder="0.000"
              className="w-full bg-transparent outline-none text-fg font-mono tabular placeholder:text-faint"
            />
          </Field>

          <Field label="Amount" suffix={`${baseSymbol}-${side.toUpperCase()}`}>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              placeholder="0.000"
              className="w-full bg-transparent outline-none text-fg font-mono tabular placeholder:text-faint"
            />
          </Field>

          <div className="flex items-center justify-between text-[11px] font-mono tabular text-faint">
            <span>Balance</span>
            <span>{formatNumber(1284.32)} {quoteSymbol}</span>
          </div>

          <Button
            variant={orderSide === "buy" ? "success" : "danger"}
            className="w-full"
          >
            {orderSide === "buy" ? "Place buy" : "Place sell"} order
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
