import type { RepoBundle } from "./github.js";

/**
 * The canonical upstream repo every Monad Blitz submission must fork from.
 * Set as a constant — changing this means we're judging a different hackathon.
 */
export const UPSTREAM_FORK = "monad-developers/monad-blitz-kl" as const;

export interface ForkCheckResult {
  ok: boolean;
  reasons: string[];
  upstream: string;
  isFork: boolean;
  parent: string | null;
  pushedAt: string;
  createdAt: string;
}

/**
 * Mechanical fork-lineage check. Used as the gate BEFORE we spend OpenRouter
 * credits: if the repo isn't a Monad Blitz fork, the swarm short-circuits with a
 * synthetic FAIL and never calls the models.
 *
 * Commit-window freshness check is intentionally NOT done here yet — we don't have
 * the official Monad Blitz event window dates pinned. Add when those land:
 *   HACKATHON_START / HACKATHON_END env vars → reject if no in-window commits.
 */
export function checkFork(bundle: RepoBundle, upstream = UPSTREAM_FORK): ForkCheckResult {
  const reasons: string[] = [];
  if (!bundle.isFork) reasons.push(`repo ${bundle.owner}/${bundle.repo} is not a fork`);
  if (bundle.parentFullName !== upstream) {
    reasons.push(
      `parent is ${bundle.parentFullName ?? "<none>"}, expected ${upstream}`,
    );
  }
  if (bundle.recentCommits.length === 0) {
    reasons.push("no commits visible — repo may be empty or unreachable");
  }
  return {
    ok: reasons.length === 0,
    reasons,
    upstream,
    isFork: bundle.isFork,
    parent: bundle.parentFullName,
    pushedAt: bundle.pushedAt,
    createdAt: bundle.createdAt,
  };
}
