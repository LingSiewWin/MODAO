import { cn } from "@/lib/utils";

/* Hourglass mark — drawn inline so we don't depend on /public assets being
   present. Swap this with <Image src="/MoDAO-whitelogo.svg" /> later if the
   raster/SVG asset is added to web/public. */
export function LogoMark({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id="modao-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6E54FF" />
          <stop offset="100%" stopColor="#A89AFF" />
        </linearGradient>
      </defs>
      {/* Top triangle */}
      <path
        d="M6 4 H26 L16 16 Z"
        fill="url(#modao-grad)"
        opacity="0.95"
      />
      {/* Bottom triangle */}
      <path
        d="M6 28 H26 L16 16 Z"
        fill="url(#modao-grad)"
        opacity="0.6"
      />
      {/* Center notch */}
      <circle cx="16" cy="16" r="1.6" fill="#0a0a0f" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <LogoMark />
      <span className="text-fg font-semibold tracking-tight text-lg">
        Mo<span className="text-brand-3">DAO</span>
      </span>
    </div>
  );
}
