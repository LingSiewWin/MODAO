"use client";

import { useMemo } from "react";
import type { Address } from "viem";
import { useReadContract, useReadContracts } from "wagmi";
import {
  CONTRACTS,
  conditionalVaultAbi,
  futarchyFactoryAbi,
  futarchyMarketAbi,
  FutarchyMarketState,
  FutarchyOutcome,
} from "@/lib/contracts";

const ZERO = "0x0000000000000000000000000000000000000000" as const;
export const factoryDeployed = CONTRACTS.futarchyFactory !== ZERO;

/** Global market count from the factory. */
export function useFutarchyMarketCount() {
  const { data, isLoading } = useReadContract({
    address: CONTRACTS.futarchyFactory,
    abi: futarchyFactoryAbi,
    functionName: "marketCount",
    query: { enabled: factoryDeployed },
  });
  return { count: data ? Number(data) : 0, isLoading };
}

/** Addresses for every market in the factory, indexed globally. */
export function useAllFutarchyMarkets() {
  const { count, isLoading: countLoading } = useFutarchyMarketCount();
  const ids = useMemo(
    () => Array.from({ length: count }, (_, i) => BigInt(i + 1)),
    [count],
  );

  const { data, isLoading } = useReadContracts({
    contracts: ids.map((id) => ({
      address: CONTRACTS.futarchyFactory,
      abi: futarchyFactoryAbi,
      functionName: "marketsByGlobalId",
      args: [id],
    })),
    query: { enabled: factoryDeployed && ids.length > 0 },
  });

  const markets = useMemo(() => {
    if (!data) return [] as { id: bigint; address: Address }[];
    return data
      .map((r, i) => {
        if (r.status !== "success" || !r.result) return null;
        return { id: ids[i]!, address: r.result as Address };
      })
      .filter((m): m is { id: bigint; address: Address } => m !== null);
  }, [data, ids]);

  return { markets, isLoading: countLoading || isLoading };
}

/** Market ids tied to a specific project token. */
export function useFutarchyMarketsForProject(projectToken: Address | undefined) {
  const { data, isLoading } = useReadContract({
    address: CONTRACTS.futarchyFactory,
    abi: futarchyFactoryAbi,
    functionName: "marketsByProject",
    args: projectToken ? [projectToken] : undefined,
    query: { enabled: factoryDeployed && !!projectToken },
  });
  return {
    marketIds: (data as bigint[] | undefined) ?? [],
    isLoading,
  };
}

export interface FutarchyMarketSnapshot {
  address: Address;
  projectToken: Address;
  proposer: Address;
  description: string;
  marketId: bigint;
  state: number; // FutarchyMarketState
  outcome: number; // FutarchyOutcome
  tradingEndsAt: number; // ms epoch
  passTwap: bigint;
  failTwap: bigint;
  passAmm: Address;
  failAmm: Address;
  projectVault: Address;
  usdcVault: Address;
  seeded: boolean;
}

/** Pulls every static + dynamic field for one market in a single batched call. */
export function useFutarchyMarket(marketAddress: Address | undefined): {
  market: FutarchyMarketSnapshot | null;
  isLoading: boolean;
  refetch: () => void;
} {
  const reads = useMemo(
    () =>
      marketAddress
        ? ([
            { address: marketAddress, abi: futarchyMarketAbi, functionName: "projectToken" },
            { address: marketAddress, abi: futarchyMarketAbi, functionName: "proposer" },
            { address: marketAddress, abi: futarchyMarketAbi, functionName: "description" },
            { address: marketAddress, abi: futarchyMarketAbi, functionName: "marketId" },
            { address: marketAddress, abi: futarchyMarketAbi, functionName: "snapshot" },
          ] as const)
        : [],
    [marketAddress],
  );

  const { data, isLoading, refetch } = useReadContracts({
    contracts: reads as unknown as readonly {
      address: Address;
      abi: typeof futarchyMarketAbi;
      functionName: string;
    }[],
    query: { enabled: !!marketAddress, refetchInterval: 6000 },
  });

  const market = useMemo<FutarchyMarketSnapshot | null>(() => {
    if (!data || !marketAddress) return null;
    const [projectToken, proposer, description, marketId, snapshot] = data;
    if (
      !projectToken ||
      !proposer ||
      !description ||
      !marketId ||
      !snapshot ||
      projectToken.status !== "success" ||
      proposer.status !== "success" ||
      description.status !== "success" ||
      marketId.status !== "success" ||
      snapshot.status !== "success"
    ) {
      return null;
    }
    const s = snapshot.result as readonly [
      number,
      number,
      bigint,
      bigint,
      bigint,
      Address,
      Address,
      Address,
      Address,
      boolean,
    ];
    return {
      address: marketAddress,
      projectToken: projectToken.result as Address,
      proposer: proposer.result as Address,
      description: description.result as string,
      marketId: marketId.result as bigint,
      state: Number(s[0]),
      outcome: Number(s[1]),
      tradingEndsAt: Number(s[2]) * 1000,
      passTwap: s[3],
      failTwap: s[4],
      passAmm: s[5],
      failAmm: s[6],
      projectVault: s[7],
      usdcVault: s[8],
      seeded: s[9],
    };
  }, [data, marketAddress]);

  return { market, isLoading, refetch };
}

export function describeOutcome(state: number, outcome: number, tradingEndsAt: number) {
  if (state === FutarchyMarketState.Resolved) {
    return outcome === FutarchyOutcome.Pass ? "passed" : "failed";
  }
  if (Date.now() >= tradingEndsAt) return "ready-to-resolve";
  return "trading";
}

/** Reads the four conditional token addresses for a market (pass/fail × project/usdc). */
export function useVaultConditionalTokens(
  projectVault: Address | undefined,
  usdcVault: Address | undefined,
) {
  const { data, isLoading } = useReadContracts({
    contracts:
      projectVault && usdcVault
        ? [
            { address: projectVault, abi: conditionalVaultAbi, functionName: "passToken" },
            { address: projectVault, abi: conditionalVaultAbi, functionName: "failToken" },
            { address: usdcVault, abi: conditionalVaultAbi, functionName: "passToken" },
            { address: usdcVault, abi: conditionalVaultAbi, functionName: "failToken" },
          ]
        : [],
    query: { enabled: !!projectVault && !!usdcVault },
  });
  if (!data) return { tokens: null, isLoading };
  const [pp, pf, up, uf] = data;
  if (
    !pp ||
    !pf ||
    !up ||
    !uf ||
    pp.status !== "success" ||
    pf.status !== "success" ||
    up.status !== "success" ||
    uf.status !== "success"
  ) {
    return { tokens: null, isLoading };
  }
  return {
    tokens: {
      passProject: pp.result as Address,
      failProject: pf.result as Address,
      passUsdc: up.result as Address,
      failUsdc: uf.result as Address,
    },
    isLoading,
  };
}
