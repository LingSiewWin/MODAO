"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "describe", title: "Describe", body: "Project name, pitch, and link to the full proposal." },
  { key: "tokenomics", title: "Tokenomics", body: "Supply, distribution, vesting." },
  { key: "raise", title: "Raise", body: "Amount, launch mechanism, bond." },
  { key: "review", title: "Review", body: "Confirm and pay the proposal fee." },
] as const;

type StepKey = typeof STEPS[number]["key"];

export default function CreatePage() {
  const [step, setStep] = useState<StepKey>("describe");
  const stepIdx = STEPS.findIndex((s) => s.key === step);

  return (
    <AppShell
      title="Create a proposal"
      description="Submit a project to the futarchy market. AI agents will pre-screen, then markets decide."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <aside>
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
                      current ? "bg-surface border border-border" : "hover:bg-surface/60 border border-transparent",
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
        </aside>

        <Card className="p-6 sm:p-8">
          {step === "describe" && <DescribeStep />}
          {step === "tokenomics" && <TokenomicsStep />}
          {step === "raise" && <RaiseStep />}
          {step === "review" && <ReviewStep />}

          <div className="mt-8 flex items-center justify-between pt-6 border-t border-border">
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
            ) : (
              <Button variant="gradient">Submit proposal · 0.5 MON</Button>
            )}
          </div>
        </Card>
      </div>
    </AppShell>
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

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="w-full min-h-[120px] p-3 rounded-[var(--radius-md)] bg-surface-2 border border-border text-sm text-fg placeholder:text-faint outline-none focus:border-brand resize-y"
    />
  );
}

function DescribeStep() {
  return (
    <div className="space-y-5">
      <Header title="Describe the project" body="Make it scannable. AI agents and humans will both read this." />
      <div>
        <Label>Project name</Label>
        <Input placeholder="e.g. Hyperlend" />
      </div>
      <div>
        <Label>Symbol</Label>
        <Input placeholder="e.g. HYPER" />
      </div>
      <div>
        <Label hint="Markdown supported">Pitch</Label>
        <Textarea placeholder="What are you building, who is it for, and why now?" />
      </div>
      <div>
        <Label>Full proposal URL</Label>
        <Input placeholder="https://docs.yourproject.com/proposal" />
      </div>
    </div>
  );
}

function TokenomicsStep() {
  return (
    <div className="space-y-5">
      <Header title="Tokenomics" body="The split everyone sees. Agents flag distributions with team allocation >25% by default." />
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label>LP %</Label>
          <Input defaultValue="70" inputMode="numeric" />
        </div>
        <div>
          <Label>Team %</Label>
          <Input defaultValue="20" inputMode="numeric" />
        </div>
        <div>
          <Label>Community %</Label>
          <Input defaultValue="10" inputMode="numeric" />
        </div>
      </div>
      <div>
        <Label>Team vesting (months)</Label>
        <Input defaultValue="48" inputMode="numeric" />
      </div>
      <div>
        <Label>Total supply</Label>
        <Input defaultValue="1000000" inputMode="numeric" />
      </div>
    </div>
  );
}

function RaiseStep() {
  return (
    <div className="space-y-5">
      <Header title="Raise" body="How much, on what curve. The bond is returned if your proposal passes." />
      <div>
        <Label>Target raise (USDC)</Label>
        <Input defaultValue="500000" inputMode="numeric" />
      </div>
      <div>
        <Label>Mechanism</Label>
        <select className="w-full h-10 px-3 rounded-[var(--radius-md)] bg-surface-2 border border-border text-sm text-fg outline-none focus:border-brand">
          <option>Bonding curve</option>
          <option>Liquidity bootstrap (LBP)</option>
          <option>Fixed-price IDO</option>
        </select>
      </div>
      <div>
        <Label hint="Refunded on pass · forfeit on fail">Proposer bond (MON)</Label>
        <Input defaultValue="50" inputMode="numeric" />
      </div>
    </div>
  );
}

function ReviewStep() {
  return (
    <div className="space-y-5">
      <Header title="Review and submit" body="Once submitted, AI agents have 24h to score, then markets open for a 3-day TWAP window." />
      <ul className="rounded-[var(--radius-md)] bg-surface-2 border border-border divide-y divide-border text-sm">
        <ReviewRow label="Project" value="Hyperlend (HYPER)" />
        <ReviewRow label="Raise" value="$500,000 · Bonding curve" />
        <ReviewRow label="Split" value="LP 70 / Team 20 / Community 10" />
        <ReviewRow label="Bond" value="50 MON (refundable on pass)" />
        <ReviewRow label="Fee" value="0.5 MON" />
      </ul>
      <p className="text-xs text-faint leading-relaxed">
        By submitting you agree that the proposal is binding: the launch executes automatically on PASS.
      </p>
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

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="text-muted">{label}</span>
      <span className="font-mono text-fg tabular text-right">{value}</span>
    </div>
  );
}
