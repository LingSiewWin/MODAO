import {
  createPublicClient,
  createWalletClient,
  http,
  defineChain,
  getContract,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  ADDRESSES,
  AI_SWARM_ORACLE_ABI,
  MODAO_GOVERNOR_ABI,
  MONAD_TESTNET_CHAIN_ID,
} from "@modao/shared";
import { config } from "./config.js";

export const monadTestnet = defineChain({
  id: MONAD_TESTNET_CHAIN_ID,
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: [config.rpcUrl] } },
});

export const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(),
});

export const submitterAccount = privateKeyToAccount(config.submitterPrivateKey);

export const walletClient = createWalletClient({
  account: submitterAccount,
  chain: monadTestnet,
  transport: http(),
});

export const governor = getContract({
  address: ADDRESSES.MODAOGovernor,
  abi: MODAO_GOVERNOR_ABI,
  client: { public: publicClient, wallet: walletClient },
});

export const oracle = getContract({
  address: ADDRESSES.AISwarmOracle,
  abi: AI_SWARM_ORACLE_ABI,
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
}

/** Resolve full proposal context from the on-chain spec. */
export async function loadProposal(proposalId: bigint): Promise<ProposalContext> {
  const p = await governor.read.getProposal([proposalId]);
  return {
    proposalId,
    proposer: p.proposer,
    name: p.spec.name,
    symbol: p.spec.symbol,
    descriptionURI: p.spec.descriptionURI,
    supply: p.spec.supply,
  };
}
