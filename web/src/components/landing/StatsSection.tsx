import { PLATFORM_STATS } from "@/lib/mock-data";
import { formatUsd } from "@/lib/utils";

const stats = [
  { label: "Cumulative raised", value: formatUsd(PLATFORM_STATS.cumulativeRaisedUsd) },
  { label: "Projects launched", value: PLATFORM_STATS.launchedToDate.toString() },
  { label: "Active proposals", value: PLATFORM_STATS.activeProposals.toString() },
  { label: "24h volume", value: formatUsd(PLATFORM_STATS.totalVolumeUsd) },
];

export function StatsSection() {
  return (
    <section className="relative -mt-16 z-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-[var(--radius-xl)] border border-border bg-surface/80 backdrop-blur-xl shadow-[var(--shadow-lg)] overflow-hidden">
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-border">
            {stats.map((s) => (
              <div key={s.label} className="px-6 py-5">
                <p className="text-xs font-medium text-faint uppercase tracking-wider">
                  {s.label}
                </p>
                <p className="mt-1.5 text-2xl sm:text-3xl font-semibold text-fg font-mono tracking-tight">
                  {s.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
