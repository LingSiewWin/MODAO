"use client";

import { useCallback, useState } from "react";
import { parseUnits, type Address, type Hash } from "viem";
import {
  useAccount,
  usePublicClient,
  useReadContracts,
  useWriteContract,
} from "wagmi";
import {
  CONTRACTS,
  conditionalVaultAbi,
  erc20Abi,
  mockUsdcAbi,
  MODAO_DECIMALS,
  USDC_DECIMALS,
} from "@/lib/contracts";

/**
 * Standalone vault actions, separate from the buy/sell trade flow:
 *
 *   deposit(usdc, X) — approve real USDC -> usdcVault, then usdcVault.deposit(X).
 *                       User receives X PASS-USDC + X FAIL-USDC. No swap.
 *   merge(usdc, X)   — usdcVault.merge(X). Burns X PASS-USDC + X FAIL-USDC,
 *                       returns X real USDC. No approval needed — vault has
 *                       mint/burn authority over the conditional tokens.
 *   redeem(usdc, X)  — usdcVault.redeem(X). Post-finalize only. Burns X of the
 *                       winning side, returns X real USDC.
 *
 *   Same three actions exist for `modao` against modaoVault.
 *
 * MockUSDC auto-mints if balance < amount on deposit — testnet convenience.
 */

export type VaultActionStep =
  | "idle"
  | "minting-usdc"
  | "approving"
  | "depositing"
  | "merging"
  | "redeeming"
  | "success"
  | "error";

export type VaultSide = "usdc" | "modao";
export type VaultAction = "deposit" | "merge" | "redeem";

