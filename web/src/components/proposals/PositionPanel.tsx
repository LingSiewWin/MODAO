"use client";

import { useState } from "react";
import { formatUnits, type Address } from "viem";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  useVaultActions,
  type VaultAction,
  type VaultSide,
  type VaultActionStep,
} from "@/hooks/use-vault-actions";
import { cn, formatNumber } from "@/lib/utils";
import { MODAO_DECIMALS, USDC_DECIMALS } from "@/lib/contracts";

/**
 * Your position — direct vault actions independent of the buy/sell trade
 * flow. Three actions × two sides:
 *
 *   deposit · mint pass+fail conditional tokens from real underlying
 *   merge   · burn equal pass+fail back to real underlying (pre-finalize)
 *   redeem  · post-finalize, burn winning-side tokens for 1:1 underlying
 *
 * Layout: balance grid on top, action selector below. The action selector
 * is one compact form parameterised by (action, side, amount) — cuts the
 * surface vs. six separate buttons + modals.
 */
export function PositionPanel({
  usdcVault,
  projectVault,
  projectToken,
  projectSymbol,
}: {
  usdcVault: Address;
  projectVault: Address;
  /** Per-proposal ProjectToken address; required for project-side deposits. */
  projectToken: Address;
  /** Project's ERC20 symbol (e.g. "ACME") — used for UI labels. */
  projectSymbol: string;
}) {
  const { isConnected } = useAccount();
  const [action, setAction] = useState<VaultAction>("deposit");
  const [side, setSide] = useState<VaultSide>("usdc");
  const [amount, setAmount] = useState("");

  const {
    run,
    reset,
    step,
    error,
    lastTx,
    lastAction,
    isWorking,
    balances,
    outcomes,
  } = useVaultActions({ usdcVault, projectVault, projectToken });

  const decimals = side === "usdc" ? USDC_DECIMALS : MODAO_DECIMALS;
  const isFinalized =
    side === "usdc" ? outcomes.usdc !== 0 : outcomes.modao !== 0;
  const canRedeem = isFinalized; // contract enforces; this just gates the UI

  // Sensible "max" per action:
  //   deposit → your real-token balance (no cap; auto-mints USDC if short)
  //   merge   → min(passSide, failSide) — you need both to merge
  //   redeem  → balance of whichever side won (pass or fail)
  const maxBigInt = (() => {
    if (action === "deposit") {
      return side === "usdc" ? balances.usdc : balances.modao;
    }
    if (action === "merge") {
      return side === "usdc"
        ? bigMin(balances.passUsdc, balances.failUsdc)
        : bigMin(balances.passModao, balances.failModao);
    }
    // redeem
    if (side === "usdc") {
      return outcomes.usdc === 1 ? balances.passUsdc : balances.failUsdc;
    }
    return outcomes.modao === 1 ? balances.passModao : balances.failModao;
  })();

  const setMax = () => setAmount(formatUnits(maxBigInt, decimals));

  return (
    <Card className="p-5">
      <header className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-faint">
          Your position
        </h2>
        {isConnected && !isFinalized && (
          <span className="text-[10px] font-mono text-faint">pre-finalize</span>
        )}
        {isConnected && isFinalized && (
          <span
            className={cn(
              "text-[10px] font-mono",
              (side === "usdc" ? outcomes.usdc : outcomes.modao) === 1
                ? "text-success"
                : "text-danger",
            )}
          >
            finalized · {(side === "usdc" ? outcomes.usdc : outcomes.modao) === 1 ? "PASS" : "FAIL"}
          </span>
        )}
      </header>

      {!isConnected ? (
        <ConnectButton.Custom>
          {({ openConnectModal }) => (
            <Button variant="secondary" className="w-full" onClick={openConnectModal}>
              Connect wallet to view position
            </Button>
          )}
        </ConnectButton.Custom>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 text-xs font-mono tabular">
            <Balance label="USDC" amount={balances.usdc} decimals={USDC_DECIMALS} tone="muted" />
            <Balance label={projectSymbol} amount={balances.modao} decimals={MODAO_DECIMALS} tone="muted" />
            <Balance label="PASS-USDC" amount={balances.passUsdc} decimals={USDC_DECIMALS} tone="success" />
            <Balance label={`PASS-${projectSymbol}`} amount={balances.passModao} decimals={MODAO_DECIMALS} tone="success" />
            <Balance label="FAIL-USDC" amount={balances.failUsdc} decimals={USDC_DECIMALS} tone="danger" />
            <Balance label={`FAIL-${projectSymbol}`} amount={balances.failModao} decimals={MODAO_DECIMALS} tone="danger" />
          </div>

          <div className="mt-5 pt-4 border-t border-border space-y-3">
            <div className="flex rounded-[var(--radius-md)] bg-surface-2 p-1 text-xs">
              {(["deposit", "merge", "redeem"] as VaultAction[]).map((a) => (
                <button
                  key={a}
                  onClick={() => setAction(a)}
                  disabled={a === "redeem" && !canRedeem}
                  className={cn(
                    "flex-1 h-8 rounded-[var(--radius-sm)] font-medium transition-colors capitalize",
                    action === a
                      ? "bg-surface text-fg border border-border"
                      : "text-muted hover:text-fg disabled:opacity-40 disabled:cursor-not-allowed",
                  )}
                >
                  {a}
                </button>
              ))}
            </div>

            <div className="flex rounded-[var(--radius-md)] bg-surface-2 p-1 text-xs">
              {(["usdc", "modao"] as VaultSide[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSide(s)}
                  className={cn(
                    "flex-1 h-8 rounded-[var(--radius-sm)] font-medium transition-colors uppercase",
                    side === s
                      ? "bg-surface text-fg border border-border"
                      : "text-muted hover:text-fg",
                  )}
                >
                  {s === "usdc" ? "USDC" : projectSymbol}
                </button>
              ))}
            </div>

            <label className="block">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-medium text-muted capitalize">
                  Amount ({side === "usdc" ? "USDC" : projectSymbol})
                </span>
                <button
                  onClick={setMax}
                  className="text-[10px] font-mono text-brand-3 hover:text-brand"
                >
                  max {formatNumber(Number(formatUnits(maxBigInt, decimals)), 4)}
                </button>
              </div>
              <div className="flex items-center rounded-[var(--radius-md)] bg-surface-2 border border-border px-3 h-10 focus-within:border-brand">
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                  inputMode="decimal"
                  placeholder="0.000"
                  className="w-full bg-transparent outline-none text-fg font-mono tabular placeholder:text-faint"
                />
              </div>
            </label>

            <p className="text-[10px] text-faint leading-relaxed">{actionHint(action, side, projectSymbol)}</p>

            <Button
              variant={action === "redeem" ? "success" : "primary"}
              className="w-full"
              onClick={() => run(action, side, amount)}
              disabled={isWorking || !amount}
            >
              {actionLabel(step, action)}
            </Button>

            {(step !== "idle") && (
              <StatusBanner
                step={step}
                error={error}
                lastTx={lastTx}
                lastAction={lastAction}
                onReset={reset}
              />
            )}
          </div>
        </>
      )}
    </Card>
  );
}

