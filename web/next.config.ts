import type { NextConfig } from "next";

const OPTIONAL_WALLET_PEERS = [
  "@safe-global/safe-apps-sdk",
  "@safe-global/safe-apps-provider",
  "@walletconnect/ethereum-provider",
  "@metamask/connect-evm",
  "accounts",
  "pino-pretty",
  "lokijs",
  "encoding",
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@modao/shared"],
  webpack: (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.fallback = {
      ...(config.resolve.fallback ?? {}),
      ...Object.fromEntries(OPTIONAL_WALLET_PEERS.map((p) => [p, false])),
    };
    return config;
  },
};

export default nextConfig;
