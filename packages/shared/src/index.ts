// Shared types, constants, ABIs, and deployment addresses for the MODAO monorepo.
// Imported by agents/ and web/. Single source of truth: deployments/monad-testnet.json.

import { getAddress } from "viem";
import deployment from "../../../deployments/monad-testnet.json" with { type: "json" };

export const MONAD_TESTNET_CHAIN_ID = 10143 as const;
export const MONAD_TESTNET_RPC = deployment.rpcUrl;

/**
 * Normalize every deployed address through viem's `getAddress` so checksum
 * casing in deployments/monad-testnet.json doesn't trip strict consumers.
 */
const raw = deployment.contracts;
export const ADDRESSES = {
  MODAOToken: getAddress(raw.MODAOToken),
  MockUSDC: getAddress(raw.MockUSDC),
  AISwarmOracle: getAddress(raw.AISwarmOracle),
  MODAOGovernor: getAddress(raw.MODAOGovernor),
} as const;

export const AGENT_ADDRESSES = deployment.agents.addresses.map((a) =>
  getAddress(a),
) as readonly `0x${string}`[];
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
  /** Minimum USDC raise required for sale Successful (6 decimals). */
  minRaise: bigint;
}

/** Mirrors LaunchSale.State (0 Open / 1 Successful / 2 Failed). */
export enum LaunchSaleState {
  Open = 0,
  Successful = 1,
  Failed = 2,
}

/** Mirrors MODAOGovernor.Status (0 None / 1 Submitted / 2 SaleOpen / 3 Finalized). */
export enum ProposalStatus {
  None = 0,
  Submitted = 1,
  SaleOpen = 2,
  Finalized = 3,
}

// Minimal ABIs — only what agents and frontend touch.
//
// Governor v3 = MetaDAO-style commit-ICO model. Each proposal on AI-accept
// deploys a fresh ProjectToken + LaunchSale; conditional vaults / AMMs are no
// longer part of the launch flow (shelved for the Phase-2 governance product).
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
    name: "SaleOpened",
    inputs: [
      { name: "proposalId", type: "uint256", indexed: true },
      { name: "projectToken", type: "address", indexed: false },
      { name: "sale", type: "address", indexed: false },
      { name: "minRaise", type: "uint256", indexed: false },
      { name: "saleEndsAt", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "ProposalFinalized",
    inputs: [
      { name: "proposalId", type: "uint256", indexed: true },
      { name: "outcome", type: "uint8", indexed: false },
      { name: "totalCommitted", type: "uint256", indexed: false },
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
      { name: "raised", type: "uint256", indexed: false },
    ],
  },
  {
    type: "function",
    name: "submitProposal",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "spec",
        type: "tuple",
        components: [
          { name: "name", type: "string" },
          { name: "symbol", type: "string" },
          { name: "supply", type: "uint256" },
          { name: "descriptionURI", type: "string" },
          { name: "minRaise", type: "uint256" },
        ],
      },
    ],
    outputs: [{ type: "uint256" }],
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
    name: "finalize",
    stateMutability: "nonpayable",
    inputs: [{ name: "proposalId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "BOND_MODAO",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "SALE_WINDOW",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "proposalCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
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
          { name: "sale", type: "address" },
          { name: "saleStartedAt", type: "uint256" },
          { name: "saleEndsAt", type: "uint256" },
          {
            type: "tuple",
            name: "spec",
            components: [
              { name: "name", type: "string" },
              { name: "symbol", type: "string" },
              { name: "supply", type: "uint256" },
              { name: "descriptionURI", type: "string" },
              { name: "minRaise", type: "uint256" },
            ],
          },
        ],
      },
    ],
  },
] as const;

export const LAUNCH_SALE_ABI = [
  // ---- views ----
  { type: "function", name: "usdc", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "projectToken", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "recipient", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "minRaise", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "saleEndsAt", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "tokenSupplyForSale", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "state", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", name: "totalCommitted", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  {
    type: "function",
    name: "commitments",
    stateMutability: "view",
    inputs: [{ name: "depositor", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  // ---- writes ----
  {
    type: "function",
    name: "commit",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  { type: "function", name: "finalize", stateMutability: "nonpayable", inputs: [], outputs: [] },
  {
    type: "function",
    name: "claimTokens",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  { type: "function", name: "refund", stateMutability: "nonpayable", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "claimFunds", stateMutability: "nonpayable", inputs: [], outputs: [{ type: "uint256" }] },
  // ---- events ----
  {
    type: "event",
    name: "Committed",
    inputs: [
      { name: "depositor", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "totalCommitted", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Finalized",
    inputs: [
      { name: "state", type: "uint8", indexed: false },
      { name: "totalCommitted", type: "uint256", indexed: false },
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
