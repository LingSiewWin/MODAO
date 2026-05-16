export type ProposalState = "pending" | "passed" | "failed";

export interface Proposal {
  id: string;
  number: number;
  title: string;
  description: string;
  descriptionUrl: string;
  proposer: string;
  state: ProposalState;
  slotEnqueued: number;
  passTwap: number;
  failTwap: number;
  passThresholdBps: number;
  volumeUsd: number;
  createdAt: string;
  endsAt: string;
}

export interface Market {
  id: string;
  name: string;
  address: string;
  baseDecimals: number;
  quoteDecimals: number;
  twap: number;
  volume24h: number;
}

export interface TwapData {
  twap: number;
  lastObservationValue: number;
  lastObservedSlot: number;
}

export interface Order {
  price: number;
  size: number;
  side: "ask" | "bid";
}
