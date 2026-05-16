import {
  createPublicClient,
  createWalletClient,
  http,
  defineChain,
  getContract,
} from "viem";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import {
  ADDRESSES,
  AI_SWARM_ORACLE_ABI,
  MODAO_GOVERNOR_ABI,
  MONAD_TESTNET_CHAIN_ID,
} from "@modao/shared";
import { config } from "./config.js";
import type { RepoBundle } from "./github.js";

export const monadTestnet = defineChain({
  id: MONAD_TESTNET_CHAIN_ID,
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: [config.rpcUrl] } },
});

// Read-only client — safe to instantiate eagerly. Used by dry-run and live both.
export const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(),
});

// Read-only oracle binding (no signer needed for reads like `verdictRecorded`).
export const oracle = getContract({
  address: ADDRESSES.AISwarmOracle,
  abi: AI_SWARM_ORACLE_ABI,
  client: publicClient,
});

// Lazy submitter — only constructed when first accessed. This lets the dry-run
// CLI run without SUBMITTER_PRIVATE_KEY (it only signs typed data with agent
// keys derived from a seed, and never submits).
let _submitter: PrivateKeyAccount | null = null;

function getSubmitter(): PrivateKeyAccount {
  if (!_submitter) _submitter = privateKeyToAccount(config.submitterPrivateKey);
  return _submitter;
}

function makeGovernor() {
  const wallet = createWalletClient({
    account: getSubmitter(),
    chain: monadTestnet,
    transport: http(),
  });
  return getContract({
    address: ADDRESSES.MODAOGovernor,
    abi: MODAO_GOVERNOR_ABI,
    client: { public: publicClient, wallet },
  });
}

let _governor: ReturnType<typeof makeGovernor> | null = null;

/**
 * Lazy governor binding. Access via `governor()` instead of as a const so
 * the wallet client + submitter key are only instantiated when actually needed.
 */
export function governor(): ReturnType<typeof makeGovernor> {
  if (!_governor) _governor = makeGovernor();
  return _governor;
}

// Read-only governor for dry-run / view calls without needing a wallet.
export const governorRead = getContract({
  address: ADDRESSES.MODAOGovernor,
  abi: MODAO_GOVERNOR_ABI,
  client: publicClient,
});

export interface ProposalContext {
  proposalId: bigint;
  proposer: `0x${string}`;
  name: string;
  symbol: string;
  /** May be ipfs:// or https://. Personas can fetch this for richer context. */
  descriptionURI: string;
  /** Hard supply cap from the spec. */
  supply: bigint;
  /**
   * GitHub URL of the submitted Monad Blitz fork. Required for the swarm to do
   * real evaluation. In Phase 5 (dry-run) supplied by CLI; in Phase 7 (live) the
   * orchestrator will extract it from the on-chain descriptionURI markdown.
   */
  githubUrl?: string;
  /**
   * Fetched repo bundle (README, files, commits, fork-lineage flags). The
   * orchestrator builds this from `githubUrl` before calling personas — if
   * undefined, personas should default to a conservative low score and say so.
   */
  repoData?: RepoBundle;
}

/** Resolve base proposal context from the on-chain spec. Does NOT fetch GitHub —
 * the orchestrator enriches with `repoData` before passing to personas. */
export async function loadProposal(proposalId: bigint): Promise<ProposalContext> {
  const p = await governorRead.read.getProposal([proposalId]);
  return {
    proposalId,
    proposer: p.proposer,
    name: p.spec.name,
    symbol: p.spec.symbol,
    descriptionURI: p.spec.descriptionURI,
    supply: p.spec.supply,
  };
}
