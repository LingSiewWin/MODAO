import { privateKeyToAccount } from "viem/accounts";
import { MODAO_EIP712_DOMAIN, VERDICT_TYPES } from "@modao/shared";

// TODO: this signature shape must exactly match the on-chain verifier's
// EIP-712 typed-data definition once the contracts are written.

export async function signVerdict(
  proposalId: bigint,
  score: number,
  agentPrivateKey: `0x${string}`,
): Promise<`0x${string}`> {
  const account = privateKeyToAccount(agentPrivateKey);

  const signature = await account.signTypedData({
    domain: MODAO_EIP712_DOMAIN,
    types: VERDICT_TYPES,
    primaryType: "Verdict",
    message: {
      proposalId,
      score: BigInt(score),
    },
  });

  return signature;
}
