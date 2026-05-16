/**
 * Tiny class-name joiner. Replaces clsx + tailwind-merge until those land
 * via `bun install`. Falsy values dropped, no merge conflict resolution —
 * keep order of utilities sensible at the call site.
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/** 0x1234abcd...ef01 — 6 chars head, 4 chars tail. Standard EVM convention. */
export function truncateAddress(address: string, head = 6, tail = 4): string {
  if (!address || address.length <= head + tail + 2) return address;
  return `${address.slice(0, head + 2)}…${address.slice(-tail)}`;
}

/** $39,596,486 — locale-aware integer USD. For headlines, not precision. */
export function formatUsd(value: number, opts?: { decimals?: number }): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: opts?.decimals ?? 0,
    maximumFractionDigits: opts?.decimals ?? 0,
  }).format(value);
}

/** 1,234.5678 — locale-aware number with configurable decimals. */
export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** 0.42 → 42.00%. For TWAP/probability displays. */
export function formatPercent(value: number, decimals = 2): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/** Relative time — "2h ago", "3d ago". For activity feeds, not legal text. */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
