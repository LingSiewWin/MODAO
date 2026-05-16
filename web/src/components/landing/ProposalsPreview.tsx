import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { StateBadge } from "@/components/ui/Badge";
import { MOCK_PROPOSALS } from "@/lib/mock-data";
import { formatUsd, truncateAddress } from "@/lib/utils";

export function ProposalsPreview() {
  const live = MOCK_PROPOSALS.slice(0, 3);

  return (
    <section className="relative py-24 sm:py-32 border-t border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-6 mb-10">
          <div>
            <p className="text-xs font-semibold text-brand-3 uppercase tracking-widest">
              Live now
            </p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-fg">
              Trade the next launch
            </h2>
          </div>
          <Link
            href="/proposals"
            className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-brand-3 hover:text-fg"
          >
            View all proposals →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {live.map((p) => {
            const passPct = Math.round(p.passTwap * 100);
            const failPct = 100 - passPct;
            return (
              <Link key={p.id} href={`/proposals/${p.id}`}>
                <Card interactive className="p-6 h-full flex flex-col">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-faint">#{p.number}</span>
                    <StateBadge state={p.state} />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-fg leading-snug line-clamp-2">
                    {p.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted leading-relaxed line-clamp-3">
                    {p.description}
                  </p>

                  {/* TWAP bar */}
                  <div className="mt-5">
                    <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                      <span className="text-success">PASS {passPct}%</span>
                      <span className="text-danger">FAIL {failPct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden flex">
                      <div
                        className="h-full bg-success"
                        style={{ width: `${passPct}%` }}
                      />
                      <div
                        className="h-full bg-danger"
                        style={{ width: `${failPct}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-5 pt-5 border-t border-border flex items-center justify-between text-xs">
                    <span className="text-faint font-mono">{truncateAddress(p.proposer)}</span>
                    <span className="text-muted">{formatUsd(p.volumeUsd)} vol</span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
