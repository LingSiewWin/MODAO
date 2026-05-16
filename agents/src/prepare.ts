import { buildRepoBundle, parseGithubUrl } from "./github.js";
import { checkFork, type ForkCheckResult } from "./forkCheck.js";
import type { ProposalContext } from "./chain.js";

export interface EnrichedResult {
  context: ProposalContext;
  forkCheck: ForkCheckResult;
}

/**
 * Take a base proposal context (from CLI in dry-run, or from the on-chain spec
 * in the live worker) and enrich it with GitHub repo data + a fork-lineage
 * verdict. Personas read the enriched context; the orchestrator reads
 * `forkCheck.ok` to decide whether to spend OpenRouter credits at all.
 */
export async function enrichContext(
  base: Omit<ProposalContext, "repoData"> & { githubUrl: string },
): Promise<EnrichedResult> {
  const { owner, repo } = parseGithubUrl(base.githubUrl);
  const repoData = await buildRepoBundle(owner, repo);
  const forkCheck = checkFork(repoData);
  return {
    context: { ...base, repoData },
    forkCheck,
  };
}

const GITHUB_URL_RE = /https?:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+/i;
const IPFS_GATEWAYS = [
  "https://gateway.pinata.cloud/ipfs/",
  "https://ipfs.io/ipfs/",
];
/**
 * SSRF guard: descriptionURI is attacker-controlled, so we restrict the hosts
 * we'll fetch over HTTPS. Anything not on this list (especially loopback,
 * RFC1918, link-local, cloud metadata services like 169.254.169.254) is
 * rejected before the network call.
 */
const ALLOWED_FETCH_HOSTS = new Set([
  "gateway.pinata.cloud",
  "ipfs.io",
  "cloudflare-ipfs.com",
  "dweb.link",
]);

/**
 * Extract the first github.com URL from a description. Handles:
 *   - direct GitHub URLs (`https://github.com/owner/repo`)
 *   - direct `owner/repo` slugs (rejected here — must include scheme)
 *   - IPFS URIs (`ipfs://CID`) — fetched via gateway, markdown scanned
 *   - HTTPS URIs — fetched, body scanned
 * Returns null if nothing found.
 */
export async function extractGithubFromUri(uri: string): Promise<string | null> {
  if (!uri) return null;

  const direct = uri.match(GITHUB_URL_RE);
  if (direct) return direct[0];

  let fetchUrl: string | null = null;
  if (uri.startsWith("ipfs://")) {
    const cid = uri.replace(/^ipfs:\/\//, "").replace(/^\/+/, "");
    fetchUrl = IPFS_GATEWAYS[0] + cid;
  } else if (uri.startsWith("https://")) {
    try {
      const parsed = new URL(uri);
      if (ALLOWED_FETCH_HOSTS.has(parsed.hostname)) fetchUrl = uri;
    } catch {
      return null;
    }
  }
  // Note: http:// is intentionally rejected (no plaintext, blocks loopback by extension).
  if (!fetchUrl) return null;

  try {
    const res = await fetch(fetchUrl, {
      headers: { Accept: "text/plain, text/markdown, application/json, */*" },
      // 8 KB plenty for a 200-800-word proposal
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const body = (await res.text()).slice(0, 32_000);
    const m = body.match(GITHUB_URL_RE);
    return m ? m[0] : null;
  } catch {
    return null;
  }
}
