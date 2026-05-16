"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { ProjectCard } from "@/components/proposals/ProjectCard";
import { FeaturedProjectCard } from "@/components/proposals/FeaturedProjectCard";
import { LinkButton } from "@/components/ui/LinkButton";
import { Badge } from "@/components/ui/Badge";
import { useProposals } from "@/hooks/use-proposals";
import { MOCK_PROPOSALS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import type { Proposal, ProposalState } from "@/lib/types";

type Filter = "all" | ProposalState;
type Sort = "newest" | "oldest" | "volume";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Live" },
  { key: "passed", label: "Completed" },
  { key: "failed", label: "Rejected" },
];

export default function ProposalsPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("newest");
  const [showMock, setShowMock] = useState(true);

  const { proposals: onchain, count, isLoading } = useProposals();
  const usingMock = onchain.length === 0 && showMock && !isLoading;
  const source = onchain.length > 0 ? onchain : showMock ? MOCK_PROPOSALS : [];

  // Featured = the highest-volume pending project, falling back to most recent.
  const featured = useMemo<Proposal | null>(() => {
    const pending = source.filter((p) => p.state === "pending");
    const pool = pending.length > 0 ? pending : source;
    if (pool.length === 0) return null;
    return [...pool].sort((a, b) => b.volumeUsd - a.volumeUsd)[0] ?? null;
  }, [source]);

  const projects = useMemo(() => {
    let list = source.filter((p) => p.id !== featured?.id);
    if (filter !== "all") list = list.filter((p) => p.state === filter);
    return [...list].sort((a, b) => {
      if (sort === "volume") return b.volumeUsd - a.volumeUsd;
      const aT = new Date(a.createdAt).getTime();
      const bT = new Date(b.createdAt).getTime();
      return sort === "newest" ? bT - aT : aT - bT;
    });
  }, [source, filter, sort, featured]);

  const live = projects.filter((p) => p.state === "pending");
  const archived = projects.filter((p) => p.state !== "pending");

  return (
    <AppShell
      title="Projects"
      description="Every project put through MoDAO's futarchy markets. Trade on whether each one should be admitted to the platform."
      actions={
        <div className="flex items-center gap-2">
          <Badge variant={onchain.length > 0 ? "passed" : "default"} className="hidden sm:inline-flex">
            <span className={cn("size-1.5 rounded-full", onchain.length > 0 ? "bg-success animate-pulse" : "bg-faint")} />
            {isLoading ? "Reading chain…" : `${count} on-chain`}
          </Badge>
          <LinkButton href="/create" variant="gradient" size="md">
            Submit project
          </LinkButton>
        </div>
      }
    >
      {usingMock && (
        <div className="mb-8 flex items-start gap-3 rounded-[var(--radius-md)] border border-warning/30 bg-warning/5 p-3 text-xs">
          <span className="mt-0.5 size-1.5 rounded-full bg-warning shrink-0" />
          <div className="flex-1">
            <p className="text-warning font-medium">No projects on chain yet.</p>
            <p className="mt-0.5 text-muted leading-relaxed">
              Showing demo data so you can see the layout. Submit a project from <span className="font-mono">/create</span> to see real data here.
            </p>
          </div>
          <button onClick={() => setShowMock(false)} className="text-xs text-muted hover:text-fg font-medium shrink-0">
            Hide
          </button>
        </div>
      )}

      {/* ─── Featured ──────────────────────────────────────────────── */}
      {featured && (
        <section className="mb-12">
          <header className="flex items-center justify-between gap-3 mb-5">
            <h2 className="text-2xl font-display text-fg flex items-center gap-2">
              Featured
              <span
                aria-hidden
                className="inline-flex size-4 items-center justify-center rounded-full border border-border text-faint text-[10px] font-mono"
                title="Highest-volume open market this cycle"
              >
                ?
              </span>
            </h2>
            <Link href="/create" className="text-xs text-muted hover:text-fg flex items-center gap-1">
              Apply to be featured <span aria-hidden>→</span>
            </Link>
          </header>
          <FeaturedProjectCard proposal={featured} />
        </section>
      )}

      {/* ─── Permissionless Launches ─────────────────────────────────── */}
      <section className="mb-12">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
          <h2 className="text-2xl font-display text-fg flex items-center gap-2">
            <ShieldIcon />
            Permissionless launches
            <span className="text-xs font-mono tabular text-faint">
              {live.length} active
            </span>
          </h2>
          <div className="flex items-center gap-3">
            <div className="inline-flex rounded-[var(--radius-md)] bg-surface p-1 border border-border">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={cn(
                    "px-3 h-8 text-xs font-medium rounded-[var(--radius-sm)] transition-colors",
                    filter === f.key ? "bg-surface-2 text-fg" : "text-muted hover:text-fg",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              aria-label="Sort"
              className="bg-surface border border-border rounded-[var(--radius-md)] h-9 px-3 text-xs text-fg outline-none focus:border-brand"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="volume">Volume</option>
            </select>
          </div>
        </header>

        {isLoading ? (
          <LoadingGrid />
        ) : live.length === 0 && archived.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {live.length > 0 && (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {live.map((p) => (
                  <ProjectCard key={p.id} proposal={p} />
                ))}
              </div>
            )}
            {archived.length > 0 && (
              <div className="mt-12">
                <header className="flex items-baseline justify-between mb-5">
                  <h2 className="text-2xl font-display text-fg">Archived</h2>
                  <span className="text-xs font-mono tabular text-faint">
                    {archived.length} completed
                  </span>
                </header>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 opacity-90">
                  {archived.map((p) => (
                    <ProjectCard key={p.id} proposal={p} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </AppShell>
  );
}

function ShieldIcon() {
  return (
    <span className="inline-flex size-5 items-center justify-center rounded-md bg-warning/15 text-warning">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-3">
        <path d="M12 22s8-4 8-12V5l-8-3-8 3v5c0 8 8 12 8 12z" />
      </svg>
    </span>
  );
}

function LoadingGrid() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-[var(--radius-lg)] border border-border bg-surface/40 animate-pulse h-[360px]" />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div role="status" className="rounded-[var(--radius-lg)] border border-dashed border-border bg-surface/30 px-6 py-16 text-center">
      <div className="mx-auto size-12 rounded-full bg-surface-2 border border-border flex items-center justify-center text-muted">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-5">
          <path d="M9 11l3 3L22 4M3 12a9 9 0 1118 0 9 9 0 01-18 0z" />
        </svg>
      </div>
      <h3 className="mt-3 text-sm font-semibold text-fg">No projects yet</h3>
      <p className="mt-1 text-xs text-muted">Be the first to put a project through the market.</p>
      <div className="mt-4">
        <LinkButton href="/create" variant="primary" size="sm">
          Submit project
        </LinkButton>
      </div>
    </div>
  );
}

