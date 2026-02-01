'use client';

import { motion } from "framer-motion";
import Link from "next/link";
import { HeroChatWidget } from "./HeroChatWidget";
import { HeroOrbitBlue } from "./HeroOrbitBlue";

const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 100, damping: 22 },
  },
};

const Hero = () => {
  return (
    <section
      className="relative w-full overflow-hidden bg-white px-4 py-16 sm:px-6 lg:px-8"
      id="product"
    >
      {/* Orbit as faded background */}
      <HeroOrbitBlue />

      <div className="relative mx-auto max-w-6xl">
      <div className="grid min-h-[calc(100vh-8rem)] grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
          {/* Left column — headline, text, CTAs */}
          <motion.div
            variants={container}
            initial="hidden"
            animate="visible"
            className="order-2 flex flex-col lg:order-1 lg:self-start lg:pt-39"
          >
            <motion.p
              variants={item}
              className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#0066FF]"
            >
              Powered by LUNA
            </motion.p>
            <motion.h1
              variants={item}
              className="text-4xl font-extrabold leading-[1.1] tracking-[-0.025em] text-zinc-900 sm:text-5xl lg:text-[3.25rem]"
            >
              AI-first hiring for
              <br />
              <span className="bg-gradient-to-r from-[#0066FF] to-[#3399FF] bg-clip-text text-transparent">
                modern teams
              </span>
            </motion.h1>

            <motion.p
              variants={item}
              className="mt-5 max-w-lg text-base leading-relaxed text-zinc-600 sm:text-lg"
            >
              Space42 brings you LUNA — an AI agent that guides candidates through applications, screens resumes, and streamlines onboarding. Built for growing teams.
            </motion.p>

            <motion.div variants={item} className="mt-8 flex flex-wrap items-center gap-4">
              <Link href="/career">
                <motion.span
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center justify-center rounded-full bg-[#0066FF] px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-500/30 transition-shadow hover:shadow-xl hover:shadow-blue-500/40"
                >
                  Explore Careers
                </motion.span>
              </Link>
              <motion.button
                whileHover={{ opacity: 0.85 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
                className="text-base font-semibold text-zinc-600 underline-offset-4 transition-colors hover:text-zinc-900 hover:underline"
              >
                Learn more
              </motion.button>
            </motion.div>
          </motion.div>
          {/* Right column — chat widget */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            className="order-1 flex items-center justify-center lg:order-2 lg:justify-end"
          >
            <HeroChatWidget />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
