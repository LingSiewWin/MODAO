"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ProposalCard } from "@/components/proposals/ProposalCard";
import { LinkButton } from "@/components/ui/LinkButton";
import { MOCK_PROPOSALS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import type { ProposalState } from "@/lib/types";

type Filter = "all" | ProposalState;
type Sort = "newest" | "oldest" | "volume";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "passed", label: "Passed" },
  { key: "failed", label: "Failed" },
];

export default function ProposalsPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("newest");

  const proposals = useMemo(() => {
    let list = MOCK_PROPOSALS;
    if (filter !== "all") list = list.filter((p) => p.state === filter);
    return [...list].sort((a, b) => {
      if (sort === "volume") return b.volumeUsd - a.volumeUsd;
      const aT = new Date(a.createdAt).getTime();
      const bT = new Date(b.createdAt).getTime();
      return sort === "newest" ? bT - aT : aT - bT;
    });
  }, [filter, sort]);

  const pending = proposals.filter((p) => p.state === "pending");
  const archived = proposals.filter((p) => p.state !== "pending");

  return (
    <AppShell
      title="Proposals"
      description="Every project that's been put through the futarchy market — pending, passed, or rejected."
      actions={<LinkButton href="/create" variant="gradient" size="md">Create proposal</LinkButton>}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="inline-flex rounded-[var(--radius-md)] bg-surface p-1 border border-border self-start">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "px-3 h-8 text-sm font-medium rounded-[var(--radius-sm)] transition-colors",
                filter === f.key
                  ? "bg-surface-2 text-fg"
                  : "text-muted hover:text-fg",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-sm text-muted">
          <span className="text-xs uppercase tracking-widest text-faint">Sort</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="bg-surface border border-border rounded-[var(--radius-md)] h-9 px-3 text-sm text-fg outline-none focus:border-brand"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="volume">Highest volume</option>
          </select>
        </label>
      </div>

      {proposals.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-8">
          {pending.length > 0 && (
            <Section heading="Pending" count={pending.length}>
              <div className="grid gap-3">
                {pending.map((p) => (
                  <ProposalCard key={p.id} proposal={p} />
                ))}
              </div>
            </Section>
          )}
          {archived.length > 0 && (
            <Section heading="Archived" count={archived.length}>
              <div className="grid gap-3">
                {archived.map((p) => (
                  <ProposalCard key={p.id} proposal={p} />
                ))}
              </div>
            </Section>
          )}
        </div>
      )}
    </AppShell>
  );
}

function Section({
  heading,
  count,
  children,
}: {
  heading: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="flex items-baseline gap-2 mb-3 text-sm font-semibold text-fg">
        {heading}
        <span className="text-xs font-mono text-faint">({count})</span>
      </h2>
      {children}
    </section>
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
      <h3 className="mt-3 text-sm font-semibold text-fg">No proposals yet</h3>
      <p className="mt-1 text-xs text-muted">
        Be the first to put a project through the market.
      </p>
      <div className="mt-4">
        <LinkButton href="/create" variant="primary" size="sm">
          Create proposal
        </LinkButton>
      </div>
    </div>
  );
}
