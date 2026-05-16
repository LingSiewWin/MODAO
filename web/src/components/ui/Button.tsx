import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "gradient" | "danger" | "success";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-brand text-white hover:bg-brand-dark active:bg-brand-dark/90 shadow-[var(--shadow-md)]",
  secondary:
    "bg-transparent border border-border text-fg hover:bg-surface-2 hover:border-border-hover",
  ghost: "bg-transparent text-fg hover:bg-surface-2",
  gradient:
    "text-white shadow-[var(--shadow-md)] hover:brightness-110",
  danger:
    "bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20",
  success:
    "bg-success/10 text-success border border-success/20 hover:bg-success/20",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", style, ...props }, ref) => {
    const gradientStyle =
      variant === "gradient" ? { background: "var(--accent-gradient)", ...style } : style;

    return (
      <button
        ref={ref}
        style={gradientStyle}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] font-medium",
          "transition-[background,border-color,filter,transform] duration-150 ease-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
          "disabled:opacity-50 disabled:pointer-events-none",
          "active:scale-[0.98]",
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
