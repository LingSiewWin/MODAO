import type { Proposal, Market } from "./types";

/* Realistic mock data — proper names + descriptions so layouts don't get
   tested with lorem ipsum (a classic AI-aesthetic tell). */

export const MOCK_PROPOSALS: Proposal[] = [
  {
    id: "prop_001",
    number: 12,
    title: "Launch Hyperlend on MoDAO",
    description:
      "Hyperlend is an isolated-pool money market for Monad. We're requesting platform listing with a $500k raise via bonding curve, 70% to LP, 20% to team (4-year vest), 10% to community airdrop.",
    descriptionUrl: "https://modao.fi/proposals/12",
    proposer: "0xA1B2C3D4E5F6789012345678901234567890ABCD",
    state: "pending",
    slotEnqueued: 184_271_409,
    passTwap: 0.624,
    failTwap: 0.376,
    passThresholdBps: 500,
    volumeUsd: 142_300,
    createdAt: "2026-05-14T09:12:00Z",
    endsAt: "2026-05-17T09:12:00Z",
  },
  {
    id: "prop_002",
    number: 11,
    title: "Launch Pulse Perps on MoDAO",
    description:
      "Pulse is a perpetuals DEX targeting Monad-native liquidity. Seeking $750k raise, on-chain oracle from Redstone, 60/30/10 LP/team/community split.",
    descriptionUrl: "https://modao.fi/proposals/11",
    proposer: "0xB2C3D4E5F6789012345678901234567890ABCDEF",
    state: "pending",
    slotEnqueued: 184_260_881,
    passTwap: 0.481,
    failTwap: 0.519,
    passThresholdBps: 500,
    volumeUsd: 89_140,
    createdAt: "2026-05-13T15:42:00Z",
    endsAt: "2026-05-16T15:42:00Z",
  },
  {
    id: "prop_003",
    number: 10,
    title: "Launch Anchor Stable on MoDAO",
    description:
      "Over-collateralized stablecoin backed by MON + LSTs. $1M raise, vault liquidations gated by Chainlink price feed.",
    descriptionUrl: "https://modao.fi/proposals/10",
    proposer: "0xC3D4E5F6789012345678901234567890ABCDEF12",
    state: "passed",
    slotEnqueued: 184_120_044,
    passTwap: 0.812,
    failTwap: 0.188,
    passThresholdBps: 500,
    volumeUsd: 421_800,
    createdAt: "2026-05-10T11:00:00Z",
    endsAt: "2026-05-13T11:00:00Z",
  },
  {
    id: "prop_004",
    number: 9,
    title: "Launch Kettle NFT Marketplace",
    description:
      "Royalty-enforcing NFT marketplace with on-chain order matching. $300k raise.",
    descriptionUrl: "https://modao.fi/proposals/9",
    proposer: "0xD4E5F6789012345678901234567890ABCDEF1234",
    state: "failed",
    slotEnqueued: 184_005_122,
    passTwap: 0.293,
    failTwap: 0.707,
    passThresholdBps: 500,
    volumeUsd: 76_200,
    createdAt: "2026-05-07T08:30:00Z",
    endsAt: "2026-05-10T08:30:00Z",
  },
];

export const MOCK_MARKETS: Market[] = [
  {
    id: "mkt_hyperlend_pass",
    name: "HYPERLEND-PASS / USDC",
    address: "0xMKT1A1B2C3D4E5F6789012345678901234567890",
    baseDecimals: 18,
    quoteDecimals: 6,
    twap: 0.624,
    volume24h: 88_400,
  },
  {
    id: "mkt_hyperlend_fail",
    name: "HYPERLEND-FAIL / USDC",
    address: "0xMKT2B2C3D4E5F6789012345678901234567890AB",
    baseDecimals: 18,
    quoteDecimals: 6,
    twap: 0.376,
    volume24h: 53_900,
  },
  {
    id: "mkt_pulse_pass",
    name: "PULSE-PASS / USDC",
    address: "0xMKT3C3D4E5F6789012345678901234567890ABCD",
    baseDecimals: 18,
    quoteDecimals: 6,
    twap: 0.481,
    volume24h: 41_200,
  },
];

export const PLATFORM_STATS = {
  cumulativeRaisedUsd: 39_596_486,
  launchedToDate: 11,
  activeProposals: 2,
  totalVolumeUsd: 4_812_300,
};
