// Shared types and constants for the MODAO monorepo.
// TODO: expand once contracts/agents land.

export const MONAD_TESTNET_CHAIN_ID = 10143 as const;

export enum ProposalState {
  Pending = 0,
  Active = 1,
  Reviewing = 2,
  Passed = 3,
  Rejected = 4,
  Executed = 5,
  Cancelled = 6,
}

export interface Verdict {
  proposalId: bigint;
  score: bigint;
}

// EIP-712 domain — keep in sync with the on-chain verifier contract.
export const MODAO_EIP712_DOMAIN = {
  name: "MODAO",
  version: "1",
  chainId: MONAD_TESTNET_CHAIN_ID,
  // TODO: set to deployed verifier address.
  verifyingContract: "0x0000000000000000000000000000000000000000",
} as const;

export const VERDICT_TYPES = {
  Verdict: [
    { name: "proposalId", type: "uint256" },
    { name: "score", type: "uint256" },
  ],
} as const;
