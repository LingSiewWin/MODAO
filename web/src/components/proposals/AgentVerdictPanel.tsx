"use client";

import { Card } from "@/components/ui/Card";
import { useVerdict } from "@/hooks/use-verdict";
import { cn } from "@/lib/utils";

/**
 * On-chain verdict surface. Renders only data the AISwarmOracle exposes:
 *   - aggregate score (0..100)
 *   - reasoningHash (bytes32 of the IPFS-pinned multi-agent reasoning blob)
 *   - oracle config (threshold of signatures required, minScore floor,
 *     count of registered agents)
 *
 * Per-agent score breakdown + reasoning are pinned to IPFS off-chain (see
 * agents/src/orchestrate.ts) but not addressable from chain — the indexer
 * that maps proposalId → pin CIDs is not built yet. Until that lands, this
 * panel deliberately shows no per-agent table rather than fake one.
 */
interface Props {
  proposalId: string; // "prop_007" or "7"
  outcome?: "passed" | "failed" | "pending";
}

export function AgentVerdictPanel({ proposalId, outcome = "pending" }: Props) {
  const numeric = BigInt(proposalId.replace(/^prop_0*/, "") || "0");
  const v = useVerdict(numeric > 0n ? numeric : null);

  if (v.isLoading) {
    return (
      <Card className="p-5">
        <div className="h-32 animate-pulse rounded-[var(--radius-md)] bg-surface-2" />
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-faint">
            AI swarm verdict
          </h2>
          <p className="mt-1 text-sm text-muted leading-relaxed">
            Independent AI agents sign an EIP-712 verdict over{" "}
            <span className="font-mono text-fg">
              (proposalId, score, reasoningHash, deadline)
            </span>
            . The bundle is verified by{" "}
            <span className="font-mono text-fg">AISwarmOracle</span> and the
            aggregate is recorded on-chain.
          </p>
        </div>
        <VerdictBadge score={v.score} outcome={outcome} recorded={v.recorded} />
      </div>

      <dl className="grid grid-cols-2 gap-px rounded-[var(--radius-md)] overflow-hidden border border-border bg-border text-xs">
        <Stat
          label="Aggregate score"
          value={v.score !== null ? `${v.score}` : "—"}
          hint="0–100, mean across all rubrics"
        />
        <Stat
          label="Min score"
          value={v.minScore !== null ? `${v.minScore}` : "—"}
          hint="Oracle admission floor"
        />
        <Stat
          label="Signature threshold"
          value={
            v.threshold !== null && v.agentCount !== null
              ? `${v.threshold} / ${v.agentCount}`
              : "—"
          }
          hint="Sigs required from registered agents"
        />
        <Stat
          label="Verdict recorded"
          value={v.recorded ? "Yes" : "Not yet"}
          hint="Set by AISwarmOracle.submitVerdict"
        />
      </dl>

      {v.reasoningHash && v.reasoningHash !== "0x0000000000000000000000000000000000000000000000000000000000000000" && (
        <div className="mt-4 rounded-[var(--radius-md)] border border-border bg-surface-2 p-3">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[10px] uppercase tracking-widest text-faint">
              Reasoning hash
            </span>
            <span className="text-[10px] text-faint">keccak256</span>
          </div>
          <code className="text-[11px] font-mono text-fg break-all leading-relaxed">
            {v.reasoningHash}
          </code>
          <p className="mt-2 text-[10px] text-faint leading-relaxed">
            Hash of the per-agent reasoning bundle pinned to IPFS off-chain.
            Per-agent score + prose breakdown will surface here once the
            pin-indexer lands.
          </p>
        </div>
      )}

      {!v.recorded && (
        <p className="mt-3 text-[11px] text-faint leading-relaxed">
          Waiting for the swarm worker to submit the bundle. The worker watches
          the governor's <span className="font-mono">ProposalSubmitted</span>{" "}
          event and submits within seconds of completion.
        </p>
      )}
    </Card>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="bg-surface p-3">
      <dt className="text-[10px] uppercase tracking-widest text-faint">{label}</dt>
      <dd className="mt-1 font-mono tabular text-sm text-fg">{value}</dd>
      <p className="mt-0.5 text-[10px] text-faint leading-snug">{hint}</p>
    </div>
  );
}

function VerdictBadge({
  score,
  outcome,
  recorded,
}: {
  score: number | null;
  outcome: "passed" | "failed" | "pending";
  recorded: boolean;
}) {
  const tone = !recorded
    ? "border-warning/30 bg-warning/5 text-warning"
    : outcome === "passed"
      ? "border-success/30 bg-success/5 text-success"
      : outcome === "failed"
        ? "border-danger/30 bg-danger/5 text-danger"
        : "border-border bg-surface-2 text-muted";
  const label = !recorded
    ? "Pending verdict"
    : outcome === "passed"
      ? "Accepted"
      : outcome === "failed"
        ? "Rejected"
        : "Recorded";
  return (
    <div className={cn("rounded-[var(--radius-md)] border px-3 py-2 text-right shrink-0", tone)}>
      <div className="text-[10px] uppercase tracking-widest opacity-80">{label}</div>
      <div className="font-mono tabular text-lg font-semibold leading-none mt-0.5">
        {score !== null ? score : "—"}
        <span className="text-xs opacity-60">/100</span>
      </div>
    </div>
  );
}
