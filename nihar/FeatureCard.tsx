'use client';

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface FeatureCardProps {
  title: string;
  description: string;
  children: ReactNode;
  wide?: boolean;
  delay?: number;
  index?: number;
}

const FeatureCard = ({ title, description, children, wide = false, delay = 0, index = 0 }: FeatureCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2, margin: "-40px" }}
      transition={{
        type: "spring",
        stiffness: 80,
        damping: 20,
        delay: delay * 0.08,
      }}
      className={`group relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:border-zinc-300 hover:shadow-lg ${
        wide ? "md:col-span-2" : ""
      }`}
    >
      <div className="mb-4 flex h-[120px] items-center justify-center rounded-xl bg-gradient-to-b from-zinc-50/80 to-transparent">
        {children}
      </div>
      <h3 className="mb-2 text-xl font-bold tracking-tight text-zinc-900">{title}</h3>
      <p className="text-[15px] leading-relaxed text-zinc-600">{description}</p>
    </motion.div>
  );
};

export default FeatureCard;
