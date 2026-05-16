import { ORACLE_THRESHOLD } from "@modao/shared";
import { config } from "./config.js";
import { deriveAgentAccount, verifyAgentSet } from "./keys.js";
import { reasoningHash, signVerdict, sortBundle, type AgentVerdict } from "./signing.js";
import { governor, oracle, loadProposal, type ProposalContext } from "./chain.js";
import { PERSONAS, callModel, type PersonaVerdict, type Persona } from "./personas/index.js";
import { pinReasoning, type PinResult } from "./ipfs.js";
import { enrichContext, extractGithubFromUri } from "./prepare.js";

export interface PerAgentResult {
  persona: Persona;
  index: number;
  verdict: PersonaVerdict;
  pin: PinResult | null; // null if PINATA_JWT not set or pin failed
}

export interface ScoredProposal {
  proposalId: bigint;
  aggregateScore: number;
  reasoningBlob: string;
  rHash: `0x${string}`;
  deadline: bigint;
  perAgent: PerAgentResult[];
  signed: AgentVerdict[];
  sortedSigs: `0x${string}`[];
}

/**
 * Pure scoring pipeline — runs the swarm and produces a signed bundle, but does
 * NOT touch the chain. Shared between the live worker (runVerdict) and the
 * dry-run CLI (runDryEval). Pinata pinning is opt-in: when PINATA_JWT is set
 * each agent's reasoning is pinned independently for audit; when missing the
 * pipeline still completes (with pin: null) so the brain stays demoable offline.
 *
 * Returns null if fewer than ORACLE_THRESHOLD personas succeeded.
 */
export async function scoreProposal(ctx: ProposalContext): Promise<ScoredProposal | null> {
  console.log(
    `[swarm] scoring proposal ${ctx.proposalId}: ${ctx.name} (${ctx.symbol}) — ${ctx.githubUrl ?? "(no github url)"}`,
  );

  const personaResults = await Promise.all(
    PERSONAS.slice(0, config.activeAgentCount).map(async (persona, i) => {
      try {
        const verdict = await callModel(persona, ctx);
        console.log(`  [${persona.name}] (${persona.model}) score=${verdict.score}`);
        return { persona, index: i, verdict };
      } catch (err) {
        console.error(`  [${persona.name}] FAILED: ${(err as Error).message}`);
        return null;
      }
    }),
  );

  const successful = personaResults.filter(
    (r): r is { persona: Persona; index: number; verdict: PersonaVerdict } => r !== null,
  );

  if (successful.length < ORACLE_THRESHOLD) {
    console.error(`[swarm] only ${successful.length}/${ORACLE_THRESHOLD} personas succeeded — aborting`);
    return null;
  }

  // C3 fix: divide by activeAgentCount (not successful.length) so failed
  // personas count as 0. Otherwise a malicious submitter who crafts input that
  // JSON-breaks the strictest model (e.g. tech-monad) gets credit for an
  // average of only the lenient survivors.
  const aggregateScore = Math.round(
    successful.reduce((sum, r) => sum + r.verdict.score, 0) / config.activeAgentCount,
  );
  const reasoningBlob = successful
    .map((r) => `[${r.persona.name}] (score=${r.verdict.score}) ${r.verdict.reasoning}`)
    .join("\n---\n");
  const rHash = reasoningHash(reasoningBlob);
  const deadline = BigInt(Math.floor(Date.now() / 1000) + config.verdictDeadlineSeconds);

  // Pin each agent's reasoning separately for audit. Optional: skipped if no
  // PINATA_JWT. Errors are logged but non-fatal — the threshold-signed bundle
  // is the trustless artifact; the pins are auxiliary evidence.
  const pins: (PinResult | null)[] = await Promise.all(
    successful.map(async (r) => {
      if (!process.env.PINATA_JWT) return null;
      try {
        return await pinReasoning(r.verdict.reasoning, {
          personaName: r.persona.name,
          model: r.persona.model,
          score: r.verdict.score,
          proposalId: ctx.proposalId.toString(),
        });
      } catch (err) {
        console.error(`  [${r.persona.name}] pin failed: ${(err as Error).message}`);
        return null;
      }
    }),
  );

  const perAgent: PerAgentResult[] = successful.map((r, idx) => ({
    persona: r.persona,
    index: r.index,
    verdict: r.verdict,
    pin: pins[idx] ?? null,
  }));

  console.log(`[swarm] aggregate score=${aggregateScore} deadline=${deadline} rHash=${rHash}`);

  const signed: AgentVerdict[] = await Promise.all(
    successful.map((r) =>
      signVerdict(deriveAgentAccount(r.index), ctx.proposalId, aggregateScore, rHash, deadline),
    ),
  );
  const sortedSigs = sortBundle(signed);

  return {
    proposalId: ctx.proposalId,
    aggregateScore,
    reasoningBlob,
    rHash,
    deadline,
    perAgent,
    signed,
    sortedSigs,
  };
}

