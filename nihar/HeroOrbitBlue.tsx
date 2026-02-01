'use client';

import { motion } from "framer-motion";

/**
 * Blue orbit as faded background for the Hero section.
 */
export function HeroOrbitBlue() {
  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.35]"
      aria-hidden
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
        className="relative h-[min(120%,80vw)] w-[min(120%,80vw)] max-h-[900px] max-w-[900px]"
      >
        <svg
          className="absolute inset-0 h-full w-full animate-orbit"
          viewBox="0 0 200 200"
        >
          <ellipse
            cx="100"
            cy="100"
            rx="88"
            ry="88"
            fill="none"
            stroke="url(#orbitBg1)"
            strokeWidth="1"
            strokeDasharray="8 12"
          />
          <defs>
            <linearGradient id="orbitBg1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0066FF" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#3399FF" stopOpacity="0.3" />
            </linearGradient>
          </defs>
        </svg>
        <svg
          className="absolute inset-0 h-full w-full animate-orbit-reverse"
          viewBox="0 0 200 200"
        >
          <ellipse
            cx="100"
            cy="100"
            rx="65"
            ry="65"
            fill="none"
            stroke="#3399FF"
            strokeOpacity="0.25"
            strokeWidth="1"
            strokeDasharray="6 10"
          />
        </svg>
        <svg
          className="absolute inset-0 h-full w-full animate-orbit-slow"
          viewBox="0 0 200 200"
        >
          <ellipse
            cx="100"
            cy="100"
            rx="42"
            ry="42"
            fill="none"
            stroke="#0066FF"
            strokeOpacity="0.2"
            strokeWidth="1"
            strokeDasharray="4 8"
          />
        </svg>
      </motion.div>
    </div>
  );
}
