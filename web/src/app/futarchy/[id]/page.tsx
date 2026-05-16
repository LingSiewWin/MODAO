"use client";

import Link from "next/link";
import { use, useState } from "react";
import { formatUnits, parseUnits, type Address } from "viem";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  CONTRACTS,
  futarchyFactoryAbi,
  futarchyMarketAbi,
  conditionalVaultAbi,
  proposalAmmAbi,
  erc20Abi,
  FutarchyMarketState,
  FutarchyOutcome,
  USDC_DECIMALS,
  MODAO_DECIMALS,
} from "@/lib/contracts";
import {
  useFutarchyMarket,
  useVaultConditionalTokens,
  describeOutcome,
  factoryDeployed,
} from "@/hooks/use-futarchy";
import { cn } from "@/lib/utils";

export default function FutarchyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const marketId = BigInt(id);

  const { data: marketAddress } = useReadContract({
    address: CONTRACTS.futarchyFactory,
    abi: futarchyFactoryAbi,
    functionName: "marketsByGlobalId",
    args: [marketId],
    query: { enabled: factoryDeployed },
  });

  const { market, isLoading, refetch } = useFutarchyMarket(marketAddress as Address | undefined);

  if (isLoading || !market) {
    return (
      <AppShell>
        <div className="h-96 rounded-[var(--radius-lg)] border border-border bg-surface/40 animate-pulse" />
      </AppShell>
    );
  }

  const status = describeOutcome(market.state, market.outcome, market.tradingEndsAt);
  const passNum = Number(market.passTwap) / 1e18;
  const failNum = Number(market.failTwap) / 1e18;

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between gap-3">
        <Link
          href="/futarchy"
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-fg font-medium"
        >
          <span aria-hidden>←</span> Governance markets
        </Link>
        <span className="px-2 py-0.5 rounded bg-[#7c3aed]/15 text-[#a78bfa] font-medium text-[10px] uppercase tracking-widest">
          Futarchy market
        </span>
      </div>

      <header className="mb-8">
        <div className="flex items-center gap-2 text-xs font-mono text-faint">
          <span>Market #{market.marketId.toString()}</span>
          <span aria-hidden>·</span>
          <span className="truncate">
            project {market.projectToken.slice(0, 10)}…{market.projectToken.slice(-4)}
          </span>
        </div>
        <h1 className="mt-2 text-2xl sm:text-3xl font-semibold text-fg tracking-tight">
          {market.description}
        </h1>
        <div className="mt-3 flex items-center gap-3 text-xs text-muted">
          <span>
            Proposer{" "}
            <span className="font-mono text-fg">
              {market.proposer.slice(0, 6)}…{market.proposer.slice(-4)}
            </span>
          </span>
          <span aria-hidden>·</span>
          <span>
            {status === "trading"
              ? `Trading until ${new Date(market.tradingEndsAt).toLocaleString()}`
              : status === "ready-to-resolve"
                ? "Trading ended — awaiting resolve()"
                : status === "passed"
                  ? "Resolved · PASS"
                  : "Resolved · FAIL"}
          </span>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-faint mb-3">
              Live TWAP (USDC per PROJECT)
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <BigTwap label="Pass" tone="success" value={passNum} lead={passNum >= failNum} />
              <BigTwap label="Fail" tone="danger" value={failNum} lead={failNum > passNum} />
            </div>
            {!market.seeded && (
              <div className="mt-3 rounded-[var(--radius-md)] border border-warning/30 bg-warning/5 p-3 text-xs text-warning">
                Market is unseeded. The proposer needs to add initial liquidity
                before trading can start.
              </div>
            )}
          </Card>

          {status === "trading" && market.seeded && (
            <TradePanel market={market} onAction={refetch} />
          )}

          {!market.seeded && (
            <SeedPanel market={market} onAction={refetch} />
          )}

          {status === "ready-to-resolve" && <ResolvePanel market={market} onAction={refetch} />}

          {(status === "passed" || status === "failed") && (
            <RedeemPanel market={market} />
          )}
        </div>

        <aside className="space-y-4">
          <Card className="p-5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-faint mb-3">
              Contracts
            </h2>
            <dl className="space-y-2 text-[11px] font-mono">
              <AddrRow label="Market" value={market.address} />
              <AddrRow label="Project vault" value={market.projectVault} />
              <AddrRow label="USDC vault" value={market.usdcVault} />
              <AddrRow label="Pass AMM" value={market.passAmm} />
              <AddrRow label="Fail AMM" value={market.failAmm} />
            </dl>
          </Card>
        </aside>
      </div>
    </AppShell>
  );
}

