import { cn } from "@/lib/utils";

/**
 * Deterministic project artwork generated from a string seed (project name
 * or symbol). Two layers:
 *   1. A radial-gradient backdrop tinted by the seed's hash.
 *   2. A constellation of dots whose density and orbit are seeded too,
 *      echoing MetaDAO's data-art covers without copying any specific asset.
 *
 * Cheap, GPU-friendly, and unique per project — no need for real artwork.
 */
export function ProjectArtwork({
  seed,
  className,
  symbol,
}: {
  seed: string;
  className?: string;
  symbol?: string;
}) {
  const hash = simpleHash(seed);
  const hue = (hash % 360);
  const secondary = (hue + 35) % 360;
  const dotCount = 40 + (hash % 30);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-lg)]",
        className,
      )}
      aria-hidden
    >
      {/* Base gradient — purple-leaning with a seeded hue accent */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(circle at 30% 30%, hsla(${hue}, 70%, 55%, 0.35), transparent 60%),
            radial-gradient(circle at 75% 65%, hsla(${secondary}, 70%, 50%, 0.30), transparent 55%),
            linear-gradient(135deg, #0e0e18 0%, #1a1525 100%)
          `,
        }}
      />

      {/* Concentric ring like MetaDAO's covers */}
      <svg
        viewBox="0 0 400 400"
        className="absolute inset-0 w-full h-full opacity-60"
      >
        <defs>
          <radialGradient id={`ring-${hash}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(265, 80%, 65%)" stopOpacity="0.5" />
            <stop offset="50%" stopColor="hsl(265, 80%, 65%)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="hsl(265, 80%, 65%)" stopOpacity="0" />
          </radialGradient>
        </defs>
        {Array.from({ length: 8 }).map((_, i) => (
          <circle
            key={i}
            cx="200"
            cy="200"
            r={30 + i * 25}
            fill="none"
            stroke={`url(#ring-${hash})`}
            strokeWidth="0.6"
          />
        ))}

        {Array.from({ length: dotCount }).map((_, i) => {
          const angle = (i / dotCount) * Math.PI * 2;
          const radiusJitter = ((hash + i * 17) % 100) / 100;
          const r = 80 + radiusJitter * 130;
          const cx = 200 + Math.cos(angle) * r;
          const cy = 200 + Math.sin(angle) * r;
          return (
            <circle
              key={`d-${i}`}
              cx={cx}
              cy={cy}
              r={0.8 + ((i * 7) % 18) / 12}
              fill="hsl(265, 80%, 75%)"
              opacity={0.4 + ((i * 11) % 50) / 100}
            />
          );
        })}
      </svg>

      {/* Project mark in lower-left, like a magazine cover */}
      {symbol && (
        <div className="absolute bottom-3 left-4 flex items-center gap-2">
          <span className="text-fg/90 text-xl font-display italic">
            {symbol}
          </span>
        </div>
      )}
    </div>
  );
}

function simpleHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}
