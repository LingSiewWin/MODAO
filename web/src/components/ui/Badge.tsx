import * as React from "react";
import { cn } from "@/lib/utils";
import type { ProposalState } from "@/lib/types";

type Variant = "default" | "brand" | "pending" | "passed" | "failed" | "info";

const variants: Record<Variant, string> = {
  default: "bg-surface-2 text-muted border border-border",
  brand: "bg-brand/10 text-brand-3 border border-brand/30",
  pending: "bg-warning/10 text-warning border border-warning/20",
  passed: "bg-success/10 text-success border border-success/20",
  failed: "bg-danger/10 text-danger border border-danger/20",
  info: "bg-[color:var(--info)]/10 text-[color:var(--info)] border border-[color:var(--info)]/20",
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5",
        "text-xs font-medium tracking-tight whitespace-nowrap",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

const stateMap: Record<ProposalState, { label: string; variant: Variant }> = {
  pending: { label: "Pending", variant: "pending" },
  passed: { label: "Passed", variant: "passed" },
  failed: { label: "Failed", variant: "failed" },
};

export function StateBadge({ state }: { state: ProposalState }) {
  const { label, variant } = stateMap[state];
  return (
    <Badge variant={variant}>
      <span
        className="size-1.5 rounded-full"
        style={{
          background:
            variant === "passed"
              ? "var(--success)"
              : variant === "failed"
                ? "var(--danger)"
                : "var(--warning)",
        }}
        aria-hidden
      />
      {label}
    </Badge>
  );
}
