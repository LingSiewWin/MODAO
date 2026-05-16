"use client";

import { useState } from "react";
import { formatUnits, parseUnits, type Address } from "viem";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProposalCountdown } from "@/components/proposals/ProposalCountdown";
import { useLaunchSale } from "@/hooks/use-launch-sale";
import {
  USDC_DECIMALS,
  MODAO_DECIMALS,
  type OnchainProposal,
} from "@/lib/contracts";
import { cn, formatNumber } from "@/lib/utils";

const EXPLORER = "https://testnet.monadexplorer.com/tx";
const FAUCET_AMOUNT = parseUnits("1000", USDC_DECIMALS);
const USDC_INPUT_PATTERN = /^\d*(\.\d{0,6})?$/;

type SaleHandle = ReturnType<typeof useLaunchSale>;

export function CommitPanel({ raw }: { raw: OnchainProposal }) {
  const { address, isConnected } = useAccount();
  const sale = useLaunchSale(raw.sale);

  return (
    <Card className="p-5 space-y-4">
      <PanelHeader saleEndsAt={sale.saleEndsAt} symbol={raw.spec.symbol} />
      <ProgressBar committed={sale.totalCommitted} minRaise={sale.minRaise} />

      {!isConnected ? (
        <NotConnected />
      ) : (
        <PhaseBody sale={sale} raw={raw} address={address!} />
      )}

      {isConnected && sale.canSweep && <SweepAction sale={sale} />}
    </Card>
  );
}

function PanelHeader({
  saleEndsAt,
  symbol,
}: {
  saleEndsAt: bigint;
  symbol: string;
}) {
  const endsAtIso =
    saleEndsAt > 0n
      ? new Date(Number(saleEndsAt) * 1000).toISOString()
      : null;
  return (
    <header className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-faint">
          Launch sale
        </h2>
        <p className="mt-1 text-[11px] text-faint font-mono">
          {symbol} · USDC commit · pro-rata claim on PASS
        </p>
      </div>
      {endsAtIso && <ProposalCountdown endsAt={endsAtIso} />}
    </header>
  );
}

