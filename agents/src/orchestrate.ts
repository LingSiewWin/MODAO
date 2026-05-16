import { ORACLE_THRESHOLD } from "@modao/shared";
import { config } from "./config.js";
import { deriveAgentAccount, verifyAgentSet } from "./keys.js";
import { reasoningHash, signVerdict, sortBundle, type AgentVerdict } from "./signing.js";
import { governor, oracle, loadProposal, type ProposalContext } from "./chain.js";
import { PERSONAS, callClaude, type PersonaVerdict } from "./personas/index.js";

/**
 * Run the full verdict pipeline for a single proposal:
 *   1. Load on-chain spec
 *   2. Call each persona's Claude prompt in parallel
 *   3. Aggregate scores (mean)
 *   4. Hash concatenated reasoning
 *   5. Each agent signs the typed verdict
 *   6. Sort by signer ascending
 *   7. Submit to governor.submitVerdictAndOpen
 *
 * Returns the submission tx hash, or null if the verdict was below the minimum and
 * the swarm chose not to submit.
 */
export async function runVerdict(proposalId: bigint): Promise<`0x${string}` | null> {
  const already = await oracle.read.verdictRecorded([proposalId]);
  if (already) {
    console.log(`[swarm] proposal ${proposalId} already has a verdict, skipping`);
    return null;
  }

  const proposal = await loadProposal(proposalId);
  console.log(`[swarm] scoring proposal ${proposalId}: ${proposal.name} (${proposal.symbol})`);

  const personaResults = await Promise.all(
    PERSONAS.slice(0, config.activeAgentCount).map(async (persona, i) => {
      try {
        const verdict = await callClaude(persona, proposal);
        console.log(`  [${persona.name}] score=${verdict.score}`);
        return { persona, index: i, verdict };
      } catch (err) {
        console.error(`  [${persona.name}] FAILED: ${(err as Error).message}`);
        return null;
      }
    }),
  );

  const successful = personaResults.filter(
    (r): r is { persona: (typeof PERSONAS)[number]; index: number; verdict: PersonaVerdict } => r !== null,
  );

  if (successful.length < ORACLE_THRESHOLD) {
    console.error(`[swarm] only ${successful.length}/${ORACLE_THRESHOLD} personas succeeded — aborting`);
    return null;
  }

  const aggregateScore = Math.round(
    successful.reduce((sum, r) => sum + r.verdict.score, 0) / successful.length,
  );
  const reasoningBlob = successful
    .map((r) => `[${r.persona.name}] (score=${r.verdict.score}) ${r.verdict.reasoning}`)
    .join("\n---\n");
  const rHash = reasoningHash(reasoningBlob);
  const deadline = BigInt(Math.floor(Date.now() / 1000) + config.verdictDeadlineSeconds);

  console.log(`[swarm] aggregate score=${aggregateScore} deadline=${deadline}`);

  const signed: AgentVerdict[] = await Promise.all(
    successful.map((r) =>
      signVerdict(deriveAgentAccount(r.index), proposalId, aggregateScore, rHash, deadline),
    ),
  );
  const sortedSigs = sortBundle(signed);

  console.log(`[swarm] submitting bundle of ${sortedSigs.length} signatures`);
  const hash = await governor.write.submitVerdictAndOpen([
    proposalId,
    BigInt(aggregateScore),
    rHash,
    deadline,
    sortedSigs,
  ]);
  console.log(`[swarm] tx submitted: ${hash}`);
  return hash;
}

export function bootstrap(): void {
  verifyAgentSet(config.activeAgentCount);
  console.log(
    `[swarm] verified ${config.activeAgentCount} agent keys against on-chain registry`,
  );
}

export type { ProposalContext };
