import { keccak256, toBytes } from "viem";
import type { PrivateKeyAccount } from "viem";
import { MODAO_EIP712_DOMAIN, VERDICT_TYPES } from "@modao/shared";

export interface AgentVerdict {
  signer: `0x${string}`;
  signature: `0x${string}`;
}

export function reasoningHash(text: string): `0x${string}` {
  return keccak256(toBytes(text));
}

export async function signVerdict(
  account: PrivateKeyAccount,
  proposalId: bigint,
  score: number,
  reasoningHashHex: `0x${string}`,
  deadline: bigint,
): Promise<AgentVerdict> {
  const signature = await account.signTypedData({
    domain: MODAO_EIP712_DOMAIN,
    types: VERDICT_TYPES,
    primaryType: "Verdict",
    message: {
      proposalId,
      score: BigInt(score),
      reasoningHash: reasoningHashHex,
      deadline,
    },
  });
  return { signer: account.address, signature };
}

/**
 * The AISwarmOracle requires signatures presented in strictly-ascending signer order
 * for cheap on-chain dedup. Sort before submitting.
 */
export function sortBundle(bundle: AgentVerdict[]): `0x${string}`[] {
  return [...bundle]
    .sort((a, b) => (BigInt(a.signer) < BigInt(b.signer) ? -1 : 1))
    .map((v) => v.signature);
}
