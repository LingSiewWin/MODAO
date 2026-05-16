import "dotenv/config";

const required = (key: string): string => {
  const v = process.env[key];
  if (!v) throw new Error(`Missing required env var: ${key}`);
  return v;
};

export const config = {
  anthropicApiKey: required("ANTHROPIC_API_KEY"),
  rpcUrl: process.env.MONAD_RPC_URL ?? "https://testnet-rpc.monad.xyz",
  // Submitter key — the wallet that pays gas to call submitVerdictAndOpen.
  // Distinct from agent signing keys (those are derived deterministically).
  submitterPrivateKey: required("SUBMITTER_PRIVATE_KEY") as `0x${string}`,
  // Verdict deadline window (seconds from now). Oracle rejects expired verdicts.
  verdictDeadlineSeconds: Number(process.env.VERDICT_DEADLINE_SECONDS ?? 3600),
  // How many agents to actually run (max = 5). Threshold is 3; running all 5
  // gives redundancy if one Claude call fails.
  activeAgentCount: Number(process.env.ACTIVE_AGENT_COUNT ?? 5),
};
