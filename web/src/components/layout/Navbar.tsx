"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Logo } from "@/components/brand/Logo";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/proposals", label: "ICO Proposals" },
  { href: "/futarchy", label: "Governance" },
  { href: "/dao", label: "DAO" },
  { href: "/create", label: "Submit Project" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 inset-x-0 z-50 transition-all duration-200",
        "border-b",
        scrolled
          ? "bg-bg/80 backdrop-blur-xl border-border shadow-[var(--shadow-md)]"
          : "bg-transparent border-transparent",
      )}
    >
      <div className="mx-auto max-w-7xl h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        <Link href="/" aria-label="MoDAO home" className="flex items-center">
          <Logo />
        </Link>

        <nav aria-label="Primary" className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "px-3 py-2 text-sm font-medium text-muted hover:text-fg rounded-[var(--radius-md)]",
                "hover:bg-surface-2 transition-colors duration-150",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Badge variant="brand" className="hidden sm:inline-flex">
            <span className="size-1.5 rounded-full bg-brand-3 animate-pulse" />
            Monad Testnet
          </Badge>
          <div className="hidden sm:block">
            <ConnectButton
              showBalance={false}
              chainStatus="icon"
              accountStatus={{ smallScreen: "avatar", largeScreen: "full" }}
            />
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
            className="md:hidden inline-flex items-center justify-center size-10 rounded-[var(--radius-md)] border border-border text-fg hover:bg-surface-2"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {mobileOpen ? (
                <path d="M6 6l12 12M6 18L18 6" />
              ) : (
                <path d="M3 6h18M3 12h18M3 18h18" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile sheet */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-bg/95 backdrop-blur-xl">
          <nav className="px-4 py-3 flex flex-col gap-1" aria-label="Mobile">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="px-3 py-2.5 text-sm font-medium text-fg rounded-[var(--radius-md)] hover:bg-surface-2"
              >
                {item.label}
              </Link>
            ))}
            <div className="pt-2 mt-2 border-t border-border">
              <ConnectButton />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