function BigTwap({
  label,
  tone,
  value,
  lead,
}: {
  label: string;
  tone: "success" | "danger";
  value: number;
  lead: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-md)] border px-4 py-3",
        tone === "success" && "border-success/30 bg-success/5",
        tone === "danger" && "border-danger/30 bg-danger/5",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-faint">{label}</span>
        {lead && <span className="text-[9px] font-mono text-fg uppercase">leading</span>}
      </div>
      <p
        className={cn(
          "mt-1 font-mono tabular text-2xl font-semibold",
          tone === "success" ? "text-success" : "text-danger",
        )}
      >
        {value > 0 ? value.toFixed(4) : "—"}
      </p>
    </div>
  );
}

function AddrRow({ label, value }: { label: string; value: Address }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-faint">{label}</span>
      <a
        href={`https://testnet.monadexplorer.com/address/${value}`}
        target="_blank"
        rel="noreferrer"
        className="text-fg hover:text-brand-3 truncate max-w-[160px]"
      >
        {value.slice(0, 6)}…{value.slice(-4)}
      </a>
    </div>
  );
}

// ---------------- seed liquidity (proposer only) ----------------

function SeedPanel({
  market,
  onAction,
}: {
  market: ReturnType<typeof useFutarchyMarket>["market"] & {};
  onAction: () => void;
}) {
  const { address } = useAccount();
  const [projectAmt, setProjectAmt] = useState("100");
  const [usdcAmt, setUsdcAmt] = useState("100");
  const { writeContractAsync, isPending } = useWriteContract();

  if (!market) return null;
  const isProposer = address?.toLowerCase() === market.proposer.toLowerCase();

  const seed = async () => {
    const pAmt = parseUnits(projectAmt || "0", MODAO_DECIMALS);
    const uAmt = parseUnits(usdcAmt || "0", USDC_DECIMALS);
    // 1. approve project + usdc to the market.
    await writeContractAsync({
      address: market.projectToken,
      abi: erc20Abi,
      functionName: "approve",
      args: [market.address, pAmt],
    });
    await writeContractAsync({
      address: CONTRACTS.mockUsdc,
      abi: erc20Abi,
      functionName: "approve",
      args: [market.address, uAmt],
    });
    // 2. seed
    await writeContractAsync({
      address: market.address,
      abi: futarchyMarketAbi,
      functionName: "seedLiquidity",
      args: [pAmt, uAmt],
    });
    onAction();
  };

  return (
    <Card className="p-5">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-faint mb-1">
        Seed initial liquidity
      </h2>
      <p className="text-xs text-muted leading-relaxed">
        The proposer seeds both AMMs with the same (project, USDC) reserves so
        pass/fail start at the same implied price. After this, anyone can trade.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <NumberField
          label="Project tokens"
          value={projectAmt}
          onChange={setProjectAmt}
        />
        <NumberField label="USDC" value={usdcAmt} onChange={setUsdcAmt} />
      </div>
      <div className="mt-4 flex items-center justify-end">
        <Button
          variant="gradient"
          disabled={!isProposer || isPending}
          onClick={seed}
        >
          {!isProposer ? "Only proposer can seed" : isPending ? "Seeding…" : "Seed liquidity"}
        </Button>
      </div>
    </Card>
  );
}

