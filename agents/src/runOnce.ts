import { runVerdict, bootstrap } from "./orchestrate.js";

/**
 * One-shot: pass a proposalId on the CLI, exit when done.
 *   bun run src/runOnce.ts 1
 */
async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error("usage: runOnce <proposalId>");
    process.exit(2);
  }
  bootstrap();
  const hash = await runVerdict(BigInt(arg));
  if (hash) {
    console.log(`[runOnce] done — tx ${hash}`);
  } else {
    console.log(`[runOnce] no submission`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