function ProgressBar({
  committed,
  minRaise,
}: {
  committed: bigint;
  minRaise: bigint;
}) {
  const pct =
    minRaise > 0n ? Number((committed * 10000n) / minRaise) / 100 : 0;
  const clamped = Math.min(100, pct);
  const committedUsdc = formatNumber(
    Number(formatUnits(committed, USDC_DECIMALS)),
    2,
  );
  const minUsdc = formatNumber(
    Number(formatUnits(minRaise, USDC_DECIMALS)),
    2,
  );

  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-mono text-fg tabular">{committedUsdc}</span>
        <span className="font-mono text-faint tabular">
          / {minUsdc} USDC ({pct.toFixed(1)}%)
        </span>
      </div>
      <div className="mt-1.5 h-2 rounded-full bg-surface-2 overflow-hidden border border-border">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-300",
            pct >= 100 ? "bg-success" : "bg-brand",
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

function NotConnected() {
  return (
    <div className="rounded-[var(--radius-md)] border border-border bg-surface-2 p-4 text-xs text-muted leading-relaxed text-center">
      <p>Connect a wallet to commit USDC to this sale.</p>
      <div className="mt-3 flex justify-center">
        <ConnectButton.Custom>
          {({ openConnectModal }) => (
            <Button variant="gradient" size="sm" onClick={openConnectModal}>
              Connect wallet
            </Button>
          )}
        </ConnectButton.Custom>
      </div>
    </div>
  );
}

function PhaseBody({
  sale,
  raw,
  address,
}: {
  sale: SaleHandle;
  raw: OnchainProposal;
  address: Address;
}) {
  switch (sale.phase) {
    case "no-sale":
      return null;
    case "commit-allowed":
      return <CommitForm sale={sale} symbol={raw.spec.symbol} address={address} />;
    case "admin-can-finalize":
      return <AdminFinalize sale={sale} />;
    case "awaiting-finalize":
      return <AwaitingFinalize />;
    case "can-claim-tokens":
      return <ClaimTokens sale={sale} symbol={raw.spec.symbol} />;
    case "can-refund":
      return <RefundAction sale={sale} />;
    case "done-success-no-stake":
      return <DoneSuccess sale={sale} />;
    case "done-failed-no-stake":
      return <DoneFailed />;
    default:
      return null;
  }
}

function CommitForm({
  sale,
  symbol,
  address,
}: {
  sale: SaleHandle;
  symbol: string;
  address: Address;
}) {
  const [raw, setRaw] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const parsed = (() => {
    if (!raw || raw === "." || !USDC_INPUT_PATTERN.test(raw)) return 0n;
    try {
      return parseUnits(raw, USDC_DECIMALS);
    } catch {
      return 0n;
    }
  })();

  const hasBalance = sale.usdcBalance >= parsed;
  const needsFaucet = !hasBalance && parsed > 0n;
  const inFlight =
    sale.commitState === "approving" || sale.commitState === "committing";

  const onChange = (v: string) => {
    if (v === "" || USDC_INPUT_PATTERN.test(v)) {
      setRaw(v);
      setValidationError(null);
    } else {
      setValidationError("USDC supports up to 6 decimal places.");
    }
  };

  const submit = () => {
    if (parsed <= 0n) {
      setValidationError("Enter an amount greater than zero.");
      return;
    }
    if (parsed > sale.usdcBalance) {
      setValidationError("Amount exceeds your USDC balance.");
      return;
    }
    setValidationError(null);
    void sale.commit(parsed);
  };

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <label className="text-xs font-medium text-fg" htmlFor="commit-amount">
            Commit USDC
          </label>
          <span className="text-[11px] text-faint font-mono">
            Balance: {formatNumber(Number(formatUnits(sale.usdcBalance, USDC_DECIMALS)), 2)}
          </span>
        </div>
        <input
          id="commit-amount"
          inputMode="decimal"
          placeholder="0.00"
          value={raw}
          onChange={(e) => onChange(e.target.value)}
          disabled={inFlight}
          className="w-full h-10 px-3 rounded-[var(--radius-md)] bg-surface-2 border border-border text-sm text-fg placeholder:text-faint outline-none focus:border-brand font-mono tabular"
        />
        {sale.userCommitment > 0n && (
          <p className="mt-1.5 text-[11px] text-faint">
            Already committed:{" "}
            <span className="font-mono text-fg">
              {formatNumber(Number(formatUnits(sale.userCommitment, USDC_DECIMALS)), 2)} USDC
            </span>
          </p>
        )}
      </div>

      {needsFaucet && (
        <FaucetRow sale={sale} address={address} />
      )}

      <Button
        variant="gradient"
        onClick={submit}
        disabled={inFlight || parsed <= 0n || !hasBalance}
        className="w-full"
      >
        {commitButtonLabel(sale.commitState, symbol)}
      </Button>

      {validationError && (
        <p className="text-xs text-danger">{validationError}</p>
      )}

      <CommitStatus sale={sale} />
    </div>
  );
}

function commitButtonLabel(state: SaleHandle["commitState"], symbol: string) {
  switch (state) {
    case "approving":
      return "Approving USDC…";
    case "committing":
      return "Committing…";
    case "success":
      return `Committed ✓ · commit more ${symbol}?`;
    default:
      return `Commit USDC for ${symbol}`;
  }
}

function FaucetRow({ sale, address }: { sale: SaleHandle; address: Address }) {
  void address;
  return (
    <div className="rounded-[var(--radius-md)] border border-warning/30 bg-warning/5 p-3 text-xs text-warning flex items-center justify-between gap-3">
      <span>Not enough test USDC. Mint some.</span>
      <Button
        variant="ghost"
        size="sm"
        disabled={sale.faucetPending}
        onClick={() => sale.mintTestUsdc(FAUCET_AMOUNT)}
      >
        {sale.faucetPending ? "Minting…" : "Get 1,000 test USDC"}
      </Button>
    </div>
  );
}

