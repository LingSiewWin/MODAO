"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { decodeEventLog, parseUnits, type Address } from "viem";
import {
  useAccount,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useProposals } from "@/hooks/use-proposals";
import { factoryDeployed } from "@/hooks/use-futarchy";
import {
  CONTRACTS,
  futarchyFactoryAbi,
  erc20Abi,
} from "@/lib/contracts";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <CreateFutarchyProposal />
    </Suspense>
  );
}

function CreateFutarchyProposal() {
  const router = useRouter();
  const search = useSearchParams();
  const initialProjectParam = search.get("project") ?? "";
  const { address, isConnected } = useAccount();
  const { proposals } = useProposals();

  // Project picker: launched proposals only. Distinct from /create which is
  // for *submitting* a brand new project — this page is for governing one
  // that's already live.
  const launched = useMemo(
    () => proposals.filter((p) => p.state === "passed"),
    [proposals],
  );

  const [projectId, setProjectId] = useState<string>(() => {
    if (initialProjectParam) return initialProjectParam;
    return launched[0]?.id ?? "";
  });
  const project = useMemo(
    () => launched.find((p) => p.id === projectId) ?? null,
    [launched, projectId],
  );

  const [description, setDescription] = useState("");
  const [windowHours, setWindowHours] = useState("24");
  const [createdMarketId, setCreatedMarketId] = useState<bigint | null>(null);

  const { writeContractAsync, isPending } = useWriteContract();
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const { data: receipt, isLoading: confirming } = useWaitForTransactionReceipt({
    hash: txHash ?? undefined,
  });

  // Decode the new marketId from the receipt so we can redirect.
  useMemo(() => {
    if (!receipt || createdMarketId !== null) return;
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== CONTRACTS.futarchyFactory.toLowerCase()) continue;
      try {
        const d = decodeEventLog({
          abi: futarchyFactoryAbi,
          data: log.data,
          topics: log.topics,
        });
        if (d.eventName === "MarketCreated") {
          const id = (d.args as { marketId: bigint }).marketId;
          setCreatedMarketId(id);
          router.push(`/futarchy/${id.toString()}`);
        }
      } catch {
        /* not this event */
      }
    }
  }, [receipt, createdMarketId, router]);

  // projectToken comes straight from getProposal(id).projectToken — surfaced
  // by useProposals(). Zero address means the AI swarm hasn't admitted the
  // proposal yet, so it isn't actually launched.
  const ZERO = "0x0000000000000000000000000000000000000000";
  const projectTokenAddress =
    project && project.projectToken && project.projectToken !== ZERO
      ? (project.projectToken as Address)
      : null;

  const canSubmit =
    isConnected &&
    factoryDeployed &&
    !!project &&
    !!projectTokenAddress &&
    description.trim().length > 0 &&
    Number(windowHours) >= 1 &&
    Number(windowHours) <= 720 &&
    !isPending &&
    !confirming;

  const onSubmit = async () => {
    if (!canSubmit || !project || !projectTokenAddress) return;
    const hash = await writeContractAsync({
      address: CONTRACTS.futarchyFactory,
      abi: futarchyFactoryAbi,
      functionName: "createProposal",
      args: [
        projectTokenAddress,
        description.trim(),
        BigInt(Math.floor(Number(windowHours) * 3600)),
      ],
    });
    setTxHash(hash);
  };

  return (
    <AppShell
      title="Create governance proposal"
      description="Spin up a futarchy market for a project that's already launched. Token holders trade pass/fail markets; the side with the higher TWAP wins."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <aside className="space-y-4">
          <Card className="p-5 border-[#7c3aed]/30 bg-[#7c3aed]/5">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#a78bfa]">
              Futarchy
            </span>
            <h2 className="mt-1 text-sm font-semibold text-fg">
              Different from an ICO submission
            </h2>
            <p className="mt-2 text-xs text-muted leading-relaxed">
              This is for{" "}
              <span className="text-fg font-medium">already-launched projects</span>.
              No AI gate, no bond — the market decides. To submit a{" "}
              <span className="text-fg font-medium">new project</span> for an ICO
              instead, use{" "}
              <a href="/create" className="text-brand-3 hover:text-brand">
                Submit Project
              </a>
              .
            </p>
          </Card>

          <Card className="p-5">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-faint">
              How it works
            </h3>
            <ol className="mt-3 space-y-3 text-xs text-muted leading-relaxed list-decimal list-inside">
              <li>
                Factory deploys a market + 2 conditional vaults + 2 AMMs
                (pass_PROJECT/pass_USDC, fail_PROJECT/fail_USDC).
              </li>
              <li>
                You seed initial liquidity by depositing equal-priced PROJECT and
                USDC into both AMMs.
              </li>
              <li>
                Holders deposit tokens into vaults to get paired pass/fail tokens
                and trade on whichever side they think reflects reality.
              </li>
              <li>
                When the trading window closes, anyone can call{" "}
                <code className="font-mono text-fg">resolve()</code>. The side
                with the higher TWAP wins; winning tokens redeem 1:1.
              </li>
            </ol>
          </Card>
        </aside>

        <Card className="p-6 sm:p-8">
          {!factoryDeployed && (
            <div className="mb-5 rounded-[var(--radius-md)] border border-warning/30 bg-warning/5 p-3 text-xs text-warning">
              FutarchyMarketFactory address not configured yet — see{" "}
              <code className="font-mono">CONTRACTS.futarchyFactory</code>.
            </div>
          )}

          <Header
            title="Proposal details"
            body="Describe what you're proposing the project do. The description is stored on-chain."
          />

          <div className="mt-6 space-y-5">
            <Field label="Target project" hint="Launched projects only">
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full h-10 px-3 rounded-[var(--radius-md)] bg-surface-2 border border-border text-sm text-fg outline-none focus:border-brand"
              >
                <option value="" disabled>
                  Select a launched project
                </option>
                {launched.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} ({p.symbol})
                  </option>
                ))}
              </select>
              {launched.length === 0 && (
                <p className="mt-1.5 text-[11px] text-warning">
                  No launched projects yet. Submit and launch one via{" "}
                  <a href="/create" className="underline">
                    Submit Project
                  </a>{" "}
                  first.
                </p>
              )}
            </Field>

            <Field
              label="Project token"
              hint="Auto-filled from on-chain getProposal().projectToken"
            >
              <div className="h-10 px-3 flex items-center font-mono text-xs rounded-[var(--radius-md)] bg-surface-2 border border-border text-fg">
                {projectTokenAddress ? (
                  <a
                    href={`https://testnet.monadexplorer.com/address/${projectTokenAddress}`}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate hover:text-brand-3"
                  >
                    {projectTokenAddress}
                  </a>
                ) : project ? (
                  <span className="text-warning">
                    Project not launched yet — no project token minted
                  </span>
                ) : (
                  <span className="text-faint">Select a project above</span>
                )}
              </div>
            </Field>

            <Field label="Proposal description" hint="On-chain, plain text">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                placeholder="e.g. Allocate 50,000 USDC from the project treasury to seed a Uniswap V3 pool at 5bps for ${symbol}/USDC."
                className="w-full px-3 py-2 rounded-[var(--radius-md)] bg-surface-2 border border-border text-sm text-fg placeholder:text-faint outline-none focus:border-brand resize-y"
              />
            </Field>

            <Field label="Trading window (hours)" hint="1–720">
              <input
                value={windowHours}
                onChange={(e) =>
                  setWindowHours(e.target.value.replace(/[^0-9]/g, ""))
                }
                inputMode="numeric"
                className="w-full h-10 px-3 rounded-[var(--radius-md)] bg-surface-2 border border-border text-sm text-fg outline-none focus:border-brand"
              />
            </Field>
          </div>

          <div className="mt-8 pt-6 border-t border-border flex items-center justify-between gap-3">
            <a href="/futarchy" className="text-xs text-muted hover:text-fg">
              ← Back
            </a>
            {!isConnected ? (
              <ConnectButton.Custom>
                {({ openConnectModal }) => (
                  <Button variant="gradient" onClick={openConnectModal}>
                    Connect wallet
                  </Button>
                )}
              </ConnectButton.Custom>
            ) : (
              <Button
                variant="gradient"
                onClick={onSubmit}
                disabled={!canSubmit}
              >
                {isPending
                  ? "Confirming…"
                  : confirming
                    ? "Mining…"
                    : "Create market"}
              </Button>
            )}
          </div>

          <p className="mt-3 text-[11px] text-faint leading-relaxed">
            Creating a market doesn't seed liquidity — you'll do that as a
            second tx on the market page so trading can start.
          </p>
        </Card>
      </div>
    </AppShell>
  );
}

function Header({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-fg">{title}</h2>
      <p className="mt-1 text-sm text-muted leading-relaxed">{body}</p>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-xs font-medium text-fg">{label}</span>
        {hint && <span className="text-[11px] text-faint">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
