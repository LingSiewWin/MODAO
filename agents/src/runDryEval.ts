import { enrichContext } from "./prepare.js";
import { scoreProposal } from "./orchestrate.js";
import { PANEL, RUBRIC_KEYS } from "./personas/index.js";
import type { ProposalContext } from "./chain.js";

/**
 * Dry-run brain. Takes a GitHub URL (and optional ID/name/symbol overrides) on
 * the CLI, runs the full 4-member panel with real GitHub fetch + real
 * OpenRouter calls (+ optional Pinata pin), and prints per-rubric scores +
 * per-member breakdown + wall-clock timing. Does NOT submit on-chain.
 *
 *   bun run dry https://github.com/owner/repo
 *   bun run dry https://github.com/owner/repo --id 42 --name "Crank" --symbol "CRNK"
 */

interface CliArgs {
  githubUrl: string;
  proposalId: bigint;
  name: string;
  symbol: string;
  supply: bigint;
  proposer: `0x${string}`;
  descriptionURI: string;
}

function parseArgs(argv: string[]): CliArgs {
  if (argv.length === 0) {
    console.error(
      "usage: runDryEval <github-url> [--id N] [--name X] [--symbol Y] [--supply N] [--proposer 0x..] [--desc URI]",
    );
    process.exit(2);
  }
  const [githubUrl, ...rest] = argv;
  const opts: Record<string, string> = {};
  for (let i = 0; i < rest.length; i += 2) {
    const k = rest[i]?.replace(/^--/, "");
    const v = rest[i + 1];
    if (k && v) opts[k] = v;
  }
  return {
    githubUrl: githubUrl!,
    proposalId: BigInt(opts.id ?? "0"),
    name: opts.name ?? "Dry-run Eval",
    symbol: opts.symbol ?? "DRY",
    supply: BigInt(opts.supply ?? "1000000"),
    proposer: (opts.proposer ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
    descriptionURI: opts.desc ?? "",
  };
}

function fmtMs(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

async function main() {
  const wallClockStart = performance.now();
  const args = parseArgs(process.argv.slice(2));

  console.log(`\n⏱  START  ${new Date().toISOString()}`);
  console.log(`▸ panel: ${PANEL.map((p) => p.name).join(", ")}`);
  console.log(`▸ target: ${args.githubUrl}\n`);

  const t0 = performance.now();
  const base: Omit<ProposalContext, "repoData"> & { githubUrl: string } = {
    proposalId: args.proposalId,
    proposer: args.proposer,
    name: args.name,
    symbol: args.symbol,
    supply: args.supply,
    descriptionURI: args.descriptionURI,
    githubUrl: args.githubUrl,
  };
  console.log(`[dry] enriching context for ${args.githubUrl}`);
  const { context, forkCheck } = await enrichContext(base);
  const enrichMs = performance.now() - t0;
  console.log(`[dry] fork check: ${forkCheck.ok ? "PASS" : "FAIL"} — parent=${forkCheck.parent ?? "<none>"}  (${fmtMs(enrichMs)})`);

  if (!forkCheck.ok) {
    console.log(`[dry] reasons: ${forkCheck.reasons.join("; ")}`);
    console.log(`[dry] short-circuit: not spending OpenRouter credits on an invalid fork`);
    process.exit(1);
  }

  const tScore = performance.now();
  const scored = await scoreProposal(context);
  const scoreMs = performance.now() - tScore;

  if (!scored) {
    console.error("[dry] panel failed to reach threshold");
    process.exit(1);
  }

  const wallClockMs = performance.now() - wallClockStart;

  // Pretty summary
  console.log("\n========== DRY-RUN RESULT ==========");
  console.log(`Proposal:   ${scored.proposalId} (${context.name} / ${context.symbol})`);
  console.log(`GitHub:     ${args.githubUrl}`);
  console.log("");
  console.log("Per-rubric (mean across panel, failed members = 0):");
  for (const k of RUBRIC_KEYS) {
    const bar = "█".repeat(Math.round(scored.perRubric[k] / 5)).padEnd(20, "·");
    console.log(`  ${k.padEnd(8)} ${bar} ${scored.perRubric[k].toString().padStart(3)}/100`);
  }
  console.log("");
  console.log(`Aggregate:  ${scored.aggregateScore}/100`);
  console.log(`rHash:      ${scored.rHash}`);
  console.log(`Deadline:   ${scored.deadline}`);
  console.log(`Sigs:       ${scored.sortedSigs.length}`);

  console.log("\nPer-member matrix:");
  console.log("  ┌─" + "─".repeat(78));
  const header =
    "  │  " +
    "member".padEnd(14) +
    RUBRIC_KEYS.map((k) => k.padStart(7)).join("  ") +
    "    avg".padStart(8) +
    "    time".padStart(10);
  console.log(header);
  console.log("  ├─" + "─".repeat(78));
  for (const r of scored.perMember) {
    const avg = Math.round(
      (r.verdict.origin.score + r.verdict.novelty.score + r.verdict.tech.score + r.verdict.demo.score) / 4,
    );
    const scores = RUBRIC_KEYS.map((k) => r.verdict[k].score.toString().padStart(7)).join("  ");
    console.log(
      `  │  ${r.member.name.padEnd(14)}${scores}  ${avg.toString().padStart(5)}  ${fmtMs(r.durationMs).padStart(8)}`,
    );
  }
  console.log("  └─" + "─".repeat(78));

  console.log("\nIPFS pins:");
  for (const r of scored.perMember) {
    console.log(`  ${r.member.name.padEnd(14)} ${r.pin ? r.pin.uri : "(no pin — PINATA_JWT unset?)"}`);
  }

  console.log("\n⏱  TIMING");
  console.log(`  enrich (GitHub fetch):  ${fmtMs(enrichMs)}`);
  console.log(`  score (panel + pin):    ${fmtMs(scoreMs)}`);
  console.log(`  └─ parallel panel call: ${fmtMs(scored.totalDurationMs)}`);
  console.log(`  wall clock total:       ${fmtMs(wallClockMs)}`);
  const slowest = scored.perMember.reduce((a, b) => (a.durationMs > b.durationMs ? a : b));
  const fastest = scored.perMember.reduce((a, b) => (a.durationMs < b.durationMs ? a : b));
  console.log(`  fastest model:          ${fastest.member.name} (${fmtMs(fastest.durationMs)})`);
  console.log(`  slowest model:          ${slowest.member.name} (${fmtMs(slowest.durationMs)})`);

  console.log("\n[dry] NOT submitting on-chain — this was a dry run.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
