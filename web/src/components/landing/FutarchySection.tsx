"use client";

import { motion } from "framer-motion";
import { TrendingUp, BarChart3, Wallet } from "lucide-react";

const pillars = [
  {
    icon: <TrendingUp className="w-8 h-8 text-accent-primary" />,
    title: "Conditional markets",
    description:
      "Traders bet on whether an action would increase the value of a project",
  },
  {
    icon: <BarChart3 className="w-8 h-8 text-accent-primary" />,
    title: "Price-based resolution",
    description:
      "Proposals are accepted if the market thinks they would create value",
  },
  {
    icon: <Wallet className="w-8 h-8 text-accent-primary" />,
    title: "Skin in the game",
    description:
      "You grow your portfolio when you help projects make better decisions",
  },
];

export function FutarchySection() {
  return (
    <section className="py-24 relative bg-bg-secondary/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mb-6">
            We don&apos;t vote,{" "}
            <span className="gradient-text">we trade</span>
          </h2>
          <p className="text-text-secondary max-w-2xl mx-auto leading-relaxed">
            The key advantage of decision markets is that they harness the predictive power of financial markets and asset prices to guide decision-making, with participants placing real monetary stakes behind their forecasts.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {pillars.map((pillar, i) => (
            <motion.div
              key={pillar.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-accent-primary/10 flex items-center justify-center mx-auto mb-5">
                {pillar.icon}
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                {pillar.title}
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                {pillar.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
