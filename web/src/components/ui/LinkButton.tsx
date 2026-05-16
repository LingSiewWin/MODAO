import Link, { type LinkProps } from "next/link";
import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "gradient";
type Size = "sm" | "md" | "lg";

interface LinkButtonProps extends LinkProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
}

const variants: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-dark shadow-[var(--shadow-md)]",
  secondary:
    "bg-transparent border border-border text-fg hover:bg-surface-2 hover:border-border-hover",
  ghost: "bg-transparent text-fg hover:bg-surface-2",
  gradient: "text-white shadow-[var(--shadow-md)] hover:brightness-110",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

export function LinkButton({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: LinkButtonProps) {
  const style =
    variant === "gradient" ? { background: "var(--accent-gradient)" } : undefined;

  return (
    <Link
      {...props}
      style={style}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] font-medium",
        "transition-[background,border-color,filter,transform] duration-150 ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
        "active:scale-[0.98]",
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {children}
    </Link>
  );
}
