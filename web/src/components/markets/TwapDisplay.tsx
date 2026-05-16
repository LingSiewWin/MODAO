import { cn } from "@/lib/utils";

export function TwapDisplay({
  twap,
  trend = 0,
  side,
  className,
}: {
  twap: number;
  trend?: number;
  side: "pass" | "fail";
  className?: string;
}) {
  const tone = side === "pass" ? "text-success" : "text-danger";
  return (
    <div className={cn("flex flex-col items-end", className)}>
      <span className="text-[10px] font-medium uppercase tracking-widest text-faint">
        TWAP
      </span>
      <span className={cn("font-mono tabular text-2xl font-semibold leading-none mt-1", tone)}>
        {(twap * 100).toFixed(1)}
        <span className="text-muted text-base font-normal">%</span>
      </span>
      {trend !== 0 && (
        <span
          className={cn(
            "mt-1 text-[11px] font-mono tabular",
            trend > 0 ? "text-success" : "text-danger",
          )}
        >
          {trend > 0 ? "▲" : "▼"} {Math.abs(trend * 100).toFixed(2)}%
        </span>
      )}
    </div>
  );
}
