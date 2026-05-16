"use client";

import Link from "next/link";
import { Github, Twitter, MessageCircle, BookOpen } from "lucide-react";

const socialLinks = [
  { name: "GitHub", href: "https://github.com/modao", icon: Github },
  { name: "Docs", href: "https://docs.modao.fi", icon: BookOpen },
  { name: "Discord", href: "https://discord.gg/modao", icon: MessageCircle },
  { name: "Twitter", href: "https://twitter.com/MoDAOProject", icon: Twitter },
];

const navLinks = [
  { href: "/proposals", label: "Proposals" },
  { href: "/markets", label: "Markets" },
  { href: "/dao", label: "DAO Directory" },
  { href: "/create", label: "Create Proposal" },
];

export function LandingFooter() {
  return (
    <footer className="border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <Link href="/" className="inline-block mb-4">
              <img
                src="/MoDAO-whitelogo.svg"
                alt="MoDAO"
                className="h-6 w-auto"
              />
            </Link>
            <p className="text-sm text-text-muted leading-relaxed">
              Futarchy governance and fair token launches on Monad.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-text-primary mb-4">Platform</h4>
            <ul className="space-y-2">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-text-muted hover:text-accent-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-text-primary mb-4">Community</h4>
            <div className="flex gap-3">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-lg bg-bg-tertiary flex items-center justify-center text-text-muted hover:text-accent-primary transition-all"
                    aria-label={social.name}
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-text-muted">
            &copy; {new Date().getFullYear()} MoDAO. All rights reserved.
          </p>
          <p className="text-xs text-text-muted">
            Built on <span className="text-accent-primary">Monad</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
