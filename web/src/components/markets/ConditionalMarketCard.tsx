"use client";

import { useMemo, useState } from "react";
import { parseUnits, formatUnits, type Address } from "viem";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TwapDisplay } from "./TwapDisplay";
import { DepthLadder } from "./DepthLadder";
import { OrderBook } from "./OrderBook";
import { cn, formatNumber } from "@/lib/utils";
import { quoteTrade, type LadderRow } from "@/lib/amm-math";
import { MODAO_DECIMALS, USDC_DECIMALS } from "@/lib/contracts";
import { useTradeProposal, type TradeStep } from "@/hooks/use-trade-proposal";
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
    // Vault + AMM addresses for the trade flow. Both AMMs are passed in so
    // the hook can route to the right side.
    passAmm: Address;
    failAmm: Address;
    usdcVault: Address;
    projectVault: Address;
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
  const { isConnected } = useAccount();

  const {
    trade,
    reset,
    step,
    error,
    lastTx,
    isWorking,
    balances,
  } = useTradeProposal({
    passAmm: live?.passAmm,
    failAmm: live?.failAmm,
    usdcVault: live?.usdcVault,
    projectVault: live?.projectVault,
    side,
  });

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

  const onTrade = async () => {
    if (!amount) return;
    await trade({ direction: orderSide, amount });
  };

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

          {/* Balances when wallet connected + live */}
          {live && isConnected && (
            <div className="flex items-center justify-between text-[11px] font-mono tabular text-faint">
              <span>Balance</span>
              <span>
                {orderSide === "buy"
                  ? `${formatNumber(Number(formatUnits(balances.usdc, USDC_DECIMALS)), 2)} ${quoteSymbol}`
                  : `${formatNumber(Number(formatUnits(balances.conditionalModao, MODAO_DECIMALS)), 4)} ${baseSymbol}-${side.toUpperCase()}`}
              </span>
            </div>
          )}

          {/* Trade button — real flow when live + connected, otherwise gated */}
          {!live ? (
            <Button
              variant={orderSide === "buy" ? "success" : "danger"}
              className="w-full"
              disabled
            >
              Markets not open yet
            </Button>
          ) : !isConnected ? (
            <ConnectButton.Custom>
              {({ openConnectModal }) => (
                <Button variant="gradient" className="w-full" onClick={openConnectModal}>
                  Connect wallet to trade
                </Button>
              )}
            </ConnectButton.Custom>
          ) : (
            <Button
              variant={orderSide === "buy" ? "success" : "danger"}
              className="w-full"
              onClick={onTrade}
              disabled={isWorking || !amount}
            >
              {tradeLabel(step, orderSide, side)}
            </Button>
          )}

          {/* Per-step progress banner */}
          {live && isConnected && (step !== "idle") && (
            <TradeStatus step={step} error={error} lastTx={lastTx} onReset={reset} />
          )}

          {/* Buyer-side leftover warning — futarchy UX truth */}
          {live && isConnected && orderSide === "buy" && step === "idle" && amount && (
            <p className="text-[10px] text-faint leading-relaxed">
              You'll receive {baseSymbol}-{side.toUpperCase()} and keep an equal amount
              of {quoteSymbol}-{side === "pass" ? "FAIL" : "PASS"} from the deposit. Sell
              it on the other market or hold until the proposal finalizes.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

function tradeLabel(step: TradeStep, dir: "buy" | "sell", side: "pass" | "fail"): string {
  if (step === "success") return "Done ✓";
  if (step === "minting-usdc") return "Minting USDC…";
  if (step === "approving-input") return dir === "buy" ? "Approving USDC…" : "Approving token…";
  if (step === "depositing-collateral") return "Splitting into PASS+FAIL…";
  if (step === "approving-conditional") return "Approving conditional…";
  if (step === "swapping") return "Swapping…";
  return dir === "buy" ? `Buy ${side === "pass" ? "PASS" : "FAIL"}` : `Sell ${side === "pass" ? "PASS" : "FAIL"}`;
}

function TradeStatus({
  step,
  error,
  lastTx,
  onReset,
}: {
  step: TradeStep;
  error: Error | null;
  lastTx: `0x${string}` | null;
  onReset: () => void;
}) {
  if (step === "success") {
    return (
      <div className="rounded-[var(--radius-md)] border border-success/30 bg-success/5 px-3 py-2 text-[11px] text-success flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-success" />
          Trade landed
          {lastTx && (
            <a
              href={`https://testnet.monadexplorer.com/tx/${lastTx}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono underline-offset-2 hover:underline ml-1"
            >
              {lastTx.slice(0, 8)}…
            </a>
          )}
        </span>
        <button onClick={onReset} className="text-muted hover:text-fg">
          Trade again
        </button>
      </div>
    );
  }
  if (step === "error") {
    return (
      <div className="rounded-[var(--radius-md)] border border-danger/30 bg-danger/5 px-3 py-2 text-[11px] text-danger break-words">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="font-medium">Trade failed</span>
          <button onClick={onReset} className="text-muted hover:text-fg">
            Reset
          </button>
        </div>
        {error?.message?.slice(0, 200) ?? "Unknown error"}
      </div>
    );
  }
  // Working state
  return (
    <div className="rounded-[var(--radius-md)] border border-brand/30 bg-brand/5 px-3 py-2 text-[11px] text-brand-3 flex items-center gap-2">
      <span className="size-1.5 rounded-full bg-brand-3 animate-pulse" />
      Step in progress — confirm in wallet
    </div>
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
