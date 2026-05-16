/**
 * MODAO deployed contracts on Monad testnet (chain 10143).
 *
 * Addresses come from contracts/broadcast/Deploy.s.sol/10143/run-latest.json.
 * Re-deploys overwrite that file — re-run `bun run sync:contracts` (TODO) or
 * update manually.
 *
 * ABIs here are hand-trimmed to the surface the UI actually calls. The full
 * ABIs live in contracts/out/<name>.sol/<name>.json. If you need a function
 * that's not exported here, copy it from there.
 */
import type { Address } from "viem";

export const CHAIN_ID = 10143;

export const CONTRACTS = {
  modaoToken: "0xb2de502b643fe5cc7781fc8b18493a414dee8afb" as Address,
  mockUsdc: "0xf1c0657bb651d14a64a42daa1381a4615d5e72f5" as Address,
  aiSwarmOracle: "0xaf15a88b7d0cc75bb254662a1abf4d01491fe536" as Address,
  governor: "0x7992f1590be36dcc78079de75ec796c904461342" as Address,
} as const;

// ----------------------------------------------------------------------------
// MODAOGovernor
// ----------------------------------------------------------------------------

export const governorAbi = [
  // ---- views ----
  {
    type: "function",
    name: "proposalCount",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getProposal",
    inputs: [{ name: "proposalId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "proposer", type: "address" },
          { name: "status", type: "uint8" },
          { name: "outcome", type: "uint8" },
          { name: "modaoVault", type: "address" },
          { name: "usdcVault", type: "address" },
          { name: "passAmm", type: "address" },
          { name: "failAmm", type: "address" },
          { name: "marketStartedAt", type: "uint256" },
          { name: "passCumulativeAtStart", type: "uint256" },
          { name: "failCumulativeAtStart", type: "uint256" },
          {
            name: "spec",
            type: "tuple",
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
    stateMutability: "view",
  },
  { type: "function", name: "BOND_MODAO", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "BOND_USDC", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "TWAP_WINDOW", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  // ---- writes ----
  {
    type: "function",
    name: "submitProposal",
    inputs: [
      {
        name: "spec",
        type: "tuple",
        components: [
          { name: "name", type: "string" },
          { name: "symbol", type: "string" },
          { name: "supply", type: "uint256" },
          { name: "descriptionURI", type: "string" },
        ],
      },
    ],
    outputs: [{ type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "finalize",
    inputs: [{ name: "proposalId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  // ---- events ----
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
      { name: "modaoVault", type: "address", indexed: false },
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
] as const;

// ----------------------------------------------------------------------------
// ProposalAMM — deployed per-proposal, so addresses come from getProposal()
// ----------------------------------------------------------------------------

export const proposalAmmAbi = [
  // ---- views ----
  { type: "function", name: "reserve0", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "reserve1", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "token0", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
  { type: "function", name: "token1", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
  { type: "function", name: "blockTimestampLast", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "price0CumulativeLast", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  {
    type: "function",
    name: "snapshotCumulative",
    inputs: [],
    outputs: [{ type: "uint256" }, { type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "consultTWAP",
    inputs: [
      { name: "sinceCumulative", type: "uint256" },
      { name: "sinceTimestamp", type: "uint256" },
    ],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  // ---- writes ----
  {
    type: "function",
    name: "swap",
    inputs: [
      { name: "zeroForOne", type: "bool" },
      { name: "amountIn", type: "uint256" },
      { name: "amountOutMin", type: "uint256" },
      { name: "to", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
    stateMutability: "nonpayable",
  },
  // ---- events ----
  {
    type: "event",
    name: "Swap",
    inputs: [
      { name: "sender", type: "address", indexed: true },
      { name: "amount0In", type: "uint256", indexed: false },
      { name: "amount1In", type: "uint256", indexed: false },
      { name: "amount0Out", type: "uint256", indexed: false },
      { name: "amount1Out", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Sync",
    inputs: [
      { name: "reserve0", type: "uint256", indexed: false },
      { name: "reserve1", type: "uint256", indexed: false },
    ],
  },
] as const;

// PRICE_SCALE used by the AMM's cumulative-price math (1e18).
export const AMM_PRICE_SCALE = 10n ** 18n;
// Constant the contract uses for the conditional MODAO and USDC decimals.
export const MODAO_DECIMALS = 18;
export const USDC_DECIMALS = 6;

// ----------------------------------------------------------------------------
// ERC20 — MODAOToken and MockUSDC share the standard surface we need
// ----------------------------------------------------------------------------

export const erc20Abi = [
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "allowance",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "decimals",
    inputs: [],
    outputs: [{ type: "uint8" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "symbol",
    inputs: [],
    outputs: [{ type: "string" }],
    stateMutability: "view",
  },
] as const;

// MockUSDC — public mint for testnet faucet UX.
export const mockUsdcAbi = [
  ...erc20Abi,
  {
    type: "function",
    name: "mint",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

// ----------------------------------------------------------------------------
// ConditionalVault — wraps an underlying ERC20 into pass/fail conditional tokens
// ----------------------------------------------------------------------------

export const conditionalVaultAbi = [
  { type: "function", name: "passToken", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
  { type: "function", name: "failToken", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
  { type: "function", name: "outcome", inputs: [], outputs: [{ type: "uint8" }], stateMutability: "view" },
  { type: "function", name: "underlying", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
  {
    type: "function",
    name: "deposit",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "merge",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "redeem",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

// ----------------------------------------------------------------------------
// On-chain proposal status — mirrors MODAOGovernor.Status enum.
// ----------------------------------------------------------------------------

export const ProposalStatus = {
  None: 0,
  Submitted: 1,
  MarketsOpen: 2,
  Finalized: 3,
} as const;

export const ProposalOutcome = {
  Undecided: 0,
  Pass: 1,
  Fail: 2,
} as const;

export type OnchainProposal = {
  proposer: Address;
  status: number;
  outcome: number;
  modaoVault: Address;
  usdcVault: Address;
  passAmm: Address;
  failAmm: Address;
  marketStartedAt: bigint;
  passCumulativeAtStart: bigint;
  failCumulativeAtStart: bigint;
  spec: {
    name: string;
    symbol: string;
    supply: bigint;
    descriptionURI: string;
  };
};