export function useVaultActions({
  usdcVault,
  modaoVault,
}: {
  usdcVault?: Address;
  modaoVault?: Address;
}) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [step, setStep] = useState<VaultActionStep>("idle");
  const [error, setError] = useState<Error | null>(null);
  const [lastTx, setLastTx] = useState<Hash | null>(null);
  const [lastAction, setLastAction] = useState<VaultAction | null>(null);

  // Resolve conditional-token addresses for both vaults in one batch.
  const enabled = !!usdcVault && !!modaoVault;
  const { data: tokenReads } = useReadContracts({
    contracts: enabled
      ? [
          { address: usdcVault!, abi: conditionalVaultAbi, functionName: "passToken" },
          { address: usdcVault!, abi: conditionalVaultAbi, functionName: "failToken" },
          { address: usdcVault!, abi: conditionalVaultAbi, functionName: "outcome" },
          { address: modaoVault!, abi: conditionalVaultAbi, functionName: "passToken" },
          { address: modaoVault!, abi: conditionalVaultAbi, functionName: "failToken" },
          { address: modaoVault!, abi: conditionalVaultAbi, functionName: "outcome" },
        ]
      : [],
    query: { enabled },
  });

  const conditionalPassUsdc = tokenReads?.[0]?.result as Address | undefined;
  const conditionalFailUsdc = tokenReads?.[1]?.result as Address | undefined;
  const usdcOutcome = Number(tokenReads?.[2]?.result ?? 0);
  const conditionalPassModao = tokenReads?.[3]?.result as Address | undefined;
  const conditionalFailModao = tokenReads?.[4]?.result as Address | undefined;
  const modaoOutcome = Number(tokenReads?.[5]?.result ?? 0);

  // Balances — real + all four conditional flavors.
  const balanceContracts =
    address && enabled
      ? ([
          { address: CONTRACTS.modaoToken, abi: erc20Abi, functionName: "balanceOf", args: [address] as const },
          { address: CONTRACTS.mockUsdc, abi: erc20Abi, functionName: "balanceOf", args: [address] as const },
          conditionalPassUsdc && { address: conditionalPassUsdc, abi: erc20Abi, functionName: "balanceOf", args: [address] as const },
          conditionalFailUsdc && { address: conditionalFailUsdc, abi: erc20Abi, functionName: "balanceOf", args: [address] as const },
          conditionalPassModao && { address: conditionalPassModao, abi: erc20Abi, functionName: "balanceOf", args: [address] as const },
          conditionalFailModao && { address: conditionalFailModao, abi: erc20Abi, functionName: "balanceOf", args: [address] as const },
        ].filter(Boolean) as Parameters<typeof useReadContracts>[0]["contracts"])
      : [];

  const { data: balanceReads, refetch: refetchBalances } = useReadContracts({
    contracts: balanceContracts,
    query: { enabled: !!address && enabled, refetchInterval: 8_000 },
  });

  const balances = {
    modao: bigIntAt(balanceReads, 0),
    usdc: bigIntAt(balanceReads, 1),
    passUsdc: bigIntAt(balanceReads, 2),
    failUsdc: bigIntAt(balanceReads, 3),
    passModao: bigIntAt(balanceReads, 4),
    failModao: bigIntAt(balanceReads, 5),
  };

  const reset = useCallback(() => {
    setStep("idle");
    setError(null);
    setLastTx(null);
    setLastAction(null);
  }, []);

  const run = useCallback(
    async (action: VaultAction, vaultSide: VaultSide, amountStr: string) => {
      if (!address || !publicClient) {
        setError(new Error("Connect a wallet first."));
        setStep("error");
        return;
      }
      const vault = vaultSide === "usdc" ? usdcVault : modaoVault;
      if (!vault) {
        setError(new Error("Markets not open yet."));
        setStep("error");
        return;
      }
      const decimals = vaultSide === "usdc" ? USDC_DECIMALS : MODAO_DECIMALS;
      const amount = parseAmount(amountStr, decimals);
      if (amount <= 0n) {
        setError(new Error("Enter a non-zero amount."));
        setStep("error");
        return;
      }

      try {
        setError(null);
        setLastAction(action);

        if (action === "deposit") {
          // 0. Auto-mint MockUSDC if short (testnet only path).
          if (vaultSide === "usdc" && balances.usdc < amount) {
            setStep("minting-usdc");
            await sendAndWait(publicClient, () =>
              writeContractAsync({
                address: CONTRACTS.mockUsdc,
                abi: mockUsdcAbi,
                functionName: "mint",
                args: [address, amount - balances.usdc],
              }),
              setLastTx,
            );
          }

          // 1. approve underlying -> vault
          const underlying = vaultSide === "usdc" ? CONTRACTS.mockUsdc : CONTRACTS.modaoToken;
          setStep("approving");
          await sendAndWait(publicClient, () =>
            writeContractAsync({
              address: underlying,
              abi: erc20Abi,
              functionName: "approve",
              args: [vault, amount],
            }),
            setLastTx,
          );

          // 2. vault.deposit(amount)
          setStep("depositing");
          await sendAndWait(publicClient, () =>
            writeContractAsync({
              address: vault,
              abi: conditionalVaultAbi,
              functionName: "deposit",
              args: [amount],
            }),
            setLastTx,
          );
        } else if (action === "merge") {
          // Single tx — vault has burn authority on conditional tokens, no approval needed.
          setStep("merging");
          await sendAndWait(publicClient, () =>
            writeContractAsync({
              address: vault,
              abi: conditionalVaultAbi,
              functionName: "merge",
              args: [amount],
            }),
            setLastTx,
          );
        } else if (action === "redeem") {
          setStep("redeeming");
          await sendAndWait(publicClient, () =>
            writeContractAsync({
              address: vault,
              abi: conditionalVaultAbi,
              functionName: "redeem",
              args: [amount],
            }),
            setLastTx,
          );
        }

        await refetchBalances();
        setStep("success");
      } catch (e) {
        setError(e as Error);
        setStep("error");
      }
    },
    [
      address,
      publicClient,
      usdcVault,
      modaoVault,
      balances.usdc,
      writeContractAsync,
      refetchBalances,
    ],
  );

  return {
    run,
    reset,
    step,
    error,
    lastTx,
    lastAction,
    isWorking: step !== "idle" && step !== "success" && step !== "error",
    balances,
    outcomes: {
      // 0 = Pending, 1 = Pass, 2 = Fail (matches ConditionalVault.Outcome enum)
      usdc: usdcOutcome,
      modao: modaoOutcome,
    },
  };
}

function bigIntAt(
  reads: Array<{ status: string; result?: unknown }> | undefined,
  i: number,
): bigint {
  const r = reads?.[i];
  if (!r || r.status !== "success" || r.result == null) return 0n;
  return typeof r.result === "bigint" ? r.result : BigInt(r.result as string | number);
}

function parseAmount(s: string, decimals: number): bigint {
  if (!s) return 0n;
  const cleaned = s.replace(/[^0-9.]/g, "");
  if (!cleaned || cleaned === ".") return 0n;
  try {
    return parseUnits(cleaned, decimals);
  } catch {
    return 0n;
  }
}

async function sendAndWait(
  publicClient: ReturnType<typeof usePublicClient>,
  send: () => Promise<Hash>,
  setTx: (h: Hash) => void,
) {
  const hash = await send();
  setTx(hash);
  if (publicClient) {
    await publicClient.waitForTransactionReceipt({ hash });
  }
}
