import { keccak256, encodeAbiParameters, parseAbiParameters } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { PrivateKeyAccount } from "viem";
import { AGENT_ADDRESSES, AGENT_SEED } from "@modao/shared";

/**
 * Derives the i-th agent private key from the same seed the deploy script used:
 *   pk = keccak256(abi.encode("modao-agent", i))
 * Returns a viem account ready to sign typed data.
 *
 * The derived addresses must match AGENT_ADDRESSES from the deployment JSON
 * — those are the addresses the AISwarmOracle has registered.
 */
export function deriveAgentAccount(index: number): PrivateKeyAccount {
  const pk = keccak256(
    encodeAbiParameters(parseAbiParameters("string, uint256"), [AGENT_SEED, BigInt(index)]),
  );
  return privateKeyToAccount(pk);
}

/** Sanity-check: derived addresses match the deployment's registered set. */
export function verifyAgentSet(count: number): void {
  for (let i = 0; i < count; i++) {
    const acct = deriveAgentAccount(i);
    if (!AGENT_ADDRESSES.includes(acct.address)) {
      throw new Error(
        `Derived agent ${i} address ${acct.address} is not in the registered set. ` +
          `Seed or deployment is out of sync.`,
      );
    }
  }
}
