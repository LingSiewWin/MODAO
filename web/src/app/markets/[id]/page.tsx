import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { ConditionalMarketCard } from "@/components/markets/ConditionalMarketCard";
import { Card } from "@/components/ui/Card";
import { MOCK_MARKETS } from "@/lib/mock-data";
import { truncateAddress, formatUsd } from "@/lib/utils";

export default async function MarketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const market = MOCK_MARKETS.find((m) => m.id === id);
  if (!market) notFound();

  const side: "pass" | "fail" = market.name.includes("PASS") ? "pass" : "fail";

  return (
    <AppShell>
      <div className="mb-6">
        <Link
          href="/markets"
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-fg font-medium"
        >
          <span aria-hidden>←</span> Markets
        </Link>
      </div>

      <header className="mb-6">
        <p className="text-xs font-mono text-faint">{truncateAddress(market.address)}</p>
        <h1 className="mt-1 text-2xl sm:text-3xl font-mono text-fg">{market.name}</h1>
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <ConditionalMarketCard side={side} twap={market.twap} winning />

        <aside className="space-y-4">
          <Card className="p-5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-faint mb-3">
              Market info
            </h2>
            <dl className="space-y-2.5 text-xs">
              <Row label="TWAP" value={`${(market.twap * 100).toFixed(2)}%`} />
              <Row label="24h volume" value={formatUsd(market.volume24h)} />
              <Row label="Base decimals" value={String(market.baseDecimals)} />
              <Row label="Quote decimals" value={String(market.quoteDecimals)} />
            </dl>
          </Card>
        </aside>
      </div>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="font-mono tabular text-fg">{value}</dd>
    </div>
  );
}
