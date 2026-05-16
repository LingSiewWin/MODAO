"use client";

import { useMemo } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import {
  CONTRACTS,
  governorAbi,
  proposalAmmAbi,
  ProposalStatus,
  type OnchainProposal,
} from "@/lib/contracts";
import { buildDepthLadder, spotPrice, twapToPrice, type LadderRow } from "@/lib/amm-math";

export interface MarketSnapshot {
  amm: `0x${string}` | null;
  reserve0: bigint;
  reserve1: bigint;
  spot: number; // human USDC-per-MODAO
  twap: number; // human USDC-per-MODAO
  asks: LadderRow[];
  bids: LadderRow[];
}

export interface ProposalMarkets {
  isLoading: boolean;
  isOpen: boolean; // markets opened on-chain?
  pass: MarketSnapshot;
  fail: MarketSnapshot;
}

const EMPTY_SNAPSHOT: MarketSnapshot = {
  amm: null,
  reserve0: 0n,
  reserve1: 0n,
  spot: 0,
  twap: 0,
  asks: [],
  bids: [],
};

const EMPTY_RESULT: ProposalMarkets = {
  isLoading: false,
  isOpen: false,
  pass: EMPTY_SNAPSHOT,
  fail: EMPTY_SNAPSHOT,
};

/**
 * Reads everything the detail page needs to render real pass/fail markets:
 *   1. governor.getProposal(id)        → AMM addresses + snapshots taken at open
 *   2. for each AMM, in parallel:
 *        reserve0, reserve1, consultTWAP(passCumulativeAtStart, marketStartedAt)
 *   3. derive spot price + symmetric depth ladder client-side
 *
 * Returns EMPTY_RESULT when markets aren't open yet — components handle the
 * "no data" case by showing a skeleton or a "markets open after AI verdict" hint.
 */
export function useProposalMarkets(proposalIdRaw: string | bigint | undefined): ProposalMarkets {
  const proposalId =
    typeof proposalIdRaw === "bigint"
      ? proposalIdRaw
      : proposalIdRaw
        ? BigInt(String(proposalIdRaw).replace(/^prop_0*/, "") || "0")
        : 0n;

  const enabled = proposalId > 0n;

  // 1. Pull the proposal so we know the AMM addresses + cumulative-at-start.
  const { data: proposalRaw, isLoading: loadingProposal } = useReadContract({
    address: CONTRACTS.governor,
    abi: governorAbi,
    functionName: "getProposal",
    args: [proposalId],
    query: { enabled, refetchInterval: 12_000 },
  });

  const proposal = proposalRaw as OnchainProposal | undefined;
  const isOpen =
    !!proposal &&
    proposal.status === ProposalStatus.MarketsOpen &&
    proposal.passAmm !== "0x0000000000000000000000000000000000000000" &&
    proposal.failAmm !== "0x0000000000000000000000000000000000000000";

  // 2. Batch-read reserves + TWAP for both AMMs.
  const ammReadEnabled = isOpen && !!proposal;
  const { data: ammReads, isLoading: loadingAmms } = useReadContracts({
    contracts: ammReadEnabled
      ? [
          { address: proposal!.passAmm, abi: proposalAmmAbi, functionName: "reserve0" },
          { address: proposal!.passAmm, abi: proposalAmmAbi, functionName: "reserve1" },
          {
            address: proposal!.passAmm,
            abi: proposalAmmAbi,
            functionName: "consultTWAP",
            args: [proposal!.passCumulativeAtStart, proposal!.marketStartedAt],
          },
          { address: proposal!.failAmm, abi: proposalAmmAbi, functionName: "reserve0" },
          { address: proposal!.failAmm, abi: proposalAmmAbi, functionName: "reserve1" },
          {
            address: proposal!.failAmm,
            abi: proposalAmmAbi,
            functionName: "consultTWAP",
            args: [proposal!.failCumulativeAtStart, proposal!.marketStartedAt],
          },
        ]
      : [],
    query: { enabled: ammReadEnabled, refetchInterval: 6_000 },
  });

  return useMemo<ProposalMarkets>(() => {
    if (!enabled) return EMPTY_RESULT;
    if (!proposal || !isOpen) {
      return { ...EMPTY_RESULT, isLoading: loadingProposal };
    }
    if (!ammReads || ammReads.length < 6) {
      return {
        isLoading: loadingProposal || loadingAmms,
        isOpen: true,
        pass: { ...EMPTY_SNAPSHOT, amm: proposal.passAmm },
        fail: { ...EMPTY_SNAPSHOT, amm: proposal.failAmm },
      };
    }

    const passR0 = bigIntFrom(ammReads[0]);
    const passR1 = bigIntFrom(ammReads[1]);
    const passTwapRaw = bigIntFrom(ammReads[2]);
    const failR0 = bigIntFrom(ammReads[3]);
    const failR1 = bigIntFrom(ammReads[4]);
    const failTwapRaw = bigIntFrom(ammReads[5]);

    const passLadder = buildDepthLadder({ reserve0: passR0, reserve1: passR1 });
    const failLadder = buildDepthLadder({ reserve0: failR0, reserve1: failR1 });

    return {
      isLoading: false,
      isOpen: true,
      pass: {
        amm: proposal.passAmm,
        reserve0: passR0,
        reserve1: passR1,
        spot: spotPrice(passR0, passR1),
        twap: twapToPrice(passTwapRaw),
        asks: passLadder.asks,
        bids: passLadder.bids,
      },
      fail: {
        amm: proposal.failAmm,
        reserve0: failR0,
        reserve1: failR1,
        spot: spotPrice(failR0, failR1),
        twap: twapToPrice(failTwapRaw),
        asks: failLadder.asks,
        bids: failLadder.bids,
      },
    };
  }, [enabled, proposal, isOpen, ammReads, loadingProposal, loadingAmms]);
}

function bigIntFrom(r: { status: string; result?: unknown } | undefined): bigint {
  if (!r || r.status !== "success" || r.result == null) return 0n;
  return typeof r.result === "bigint" ? r.result : BigInt(r.result as string | number);
}
