import { config } from "./config.js";

/**
 * Minimal Pinata client. Pins a JSON-wrapped reasoning blob to IPFS and returns
 * the CID + canonical URI. Used by the orchestrator to make each agent's
 * reasoning trustlessly addressable — the on-chain `reasoningHash` proves the
 * agent committed to specific text; the CID lets a reader pull it back.
 *
 * Why JSON-wrap instead of raw text? The wrapper gives us a place to record
 * metadata (persona name, model, score) without polluting the hash domain
 * (which still hashes the raw reasoning string).
 */

const PINATA_BASE = "https://api.pinata.cloud";

interface PinataPinJsonResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

export interface PinResult {
  /** Bare CID, e.g. "bafkreig..." or "Qm..." */
  cid: string;
  /** Canonical ipfs:// URI for on-chain storage. */
  uri: string;
  /** HTTP gateway URL for humans / explorers. */
  gateway: string;
}

export async function pinReasoning(
  reasoning: string,
  metadata: { personaName: string; model: string; score: number; proposalId: string },
): Promise<PinResult> {
  const jwt = config.pinataJwt;
  if (!jwt) throw new Error("PINATA_JWT not set in env");

  const body = {
    pinataContent: {
      proposalId: metadata.proposalId,
      persona: metadata.personaName,
      model: metadata.model,
      score: metadata.score,
      reasoning,
      ts: new Date().toISOString(),
    },
    pinataMetadata: {
      name: `modao-reasoning-${metadata.proposalId}-${metadata.personaName}`,
      keyvalues: {
        proposalId: metadata.proposalId,
        persona: metadata.personaName,
      },
    },
  };

  const res = await fetch(`${PINATA_BASE}/pinning/pinJSONToIPFS`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Pinata ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = (await res.json()) as PinataPinJsonResponse;
  return {
    cid: data.IpfsHash,
    uri: `ipfs://${data.IpfsHash}`,
    gateway: `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`,
  };
}