/**
 * Live pipeline: load on-chain spec → extract GitHub URL from descriptionURI →
 * enrich with repo data → score → submit. Worker mode.
 *
 * If fork-check fails (not a Monad Blitz fork, or repo unreachable), the swarm
 * SHORT-CIRCUITS: no OpenRouter credits spent, a synthetic FAIL verdict (score=0)
 * is signed by all agents and submitted on-chain. This records the verdict so
 * the proposal can't be retried, and the `minScore=60` gate keeps it out of
 * markets. Cost discipline: an attacker spamming non-fork proposals burns
 * submitter-wallet gas but no model spend.
 */
export async function runVerdict(proposalId: bigint): Promise<`0x${string}` | null> {
  const already = await oracle.read.verdictRecorded([proposalId]);
  if (already) {
    console.log(`[swarm] proposal ${proposalId} already has a verdict, skipping`);
    return null;
  }

  const base = await loadProposal(proposalId);
  console.log(`[swarm] descriptionURI: ${base.descriptionURI || "(empty)"}`);

  const githubUrl = await extractGithubFromUri(base.descriptionURI);
  if (!githubUrl) {
    console.log("[swarm] no github url in descriptionURI — submitting synthetic FAIL");
    return submitSyntheticFail(proposalId, "no github url in descriptionURI");
  }

  console.log(`[swarm] extracted github url: ${githubUrl}`);
  let proposal: ProposalContext;
  try {
    const { context, forkCheck } = await enrichContext({ ...base, githubUrl });
    console.log(`[swarm] fork check: ${forkCheck.ok ? "PASS" : "FAIL"} (${forkCheck.reasons.join("; ") || "ok"})`);
    if (!forkCheck.ok) {
      return submitSyntheticFail(proposalId, `fork-check failed: ${forkCheck.reasons.join("; ")}`);
    }
    proposal = context;
  } catch (err) {
    console.error(`[swarm] enrichment failed: ${(err as Error).message}`);
    return submitSyntheticFail(proposalId, `enrichment failed: ${(err as Error).message}`);
  }

  const scored = await scoreProposal(proposal);
  if (!scored) return null;

  console.log(`[swarm] submitting bundle of ${scored.sortedSigs.length} signatures`);
  const hash = await governor().write.submitVerdictAndOpen([
    proposalId,
    BigInt(scored.aggregateScore),
    scored.rHash,
    scored.deadline,
    scored.sortedSigs,
  ]);
  console.log(`[swarm] tx submitted: ${hash}`);
  return hash;
}

/**
 * Submit a 0-score synthetic verdict bundle without calling any models. Used
 * when the proposal fails mechanical gates (no fork, wrong upstream, unreachable
 * repo). All `activeAgentCount` agents sign the same null-verdict digest.
 */
async function submitSyntheticFail(
  proposalId: bigint,
  reason: string,
): Promise<`0x${string}`> {
  const rHash = reasoningHash(`fork-check-failed: ${reason}`);
  const deadline = BigInt(Math.floor(Date.now() / 1000) + config.verdictDeadlineSeconds);
  const score = 0;
  const signed = await Promise.all(
    Array.from({ length: config.activeAgentCount }, (_, i) =>
      signVerdict(deriveAgentAccount(i), proposalId, score, rHash, deadline),
    ),
  );
  const sortedSigs = sortBundle(signed);
  console.log(`[swarm] submitting synthetic FAIL (${config.activeAgentCount} sigs): ${reason}`);
  const hash = await governor().write.submitVerdictAndOpen([
    proposalId,
    BigInt(score),
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
