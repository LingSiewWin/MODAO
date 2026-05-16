import Link from "next/link";
import type { Proposal } from "@/lib/types";
import { ProjectArtwork } from "./ProjectArtwork";
import { ProposalCountdown } from "./ProposalCountdown";
import { cn, formatUsd } from "@/lib/utils";

/**
 * Grid card for /proposals — MetaDAO "Permissionless Launches" feel.
 * Square artwork header, status pill, serif project name, terse description,
 * pass/fail metrics in a footer row. Whole card is a link.
 */
export function ProjectCard({ proposal }: { proposal: Proposal }) {
  const projectName = proposal.title
    .replace(/^Launch /, "")
    .replace(/ on MoDAO$/, "");
  const symbol = projectName.split(" ")[0]?.slice(0, 4).toUpperCase() ?? "";

  const statusLabel =
    proposal.state === "pending"
      ? "Live"
      : proposal.state === "passed"
        ? "Raised"
        : "Rejected";
  const statusTone =
    proposal.state === "pending"
      ? "text-warning border-warning/30 bg-warning/10"
      : proposal.state === "passed"
        ? "text-success border-success/30 bg-success/10"
        : "text-danger border-danger/30 bg-danger/10";

  return (
    <Link href={`/proposals/${proposal.id}`} className="group block">
      <article className="rounded-[var(--radius-lg)] border border-border bg-surface/60 overflow-hidden hover:border-border-hover hover:shadow-[var(--shadow-glow)] hover:-translate-y-0.5 transition-all duration-200">
        <div className="relative aspect-[5/3]">
          <ProjectArtwork seed={proposal.id} symbol={symbol} className="absolute inset-0" />
          <span
            className={cn(
              "absolute top-3 right-3 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full border backdrop-blur-sm",
              statusTone,
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                proposal.state === "pending" && "bg-warning",
                proposal.state === "passed" && "bg-success",
                proposal.state === "failed" && "bg-danger",
              )}
            />
            {statusLabel}
          </span>
        </div>

        <div className="p-5">
          <h3 className="text-2xl font-display tracking-tight text-fg group-hover:text-brand-3 transition-colors leading-tight">
            {projectName}
          </h3>

          <p className="mt-2 text-sm text-muted leading-relaxed line-clamp-2 min-h-[2.7rem]">
            {proposal.description}
          </p>

          <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-3">
            <Stat
              label={proposal.state === "passed" ? "Final PASS" : proposal.state === "failed" ? "Final FAIL" : "PASS TWAP"}
              value={
                proposal.state === "passed"
                  ? `${(proposal.passTwap * 100).toFixed(1)}%`
                  : proposal.state === "failed"
                    ? `${(proposal.failTwap * 100).toFixed(1)}%`
                    : `${(proposal.passTwap * 100).toFixed(1)}%`
              }
              tone={
                proposal.state === "failed" ? "danger" : "success"
              }
            />
            <Stat
              label="volume"
              value={formatUsd(proposal.volumeUsd)}
              tone="muted"
              align="right"
            />
          </div>

          {proposal.state === "pending" && (
            <div className="mt-3 flex justify-end">
              <ProposalCountdown endsAt={proposal.endsAt} />
            </div>
          )}
        </div>
      </article>
    </Link>
  );
}

function Stat({
  label,
  value,
  tone,
  align = "left",
}: {
  label: string;
  value: string;
  tone: "success" | "danger" | "muted";
  align?: "left" | "right";
}) {
  return (
    <div className={align === "right" ? "text-right" : ""}>
      <p
        className={cn(
          "text-lg font-mono tabular leading-none",
          tone === "success" && "text-success",
          tone === "danger" && "text-danger",
          tone === "muted" && "text-fg",
        )}
      >
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-widest text-faint mt-1">
        {label}
      </p>
    </div>
  );
}
