import type { Address } from "viem";

/**
 * Platform admin wallets. Empowered to manually trigger `LaunchSale.finalize()`
 * from the proposal detail page once a sale window closes.
 *
 * The contract function is permissionless; this is a UX gate only. Add the
 * deployer plus any teammate wallets that should be able to end sales.
 */
export const ADMIN_ADDRESSES: readonly Address[] = [
  "0x37960C65118a5263fb880f105663Fd4f29aA15de", // deployer (deployments/monad-testnet.json)
] as const;

/** Case-insensitive check — viem may return checksummed or lowercased forms. */
export function isAdmin(addr: Address | undefined): boolean {
  if (!addr) return false;
  const lower = addr.toLowerCase();
  return ADMIN_ADDRESSES.some((a) => a.toLowerCase() === lower);
}
