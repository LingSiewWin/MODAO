import "dotenv/config";

/**
 * Lazy env access. We don't eagerly validate at import-time because parts of the
 * agent code (e.g. github.ts, ipfs.ts) only need a subset — we want
 * `tsx src/runDryEval.ts ...` to fail loudly only on the var it actually needs,
 * not on whichever required-but-unused key was added first.
 *
 * Use `config.openrouterApiKey` (getter) — it throws if missing at access time.
 */
const env = (key: string): string | undefined => process.env[key];

const must = (key: string): string => {
  const v = env(key);
  if (!v) throw new Error(`Missing required env var: ${key}`);
  return v;
};

export const config = {
  get openrouterApiKey(): string {
    return must("OPENROUTER_API_KEY");
  },
  get pinataJwt(): string {
    return must("PINATA_JWT");
  },
  /** Optional. Defaults to "" (unauthenticated 60 req/hr). */
  get githubToken(): string {
    return env("GITHUB_TOKEN") ?? "";
  },
  get submitterPrivateKey(): `0x${string}` {
    return must("SUBMITTER_PRIVATE_KEY") as `0x${string}`;
  },
  get rpcUrl(): string {
    return env("MONAD_RPC_URL") ?? "https://testnet-rpc.monad.xyz";
  },
  get verdictDeadlineSeconds(): number {
    return Number(env("VERDICT_DEADLINE_SECONDS") ?? 3600);
  },
  get activeAgentCount(): number {
    return Number(env("ACTIVE_AGENT_COUNT") ?? 4);
  },
};
