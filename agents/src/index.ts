import "dotenv/config";
import { scoreProposal } from "./agent.js";
import { signVerdict } from "./signer.js";

async function main() {
  // TODO: wire up a real proposal feed (e.g. on-chain event listener via viem).
  const proposalId = 1n;
  const description = "Placeholder proposal description.";

  const verdict = await scoreProposal(proposalId, description);
  console.log("[agent] verdict:", verdict);

  const privateKey = process.env.AGENT_PRIVATE_KEY;
  if (!privateKey) {
    console.warn("[agent] AGENT_PRIVATE_KEY not set; skipping signing.");
    return;
  }

  const signature = await signVerdict(
    proposalId,
    verdict.score,
    privateKey as `0x${string}`,
  );
  console.log("[agent] signature:", signature);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
