"use client";

import { motion } from "framer-motion";

export function FundraisingSection() {
  return (
    <section className="py-20 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-text-primary">
            We built a <span className="gradient-text">better</span> fundraising system
          </h2>
        </motion.div>
      </div>
    </section>
  );
}
