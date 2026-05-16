"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { MarketCard } from "@/components/markets/MarketCard";
import { MOCK_MARKETS } from "@/lib/mock-data";

export default function MarketsPage() {
  const [query, setQuery] = useState("");

  const markets = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MOCK_MARKETS;
    return MOCK_MARKETS.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.address.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <AppShell
      title="Markets"
      description="Every conditional market currently open on MoDAO. Each proposal has both a PASS and FAIL pool."
    >
      <div className="mb-6">
        <label className="block max-w-sm">
          <span className="sr-only">Search markets</span>
          <div className="relative">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-faint pointer-events-none"
              aria-hidden
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or address"
              className="w-full h-10 pl-9 pr-3 rounded-[var(--radius-md)] bg-surface border border-border text-sm text-fg placeholder:text-faint outline-none focus:border-brand"
            />
          </div>
        </label>
      </div>

      {markets.length === 0 ? (
        <div role="status" className="rounded-[var(--radius-lg)] border border-dashed border-border bg-surface/30 px-6 py-16 text-center">
          <p className="text-sm text-muted">No markets match "{query}".</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {markets.map((m) => (
            <MarketCard key={m.id} market={m} />
          ))}
        </div>
      )}
    </AppShell>
  );
}
