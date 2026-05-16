"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ArrowRight } from "lucide-react";
import { UnicornStudioBackground } from "./UnicornStudioBackground";

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-start overflow-hidden pt-32">
      {/* UnicornStudio background */}
      <UnicornStudioBackground />

      {/* Subtle overlay for text legibility */}
      <div className="absolute inset-0 bg-bg-primary/40 pointer-events-none" style={{ zIndex: 1 }} />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-10"
        >
          <img
            src="/MoDAO-whitelogo.svg"
            alt="MoDAO"
            className="h-10 w-auto mx-auto"
          />
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] mb-72"
        >
          <span className="text-text-primary">Launch an </span>
          <span className="gradient-text">ownership</span>
          <br />
          <span className="text-text-primary">coin</span>
        </motion.h1>


        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg sm:text-xl text-text-secondary max-w-xl mx-auto mb-10 leading-relaxed"
        >
          Raise money while putting ownership into the hands of your early users and believers.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link href="/create">
            <Button size="lg" className="gap-2 min-w-[200px]">
              Launch a Project
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/proposals">
            <Button variant="secondary" size="lg" className="min-w-[200px]">
              Explore Proposals
            </Button>
          </Link>
        </motion.div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-bg-primary to-transparent" style={{ zIndex: 1 }} />
    </section>
  );
}
