import { ADDRESSES, MODAO_GOVERNOR_ABI } from "@modao/shared";
import { publicClient } from "./chain.js";
import { runVerdict, bootstrap } from "./orchestrate.js";

/**
 * Long-running event-watcher. Subscribes to ProposalSubmitted on the governor and
 * fires `runVerdict` for each new proposal.
 *
 * For one-shot testing of a known proposalId, use `runOnce.ts` instead.
 */
async function main() {
  bootstrap();
  console.log(`[worker] watching ${ADDRESSES.MODAOGovernor} for ProposalSubmitted...`);

  publicClient.watchContractEvent({
    address: ADDRESSES.MODAOGovernor,
    abi: MODAO_GOVERNOR_ABI,
    eventName: "ProposalSubmitted",
    onLogs: (logs) => {
      for (const log of logs) {
        const id = log.args.proposalId;
        if (id === undefined) continue;
        runVerdict(id).catch((err) =>
          console.error(`[worker] verdict pipeline failed for ${id}: ${(err as Error).message}`),
        );
      }
    },
    onError: (err) => console.error(`[worker] event watcher error: ${err.message}`),
  });

  // Keep the process alive.
  await new Promise(() => {});
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
