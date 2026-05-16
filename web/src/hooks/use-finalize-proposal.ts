"use client";

import { useCallback, useState } from "react";
import { type Hash } from "viem";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { CONTRACTS, governorAbi } from "@/lib/contracts";

/**
 * Single-action hook: calls MODAOGovernor.finalize(proposalId).
 *
 * The contract reverts unless:
 *   - status == MarketsOpen
 *   - block.timestamp >= marketStartedAt + TWAP_WINDOW (3h)
 *
 * Anyone can call it once the window has elapsed; it reads TWAP from both
 * pools, picks the higher, and emits ProposalFinalized + ProjectLaunched (on PASS).
 */
export type FinalizeStep = "idle" | "finalizing" | "success" | "error";

export function useFinalizeProposal() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [step, setStep] = useState<FinalizeStep>("idle");
  const [error, setError] = useState<Error | null>(null);
  const [txHash, setTxHash] = useState<Hash | null>(null);

  const reset = useCallback(() => {
    setStep("idle");
    setError(null);
    setTxHash(null);
  }, []);

  const finalize = useCallback(
    async (proposalId: bigint) => {
      if (!address || !publicClient) {
        setError(new Error("Connect a wallet first."));
        setStep("error");
        return;
      }
      try {
        setError(null);
        setStep("finalizing");
        const hash = await writeContractAsync({
          address: CONTRACTS.governor,
          abi: governorAbi,
          functionName: "finalize",
          args: [proposalId],
        });
        setTxHash(hash);
        await publicClient.waitForTransactionReceipt({ hash });
        setStep("success");
      } catch (e) {
        setError(e as Error);
        setStep("error");
      }
    },
    [address, publicClient, writeContractAsync],
  );

  return { finalize, reset, step, error, txHash };
}
