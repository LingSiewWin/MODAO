"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useFinalizeProposal } from "@/hooks/use-finalize-proposal";
import { cn } from "@/lib/utils";

const TWAP_WINDOW_SECONDS = 3 * 60 * 60;

/**
 * Renders when status == MarketsOpen. Shows a countdown until the TWAP window
 * elapses, then unlocks a button that calls governor.finalize(proposalId).
 *
 * After success, the parent page's useProposalMarkets refetch (12s interval)
 * will surface the new state automatically.
 */
export function FinalizePanel({
  proposalId,
  marketStartedAt,
  status,
}: {
  proposalId: bigint;
  marketStartedAt: bigint;
  /** 2 = MarketsOpen — only render the panel in this state. */
  status: number;
}) {
  const { finalize, reset, step, error, txHash } = useFinalizeProposal();
  const startedSec = Number(marketStartedAt);
  const finalizeAtSec = startedSec + TWAP_WINDOW_SECONDS;

  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1_000);
    return () => clearInterval(t);
  }, []);

  if (status !== 2) return null;

  const remaining = Math.max(0, finalizeAtSec - now);
  const isReady = remaining === 0;

  return (
    <Card className="p-5">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-faint mb-3">
        Finalize
      </h2>
      <p className="text-xs text-muted leading-relaxed mb-4">
        {isReady
          ? "TWAP window elapsed. Anyone can finalize: reads PASS vs FAIL TWAP, higher wins, project token is launched."
          : `TWAP window closes in ${formatRemaining(remaining)}. Finalize unlocks then.`}
      </p>

      <Button
        variant={isReady ? "success" : "secondary"}
        className="w-full"
        disabled={!isReady || step === "finalizing"}
        onClick={() => finalize(proposalId)}
      >
        {step === "finalizing"
          ? "Finalizing…"
          : step === "success"
            ? "Finalized ✓"
            : isReady
              ? "Finalize proposal"
              : "Window closing…"}
      </Button>

      {step === "success" && txHash && (
        <div className="mt-3 rounded-[var(--radius-md)] border border-success/30 bg-success/5 px-3 py-2 text-[11px] text-success flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-success" />
            Finalized
            <a
              href={`https://testnet.monadexplorer.com/tx/${txHash}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono underline-offset-2 hover:underline ml-1"
            >
              {txHash.slice(0, 8)}…
            </a>
          </span>
          <button onClick={reset} className="text-muted hover:text-fg">Done</button>
        </div>
      )}

      {step === "error" && (
        <div className="mt-3 rounded-[var(--radius-md)] border border-danger/30 bg-danger/5 px-3 py-2 text-[11px] text-danger break-words">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="font-medium">Failed</span>
            <button onClick={reset} className="text-muted hover:text-fg">Reset</button>
          </div>
          {error?.message?.slice(0, 200) ?? "Unknown error"}
        </div>
      )}
    </Card>
  );
}

function formatRemaining(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
