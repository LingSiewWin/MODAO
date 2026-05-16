"use client";

import { motion } from "framer-motion";
import { Equal, Eye, Shield, Scale } from "lucide-react";

const features = [
  {
    icon: <Equal className="w-8 h-8 text-accent-primary" />,
    title: "Fair launch early",
    description: "Everyone gets the same price, anyone can participate",
  },
  {
    icon: <Eye className="w-8 h-8 text-accent-primary" />,
    title: "Transparent",
    description: "Avoid the backroom token deals that plague crypto",
  },
  {
    icon: <Shield className="w-8 h-8 text-accent-primary" />,
    title: "Raise more",
    description: "Through rug protection for your holders",
  },
  {
    icon: <Scale className="w-8 h-8 text-accent-primary" />,
    title: "Real alignment",
    description: "Legal structuring keeps the business and the token aligned",
  },
];

export function FeaturesSection() {
  return (
    <section className="py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4">
            Launch a project{" "}
            <span className="gradient-text">the right way</span>
          </h2>
          <p className="text-text-secondary max-w-xl mx-auto">
            Skip the low float / high FDV playbook and get funded by your community.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-12 max-w-3xl mx-auto">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="flex items-start gap-4"
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-accent-primary/10 flex items-center justify-center">
                {feature.icon}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-text-primary mb-1">
                  {feature.title}
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
