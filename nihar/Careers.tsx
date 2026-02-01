'use client';

import { motion } from "framer-motion";
import Link from "next/link";
import { Briefcase } from "lucide-react";

const Careers = () => {
  return (
    <section className="relative py-24 px-4 sm:px-6 lg:px-8" id="careers">
      <div className="mx-auto max-w-4xl text-center">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ type: "spring", stiffness: 80, damping: 20 }}
          className="text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl md:text-5xl"
        >
          Join the team
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ type: "spring", stiffness: 80, damping: 20, delay: 0.05 }}
          className="mx-auto mt-4 max-w-2xl text-base text-zinc-600 sm:text-lg"
        >
          Explore open roles and apply with our AI-powered chat. Quick, transparent, and built for modern candidates.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ type: "spring", stiffness: 80, damping: 20, delay: 0.1 }}
          className="mt-10"
        >
          <Link href="/career">
            <motion.span
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-2.5 rounded-full border border-zinc-200 bg-white px-8 py-4 text-base font-semibold text-zinc-800 shadow-lg shadow-zinc-200/50 transition-all hover:border-zinc-300 hover:shadow-xl hover:shadow-zinc-200/60"
            >
              <Briefcase className="h-5 w-5 text-[#0066FF]" />
              View open positions
            </motion.span>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default Careers;