// ---------------- trade (mint conditional + swap on AMM) ----------------

function TradePanel({
  market,
  onAction,
}: {
  market: NonNullable<ReturnType<typeof useFutarchyMarket>["market"]>;
  onAction: () => void;
}) {
  const { address } = useAccount();
  const [side, setSide] = useState<"pass" | "fail">("pass");
  const [direction, setDirection] = useState<"buy" | "sell">("buy"); // buy = USDC → PROJECT
  const [amount, setAmount] = useState("10");
  const { writeContractAsync, isPending } = useWriteContract();
  const { tokens } = useVaultConditionalTokens(market.projectVault, market.usdcVault);

  const vault = direction === "buy" ? market.usdcVault : market.projectVault;
  const amm = side === "pass" ? market.passAmm : market.failAmm;
  // token0 in each AMM is the PROJECT side, token1 is the USDC side. "buy"
  // means swapping USDC-side → PROJECT-side, so zeroForOne = false.
  const zeroForOne = direction === "sell";
  const tokenIn = direction === "buy" ? CONTRACTS.mockUsdc : market.projectToken;
  const decimals = direction === "buy" ? USDC_DECIMALS : MODAO_DECIMALS;

  const trade = async () => {
    if (!address || !tokens) return;
    const amt = parseUnits(amount || "0", decimals);
    // The active conditional token = the side we want to trade out of on the
    // chosen pass/fail AMM. We approve that to the AMM.
    const activeCondToken =
      direction === "buy"
        ? side === "pass"
          ? tokens.passUsdc
          : tokens.failUsdc
        : side === "pass"
          ? tokens.passProject
          : tokens.failProject;

    // 1. approve underlying to the vault
    await writeContractAsync({
      address: tokenIn,
      abi: erc20Abi,
      functionName: "approve",
      args: [vault, amt],
    });
    // 2. deposit to mint pass+fail conditional tokens
    await writeContractAsync({
      address: vault,
      abi: conditionalVaultAbi,
      functionName: "deposit",
      args: [amt],
    });
    // 3. approve the active-side conditional token to the AMM
    await writeContractAsync({
      address: activeCondToken,
      abi: erc20Abi,
      functionName: "approve",
      args: [amm, amt],
    });
    // 4. swap, recipient = user
    await writeContractAsync({
      address: amm,
      abi: proposalAmmAbi,
      functionName: "swap",
      args: [zeroForOne, amt, 0n, address],
    });
    onAction();
  };

  return (
    <Card className="p-5">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-faint mb-1">
        Trade pass / fail
      </h2>
      <p className="text-xs text-muted leading-relaxed">
        Deposit underlying into the conditional vault to get paired pass+fail
        tokens, then trade the side you believe in. The other side stays in
        your wallet — useful if you want to hedge.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Toggle
          options={[
            { value: "pass", label: "Pass" },
            { value: "fail", label: "Fail" },
          ]}
          value={side}
          onChange={(v) => setSide(v as "pass" | "fail")}
          tone={side === "pass" ? "success" : "danger"}
        />
        <Toggle
          options={[
            { value: "buy", label: "Buy PROJECT" },
            { value: "sell", label: "Sell PROJECT" },
          ]}
          value={direction}
          onChange={(v) => setDirection(v as "buy" | "sell")}
          tone="brand"
        />
      </div>

      <div className="mt-3">
        <NumberField
          label={direction === "buy" ? "USDC in" : "PROJECT in"}
          value={amount}
          onChange={setAmount}
        />
      </div>

      <div className="mt-4 flex items-center justify-end">
        <Button variant="gradient" disabled={isPending} onClick={trade}>
          {isPending ? "Trading…" : `Trade on ${side.toUpperCase()} market`}
        </Button>
      </div>
    </Card>
  );
}

