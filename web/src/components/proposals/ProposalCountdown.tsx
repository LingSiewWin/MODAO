"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function ProposalCountdown({
  endsAt,
  className,
}: {
  endsAt: string;
  className?: string;
}) {
  const [remaining, setRemaining] = useState(() => diff(endsAt));

  useEffect(() => {
    const id = setInterval(() => setRemaining(diff(endsAt)), 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  if (remaining.total <= 0) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-xs font-mono text-faint", className)}>
        <span className="size-1.5 rounded-full bg-faint" />
        Ended
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-mono tabular text-muted",
        className,
      )}
      aria-label={`${remaining.d}d ${remaining.h}h ${remaining.m}m remaining`}
    >
      <span className="size-1.5 rounded-full bg-warning animate-pulse" />
      <span>
        {remaining.d > 0 && <>{remaining.d}d </>}
        {String(remaining.h).padStart(2, "0")}:{String(remaining.m).padStart(2, "0")}:
        {String(remaining.s).padStart(2, "0")}
      </span>
    </span>
  );
}

function diff(iso: string) {
  const total = Math.max(0, new Date(iso).getTime() - Date.now());
  const d = Math.floor(total / 86_400_000);
  const h = Math.floor((total % 86_400_000) / 3_600_000);
  const m = Math.floor((total % 3_600_000) / 60_000);
  const s = Math.floor((total % 60_000) / 1000);
  return { total, d, h, m, s };
}
