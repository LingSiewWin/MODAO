import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

const FOOTER_LINKS = {
  Product: [
    { href: "/proposals", label: "Proposals" },
    { href: "/markets", label: "Markets" },
    { href: "/create", label: "Create Proposal" },
    { href: "/dao", label: "DAO Directory" },
  ],
  Learn: [
    { href: "#", label: "How Futarchy Works" },
    { href: "#", label: "Documentation" },
    { href: "#", label: "Whitepaper" },
    { href: "#", label: "FAQ" },
  ],
  Community: [
    { href: "#", label: "GitHub" },
    { href: "#", label: "Discord" },
    { href: "#", label: "Twitter" },
    { href: "#", label: "Blog" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Logo />
            <p className="mt-3 text-sm text-muted max-w-xs leading-relaxed">
              Govern at the speed of Monad. The fairest launches on the fastest chain.
            </p>
          </div>
          {Object.entries(FOOTER_LINKS).map(([heading, items]) => (
            <div key={heading}>
              <h3 className="text-xs font-semibold text-fg uppercase tracking-wider">
                {heading}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {items.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="text-sm text-muted hover:text-fg transition-colors"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-faint">© 2026 MoDAO. Built on Monad.</p>
          <p className="text-xs text-faint font-mono">
            Sub-second futarchy · Near-zero gas
          </p>
        </div>
      </div>
    </footer>
  );
}
