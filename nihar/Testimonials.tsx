'use client';

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

const testimonials = [
  {
    name: "Sarah Mitchell",
    role: "HR Director at Nexa Solutions",
    img: "https://images.unsplash.com/photo-1524502397800-2eeaad7c3fe5?auto=format&fit=crop&w=240&q=70",
    quote: "\"Space42 streamlined our hiring. AI screening saves hours, and candidates love the chat-based application flow.\"",
  },
  {
    name: "Omar Rahman",
    role: "People Ops Lead at AtlasWorks",
    img: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=240&q=70",
    quote: "\"Voice interviews at scale changed the game. We get consistent, fair evaluations and transcripts for every candidate.\"",
  },
  {
    name: "Lina Chen",
    role: "Talent Manager at BrightWave",
    img: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=240&q=70",
    quote: "\"The AI onboarding agent helps us build templates in minutes. Document uploads and department info — all in one place.\"",
  },
];

const Testimonials = () => {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const paginate = (newDirection: number) => {
    setDirection(newDirection);
    setIndex((prev) => (prev + newDirection + testimonials.length) % testimonials.length);
  };

  const current = testimonials[index];

  return (
    <section className="relative py-24 px-4 sm:px-6 lg:px-8" id="resources">
      <div className="mx-auto max-w-4xl">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ type: "spring", stiffness: 80, damping: 20 }}
          className="text-center text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl md:text-5xl"
        >
          Words of appreciation
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ type: "spring", stiffness: 80, damping: 20, delay: 0.05 }}
          className="mx-auto mt-4 max-w-2xl text-center text-base text-zinc-600 sm:text-lg"
        >
          HR teams and candidates trust Space42 for faster hiring and smoother onboarding.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ type: "spring", stiffness: 80, damping: 20, delay: 0.1 }}
          className="relative mt-16 flex flex-col items-center"
        >
          <div className="flex h-[380px] w-full max-w-[560px] items-end justify-center">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 24, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -24, scale: 0.98 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="absolute bottom-0 left-1/2 w-full max-w-[480px] -translate-x-1/2 rounded-2xl border border-zinc-200 bg-white p-8 shadow-xl shadow-zinc-200/50"
              >
                <div className="mx-auto mb-4 flex h-14 w-14 overflow-hidden rounded-2xl border border-zinc-200 shadow-sm">
                  <img alt={current.name} src={current.img} className="h-full w-full object-cover" />
                </div>
                <p className="text-center text-lg font-bold tracking-tight text-zinc-900">{current.name}</p>
                <p className="mt-1 text-center text-sm text-zinc-500">{current.role}</p>
                <div className="mt-3 flex items-center justify-center gap-1.5 text-amber-500">
                  <span className="font-bold">★ ★ ★ ★ ★</span>
                  <span className="text-zinc-700 font-semibold">5.0</span>
                </div>
                <p className="mt-4 text-center text-[15px] leading-relaxed text-zinc-600">{current.quote}</p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-8 flex gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => paginate(-1)}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-zinc-200 bg-white shadow-md transition-colors hover:bg-zinc-50 hover:border-zinc-300"
              aria-label="Previous"
            >
              <ChevronLeft className="h-5 w-5 text-zinc-600" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => paginate(1)}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-zinc-200 bg-white shadow-md transition-colors hover:bg-zinc-50 hover:border-zinc-300"
              aria-label="Next"
            >
              <ChevronRight className="h-5 w-5 text-zinc-600" />
            </motion.button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Testimonials;
