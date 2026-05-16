"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { MOCK_PROPOSALS } from "@/lib/mock-data";

export function ProposalsPreview() {
  const recent = MOCK_PROPOSALS.slice(0, 3);

  return (
    <section className="py-24 relative bg-bg-secondary/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-text-primary text-center mb-2">
            Recent Activity
          </h2>
        </motion.div>

        <div className="space-y-4 max-w-3xl mx-auto">
          {recent.map((proposal, i) => (
            <motion.div
              key={proposal.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              <Link href={`/proposals/${proposal.number}`}>
                <div className="group flex items-center gap-4 p-4 rounded-2xl border border-border bg-bg-secondary/50 hover:border-accent-primary/30 hover:bg-bg-secondary transition-all duration-200 cursor-pointer">
                  {/* Project icon */}
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-accent-primary/10 flex items-center justify-center">
                    <img
                      src="/MoDAO-whiteicon.png"
                      alt="MoDAO"
                      className="w-8 h-8 object-contain"
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-accent-primary uppercase tracking-wider">
                        Proposal #{proposal.number}
                      </span>
                      <Badge
                        variant={
                          proposal.state === "pending"
                            ? "pending"
                            : proposal.state === "passed"
                            ? "passed"
                            : "failed"
                        }
                        className="text-[10px]"
                      >
                        {proposal.state}
                      </Badge>
                    </div>
                    <p className="text-sm text-text-primary font-medium truncate group-hover:text-accent-primary transition-colors">
                      {proposal.title}
                    </p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center mt-8"
        >
          <Link
            href="/proposals"
            className="text-sm text-text-muted hover:text-accent-primary transition-colors"
          >
            View all proposals →
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