function Balance({
  label,
  amount,
  decimals,
  tone,
}: {
  label: string;
  amount: bigint;
  decimals: number;
  tone: "muted" | "success" | "danger";
}) {
  const human = Number(formatUnits(amount, decimals));
  return (
    <div
      className={cn(
        "rounded-[var(--radius-md)] border bg-surface-2 px-3 py-2.5",
        tone === "success" && "border-success/20",
        tone === "danger" && "border-danger/20",
        tone === "muted" && "border-border",
      )}
    >
      <p className="text-[10px] uppercase tracking-widest text-faint">{label}</p>
      <p
        className={cn(
          "mt-0.5 text-sm tabular",
          tone === "success" && "text-success",
          tone === "danger" && "text-danger",
          tone === "muted" && "text-fg",
        )}
      >
        {formatNumber(human, human < 1 ? 4 : 2)}
      </p>
    </div>
  );
}

function actionHint(action: VaultAction, side: VaultSide, projectSymbol: string): string {
  const sym = side === "usdc" ? "USDC" : projectSymbol;
  if (action === "deposit") {
    return `Lock ${sym} in the vault. Receive an equal amount of PASS-${sym} and FAIL-${sym}.`;
  }
  if (action === "merge") {
    return `Burn equal PASS-${sym} and FAIL-${sym}. Get your real ${sym} back. Only works pre-finalize.`;
  }
  return `Burn winning-side ${sym} 1:1 for real ${sym}. Available after the proposal finalizes.`;
}

function actionLabel(step: VaultActionStep, action: VaultAction): string {
  if (step === "success") return "Done ✓";
  if (step === "minting-usdc") return "Minting USDC…";
  if (step === "approving") return "Approving…";
  if (step === "depositing") return "Depositing…";
  if (step === "merging") return "Merging…";
  if (step === "redeeming") return "Redeeming…";
  return action.charAt(0).toUpperCase() + action.slice(1);
}

function StatusBanner({
  step,
  error,
  lastTx,
  lastAction,
  onReset,
}: {
  step: VaultActionStep;
  error: Error | null;
  lastTx: `0x${string}` | null;
  lastAction: VaultAction | null;
  onReset: () => void;
}) {
  if (step === "success") {
    return (
      <div className="rounded-[var(--radius-md)] border border-success/30 bg-success/5 px-3 py-2 text-[11px] text-success flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-success" />
          {lastAction ? `${lastAction.charAt(0).toUpperCase()}${lastAction.slice(1)} confirmed` : "Done"}
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
          Again
        </button>
      </div>
    );
  }
  if (step === "error") {
    return (
      <div className="rounded-[var(--radius-md)] border border-danger/30 bg-danger/5 px-3 py-2 text-[11px] text-danger break-words">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="font-medium">Failed</span>
          <button onClick={onReset} className="text-muted hover:text-fg">
            Reset
          </button>
        </div>
        {error?.message?.slice(0, 200) ?? "Unknown error"}
      </div>
    );
  }
  return (
    <div className="rounded-[var(--radius-md)] border border-brand/30 bg-brand/5 px-3 py-2 text-[11px] text-brand-3 flex items-center gap-2">
      <span className="size-1.5 rounded-full bg-brand-3 animate-pulse" />
      Step in progress — confirm in wallet
    </div>
  );
}

function bigMin(a: bigint, b: bigint): bigint {
  return a < b ? a : b;
}
