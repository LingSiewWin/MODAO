"use client";

import { useMemo } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import {
  CONTRACTS,
  governorAbi,
  ProposalStatus,
  ProposalOutcome,
  type OnchainProposal,
} from "@/lib/contracts";
import type { Proposal, ProposalState } from "@/lib/types";

/**
 * Reads `proposalCount` + every `getProposal(i)` and shapes them into the UI's
 * `Proposal` type. Mock fields the chain doesn't expose (volume, twap pre-finalize)
 * stay as zeros — components handle "no market data yet" gracefully.
 */
export function useProposals() {
  const { data: count, isLoading: loadingCount } = useReadContract({
    address: CONTRACTS.governor,
    abi: governorAbi,
    functionName: "proposalCount",
  });

  const ids = useMemo(() => {
    if (!count || count === 0n) return [];
    return Array.from({ length: Number(count) }, (_, i) => BigInt(i + 1));
  }, [count]);

  const { data, isLoading } = useReadContracts({
    contracts: ids.map((id) => ({
      address: CONTRACTS.governor,
      abi: governorAbi,
      functionName: "getProposal",
      args: [id],
    })),
    query: { enabled: ids.length > 0 },
  });

  const proposals = useMemo<Proposal[]>(() => {
    if (!data) return [];
    return data
      .map((r, i) => {
        if (r.status !== "success" || !r.result) return null;
        return shapeProposal(ids[i]!, r.result as unknown as OnchainProposal);
      })
      .filter((p): p is Proposal => p !== null);
  }, [data, ids]);

  return {
    proposals,
    count: count ? Number(count) : 0,
    isLoading: loadingCount || isLoading,
  };
}

export function useProposal(id: string | undefined) {
  // Frontend ids look like "prop_007" or "7" — accept both.
  const numeric = id ? BigInt(id.replace(/^prop_0*/, "") || "0") : 0n;
  const enabled = numeric > 0n;

  const { data, isLoading } = useReadContract({
    address: CONTRACTS.governor,
    abi: governorAbi,
    functionName: "getProposal",
    args: [numeric],
    query: { enabled },
  });

  const proposal = data ? shapeProposal(numeric, data as unknown as OnchainProposal) : null;
  return { proposal, isLoading };
}

function shapeProposal(id: bigint, raw: OnchainProposal): Proposal {
  const state = statusToState(raw.status, raw.outcome);
  const startedAt = Number(raw.saleStartedAt) * 1000;
  const endsAt = Number(raw.saleEndsAt) * 1000;

  return {
    id: `prop_${String(id).padStart(3, "0")}`,
    number: Number(id),
    title: raw.spec.name ? `Launch ${raw.spec.name} on MoDAO` : `Proposal #${id}`,
    symbol: raw.spec.symbol || "PROJECT",
    description: raw.spec.descriptionURI || "—",
    descriptionUrl: raw.spec.descriptionURI || "#",
    proposer: raw.proposer,
    state,
    slotEnqueued: Number(raw.saleStartedAt) || 0,
    // Sale TWAP isn't meaningful in commit-ICO — leave as placeholders for
    // any list-card progress indicator that wants a 0..1 number.
    passTwap: state === "passed" ? 1 : state === "failed" ? 0 : 0.5,
    failTwap: state === "passed" ? 0 : state === "failed" ? 1 : 0.5,
    passThresholdBps: 500,
    volumeUsd: 0,
    createdAt: new Date(startedAt || Date.now()).toISOString(),
    endsAt: new Date(endsAt || Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    projectToken: raw.projectToken,
    sale: raw.sale,
  };
}

function statusToState(status: number, outcome: number): ProposalState {
  if (status === ProposalStatus.Finalized) {
    return outcome === ProposalOutcome.Successful ? "passed" : "failed";
  }
  // Submitted + SaleOpen both surface as "pending" to the user.
  return "pending";
}
