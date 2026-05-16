"use client";

import { useState } from "react";
import { formatUnits, parseUnits } from "viem";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useSubmitProposal, type SubmitState } from "@/hooks/use-submit-proposal";
import { cn, formatNumber } from "@/lib/utils";

const STEPS = [
  { key: "describe", title: "Describe", body: "Project name, symbol, and pitch URL." },
  { key: "sale", title: "Sale terms", body: "Total token supply + minimum USDC raise." },
  { key: "review", title: "Review", body: "Confirm and submit on-chain." },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

interface FormState {
  name: string;
  symbol: string;
  descriptionURI: string;
  /** Whole tokens; 18 decimals applied at submit. */
  supply: string;
  /** USDC; 6 decimals applied at submit. */
  minRaise: string;
}

const INITIAL: FormState = {
  name: "",
  symbol: "",
  descriptionURI: "",
  supply: "1000000",
  minRaise: "500",
};

export default function CreatePage() {
  const [step, setStep] = useState<StepKey>("describe");
  const [form, setForm] = useState<FormState>(INITIAL);
  const stepIdx = STEPS.findIndex((s) => s.key === step);

  const { address, isConnected } = useAccount();
  const { submit, state, error, txHash, modaoBalance, bondMODAO, canSubmit } =
    useSubmitProposal();

  const setField = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async () => {
    if (!form.name || !form.symbol) return;
    await submit({
      name: form.name,
      symbol: form.symbol,
      supply: parseUnits(form.supply || "0", 18),
      descriptionURI: form.descriptionURI,
      minRaise: parseUnits(form.minRaise || "0", 6),
    });
  };

  return (
    <AppShell
      title="Create a proposal"
      description="Submit a project. AI agents pre-screen; on accept, a commit-style ICO opens for 3 hours."
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
            bondMODAO={bondMODAO}
          />
        </aside>

        <Card className="p-6 sm:p-8">
          {step === "describe" && <DescribeStep form={form} setField={setField} />}
          {step === "sale" && <SaleStep form={form} setField={setField} />}
          {step === "review" && (
            <ReviewStep
              form={form}
              bondMODAO={bondMODAO}
              state={state}
              error={error}
              txHash={txHash}
            />
          )}

          <div className="mt-8 flex items-center justify-between pt-6 border-t border-border gap-3">
            <Button
              variant="ghost"
              disabled={stepIdx === 0}
              onClick={() => setStep(STEPS[Math.max(0, stepIdx - 1)]!.key)}
            >
              Back
            </Button>

            {stepIdx < STEPS.length - 1 ? (
              <Button onClick={() => setStep(STEPS[stepIdx + 1]!.key)} variant="primary">
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
                disabled={!canSubmit || state === "submitting" || state === "approving-modao"}
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
    case "approving-modao":
      return "Approving MODAO…";
    case "submitting":
      return "Submitting…";
    case "success":
      return "Submitted ✓";
    default:
      return "Submit on-chain · 100 MODAO bond";
  }
}

function BalancePanel({
  address,
  modaoBalance,
  bondMODAO,
}: {
  address?: `0x${string}`;
  modaoBalance?: bigint;
  bondMODAO: bigint;
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
  const modaoOk = modao >= bondMODAO;

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
      </dl>
      <p className="mt-3 text-[11px] text-faint leading-relaxed">
        Anti-spam stake. Held in the governor; slash/refund policy is roadmap.
      </p>
    </Card>
  );
}

function BalanceRow({
  label,
  have,
  need,
  ok,
}: {
  label: string;
  have: string;
  need: string;
  ok: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted">{label}</span>
      <span className="flex items-center gap-2 font-mono tabular">
        <span className={cn(ok ? "text-fg" : "text-warning")}>{have}</span>
        <span className="text-faint">/ {need}</span>
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
      <Header
        title="Describe the project"
        body="Name and symbol are stored on-chain. Pitch URL is whatever long-form description you want agents and depositors to read."
      />
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

function SaleStep({
  form,
  setField,
}: {
  form: FormState;
  setField: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
}) {
  return (
    <div className="space-y-5">
      <Header
        title="Sale terms"
        body="Set your token supply and the minimum USDC you need raised. If commitments don't clear the minimum, depositors are refunded and the project doesn't launch."
      />
      <div>
        <Label hint="Whole tokens · 18 decimals">Total supply</Label>
        <Input
          value={form.supply}
          inputMode="numeric"
          onChange={(e) => setField("supply", e.target.value.replace(/[^0-9]/g, ""))}
        />
      </div>
      <div>
        <Label hint="USDC · whole dollars">Minimum raise</Label>
        <Input
          value={form.minRaise}
          inputMode="numeric"
          onChange={(e) => setField("minRaise", e.target.value.replace(/[^0-9]/g, ""))}
        />
        <p className="mt-2 text-[11px] text-faint leading-relaxed">
          Sale window is 3 hours. If <span className="font-mono">totalCommitted ≥ minRaise</span> →
          launch executes, depositors claim their pro-rata token share, and you receive the raised USDC.
        </p>
      </div>
    </div>
  );
}

function ReviewStep({
  form,
  bondMODAO,
  state,
  error,
  txHash,
}: {
  form: FormState;
  bondMODAO: bigint;
  state: SubmitState;
  error: Error | null;
  txHash: `0x${string}` | null;
}) {
  return (
    <div className="space-y-5">
      <Header
        title="Review and submit"
        body="On submit: approve MODAO bond → submitProposal. Two transactions."
      />
      <ul className="rounded-[var(--radius-md)] bg-surface-2 border border-border divide-y divide-border text-sm">
        <ReviewRow label="Project" value={form.name ? `${form.name} (${form.symbol || "—"})` : "—"} />
        <ReviewRow label="Supply" value={`${formatNumber(Number(form.supply || "0"), 0)} tokens`} />
        <ReviewRow label="Minimum raise" value={`${formatNumber(Number(form.minRaise || "0"), 0)} USDC`} />
        <ReviewRow label="Pitch" value={form.descriptionURI || "—"} mono={false} />
        <ReviewRow label="Bond" value={`${formatUnits(bondMODAO, 18)} MODAO`} />
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
