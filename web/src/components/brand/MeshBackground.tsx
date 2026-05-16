import { cn } from "@/lib/utils";

/* Slow-drifting purple blobs behind a hairline grid. Animation rules live
   in globals.css (mesh-blob, drift-a/b/c) so CSS owns the motion budget. */
export function MeshBackground({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "absolute inset-0 overflow-hidden pointer-events-none",
        className,
      )}
      aria-hidden
    >
      <div className="absolute inset-0 grid-overlay opacity-60" />
      <div className="mesh-blob mesh-blob-a" style={{ width: 520, height: 520, top: "-10%", left: "-5%" }} />
      <div className="mesh-blob mesh-blob-b" style={{ width: 420, height: 420, top: "30%", right: "-10%" }} />
      <div className="mesh-blob mesh-blob-c" style={{ width: 600, height: 600, bottom: "-20%", left: "30%" }} />
      {/* Vignette so blobs fade into bg at edges */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 0%, var(--bg-primary) 85%)",
        }}
      />
    </div>
  );
}
