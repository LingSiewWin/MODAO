import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Lora } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

// Editorial serif — used for project names in the launchpad grid.
const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MoDAO — Futarchy launches on Monad",
  description:
    "Launch an ownership coin. Raise money while putting ownership into the hands of your early users and believers — governed by markets, not votes.",
  metadataBase: new URL("https://modao.fi"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} ${lora.variable}`}>
      <body className="min-h-screen bg-bg text-fg antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