function CommitStatus({ sale }: { sale: SaleHandle }) {
  if (sale.commitState === "approving" && sale.approveTxHash) {
    return <PendingBanner label="Approving USDC…" hash={sale.approveTxHash} />;
  }
  if (sale.commitState === "committing" && sale.commitTxHash) {
    return <PendingBanner label="Submitting commit…" hash={sale.commitTxHash} />;
  }
  if (sale.commitConfirming && sale.commitTxHash) {
    return <PendingBanner label="Waiting for confirmation…" hash={sale.commitTxHash} />;
  }
  if (sale.commitState === "success" && sale.commitTxHash) {
    return <SuccessBanner label="Commit confirmed." hash={sale.commitTxHash} />;
  }
  if (sale.commitState === "error" && sale.commitError) {
    return <ErrorBanner error={sale.commitError} />;
  }
  return null;
}

function AdminFinalize({ sale }: { sale: SaleHandle }) {
  return (
    <div className="space-y-3">
      <div className="rounded-[var(--radius-md)] border border-border bg-surface-2 p-3 text-xs text-muted leading-relaxed">
        Window closed. Triggering <span className="font-mono text-fg">finalize()</span> resolves the
        sale outcome on-chain.
      </div>
      <Button
        variant="gradient"
        onClick={() => void sale.finalize()}
        disabled={sale.finalizePending}
        className="w-full"
      >
        {sale.finalizePending ? "Finalizing…" : "Finalize sale"}
      </Button>
      {sale.finalizeTxHash && sale.finalizePending && (
        <PendingBanner label="Submitting finalize…" hash={sale.finalizeTxHash} />
      )}
      {sale.finalizeConfirmed && sale.finalizeTxHash && (
        <SuccessBanner label="Sale finalized." hash={sale.finalizeTxHash} />
      )}
      {sale.finalizeError && <ErrorBanner error={sale.finalizeError} />}
    </div>
  );
}

function AwaitingFinalize() {
  return (
    <div className="rounded-[var(--radius-md)] border border-border bg-surface-2 p-4 text-xs text-muted leading-relaxed text-center">
      Sale window closed. Awaiting the platform to finalize the outcome on-chain.
    </div>
  );
}

function ClaimTokens({ sale, symbol }: { sale: SaleHandle; symbol: string }) {
  const claimable = formatNumber(
    Number(formatUnits(sale.tokensClaimablePreview, MODAO_DECIMALS)),
    4,
  );
  return (
    <div className="space-y-3">
      <div className="rounded-[var(--radius-md)] border border-success/30 bg-success/5 p-3 text-xs text-success leading-relaxed">
        Sale succeeded. You can claim your pro-rata share.
      </div>
      <Button
        variant="gradient"
        onClick={() => void sale.claimTokens()}
        disabled={sale.claimPending}
        className="w-full"
      >
        {sale.claimPending ? "Claiming…" : `Claim ${claimable} ${symbol}`}
      </Button>
      {sale.claimTxHash && sale.claimPending && (
        <PendingBanner label="Claiming tokens…" hash={sale.claimTxHash} />
      )}
      {sale.claimConfirmed && sale.claimTxHash && (
        <SuccessBanner label="Tokens claimed." hash={sale.claimTxHash} />
      )}
      {sale.claimError && <ErrorBanner error={sale.claimError} />}
    </div>
  );
}

