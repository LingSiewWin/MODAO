"use client";

import { useCallback, useState } from "react";
import { parseUnits, type Hash } from "viem";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import {
  CONTRACTS,
  governorAbi,
  erc20Abi,
  mockUsdcAbi,
} from "@/lib/contracts";

/**
 * Full submit flow:
 *   1. mint USDC if user balance < bond (testnet convenience — MockUSDC has open mint)
 *   2. approve MODAO + USDC to the governor for the bond
 *   3. call submitProposal(spec)
 *
 * Each step is its own state — UI can render a stepper.
 */
export type SubmitState =
  | "idle"
  | "checking"
  | "minting-usdc"
  | "approving-modao"
  | "approving-usdc"
  | "submitting"
  | "success"
  | "error";

const BOND_MODAO = parseUnits("100", 18);
const BOND_USDC = parseUnits("100", 6);

export interface ProjectSpecInput {
  name: string;
  symbol: string;
  supply: bigint;
  descriptionURI: string;
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

        // 1. mint USDC if short — testnet only.
        if (!usdcBalance || usdcBalance < BOND_USDC) {
          setState("minting-usdc");
          const hash = await writeContractAsync({
            address: CONTRACTS.mockUsdc,
            abi: mockUsdcAbi,
            functionName: "mint",
            args: [address, BOND_USDC],
          });
          setTxHash(hash);
        }

        // 2a. approve MODAO bond.
        setState("approving-modao");
        const mApproveHash = await writeContractAsync({
          address: CONTRACTS.modaoToken,
          abi: erc20Abi,
          functionName: "approve",
          args: [CONTRACTS.governor, BOND_MODAO],
        });
        setTxHash(mApproveHash);

        // 2b. approve USDC bond.
        setState("approving-usdc");
        const uApproveHash = await writeContractAsync({
          address: CONTRACTS.mockUsdc,
          abi: erc20Abi,
          functionName: "approve",
          args: [CONTRACTS.governor, BOND_USDC],
        });
        setTxHash(uApproveHash);

        // 3. submit.
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
    [address, usdcBalance, writeContractAsync],
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
    bondUSDC: BOND_USDC,
    canSubmit:
      !!address &&
      (modaoBalance ?? 0n) >= BOND_MODAO &&
      state !== "submitting" &&
      state !== "approving-modao" &&
      state !== "approving-usdc",
  };
}
