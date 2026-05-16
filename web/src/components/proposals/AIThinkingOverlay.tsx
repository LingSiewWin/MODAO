"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useVerdict } from "@/hooks/use-verdict";
import { cn } from "@/lib/utils";

/**
 * Loading overlay shown while a freshly submitted proposal is being scored.
 *
 * No hardcoded panel / no fake timers — agent count + threshold + minScore
 * come from the AISwarmOracle, and the "thinking → done" transition is driven
 * entirely by the parent's `phase` prop (which the create page derives from
 * the on-chain proposal status).
 */
interface Props {
  open: boolean;
  /** "thinking" → loop video; "done" → show CTA. Drive from real chain state. */
  phase: "thinking" | "done";
  outcome?: "accepted" | "rejected" | "pending";
  /** Proposal id once decoded from the receipt; null until then. */
  proposalId?: string | null;
  /** Numeric proposal id for verdict reads. */
  proposalIdNumeric?: bigint | null;
  txHash?: string | null;
  onClose: () => void;
}

export function AIThinkingOverlay({
  open,
  phase,
  outcome = "pending",
  proposalId,
  proposalIdNumeric,
  txHash,
  onClose,
}: Props) {
  const v = useVerdict(proposalIdNumeric ?? null);

  if (!open) return null;

  const agentCount = v.agentCount ?? 0;
  const threshold = v.threshold;
  const minScore = v.minScore;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-[var(--radius-lg)] border border-border bg-surface shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] overflow-hidden">
        <div className="relative aspect-video w-full bg-black">
          <video
            className="absolute inset-0 h-full w-full object-cover"
            src="/frog-dance.mov"
            autoPlay
            loop
            muted
            playsInline
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent" />
          <div className="absolute bottom-3 left-4 right-4 flex items-center gap-2">
            <span
              className={cn(
                "size-2 rounded-full",
                phase === "thinking" && "bg-brand animate-pulse",
                phase === "done" && outcome === "accepted" && "bg-success",
                phase === "done" && outcome === "rejected" && "bg-danger",
                phase === "done" && outcome === "pending" && "bg-warning",
              )}
            />
            <span className="text-xs font-medium text-white/90">
              {phase === "thinking"
                ? "AI agents are evaluating…"
                : outcome === "accepted"
                  ? "Panel verdict: accepted"
                  : outcome === "rejected"
                    ? "Panel verdict: rejected"
                    : "Panel verdict ready"}
            </span>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-fg">
              {phase === "thinking"
                ? "The MoDAO swarm is reviewing your proposal"
                : outcome === "accepted"
                  ? "Your proposal cleared the panel"
                  : outcome === "rejected"
                    ? "Your proposal did not clear threshold"
                    : "Verdict submitted on-chain"}
            </h2>
            <p className="mt-1 text-sm text-muted leading-relaxed">
              {phase === "thinking" ? (
                threshold !== null && minScore !== null ? (
                  <>
                    Need <span className="font-mono text-fg">{threshold}</span>{" "}
                    of <span className="font-mono text-fg">{agentCount}</span>{" "}
                    registered agents to sign a verdict scoring ≥{" "}
                    <span className="font-mono text-fg">{minScore}</span>.
                    Worker pulls the GitHub repo from your descriptionURI,
                    fork-checks, runs the panel, and submits.
                  </>
                ) : (
                  <>Connecting to the oracle…</>
                )
              ) : outcome === "accepted" ? (
                <>
                  Aggregate score{" "}
                  <span className="font-mono text-fg">{v.score ?? "—"}</span>{" "}
                  cleared the{" "}
                  <span className="font-mono text-fg">{minScore ?? "—"}</span>{" "}
                  oracle floor. The 3-hour commit-ICO is live.
                </>
              ) : outcome === "rejected" ? (
                <>
                  Aggregate score landed below the{" "}
                  <span className="font-mono text-fg">{minScore ?? "—"}</span>{" "}
                  oracle floor. The MODAO bond stays escrowed; revise the
                  GitHub repo and submit a new proposal.
                </>
              ) : (
                <>The panel verdict is on-chain. Check the proposal page for details.</>
              )}
            </p>
          </div>

          {/* Generic per-agent pills sized by the on-chain agentCount. No
              hardcoded model names — those live in the worker's panel.ts and
              aren't on chain. */}
          {agentCount > 0 && (
            <ul className="grid grid-cols-2 gap-2">
              {Array.from({ length: agentCount }).map((_, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2.5 rounded-[var(--radius-md)] border border-border bg-surface-2 px-3 py-2"
                >
                  <span
                    className={cn(
                      "size-2 rounded-full shrink-0",
                      phase === "done" && outcome === "accepted" && "bg-success",
                      phase === "done" && outcome === "rejected" && "bg-danger",
                      phase === "thinking" && "bg-brand animate-pulse",
                      phase === "done" && outcome === "pending" && "bg-faint",
                    )}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-fg">Agent #{i + 1}</p>
                    <p className="text-[10px] font-mono text-faint">registered</p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {phase === "done" && v.reasoningHash &&
            v.reasoningHash !== "0x0000000000000000000000000000000000000000000000000000000000000000" && (
              <div className="rounded-[var(--radius-md)] border border-border bg-surface-2 p-3">
                <p className="text-[10px] uppercase tracking-widest text-faint">
                  Reasoning hash
                </p>
                <code className="mt-1 block text-[11px] font-mono text-fg break-all">
                  {v.reasoningHash}
                </code>
              </div>
            )}

          {txHash && (
            <div className="text-[11px] text-faint">
              Tx{" "}
              <a
                href={`https://testnet.monadexplorer.com/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                className="font-mono underline-offset-2 hover:underline text-muted"
              >
                {txHash.slice(0, 10)}…{txHash.slice(-6)}
              </a>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-2">
            <Button variant="ghost" onClick={onClose}>
              {phase === "thinking" ? "Run in background" : "Close"}
            </Button>
            {phase === "done" && (
              <Link href={proposalId ? `/proposals/${proposalId}` : "/proposals"}>
                <Button variant="gradient">View live market →</Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
