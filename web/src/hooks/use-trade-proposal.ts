"use client";

import { useCallback, useState } from "react";
import {
  parseUnits,
  type Address,
  type Hash,
  zeroAddress,
} from "viem";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useReadContracts,
  useWriteContract,
} from "wagmi";
import {
  CONTRACTS,
  conditionalVaultAbi,
  erc20Abi,
  mockUsdcAbi,
  proposalAmmAbi,
  MODAO_DECIMALS,
  USDC_DECIMALS,
} from "@/lib/contracts";

/**
 * Real trading against a per-proposal AMM.
 *
 * BUY (USDC → PASS-MODAO or FAIL-MODAO):
 *   1. approve real USDC → usdcVault
 *   2. usdcVault.deposit(amount)        → mints amount of PASS-USDC + FAIL-USDC
 *   3. approve {side}-USDC → {side}Amm
 *   4. {side}Amm.swap(zeroForOne=false, amountIn) → outputs {side}-MODAO
 *
 *   After buying, user is left with {opposite}-USDC equal to the amount they
 *   spent. That's by design — they're a futarchy participant on this side only.
 *
 * SELL ({side}-MODAO → {side}-USDC):
 *   1. approve {side}-MODAO → {side}Amm
 *   2. {side}Amm.swap(zeroForOne=true, amountIn) → outputs {side}-USDC
 *
 * Each step awaits receipt before sending the next — the deposit's state
 * must land before the conditional-token approve can succeed.
 */

export type TradeStep =
  | "idle"
  | "minting-usdc"           // BUY only, if user is short on real USDC
  | "approving-input"        // BUY: approve real USDC to vault. SELL: approve conditional MODAO to AMM.
  | "depositing-collateral"  // BUY only
  | "approving-conditional"  // BUY only
  | "swapping"
  | "success"
  | "error";

export interface TradeParams {
  side: "pass" | "fail";
  direction: "buy" | "sell";
  /** Human-readable input amount as a string. USDC for buy, MODAO for sell. */
  amount: string;
  /** AMM and vault addresses for the proposal — comes from getProposal(). */
  passAmm: Address;
  failAmm: Address;
  usdcVault: Address;
  projectVault: Address;
}