function RefundAction({ sale }: { sale: SaleHandle }) {
  const owed = formatNumber(
    Number(formatUnits(sale.userCommitment, USDC_DECIMALS)),
    2,
  );
  return (
    <div className="space-y-3">
      <div className="rounded-[var(--radius-md)] border border-danger/30 bg-danger/5 p-3 text-xs text-danger leading-relaxed">
        Sale failed to clear minimum raise. You can refund your full commitment.
      </div>
      <Button
        variant="gradient"
        onClick={() => void sale.refund()}
        disabled={sale.refundPending}
        className="w-full"
      >
        {sale.refundPending ? "Refunding…" : `Refund ${owed} USDC`}
      </Button>
      {sale.refundTxHash && sale.refundPending && (
        <PendingBanner label="Submitting refund…" hash={sale.refundTxHash} />
      )}
      {sale.refundConfirmed && sale.refundTxHash && (
        <SuccessBanner label="Refunded." hash={sale.refundTxHash} />
      )}
      {sale.refundError && <ErrorBanner error={sale.refundError} />}
    </div>
  );
}

function DoneSuccess({ sale }: { sale: SaleHandle }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-success/30 bg-success/5 p-3 text-xs text-success leading-relaxed">
      Sale succeeded. Total raised:{" "}
      <span className="font-mono">
        {formatNumber(Number(formatUnits(sale.totalCommitted, USDC_DECIMALS)), 2)} USDC
      </span>
      . No commitment found for your wallet — if you already claimed, the tokens are in
      your account.
    </div>
  );
}

function DoneFailed() {
  return (
    <div className="rounded-[var(--radius-md)] border border-danger/30 bg-danger/5 p-3 text-xs text-danger leading-relaxed">
      Sale failed to clear minimum raise. No refund outstanding for your wallet — if you
      already refunded, the USDC is back in your balance.
    </div>
  );
}

function SweepAction({ sale }: { sale: SaleHandle }) {
  const amount = formatNumber(
    Number(formatUnits(sale.saleUsdcBalance, USDC_DECIMALS)),
    2,
  );
  return (
    <div className="pt-3 border-t border-border space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted leading-relaxed">
          As recipient, you can sweep the raised USDC to your wallet.
        </p>
      </div>
      <Button
        variant="secondary"
        onClick={() => void sale.claimFunds()}
        disabled={sale.sweepPending}
        className="w-full"
      >
        {sale.sweepPending ? "Sweeping…" : `Sweep ${amount} USDC`}
      </Button>
      {sale.sweepTxHash && sale.sweepPending && (
        <PendingBanner label="Sweeping funds…" hash={sale.sweepTxHash} />
      )}
      {sale.sweepConfirmed && sale.sweepTxHash && (
        <SuccessBanner label="USDC swept." hash={sale.sweepTxHash} />
      )}
      {sale.sweepError && <ErrorBanner error={sale.sweepError} />}
    </div>
  );
}

function PendingBanner({ label, hash }: { label: string; hash: `0x${string}` }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-brand/30 bg-brand/5 p-3 text-xs text-brand-3 flex items-center gap-2">
      <span className="size-1.5 rounded-full bg-brand-3 animate-pulse" />
      <span>{label}</span>
      <ExplorerLink hash={hash} className="ml-auto" />
    </div>
  );
}

function SuccessBanner({ label, hash }: { label: string; hash: `0x${string}` }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-success/30 bg-success/5 p-3 text-xs text-success flex items-center gap-2">
      <span>{label}</span>
      <ExplorerLink hash={hash} className="ml-auto" />
    </div>
  );
}

function ErrorBanner({ error }: { error: Error }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-danger/30 bg-danger/5 p-3 text-xs text-danger break-words">
      {error.message.slice(0, 240)}
    </div>
  );
}

function ExplorerLink({
  hash,
  className,
}: {
  hash: `0x${string}`;
  className?: string;
}) {
  return (
    <a
      href={`${EXPLORER}/${hash}`}
      target="_blank"
      rel="noreferrer"
      className={cn("font-mono underline-offset-2 hover:underline", className)}
    >
      {hash.slice(0, 8)}…{hash.slice(-4)}
    </a>
  );
}
