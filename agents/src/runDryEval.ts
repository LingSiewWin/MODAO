import { enrichContext } from "./prepare.js";
import { scoreProposal } from "./orchestrate.js";
import type { ProposalContext } from "./chain.js";

/**
 * Dry-run brain. Takes a GitHub URL (and optional ID/name/symbol overrides) on
 * the CLI, runs the full 4-agent swarm with real GitHub fetch + real OpenRouter
 * calls (+ optional Pinata pin), and prints the aggregate verdict + per-agent
 * IPFS CIDs. Does NOT submit on-chain — this is the milestone where the brain
 * is provably real, independent of contract work.
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
    console.error("usage: runDryEval <github-url> [--id N] [--name X] [--symbol Y] [--supply N] [--proposer 0x..] [--desc URI]");
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

async function main() {
  const args = parseArgs(process.argv.slice(2));

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

  console.log(`[dry] fork check: ${forkCheck.ok ? "PASS" : "FAIL"} — parent=${forkCheck.parent ?? "<none>"}`);
  if (!forkCheck.ok) {
    console.log(`[dry] reasons: ${forkCheck.reasons.join("; ")}`);
    console.log(`[dry] short-circuit: not spending OpenRouter credits on an invalid fork`);
    process.exit(1);
  }

  const scored = await scoreProposal(context);
  if (!scored) {
    console.error("[dry] swarm failed to reach threshold");
    process.exit(1);
  }

  // Pretty summary
  console.log("\n========== DRY-RUN RESULT ==========");
  console.log(`Proposal:   ${scored.proposalId} (${context.name} / ${context.symbol})`);
  console.log(`GitHub:     ${args.githubUrl}`);
  console.log(`Aggregate:  ${scored.aggregateScore}/100`);
  console.log(`rHash:      ${scored.rHash}`);
  console.log(`Deadline:   ${scored.deadline}`);
  console.log(`Sigs:       ${scored.sortedSigs.length}`);
  console.log("\nPer-agent verdicts:");
  for (const r of scored.perAgent) {
    const pin = r.pin ? r.pin.uri : "(no pin)";
    console.log(`  [${r.persona.name}] ${r.persona.model}`);
    console.log(`    score:  ${r.verdict.score}/100`);
    console.log(`    pin:    ${pin}`);
    console.log(`    reason: ${r.verdict.reasoning.slice(0, 200).replace(/\n/g, " ")}...`);
  }
  console.log("\n[dry] NOT submitting on-chain — this was a dry run.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
