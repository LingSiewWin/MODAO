"use client";

import { motion } from "framer-motion";

export function MarketOversightSection() {
  return (
    <section className="py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mb-6">
            Market <span className="gradient-text">Oversight</span>
          </h2>
          <p className="text-text-secondary text-lg leading-relaxed">
            Decision markets oversee raised funds, reducing risk of rugs and providing confidence to participants.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
