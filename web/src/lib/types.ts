export type ProposalState = "pending" | "passed" | "failed";

export interface Proposal {
  id: string;
  number: number;
  title: string;
  /** Project token symbol from the proposal spec (e.g. "ACME"). */
  symbol: string;
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
  /** Per-proposal ProjectToken minted by the governor when the sale opens.
   *  Zero address for proposals that haven't been accepted by the AI swarm yet. */
  projectToken: `0x${string}`;
  /** Per-proposal LaunchSale contract. Zero address until SaleOpen. */
  sale: `0x${string}`;
}

export interface Market {
  id: string;
  /** Parent proposal — the market only exists in that context. The pool
   *  technically trades conditional-MODAO against conditional-USDC; what
   *  varies between markets is *which proposal* the conditional is gated on. */
  proposalId: string;
  /** Which side of the conditional market: pass | fail. */
  side: "pass" | "fail";
  /** AMM contract address. */
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
