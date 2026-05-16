// Shared types, constants, ABIs, and deployment addresses for the MODAO monorepo.
// Imported by agents/ and web/. Single source of truth: deployments/monad-testnet.json.

import deployment from "../../../deployments/monad-testnet.json" with { type: "json" };

export const MONAD_TESTNET_CHAIN_ID = 10143 as const;
export const MONAD_TESTNET_RPC = deployment.rpcUrl;

export const ADDRESSES = deployment.contracts as {
  MODAOToken: `0x${string}`;
  MockUSDC: `0x${string}`;
  AISwarmOracle: `0x${string}`;
  MODAOGovernor: `0x${string}`;
};

export const AGENT_ADDRESSES = deployment.agents.addresses as readonly `0x${string}`[];
export const AGENT_SEED = "modao-agent" as const;

export const ORACLE_THRESHOLD = deployment.constants.ORACLE_THRESHOLD;
export const ORACLE_MIN_SCORE = deployment.constants.ORACLE_MIN_SCORE;
export const TWAP_WINDOW_SECONDS = deployment.constants.TWAP_WINDOW_SECONDS;

// EIP-712 — must match AISwarmOracle exactly.
export const MODAO_EIP712_DOMAIN = {
  name: "MODAOAISwarmOracle",
  version: "1",
  chainId: MONAD_TESTNET_CHAIN_ID,
  verifyingContract: ADDRESSES.AISwarmOracle,
} as const;

export const VERDICT_TYPES = {
  Verdict: [
    { name: "proposalId", type: "uint256" },
    { name: "score", type: "uint256" },
    { name: "reasoningHash", type: "bytes32" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

export interface Verdict {
  proposalId: bigint;
  score: bigint;
  reasoningHash: `0x${string}`;
  deadline: bigint;
}

export interface ProjectSpec {
  name: string;
  symbol: string;
  supply: bigint;
  descriptionURI: string;
}

// Minimal ABIs — only what agents and frontend touch.
export const MODAO_GOVERNOR_ABI = [
  {
    type: "event",
    name: "ProposalSubmitted",
    inputs: [
      { name: "proposalId", type: "uint256", indexed: true },
      { name: "proposer", type: "address", indexed: true },
      { name: "name", type: "string", indexed: false },
      { name: "symbol", type: "string", indexed: false },
    ],
  },
  {
    type: "event",
    name: "MarketsOpened",
    inputs: [
      { name: "proposalId", type: "uint256", indexed: true },
      { name: "projectToken", type: "address", indexed: false },
      { name: "projectVault", type: "address", indexed: false },
      { name: "usdcVault", type: "address", indexed: false },
      { name: "passAmm", type: "address", indexed: false },
      { name: "failAmm", type: "address", indexed: false },
    ],
  },
  {
    type: "event",
    name: "ProposalFinalized",
    inputs: [
      { name: "proposalId", type: "uint256", indexed: true },
      { name: "outcome", type: "uint8", indexed: false },
      { name: "passTwap", type: "uint256", indexed: false },
      { name: "failTwap", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "ProjectLaunched",
    inputs: [
      { name: "proposalId", type: "uint256", indexed: true },
      { name: "projectToken", type: "address", indexed: false },
      { name: "name", type: "string", indexed: false },
      { name: "symbol", type: "string", indexed: false },
      { name: "supply", type: "uint256", indexed: false },
      { name: "descriptionURI", type: "string", indexed: false },
    ],
  },
  {
    type: "function",
    name: "submitVerdictAndOpen",
    stateMutability: "nonpayable",
    inputs: [
      { name: "proposalId", type: "uint256" },
      { name: "score", type: "uint256" },
      { name: "reasoningHash", type: "bytes32" },
      { name: "deadline", type: "uint256" },
      { name: "signatures", type: "bytes[]" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "getProposal",
    stateMutability: "view",
    inputs: [{ name: "proposalId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "proposer", type: "address" },
          { name: "status", type: "uint8" },
          { name: "outcome", type: "uint8" },
          { name: "projectToken", type: "address" },
          { name: "projectVault", type: "address" },
          { name: "usdcVault", type: "address" },
          { name: "passAmm", type: "address" },
          { name: "failAmm", type: "address" },
          { name: "marketStartedAt", type: "uint256" },
          { name: "passCumulativeAtStart", type: "uint256" },
          { name: "failCumulativeAtStart", type: "uint256" },
          {
            type: "tuple",
            name: "spec",
            components: [
              { name: "name", type: "string" },
              { name: "symbol", type: "string" },
              { name: "supply", type: "uint256" },
              { name: "descriptionURI", type: "string" },
            ],
          },
        ],
      },
    ],
  },
] as const;

export const AI_SWARM_ORACLE_ABI = [
  {
    type: "function",
    name: "isAgent",
    stateMutability: "view",
    inputs: [{ name: "agent", type: "address" }],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "verdictRecorded",
    stateMutability: "view",
    inputs: [{ name: "proposalId", type: "uint256" }],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "verdictDigest",
    stateMutability: "view",
    inputs: [
      { name: "proposalId", type: "uint256" },
      { name: "score", type: "uint256" },
      { name: "reasoningHash", type: "bytes32" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [{ type: "bytes32" }],
  },
] as const;
