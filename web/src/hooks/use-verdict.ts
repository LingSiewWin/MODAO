"use client";

import { useMemo } from "react";
import { useReadContracts } from "wagmi";
import { CONTRACTS, aiSwarmOracleAbi } from "@/lib/contracts";

/**
 * Reads the on-chain verdict bundle the AISwarmOracle exposes for a proposal:
 *   - recorded (bool)
 *   - score (0..100 aggregate; mean of per-rubric means computed off-chain)
 *   - reasoningHash (bytes32 keccak of the IPFS-pinned multi-agent blob)
 *   - oracle config (threshold, minScore, agentCount)
 *
 * Per-agent breakdown is NOT on chain — each member's reasoning is pinned to
 * Pinata in orchestrate.ts:141 with metadata {personaName, model, score,
 * proposalId}. A future indexer can resolve proposalId → pin CIDs and unlock
 * the per-agent UI; until then we surface only what's authoritative.
 */
export function useVerdict(proposalId: bigint | null) {
  const enabled = proposalId !== null && proposalId > 0n;
  const oracle = CONTRACTS.aiSwarmOracle;

  const { data, isLoading } = useReadContracts({
    contracts: enabled
      ? [
          { address: oracle, abi: aiSwarmOracleAbi, functionName: "verdictRecorded", args: [proposalId!] },
          { address: oracle, abi: aiSwarmOracleAbi, functionName: "verdictScore", args: [proposalId!] },
          { address: oracle, abi: aiSwarmOracleAbi, functionName: "verdictReasoning", args: [proposalId!] },
          { address: oracle, abi: aiSwarmOracleAbi, functionName: "threshold" },
          { address: oracle, abi: aiSwarmOracleAbi, functionName: "minScore" },
          { address: oracle, abi: aiSwarmOracleAbi, functionName: "agentCount" },
        ]
      : [],
    query: { enabled, refetchInterval: 5000 },
  });

  return useMemo(() => {
    if (!data) {
      return {
        isLoading,
        recorded: false,
        score: null as number | null,
        reasoningHash: null as `0x${string}` | null,
        threshold: null as number | null,
        minScore: null as number | null,
        agentCount: null as number | null,
      };
    }
    const [recorded, score, rHash, threshold, minScore, agentCount] = data;
    return {
      isLoading,
      recorded: (recorded?.result as boolean | undefined) ?? false,
      score: score?.result !== undefined ? Number(score.result as bigint) : null,
      reasoningHash: (rHash?.result as `0x${string}` | undefined) ?? null,
      threshold: threshold?.result !== undefined ? Number(threshold.result as bigint) : null,
      minScore: minScore?.result !== undefined ? Number(minScore.result as bigint) : null,
      agentCount: agentCount?.result !== undefined ? Number(agentCount.result as bigint) : null,
    };
  }, [data, isLoading]);
}