export function useTradeProposal({
  passAmm,
  failAmm,
  usdcVault,
  projectVault,
  side,
}: {
  passAmm?: Address;
  failAmm?: Address;
  usdcVault?: Address;
  projectVault?: Address;
  side: "pass" | "fail";
}) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [step, setStep] = useState<TradeStep>("idle");
  const [error, setError] = useState<Error | null>(null);
  const [lastTx, setLastTx] = useState<Hash | null>(null);

  const amm = side === "pass" ? passAmm : failAmm;
  const enabled =
    !!address && !!amm && amm !== zeroAddress && !!usdcVault && !!projectVault;

  // Resolve conditional-token addresses on demand: vault.{side}Token().
  const { data: tokenReads } = useReadContracts({
    contracts: enabled
      ? [
          {
            address: usdcVault!,
            abi: conditionalVaultAbi,
            functionName: side === "pass" ? "passToken" : "failToken",
          },
          {
            address: projectVault!,
            abi: conditionalVaultAbi,
            functionName: side === "pass" ? "passToken" : "failToken",
          },
        ]
      : [],
    query: { enabled },
  });
  const conditionalUsdc = (tokenReads?.[0]?.result as Address | undefined) ?? undefined;
  const conditionalModao = (tokenReads?.[1]?.result as Address | undefined) ?? undefined;

  // Balances we surface to the form.
  const { data: usdcBalance } = useReadContract({
    address: CONTRACTS.mockUsdc,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 8_000 },
  });
  const { data: conditionalModaoBalance } = useReadContract({
    address: conditionalModao,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address && conditionalModao ? [address] : undefined,
    query: { enabled: !!address && !!conditionalModao, refetchInterval: 8_000 },
  });

  const reset = useCallback(() => {
    setStep("idle");
    setError(null);
    setLastTx(null);
  }, []);

  const trade = useCallback(
    async ({ direction, amount }: Pick<TradeParams, "direction" | "amount">) => {
      if (!address || !publicClient) {
        setError(new Error("Connect a wallet first."));
        setStep("error");
        return;
      }
      if (!amm || !usdcVault || !projectVault) {
        setError(new Error("This proposal's markets are not open yet."));
        setStep("error");
        return;
      }
      if (!conditionalUsdc || !conditionalModao) {
        setError(new Error("Reading conditional tokens — wait a moment and try again."));
        setStep("error");
        return;
      }

      const raw = parseAmount(amount, direction === "buy" ? USDC_DECIMALS : MODAO_DECIMALS);
      if (raw <= 0n) {
        setError(new Error("Enter a non-zero amount."));
        setStep("error");
        return;
      }

      try {
        setError(null);

        // ---- BUY: USDC → PASS-USDC → PASS-MODAO ----
        if (direction === "buy") {
          // 0. Mint MockUSDC if short (testnet convenience).
          const have = (usdcBalance ?? 0n) as bigint;
          if (have < raw) {
            setStep("minting-usdc");
            await sendAndWait(publicClient, () =>
              writeContractAsync({
                address: CONTRACTS.mockUsdc,
                abi: mockUsdcAbi,
                functionName: "mint",
                args: [address, raw - have],
              }),
              setLastTx,
            );
          }

          // 1. approve real USDC → usdcVault
          setStep("approving-input");
          await sendAndWait(publicClient, () =>
            writeContractAsync({
              address: CONTRACTS.mockUsdc,
              abi: erc20Abi,
              functionName: "approve",
              args: [usdcVault, raw],
            }),
            setLastTx,
          );

          // 2. usdcVault.deposit(amount)
          setStep("depositing-collateral");
          await sendAndWait(publicClient, () =>
            writeContractAsync({
              address: usdcVault,
              abi: conditionalVaultAbi,
              functionName: "deposit",
              args: [raw],
            }),
            setLastTx,
          );

          // 3. approve PASS-USDC (or FAIL-USDC) → AMM
          setStep("approving-conditional");
          await sendAndWait(publicClient, () =>
            writeContractAsync({
              address: conditionalUsdc,
              abi: erc20Abi,
              functionName: "approve",
              args: [amm, raw],
            }),
            setLastTx,
          );

          // 4. AMM.swap(zeroForOne=false, amountIn=raw, minOut=0, to=user)
          //    token0 = MODAO-conditional, token1 = USDC-conditional. We're paying
          //    token1 to receive token0, so zeroForOne is FALSE.
          setStep("swapping");
          await sendAndWait(publicClient, () =>
            writeContractAsync({
              address: amm,
              abi: proposalAmmAbi,
              functionName: "swap",
              args: [false, raw, 0n, address],
            }),
            setLastTx,
          );
        }
        // ---- SELL: PASS-MODAO → PASS-USDC ----
        else {
          // 1. approve conditional MODAO → AMM
          setStep("approving-input");
          await sendAndWait(publicClient, () =>
            writeContractAsync({
              address: conditionalModao,
              abi: erc20Abi,
              functionName: "approve",
              args: [amm, raw],
            }),
            setLastTx,
          );

          // 2. AMM.swap(zeroForOne=true, amountIn=raw, minOut=0, to=user)
          setStep("swapping");
          await sendAndWait(publicClient, () =>
            writeContractAsync({
              address: amm,
              abi: proposalAmmAbi,
              functionName: "swap",
              args: [true, raw, 0n, address],
            }),
            setLastTx,
          );
        }

        setStep("success");
      } catch (e) {
        setError(e as Error);
        setStep("error");
      }
    },
    [
      address,
      amm,
      usdcVault,
      projectVault,
      conditionalUsdc,
      conditionalModao,
      publicClient,
      usdcBalance,
      writeContractAsync,
    ],
  );

  return {
    trade,
    reset,
    step,
    error,
    lastTx,
    isWorking: step !== "idle" && step !== "success" && step !== "error",
    balances: {
      usdc: (usdcBalance ?? 0n) as bigint,
      conditionalModao: (conditionalModaoBalance ?? 0n) as bigint,
    },
    addresses: {
      conditionalUsdc,
      conditionalModao,
    },
  };
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
