/* Static TWAP chart mock — drawn in SVG so it ships without recharts.
   Two diverging curves: pass (green) and fail (red), with a price gap
   that opens up over time. Demonstrates the "skin in the game" idea
   without needing real data. */

export function MarketOversightSection() {
  // 24 data points each, 0-100 range. Hand-tuned to tell a clear story:
  // both start near 50; pass climbs, fail falls.
  const passSeries = [50, 51, 49, 52, 53, 55, 54, 56, 58, 59, 61, 60, 62, 64, 65, 67, 68, 70, 71, 73, 74, 75, 77, 78];
  const failSeries = [50, 49, 51, 48, 47, 45, 46, 44, 42, 41, 39, 40, 38, 36, 35, 33, 32, 30, 29, 27, 26, 25, 23, 22];

  const W = 800;
  const H = 280;
  const pointsToPath = (data: number[]) => {
    const step = W / (data.length - 1);
    return data
      .map((v, i) => `${i === 0 ? "M" : "L"} ${i * step} ${H - (v / 100) * H}`)
      .join(" ");
  };

  return (
    <section className="relative py-24 sm:py-32 border-t border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div>
          <p className="text-xs font-semibold text-brand-3 uppercase tracking-widest">
            Market oversight
          </p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-fg">
            Markets watch the treasury so you don&apos;t have to
          </h2>
          <p className="mt-5 text-muted leading-relaxed">
            Once a project launches, every meaningful treasury action goes through a fresh futarchy
            market. If the team proposes something the market thinks destroys value, the FAIL side
            wins — funds stay locked, holders stay protected.
          </p>
          <ul className="mt-6 space-y-3">
            {[
              "Continuous price discovery on every proposal",
              "Treasury releases gated by TWAP outcome",
              "Public reasoning trail from the AI agent swarm",
              "Sub-second settlement — no waiting on a multisig",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-fg">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5 text-brand-3 shrink-0 mt-0.5">
                  <path d="M5 13l4 4L19 7" />
                </svg>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-6 shadow-[var(--shadow-md)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs text-faint uppercase tracking-wider">TWAP comparison</div>
              <div className="text-sm font-medium text-fg mt-1">Hyperlend proposal · live</div>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-success" /> Pass <span className="font-mono text-fg">0.78</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-danger" /> Fail <span className="font-mono text-fg">0.22</span>
              </span>
            </div>
          </div>

          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-auto"
            role="img"
            aria-label="Pass and fail TWAP curves diverging over time"
          >
            <defs>
              <linearGradient id="pass-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="fail-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* horizontal grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((p) => (
              <line key={p} x1={0} y1={H * p} x2={W} y2={H * p} stroke="#2a2a3a" strokeDasharray="3 3" />
            ))}

            {/* fail area + line */}
            <path d={`${pointsToPath(failSeries)} L ${W} ${H} L 0 ${H} Z`} fill="url(#fail-fill)" />
            <path d={pointsToPath(failSeries)} fill="none" stroke="#ef4444" strokeWidth="2" />

            {/* pass area + line */}
            <path d={`${pointsToPath(passSeries)} L ${W} ${H} L 0 ${H} Z`} fill="url(#pass-fill)" />
            <path d={pointsToPath(passSeries)} fill="none" stroke="#22c55e" strokeWidth="2" />
          </svg>

          <div className="mt-4 flex items-center justify-between text-xs font-mono text-faint">
            <span>T-24h</span>
            <span>T-12h</span>
            <span>now</span>
          </div>
        </div>
      </div>
    </section>
  );
}
