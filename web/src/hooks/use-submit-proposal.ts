"use client";

import { useCallback, useState } from "react";
import { parseUnits, type Hash } from "viem";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { CONTRACTS, governorAbi, erc20Abi } from "@/lib/contracts";

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

  const { writeContractAsync } = useWriteContract();
  const { isLoading: confirming } = useWaitForTransactionReceipt({
    hash: txHash ?? undefined,
  });

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

        // 2. submit.
        setState("submitting");
        const submitHash = await writeContractAsync({
          address: CONTRACTS.governor,
          abi: governorAbi,
          functionName: "submitProposal",
          args: [spec],
        });
        setTxHash(submitHash);

        setState("success");
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
    confirming,
    modaoBalance,
    usdcBalance,
    bondMODAO: BOND_MODAO,
    canSubmit:
      !!address &&
      (modaoBalance ?? 0n) >= BOND_MODAO &&
      state !== "submitting" &&
      state !== "approving-modao",
  };
}
