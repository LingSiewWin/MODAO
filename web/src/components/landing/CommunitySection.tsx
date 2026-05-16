"use client";

import { motion } from "framer-motion";
import { formatNumber } from "@/lib/utils";
import { Users } from "lucide-react";

const projectsLaunched = 11;

export function CommunitySection() {
  return (
    <section className="py-16 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16"
        >
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-accent-primary" />
            <span className="text-text-secondary">Join a community</span>
          </div>
          <div className="text-center">
            <span className="text-3xl font-bold text-text-primary font-mono">{formatNumber(projectsLaunched, 0)}</span>
            <span className="text-text-muted ml-2">to-date</span>
          </div>
          <div className="text-center">
            <span className="text-text-muted">launched to-date</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
