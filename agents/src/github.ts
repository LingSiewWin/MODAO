import { config } from "./config.js";

/**
 * Thin GitHub REST client for the swarm. Unauthenticated: 60 req/hr. With
 * GITHUB_TOKEN: 5000 req/hr. Each fork eval makes ~3-4 calls, so even
 * unauthenticated handles ~15 forks/hr. Plenty for a hackathon.
 *
 * We deliberately use raw fetch instead of pulling in octokit — keeps the brain
 * dependency tree light.
 */

const GITHUB_API = "https://api.github.com";

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "MODAO-AgentSwarm/0.1",
  };
  if (config.githubToken) {
    headers.Authorization = `Bearer ${config.githubToken}`;
  }
  return headers;
}

async function gh<T>(path: string): Promise<T> {
  const res = await fetch(`${GITHUB_API}${path}`, { headers: authHeaders() });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GitHub ${res.status} for ${path}: ${body.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

export interface GithubRepo {
  full_name: string;
  description: string | null;
  default_branch: string;
  fork: boolean;
  pushed_at: string;
  created_at: string;
  size: number;
  stargazers_count: number;
  parent?: { full_name: string };
  source?: { full_name: string };
  language: string | null;
  topics: string[];
}

export interface GithubCommit {
  sha: string;
  commit: {
    message: string;
    author: { name: string; date: string };
  };
}

export interface GithubContentItem {
  name: string;
  path: string;
  type: "file" | "dir" | "submodule" | "symlink";
  size: number;
}

/** Extracts `{owner, repo}` from a GitHub URL or `owner/repo` slug. */
export function parseGithubUrl(input: string): { owner: string; repo: string } {
  const trimmed = input.trim().replace(/\.git$/i, "").replace(/\/$/, "");
  const m = trimmed.match(/^(?:https?:\/\/github\.com\/)?([^/\s]+)\/([^/\s]+)$/);
  if (!m) throw new Error(`Invalid GitHub URL or slug: ${input}`);
  return { owner: m[1]!, repo: m[2]! };
}

export async function fetchRepo(owner: string, repo: string): Promise<GithubRepo> {
  return gh<GithubRepo>(`/repos/${owner}/${repo}`);
}

/** Returns README markdown, decoded from base64. Empty string if no README. */
export async function fetchReadme(owner: string, repo: string): Promise<string> {
  try {
    const data = await gh<{ content: string; encoding: string }>(
      `/repos/${owner}/${repo}/readme`,
    );
    if (data.encoding !== "base64") return data.content;
    return Buffer.from(data.content, "base64").toString("utf-8");
  } catch (err) {
    if ((err as Error).message.includes("404")) return "";
    throw err;
  }
}

/** Top-level directory listing — gives the agent a quick sense of the repo shape. */
export async function fetchTopLevelFiles(
  owner: string,
  repo: string,
): Promise<GithubContentItem[]> {
  return gh<GithubContentItem[]>(`/repos/${owner}/${repo}/contents/`);
}

export async function fetchRecentCommits(
  owner: string,
  repo: string,
  limit = 20,
): Promise<GithubCommit[]> {
  return gh<GithubCommit[]>(`/repos/${owner}/${repo}/commits?per_page=${limit}`);
}

/**
 * A repo bundle is the curated slice of GitHub data we hand to each agent.
 * Kept intentionally small so it fits comfortably in a prompt — the README is
 * truncated and we only summarize commits/files rather than dumping everything.
 */
export interface RepoBundle {
  owner: string;
  repo: string;
  description: string | null;
  defaultBranch: string;
  pushedAt: string;
  createdAt: string;
  isFork: boolean;
  parentFullName: string | null;
  stargazers: number;
  language: string | null;
  topics: string[];
  readmeMarkdown: string;
  topFiles: { name: string; type: string; size: number }[];
  recentCommits: { sha: string; message: string; date: string; author: string }[];
}

export async function buildRepoBundle(owner: string, repo: string): Promise<RepoBundle> {
  const [info, readme, files, commits] = await Promise.all([
    fetchRepo(owner, repo),
    fetchReadme(owner, repo),
    fetchTopLevelFiles(owner, repo).catch(() => [] as GithubContentItem[]),
    fetchRecentCommits(owner, repo, 20).catch(() => [] as GithubCommit[]),
  ]);
  return {
    owner,
    repo,
    description: info.description,
    defaultBranch: info.default_branch,
    pushedAt: info.pushed_at,
    createdAt: info.created_at,
    isFork: info.fork,
    parentFullName: info.parent?.full_name ?? null,
    stargazers: info.stargazers_count,
    language: info.language,
    topics: info.topics,
    readmeMarkdown: readme.slice(0, 8000), // keep prompts bounded
    topFiles: files.map((f) => ({ name: f.name, type: f.type, size: f.size })),
    recentCommits: commits.map((c) => ({
      sha: c.sha.slice(0, 7),
      message: c.commit.message.split("\n")[0]!.slice(0, 120),
      date: c.commit.author.date,
      author: c.commit.author.name,
    })),
  };
}
