"use client";

import { useCallback, useEffect, useState } from "react";
import { decodeEventLog, parseUnits, type Hash } from "viem";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { CONTRACTS, governorAbi, erc20Abi, ProposalStatus } from "@/lib/contracts";

/**
 * Full submit flow (v3, commit-ICO):
 *   1. approve MODAO to the governor for the proposer bond
 *   2. call submitProposal(spec)
 *
 * No USDC bond in v3 — the USDC commitment happens later from anyone during
 * the sale window; the proposer just stakes MODAO as anti-spam.
 */
export type SubmitState =
  | "idle"
  | "checking"
  | "approving-modao"
  | "submitting"
  | "success"
  | "awaiting-verdict"
  | "verdict-accepted"
  | "verdict-rejected"
  | "error";

const BOND_MODAO = parseUnits("100", 18);

export interface ProjectSpecInput {
  name: string;
  symbol: string;
  supply: bigint;
  descriptionURI: string;
  /** Minimum USDC raise required for the sale to succeed (6 decimals). */
  minRaise: bigint;
}

export function useSubmitProposal() {
  const { address } = useAccount();
  const [state, setState] = useState<SubmitState>("idle");
  const [error, setError] = useState<Error | null>(null);
  const [txHash, setTxHash] = useState<Hash | null>(null);

  const { data: modaoBalance } = useReadContract({
    address: CONTRACTS.modaoToken,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: usdcBalance } = useReadContract({
    address: CONTRACTS.mockUsdc,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const [proposalId, setProposalId] = useState<bigint | null>(null);

  const { writeContractAsync } = useWriteContract();
  const { data: receipt, isLoading: confirming } = useWaitForTransactionReceipt({
    hash: txHash ?? undefined,
  });

  // Decode ProposalSubmitted from the submit receipt to capture the new id.
  useEffect(() => {
    if (!receipt || state !== "submitting") return;
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== CONTRACTS.governor.toLowerCase()) continue;
      try {
        const decoded = decodeEventLog({
          abi: governorAbi,
          data: log.data,
          topics: log.topics,
        });
        if (decoded.eventName === "ProposalSubmitted") {
          setProposalId((decoded.args as { proposalId: bigint }).proposalId);
          setState("awaiting-verdict");
          return;
        }
      } catch {
        // not this event; keep scanning
      }
    }
  }, [receipt, state]);

  // While awaiting the swarm verdict, poll the proposal status. The agent
  // worker calls submitVerdictAndOpen → status flips to SaleOpen (accepted)
  // or Finalized with outcome=Failed (rejected via synthetic 0-score path
  // followed by a finalize, though in practice rejected proposals sit in
  // Submitted with score < minScore — surface that as "rejected" too once
  // the oracle revert lands).
  const { data: liveProposal } = useReadContract({
    address: CONTRACTS.governor,
    abi: governorAbi,
    functionName: "getProposal",
    args: proposalId !== null ? [proposalId] : undefined,
    query: {
      enabled: proposalId !== null && state === "awaiting-verdict",
      refetchInterval: 3000,
    },
  });

  useEffect(() => {
    if (state !== "awaiting-verdict" || !liveProposal) return;
    const p = liveProposal as { status: number; outcome: number };
    if (p.status === ProposalStatus.SaleOpen) setState("verdict-accepted");
    else if (p.status === ProposalStatus.Finalized) setState("verdict-rejected");
  }, [liveProposal, state]);

  const submit = useCallback(
    async (spec: ProjectSpecInput) => {
      if (!address) {
        setError(new Error("Connect a wallet first."));
        setState("error");
        return;
      }

      try {
        setError(null);

        // 1. approve MODAO bond.
        setState("approving-modao");
        const mApproveHash = await writeContractAsync({
          address: CONTRACTS.modaoToken,
          abi: erc20Abi,
          functionName: "approve",
          args: [CONTRACTS.governor, BOND_MODAO],
        });
        setTxHash(mApproveHash);

        // 2. submit. State flips through `submitting → awaiting-verdict →
        // verdict-accepted/rejected` driven by receipt + on-chain poll above.
        setState("submitting");
        const submitHash = await writeContractAsync({
          address: CONTRACTS.governor,
          abi: governorAbi,
          functionName: "submitProposal",
          args: [spec],
        });
        setTxHash(submitHash);
      } catch (e) {
        setError(e as Error);
        setState("error");
      }
    },
    [address, writeContractAsync],
  );

  return {
    submit,
    state,
    error,
    txHash,
    proposalId,
    confirming,
    modaoBalance,
    usdcBalance,
    bondMODAO: BOND_MODAO,
    canSubmit:
      !!address &&
      (modaoBalance ?? 0n) >= BOND_MODAO &&
      state !== "submitting" &&
      state !== "approving-modao" &&
      state !== "awaiting-verdict",
  };
}