// ---------------- resolve ----------------

function ResolvePanel({
  market,
  onAction,
}: {
  market: NonNullable<ReturnType<typeof useFutarchyMarket>["market"]>;
  onAction: () => void;
}) {
  const { writeContractAsync, isPending } = useWriteContract();
  const resolve = async () => {
    await writeContractAsync({
      address: market.address,
      abi: futarchyMarketAbi,
      functionName: "resolve",
    });
    onAction();
  };
  return (
    <Card className="p-5 border-warning/30 bg-warning/5">
      <h2 className="text-sm font-semibold text-warning">Trading window closed</h2>
      <p className="mt-1 text-xs text-muted leading-relaxed">
        Anyone can call <code className="font-mono">resolve()</code> now. The
        side with the higher TWAP wins; the corresponding vault outcome flips
        and winning conditional tokens become redeemable 1:1.
      </p>
      <div className="mt-3 flex items-center justify-end">
        <Button variant="gradient" disabled={isPending} onClick={resolve}>
          {isPending ? "Resolving…" : "Resolve market"}
        </Button>
      </div>
    </Card>
  );
}

// ---------------- redeem after resolution ----------------

function RedeemPanel({
  market,
}: {
  market: NonNullable<ReturnType<typeof useFutarchyMarket>["market"]>;
}) {
  const [projectAmt, setProjectAmt] = useState("0");
  const [usdcAmt, setUsdcAmt] = useState("0");
  const { writeContractAsync, isPending } = useWriteContract();

  const redeem = async (vault: Address, raw: string, decimals: number) => {
    const amt = parseUnits(raw || "0", decimals);
    if (amt === 0n) return;
    await writeContractAsync({
      address: vault,
      abi: conditionalVaultAbi,
      functionName: "redeem",
      args: [amt],
    });
  };

  const isPass = market.outcome === FutarchyOutcome.Pass;
  return (
    <Card className="p-5">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-faint mb-1">
        Redeem
      </h2>
      <p className="text-xs text-muted leading-relaxed">
        Market resolved to{" "}
        <span className={cn("font-semibold", isPass ? "text-success" : "text-danger")}>
          {isPass ? "PASS" : "FAIL"}
        </span>
        . Burn your winning conditional tokens to recover the underlying 1:1.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <NumberField label="Project to redeem" value={projectAmt} onChange={setProjectAmt} />
          <Button
            className="mt-2 w-full"
            variant="primary"
            disabled={isPending}
            onClick={() => redeem(market.projectVault, projectAmt, MODAO_DECIMALS)}
          >
            Redeem PROJECT
          </Button>
        </div>
        <div>
          <NumberField label="USDC to redeem" value={usdcAmt} onChange={setUsdcAmt} />
          <Button
            className="mt-2 w-full"
            variant="primary"
            disabled={isPending}
            onClick={() => redeem(market.usdcVault, usdcAmt, USDC_DECIMALS)}
          >
            Redeem USDC
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ---------------- shared bits ----------------

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <span className="text-[10px] uppercase tracking-widest text-faint">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ""))}
        inputMode="decimal"
        className="mt-1 w-full h-10 px-3 font-mono tabular rounded-[var(--radius-md)] bg-surface-2 border border-border text-sm text-fg outline-none focus:border-brand"
      />
    </div>
  );
}

function Toggle({
  options,
  value,
  onChange,
  tone,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  tone: "success" | "danger" | "brand";
}) {
  return (
    <div className="flex rounded-[var(--radius-md)] bg-surface-2 border border-border p-0.5">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex-1 px-2 py-1.5 text-xs font-medium rounded-[var(--radius-sm)] transition-colors",
              !active && "text-muted hover:text-fg",
              active && tone === "success" && "bg-success/15 text-success",
              active && tone === "danger" && "bg-danger/15 text-danger",
              active && tone === "brand" && "bg-brand/15 text-brand-3",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
