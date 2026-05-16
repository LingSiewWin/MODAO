import { ORACLE_THRESHOLD } from "@modao/shared";
import { config } from "./config.js";
import { deriveAgentAccount, verifyAgentSet } from "./keys.js";
import { reasoningHash, signVerdict, sortBundle, type AgentVerdict } from "./signing.js";
import { governor, oracle, loadProposal, type ProposalContext } from "./chain.js";
import {
  PANEL,
  callModel,
  RUBRIC_KEYS,
  type PanelMember,
  type PanelVerdict,
  type RubricKey,
} from "./personas/index.js";
import { pinReasoning, type PinResult } from "./ipfs.js";
import { enrichContext, extractGithubFromUri } from "./prepare.js";

export interface PerMemberResult {
  member: PanelMember;
  index: number;
  verdict: PanelVerdict;
  durationMs: number;
  pin: PinResult | null; // null if PINATA_JWT not set or pin failed
}

export interface ScoredProposal {
  proposalId: bigint;
  perRubric: Record<RubricKey, number>; // mean across all members, missing = 0
  aggregateScore: number; // arithmetic mean of perRubric values
  reasoningBlob: string;
  rHash: `0x${string}`;
  deadline: bigint;
  perMember: PerMemberResult[];
  signed: AgentVerdict[];
  sortedSigs: `0x${string}`[];
  totalDurationMs: number; // wall-clock for the parallel score phase
}

/**
 * Pure scoring pipeline — runs the panel and produces a signed bundle, but does
 * NOT touch the chain. Shared between the live worker (runVerdict) and the
 * dry-run CLI (runDryEval).
 *
 * Option B architecture: every panel member evaluates ALL FOUR rubrics in one
 * call. Per-rubric score = mean across members. Failed members count as 0
 * (per audit C3) so a member that JSON-breaks can't be silently dropped — it
 * drags the mean down honestly.
 *
 * Returns null if fewer than ORACLE_THRESHOLD members succeeded.
 */
export async function scoreProposal(ctx: ProposalContext): Promise<ScoredProposal | null> {
  console.log(
    `[swarm] scoring proposal ${ctx.proposalId}: ${ctx.name} (${ctx.symbol}) — ${ctx.githubUrl ?? "(no github url)"}`,
  );

  const phaseStart = performance.now();
  const memberResults = await Promise.all(
    PANEL.slice(0, config.activeAgentCount).map(async (member, i) => {
      try {
        const { verdict, durationMs } = await callModel(member, ctx);
        const avg = Math.round(
          (verdict.origin.score + verdict.novelty.score + verdict.tech.score + verdict.demo.score) /
            4,
        );
        console.log(
          `  [${member.name.padEnd(13)}] ${member.model.padEnd(50)} avg=${avg.toString().padStart(3)}  (origin=${verdict.origin.score} novelty=${verdict.novelty.score} tech=${verdict.tech.score} demo=${verdict.demo.score})  ${durationMs.toFixed(0).padStart(5)}ms`,
        );
        return { member, index: i, verdict, durationMs };
      } catch (err) {
        console.error(`  [${member.name}] FAILED: ${(err as Error).message.slice(0, 200)}`);
        return null;
      }
    }),
  );
  const totalDurationMs = performance.now() - phaseStart;

  const successful = memberResults.filter(
    (r): r is { member: PanelMember; index: number; verdict: PanelVerdict; durationMs: number } =>
      r !== null,
  );

  if (successful.length < ORACLE_THRESHOLD) {
    console.error(
      `[swarm] only ${successful.length}/${ORACLE_THRESHOLD} members succeeded — aborting`,
    );
    return null;
  }

  // Per-rubric mean. Failed members count as 0 across all rubrics
  // (C3 fix: divide by activeAgentCount, not successful.length).
  const perRubric: Record<RubricKey, number> = { origin: 0, novelty: 0, tech: 0, demo: 0 };
  for (const rubric of RUBRIC_KEYS) {
    const sum = successful.reduce((acc, r) => acc + r.verdict[rubric].score, 0);
    perRubric[rubric] = Math.round(sum / config.activeAgentCount);
  }
  const aggregateScore = Math.round(
    (perRubric.origin + perRubric.novelty + perRubric.tech + perRubric.demo) / 4,
  );

  // Reasoning blob: per-member then per-rubric — gives a reviewer a 1D scroll
  // through what each model said about each dimension.
  const reasoningBlob = successful
    .map((r) =>
      [
        `## ${r.member.name} (${r.member.model})  duration=${r.durationMs.toFixed(0)}ms`,
        ...RUBRIC_KEYS.map(
          (k) => `### ${k} — score=${r.verdict[k].score}\n${r.verdict[k].reasoning}`,
        ),
      ].join("\n\n"),
    )
    .join("\n\n---\n\n");
  const rHash = reasoningHash(reasoningBlob);
  const deadline = BigInt(Math.floor(Date.now() / 1000) + config.verdictDeadlineSeconds);

  // Pin each member's full multi-rubric reasoning to Pinata (non-fatal if
  // PINATA_JWT unset). The pin captures all 4 rubrics for that member.
  const pins: (PinResult | null)[] = await Promise.all(
    successful.map(async (r) => {
      if (!process.env.PINATA_JWT) return null;
      try {
        const memberBlob = RUBRIC_KEYS.map(
          (k) => `## ${k} — score=${r.verdict[k].score}\n${r.verdict[k].reasoning}`,
        ).join("\n\n");
        return await pinReasoning(memberBlob, {
          personaName: r.member.name,
          model: r.member.model,
          score: Math.round(
            (r.verdict.origin.score +
              r.verdict.novelty.score +
              r.verdict.tech.score +
              r.verdict.demo.score) /
              4,
          ),
          proposalId: ctx.proposalId.toString(),
        });
      } catch (err) {
        console.error(`  [${r.member.name}] pin failed: ${(err as Error).message}`);
        return null;
      }
    }),
  );

  const perMember: PerMemberResult[] = successful.map((r, idx) => ({
    member: r.member,
    index: r.index,
    verdict: r.verdict,
    durationMs: r.durationMs,
    pin: pins[idx] ?? null,
  }));

  console.log(
    `[swarm] perRubric=${JSON.stringify(perRubric)} aggregate=${aggregateScore} wall=${totalDurationMs.toFixed(0)}ms`,
  );

  const signed: AgentVerdict[] = await Promise.all(
    successful.map((r) =>
      signVerdict(deriveAgentAccount(r.index), ctx.proposalId, aggregateScore, rHash, deadline),
    ),
  );
  const sortedSigs = sortBundle(signed);

  return {
    proposalId: ctx.proposalId,
    perRubric,
    aggregateScore,
    reasoningBlob,
    rHash,
    deadline,
    perMember,
    signed,
    sortedSigs,
    totalDurationMs,
  };
}

/**
 * Live pipeline: load on-chain spec → extract GitHub URL from descriptionURI →
 * enrich with repo data → score → submit. Worker mode.
 *
 * Short-circuits with a synthetic 0-score FAIL bundle when (a) descriptionURI
 * has no GitHub URL, (b) enrichContext throws, or (c) forkCheck rejects the
 * lineage. No model calls billed for those paths.
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
    console.log(
      `[swarm] fork check: ${forkCheck.ok ? "PASS" : "FAIL"} (${forkCheck.reasons.join("; ") || "ok"})`,
    );
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
