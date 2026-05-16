"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  maxUint256,
  zeroAddress,
  type Address,
  type Hash,
} from "viem";
import {
  useAccount,
  useReadContract,
  useReadContracts,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import {
  CONTRACTS,
  LaunchSaleState,
  erc20Abi,
  launchSaleAbi,
  mockUsdcAbi,
} from "@/lib/contracts";
import { isAdmin } from "@/lib/admin";

/**
 * Sequential commit state. `commit()` runs `approve` then `commit` atomically
 * for the caller; both writes are tracked. `useWaitForTransactionReceipt`
 * watches the commit tx and triggers a refetch on success.
 */
type CommitState = "idle" | "approving" | "committing" | "success" | "error";

/** Derived UI phase. The CommitPanel renders different branches per value. */
export type Phase =
  | "no-sale"
  | "commit-allowed"
  | "admin-can-finalize"
  | "awaiting-finalize"
  | "can-claim-tokens"
  | "can-refund"
  | "done-success-no-stake"
  | "done-failed-no-stake";

/** Lightweight tick — flips the phase to `awaiting-finalize` once saleEndsAt passes without hitting RPC. */
function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/**
 * All LaunchSale state + actions for one proposal's sale, gated on a valid
 * sale address. Returns `phase = "no-sale"` when the sale hasn't been deployed
 * yet (proposal still in `Submitted`).
 */
export function useLaunchSale(saleAddress: Address | undefined) {
  const { address } = useAccount();

  const saleReady = !!saleAddress && saleAddress !== zeroAddress;
  const userReady = saleReady && !!address;

  // -- Batch A: sale-only reads (work pre-wallet-connect)
  const saleReads = useReadContracts({
    contracts: saleReady
      ? [
          { address: saleAddress!, abi: launchSaleAbi, functionName: "state" },
          { address: saleAddress!, abi: launchSaleAbi, functionName: "totalCommitted" },
          { address: saleAddress!, abi: launchSaleAbi, functionName: "saleEndsAt" },
          { address: saleAddress!, abi: launchSaleAbi, functionName: "minRaise" },
          { address: saleAddress!, abi: launchSaleAbi, functionName: "tokenSupplyForSale" },
          { address: saleAddress!, abi: launchSaleAbi, functionName: "recipient" },
          { address: saleAddress!, abi: launchSaleAbi, functionName: "projectToken" },
        ]
      : [],
    query: { enabled: saleReady },
  });

  const state = saleReads.data?.[0]?.result as number | undefined;
  const totalCommitted = (saleReads.data?.[1]?.result as bigint | undefined) ?? 0n;
  const saleEndsAt = (saleReads.data?.[2]?.result as bigint | undefined) ?? 0n;
  const minRaise = (saleReads.data?.[3]?.result as bigint | undefined) ?? 0n;
  const tokenSupplyForSale = (saleReads.data?.[4]?.result as bigint | undefined) ?? 0n;
  const recipient = saleReads.data?.[5]?.result as Address | undefined;
  const projectToken = saleReads.data?.[6]?.result as Address | undefined;

  // -- Batch B: user-specific reads (gated on wallet)
  const userReads = useReadContracts({
    contracts: userReady
      ? [
          {
            address: saleAddress!,
            abi: launchSaleAbi,
            functionName: "commitments",
            args: [address!],
          },
          {
            address: CONTRACTS.mockUsdc,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [address!],
          },
          {
            address: CONTRACTS.mockUsdc,
            abi: erc20Abi,
            functionName: "allowance",
            args: [address!, saleAddress!],
          },
        ]
      : [],
    query: { enabled: userReady },
  });

  const userCommitment = (userReads.data?.[0]?.result as bigint | undefined) ?? 0n;
  const usdcBalance = (userReads.data?.[1]?.result as bigint | undefined) ?? 0n;
  const usdcAllowance = (userReads.data?.[2]?.result as bigint | undefined) ?? 0n;

  const isRecipient =
    !!address &&
    !!recipient &&
    address.toLowerCase() === recipient.toLowerCase();

  // -- Single read: sale's own USDC balance, only when recipient + Successful
  const saleBalanceRead = useReadContract({
    address: CONTRACTS.mockUsdc,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: saleAddress ? [saleAddress] : undefined,
    query: {
      enabled: isRecipient && state === LaunchSaleState.Successful && saleReady,
    },
  });
  const saleUsdcBalance = (saleBalanceRead.data as bigint | undefined) ?? 0n;
  const canSweep =
    isRecipient && state === LaunchSaleState.Successful && saleUsdcBalance > 0n;

  // -- Write state (split: commit sequential; others independent)
  const [commitState, setCommitState] = useState<CommitState>("idle");
  const [commitError, setCommitError] = useState<Error | null>(null);
  const [approveTxHash, setApproveTxHash] = useState<Hash | undefined>(undefined);
  const [commitTxHash, setCommitTxHash] = useState<Hash | undefined>(undefined);

  const [finalizeTxHash, setFinalizeTxHash] = useState<Hash | undefined>(undefined);
  const [finalizeError, setFinalizeError] = useState<Error | null>(null);
  const [claimTxHash, setClaimTxHash] = useState<Hash | undefined>(undefined);
  const [claimError, setClaimError] = useState<Error | null>(null);
  const [refundTxHash, setRefundTxHash] = useState<Hash | undefined>(undefined);
  const [refundError, setRefundError] = useState<Error | null>(null);
  const [sweepTxHash, setSweepTxHash] = useState<Hash | undefined>(undefined);
  const [sweepError, setSweepError] = useState<Error | null>(null);
  const [faucetTxHash, setFaucetTxHash] = useState<Hash | undefined>(undefined);
  const [faucetError, setFaucetError] = useState<Error | null>(null);

  const { writeContractAsync } = useWriteContract();

  // Receipt watchers
  const commitReceipt = useWaitForTransactionReceipt({ hash: commitTxHash });
  const finalizeReceipt = useWaitForTransactionReceipt({ hash: finalizeTxHash });
  const claimReceipt = useWaitForTransactionReceipt({ hash: claimTxHash });
  const refundReceipt = useWaitForTransactionReceipt({ hash: refundTxHash });
  const sweepReceipt = useWaitForTransactionReceipt({ hash: sweepTxHash });
  const faucetReceipt = useWaitForTransactionReceipt({ hash: faucetTxHash });

  // Pull refetch into stable refs so effects can depend on bools, not function identities.
  const refetchSale = saleReads.refetch;
  const refetchUser = userReads.refetch;
  const refetchSaleBalance = saleBalanceRead.refetch;

  // Refetch on confirmed write
  useEffect(() => {
    if (commitReceipt.isSuccess && commitTxHash) {
      refetchSale();
      refetchUser();
      setCommitState("success");
    }
  }, [commitReceipt.isSuccess, commitTxHash, refetchSale, refetchUser]);

  useEffect(() => {
    if (finalizeReceipt.isSuccess && finalizeTxHash) {
      refetchSale();
      refetchSaleBalance();
    }
  }, [finalizeReceipt.isSuccess, finalizeTxHash, refetchSale, refetchSaleBalance]);

  useEffect(() => {
    if (claimReceipt.isSuccess && claimTxHash) {
      refetchSale();
      refetchUser();
    }
  }, [claimReceipt.isSuccess, claimTxHash, refetchSale, refetchUser]);

  useEffect(() => {
    if (refundReceipt.isSuccess && refundTxHash) {
      refetchSale();
      refetchUser();
    }
  }, [refundReceipt.isSuccess, refundTxHash, refetchSale, refetchUser]);

  useEffect(() => {
    if (sweepReceipt.isSuccess && sweepTxHash) {
      refetchSaleBalance();
    }
  }, [sweepReceipt.isSuccess, sweepTxHash, refetchSaleBalance]);

  useEffect(() => {
    if (faucetReceipt.isSuccess && faucetTxHash) {
      refetchUser();
    }
  }, [faucetReceipt.isSuccess, faucetTxHash, refetchUser]);

  // -- Writes
  const commit = useCallback(
    async (amount: bigint) => {
      if (!saleAddress || !address) {
        setCommitError(new Error("Connect a wallet first."));
        setCommitState("error");
        return;
      }
      if (amount <= 0n) {
        setCommitError(new Error("Enter an amount greater than zero."));
        setCommitState("error");
        return;
      }

      try {
        setCommitError(null);
        setApproveTxHash(undefined);
        setCommitTxHash(undefined);

        if (usdcAllowance < amount) {
          setCommitState("approving");
          const h = await writeContractAsync({
            address: CONTRACTS.mockUsdc,
            abi: erc20Abi,
            functionName: "approve",
            args: [saleAddress, maxUint256],
          });
          setApproveTxHash(h);
        }

        setCommitState("committing");
        const h = await writeContractAsync({
          address: saleAddress,
          abi: launchSaleAbi,
          functionName: "commit",
          args: [amount],
        });
        setCommitTxHash(h);
        // state flips to "success" once the commit receipt lands (see useEffect above)
      } catch (e) {
        setCommitError(e as Error);
        setCommitState("error");
      }
    },
    [saleAddress, address, usdcAllowance, writeContractAsync],
  );

  const finalize = useCallback(async () => {
    if (!saleAddress) return;
    try {
      setFinalizeError(null);
      const h = await writeContractAsync({
        address: saleAddress,
        abi: launchSaleAbi,
        functionName: "finalize",
      });
      setFinalizeTxHash(h);
    } catch (e) {
      setFinalizeError(e as Error);
    }
  }, [saleAddress, writeContractAsync]);

  const claimTokens = useCallback(async () => {
    if (!saleAddress) return;
    try {
      setClaimError(null);
      const h = await writeContractAsync({
        address: saleAddress,
        abi: launchSaleAbi,
        functionName: "claimTokens",
      });
      setClaimTxHash(h);
    } catch (e) {
      setClaimError(e as Error);
    }
  }, [saleAddress, writeContractAsync]);

  const refund = useCallback(async () => {
    if (!saleAddress) return;
    try {
      setRefundError(null);
      const h = await writeContractAsync({
        address: saleAddress,
        abi: launchSaleAbi,
        functionName: "refund",
      });
      setRefundTxHash(h);
    } catch (e) {
      setRefundError(e as Error);
    }
  }, [saleAddress, writeContractAsync]);

  const claimFunds = useCallback(async () => {
    if (!saleAddress) return;
    try {
      setSweepError(null);
      const h = await writeContractAsync({
        address: saleAddress,
        abi: launchSaleAbi,
        functionName: "claimFunds",
      });
      setSweepTxHash(h);
    } catch (e) {
      setSweepError(e as Error);
    }
  }, [saleAddress, writeContractAsync]);

  const mintTestUsdc = useCallback(
    async (amount: bigint) => {
      if (!address) return;
      try {
        setFaucetError(null);
        const h = await writeContractAsync({
          address: CONTRACTS.mockUsdc,
          abi: mockUsdcAbi,
          functionName: "mint",
          args: [address, amount],
        });
        setFaucetTxHash(h);
      } catch (e) {
        setFaucetError(e as Error);
      }
    },
    [address, writeContractAsync],
  );

  // -- Phase derivation
  const now = useNow();
  const phase: Phase = useMemo(() => {
    if (!saleReady || state === undefined) return "no-sale";
    if (state === LaunchSaleState.Open) {
      if (saleEndsAt > 0n && now < Number(saleEndsAt) * 1000) {
        return "commit-allowed";
      }
      return isAdmin(address) ? "admin-can-finalize" : "awaiting-finalize";
    }
    if (state === LaunchSaleState.Successful) {
      return userCommitment > 0n ? "can-claim-tokens" : "done-success-no-stake";
    }
    if (state === LaunchSaleState.Failed) {
      return userCommitment > 0n ? "can-refund" : "done-failed-no-stake";
    }
    return "no-sale";
  }, [saleReady, state, saleEndsAt, address, userCommitment, now]);

  // Preview math — must match LaunchSale.sol:104 exactly
  const tokensClaimablePreview = useMemo<bigint>(() => {
    if (userCommitment === 0n || tokenSupplyForSale === 0n || totalCommitted === 0n) {
      return 0n;
    }
    return (userCommitment * tokenSupplyForSale) / totalCommitted;
  }, [userCommitment, tokenSupplyForSale, totalCommitted]);

  return {
    // Reads
    state,
    totalCommitted,
    saleEndsAt,
    minRaise,
    tokenSupplyForSale,
    recipient,
    projectToken,
    userCommitment,
    usdcBalance,
    usdcAllowance,
    saleUsdcBalance,

    // Derived
    phase,
    isRecipient,
    canSweep,
    tokensClaimablePreview,
    isLoading: saleReads.isLoading || userReads.isLoading,

    // Commit (sequential)
    commit,
    commitState,
    commitError,
    approveTxHash,
    commitTxHash,
    commitConfirming: commitReceipt.isLoading,

    // Finalize
    finalize,
    finalizeTxHash,
    finalizeError,
    finalizePending: finalizeReceipt.isLoading,
    finalizeConfirmed: finalizeReceipt.isSuccess,

    // Claim tokens
    claimTokens,
    claimTxHash,
    claimError,
    claimPending: claimReceipt.isLoading,
    claimConfirmed: claimReceipt.isSuccess,

    // Refund
    refund,
    refundTxHash,
    refundError,
    refundPending: refundReceipt.isLoading,
    refundConfirmed: refundReceipt.isSuccess,

    // Claim funds (recipient sweep)
    claimFunds,
    sweepTxHash,
    sweepError,
    sweepPending: sweepReceipt.isLoading,
    sweepConfirmed: sweepReceipt.isSuccess,

    // Test USDC faucet
    mintTestUsdc,
    faucetTxHash,
    faucetError,
    faucetPending: faucetReceipt.isLoading,
  };
}
