import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/LinkButton";
import { formatUsd, formatNumber } from "@/lib/utils";

const DAOS = [
  {
    name: "Hyperlend",
    symbol: "HYPER",
    description: "Isolated-pool money market for Monad.",
    treasuryUsd: 412_000,
    proposals: 4,
    tokenPrice: 0.094,
    status: "live" as const,
  },
  {
    name: "Anchor Stable",
    symbol: "ANCHR",
    description: "Over-collateralized stablecoin backed by MON + LSTs.",
    treasuryUsd: 821_500,
    proposals: 11,
    tokenPrice: 1.002,
    status: "live" as const,
  },
  {
    name: "Kettle",
    symbol: "KTL",
    description: "Royalty-enforcing NFT marketplace with on-chain order matching.",
    treasuryUsd: 76_200,
    proposals: 2,
    tokenPrice: 0.041,
    status: "raising" as const,
  },
  {
    name: "Pulse Perps",
    symbol: "PULSE",
    description: "Perpetuals DEX targeting Monad-native liquidity.",
    treasuryUsd: 0,
    proposals: 0,
    tokenPrice: 0,
    status: "pending" as const,
  },
];

const statusVariant = {
  live: "passed",
  raising: "info",
  pending: "pending",
} as const;

export default function DaoPage() {
  return (
    <AppShell
      title="DAO directory"
      description="Projects that have launched via MoDAO. Each runs its own treasury, with futarchy markets keeping spending honest."
      actions={
        <LinkButton href="/create" variant="gradient" size="md">
          Launch your DAO
        </LinkButton>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DAOS.map((d) => (
          <Card key={d.name} interactive className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="size-10 rounded-[var(--radius-md)] flex items-center justify-center font-mono text-sm shrink-0"
                  style={{ background: "var(--accent-gradient)", color: "white" }}
                >
                  {d.symbol.slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-fg truncate">{d.name}</h3>
                  <p className="text-[11px] font-mono text-faint">{d.symbol}</p>
                </div>
              </div>
              <Badge variant={statusVariant[d.status]} className="capitalize">
                {d.status}
              </Badge>
            </div>

            <p className="mt-4 text-sm text-muted leading-relaxed line-clamp-2 min-h-[2.6rem]">
              {d.description}
            </p>

            <dl className="mt-5 grid grid-cols-3 gap-3 pt-4 border-t border-border">
              <Stat label="Treasury" value={d.treasuryUsd > 0 ? formatUsd(d.treasuryUsd) : "—"} />
              <Stat label="Proposals" value={d.proposals > 0 ? formatNumber(d.proposals, 0) : "—"} />
              <Stat label="Price" value={d.tokenPrice > 0 ? `$${d.tokenPrice.toFixed(3)}` : "—"} />
            </dl>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-widest text-faint">{label}</dt>
      <dd className="mt-0.5 font-mono tabular text-sm text-fg">{value}</dd>
    </div>
  );
}
