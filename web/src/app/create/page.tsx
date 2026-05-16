"use client";

import { useState } from "react";
import { parseUnits } from "viem";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useSubmitProposal, type SubmitState } from "@/hooks/use-submit-proposal";
import { cn, formatNumber } from "@/lib/utils";
import { formatUnits } from "viem";

const STEPS = [
  { key: "describe", title: "Describe", body: "Project name, symbol, and pitch URL." },
  { key: "tokenomics", title: "Tokenomics", body: "Total token supply." },
  { key: "raise", title: "Bond", body: "Post the proposer bond — refunded on PASS." },
  { key: "review", title: "Review", body: "Confirm and submit on-chain." },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

interface FormState {
  name: string;
  symbol: string;
  descriptionURI: string;
  supply: string;
}

const INITIAL: FormState = {
  name: "",
  symbol: "",
  descriptionURI: "",
  supply: "1000000",
};

export default function CreatePage() {
  const [step, setStep] = useState<StepKey>("describe");
  const [form, setForm] = useState<FormState>(INITIAL);
  const stepIdx = STEPS.findIndex((s) => s.key === step);

  const { address, isConnected } = useAccount();
  const {
    submit,
    state,
    error,
    txHash,
    modaoBalance,
    usdcBalance,
    bondMODAO,
    bondUSDC,
    canSubmit,
  } = useSubmitProposal();

  const setField = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async () => {
    if (!form.name || !form.symbol) return;
    await submit({
      name: form.name,
      symbol: form.symbol,
      supply: parseUnits(form.supply || "0", 18),
      descriptionURI: form.descriptionURI,
    });
  };

  return (
    <AppShell
      title="Create a proposal"
      description="Submit a project to the futarchy market on Monad. AI agents pre-screen, then markets decide."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <aside className="space-y-4">
          <ol className="space-y-1">
            {STEPS.map((s, i) => {
              const done = i < stepIdx;
              const current = i === stepIdx;
              return (
                <li key={s.key}>
                  <button
                    onClick={() => setStep(s.key)}
                    className={cn(
                      "w-full text-left flex items-start gap-3 rounded-[var(--radius-md)] p-3 transition-colors",
                      current
                        ? "bg-surface border border-border"
                        : "hover:bg-surface/60 border border-transparent",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 inline-flex size-6 items-center justify-center rounded-full text-xs font-mono tabular shrink-0",
                        done && "bg-success/15 text-success",
                        current && "bg-brand text-white",
                        !done && !current && "bg-surface-2 text-muted",
                      )}
                    >
                      {done ? "✓" : i + 1}
                    </span>
                    <div>
                      <p className={cn("text-sm font-medium", current ? "text-fg" : "text-muted")}>
                        {s.title}
                      </p>
                      <p className="text-xs text-faint leading-relaxed mt-0.5">{s.body}</p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>

          <BalancePanel
            address={address}
            modaoBalance={modaoBalance}
            usdcBalance={usdcBalance}
            bondMODAO={bondMODAO}
            bondUSDC={bondUSDC}
          />
        </aside>

        <Card className="p-6 sm:p-8">
          {step === "describe" && <DescribeStep form={form} setField={setField} />}
          {step === "tokenomics" && <TokenomicsStep form={form} setField={setField} />}
          {step === "raise" && (
            <RaiseStep bondMODAO={bondMODAO} bondUSDC={bondUSDC} />
          )}
          {step === "review" && (
            <ReviewStep
              form={form}
              bondMODAO={bondMODAO}
              bondUSDC={bondUSDC}
              state={state}
              error={error}
              txHash={txHash}
            />
          )}

          <div className="mt-8 flex items-center justify-between pt-6 border-t border-border gap-3">
            <Button
              variant="ghost"
              disabled={stepIdx === 0}
              onClick={() => setStep(STEPS[Math.max(0, stepIdx - 1)].key)}
            >
              Back
            </Button>

            {stepIdx < STEPS.length - 1 ? (
              <Button onClick={() => setStep(STEPS[stepIdx + 1].key)} variant="primary">
                Continue
              </Button>
            ) : !isConnected ? (
              <ConnectButton.Custom>
                {({ openConnectModal }) => (
                  <Button variant="gradient" onClick={openConnectModal}>
                    Connect wallet to submit
                  </Button>
                )}
              </ConnectButton.Custom>
            ) : (
              <Button
                variant="gradient"
                onClick={onSubmit}
                disabled={!canSubmit || state === "submitting" || state === "approving-modao" || state === "approving-usdc"}
              >
                {submitLabel(state)}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function submitLabel(s: SubmitState) {
  switch (s) {
    case "minting-usdc":
      return "Minting USDC…";
    case "approving-modao":
      return "Approving MODAO…";
    case "approving-usdc":
      return "Approving USDC…";
    case "submitting":
      return "Submitting…";
    case "success":
      return "Submitted ✓";
    default:
      return "Submit on-chain · 100 MODAO + 100 USDC";
  }
}

function BalancePanel({
  address,
  modaoBalance,
  usdcBalance,
  bondMODAO,
  bondUSDC,
}: {
  address?: `0x${string}`;
  modaoBalance?: bigint;
  usdcBalance?: bigint;
  bondMODAO: bigint;
  bondUSDC: bigint;
}) {
  if (!address) {
    return (
      <Card className="p-4">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-faint">Wallet</h3>
        <p className="mt-2 text-xs text-muted leading-relaxed">
          Connect a wallet to see your bond balance.
        </p>
      </Card>
    );
  }
  const modao = modaoBalance ?? 0n;
  const usdc = usdcBalance ?? 0n;
  const modaoOk = modao >= bondMODAO;
  const usdcOk = usdc >= bondUSDC; // MockUSDC has open mint — auto-minted if short.

  return (
    <Card className="p-4">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-faint">Bond balance</h3>
      <dl className="mt-3 space-y-2 text-xs">
        <BalanceRow
          label="MODAO"
          have={formatNumber(Number(formatUnits(modao, 18)), 2)}
          need="100.00"
          ok={modaoOk}
        />
        <BalanceRow
          label="USDC"
          have={formatNumber(Number(formatUnits(usdc, 6)), 2)}
          need="100.00"
          ok={usdcOk}
          hint={!usdcOk ? "auto-minted on submit" : undefined}
        />
      </dl>
    </Card>
  );
}

function BalanceRow({
  label,
  have,
  need,
  ok,
  hint,
}: {
  label: string;
  have: string;
  need: string;
  ok: boolean;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted">{label}</span>
      <span className="flex items-center gap-2 font-mono tabular">
        <span className={cn(ok ? "text-fg" : "text-warning")}>{have}</span>
        <span className="text-faint">/ {need}</span>
        {hint && <span className="text-[10px] text-faint normal-case">({hint})</span>}
      </span>
    </div>
  );
}

function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-3">
      <span className="text-xs font-medium text-fg">{children}</span>
      {hint && <span className="text-[11px] text-faint">{hint}</span>}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full h-10 px-3 rounded-[var(--radius-md)] bg-surface-2 border border-border text-sm text-fg placeholder:text-faint outline-none focus:border-brand"
    />
  );
}

function DescribeStep({
  form,
  setField,
}: {
  form: FormState;
  setField: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
}) {
  return (
    <div className="space-y-5">
      <Header title="Describe the project" body="Name and symbol are stored on-chain. The pitch URL is whatever long-form description you want agents and traders to read." />
      <div>
        <Label>Project name</Label>
        <Input
          placeholder="e.g. Hyperlend"
          value={form.name}
          onChange={(e) => setField("name", e.target.value)}
        />
      </div>
      <div>
        <Label>Symbol</Label>
        <Input
          placeholder="e.g. HYPER"
          value={form.symbol}
          onChange={(e) => setField("symbol", e.target.value.toUpperCase())}
        />
      </div>
      <div>
        <Label hint="ipfs:// or https://">Pitch URL</Label>
        <Input
          placeholder="https://docs.yourproject.com/proposal"
          value={form.descriptionURI}
          onChange={(e) => setField("descriptionURI", e.target.value)}
        />
      </div>
    </div>
  );
}

function TokenomicsStep({
  form,
  setField,
}: {
  form: FormState;
  setField: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
}) {
  return (
    <div className="space-y-5">
      <Header title="Tokenomics" body="Total supply minted at launch. Distribution and vesting will be set in the executionPayload (post-MVP)." />
      <div>
        <Label hint="Whole tokens — 18 decimals applied at submit">Total supply</Label>
        <Input
          value={form.supply}
          inputMode="numeric"
          onChange={(e) => setField("supply", e.target.value.replace(/[^0-9]/g, ""))}
        />
      </div>
    </div>
  );
}

function RaiseStep({ bondMODAO, bondUSDC }: { bondMODAO: bigint; bondUSDC: bigint }) {
  return (
    <div className="space-y-5">
      <Header
        title="Proposer bond"
        body="A flat bond keeps spam out. Refunded if your proposal passes; forfeit to the protocol if it fails or never opens markets."
      />
      <div className="grid grid-cols-2 gap-3">
        <BondCard label="MODAO" amount={formatUnits(bondMODAO, 18)} note="governance token" />
        <BondCard label="USDC" amount={formatUnits(bondUSDC, 6)} note="auto-minted from MockUSDC on testnet" />
      </div>
      <p className="text-xs text-faint leading-relaxed">
        On testnet the MockUSDC contract exposes a public <code className="font-mono text-muted">mint()</code> —
        the submit flow tops up your balance if it's below the bond.
      </p>
    </div>
  );
}

function BondCard({ label, amount, note }: { label: string; amount: string; note: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-border bg-surface-2 p-4">
      <p className="text-[10px] uppercase tracking-widest text-faint">{label}</p>
      <p className="mt-1 text-2xl font-mono tabular text-fg">{amount}</p>
      <p className="mt-1 text-[11px] text-muted leading-relaxed">{note}</p>
    </div>
  );
}

function ReviewStep({
  form,
  bondMODAO,
  bondUSDC,
  state,
  error,
  txHash,
}: {
  form: FormState;
  bondMODAO: bigint;
  bondUSDC: bigint;
  state: SubmitState;
  error: Error | null;
  txHash: `0x${string}` | null;
}) {
  return (
    <div className="space-y-5">
      <Header
        title="Review and submit"
        body="On submit: USDC mint (if needed) → MODAO approve → USDC approve → submitProposal. Each step is a separate transaction."
      />
      <ul className="rounded-[var(--radius-md)] bg-surface-2 border border-border divide-y divide-border text-sm">
        <ReviewRow label="Project" value={form.name ? `${form.name} (${form.symbol || "—"})` : "—"} />
        <ReviewRow label="Supply" value={`${formatNumber(Number(form.supply || "0"), 0)} tokens`} />
        <ReviewRow label="Pitch" value={form.descriptionURI || "—"} mono={false} />
        <ReviewRow
          label="Bond"
          value={`${formatUnits(bondMODAO, 18)} MODAO + ${formatUnits(bondUSDC, 6)} USDC`}
        />
      </ul>

      {state !== "idle" && state !== "success" && state !== "error" && (
        <div className="rounded-[var(--radius-md)] border border-brand/30 bg-brand/5 p-3 text-xs text-brand-3 flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-brand-3 animate-pulse" />
          {submitLabel(state)}
        </div>
      )}

      {state === "success" && (
        <div className="rounded-[var(--radius-md)] border border-success/30 bg-success/5 p-3 text-xs text-success">
          Proposal submitted. Tx{" "}
          {txHash && (
            <a
              href={`https://testnet.monadexplorer.com/tx/${txHash}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono underline-offset-2 hover:underline"
            >
              {txHash.slice(0, 10)}…{txHash.slice(-6)}
            </a>
          )}
        </div>
      )}

      {state === "error" && error && (
        <div className="rounded-[var(--radius-md)] border border-danger/30 bg-danger/5 p-3 text-xs text-danger break-words">
          {error.message.slice(0, 240)}
        </div>
      )}
    </div>
  );
}

function Header({ title, body }: { title: string; body: string }) {
  return (
    <div className="pb-2">
      <h2 className="text-lg font-semibold text-fg">{title}</h2>
      <p className="mt-1 text-sm text-muted leading-relaxed">{body}</p>
    </div>
  );
}

function ReviewRow({
  label,
  value,
  mono = true,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="text-muted">{label}</span>
      <span className={cn("text-fg text-right truncate max-w-[60%]", mono && "font-mono tabular")}>
        {value}
      </span>
    </div>
  );
}
