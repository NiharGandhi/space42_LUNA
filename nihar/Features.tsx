'use client';

import { motion } from "framer-motion";
import FeatureCard from "./FeatureCard";
import { Shield, Clock, Mic, FileCheck, Search, Video, UserCheck } from "lucide-react";

const Features = () => {
  return (
    <section className="relative py-24 px-4 sm:px-6 lg:px-8 bg-white" id="features">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ type: "spring", stiffness: 80, damping: 20 }}
          className="mb-16 text-center"
        >
          <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl md:text-5xl">
            Built for modern HR
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-zinc-600 sm:text-lg">
            Everything you need to hire faster and onboard smarter.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
          <FeatureCard
            title="AI resume screening"
            description="Automated resume analysis with skill matching, fit ratings, and structured evaluations for faster hiring decisions."
            delay={0}
          >
            <svg width="180" height="92" viewBox="0 0 180 92" fill="none" className="opacity-90">
              <rect x="0" y="0" width="180" height="92" rx="18" fill="rgba(0,0,0,.02)" />
              <rect x="26" y="44" width="18" height="34" rx="6" fill="var(--primary)" opacity=".85" />
              <rect x="52" y="26" width="18" height="52" rx="6" fill="var(--accent)" opacity=".90" />
              <rect x="78" y="52" width="18" height="26" rx="6" fill="var(--primary)" opacity=".75" />
              <rect x="104" y="18" width="18" height="60" rx="6" fill="var(--accent)" opacity=".90" />
              <rect x="130" y="40" width="18" height="38" rx="6" fill="var(--accent)" opacity=".80" />
            </svg>
          </FeatureCard>

          <FeatureCard
            title="Voice AI interviews"
            description="Conduct consistent, role-specific voice interviews at scale. Get transcripts, scores, and insights automatically."
            delay={1}
          >
            <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#0066FF] to-[#3399FF] text-white shadow-lg shadow-blue-500/30">
                <Mic className="h-6 w-6" />
              </div>
              <span className="text-sm font-semibold text-zinc-800">Voice AI at Scale</span>
            </div>
          </FeatureCard>

          <FeatureCard
            title="Smart onboarding"
            description="AI-assisted onboarding templates. Document uploads, department info, and checklists — AI or manual."
            delay={2}
          >
            <div
              className="flex h-[70px] w-[70px] items-center justify-center rounded-2xl shadow-lg"
              style={{ background: "var(--gradient-purple)" }}
            >
              <Shield className="h-8 w-8 text-white/95" strokeWidth={1.8} />
            </div>
          </FeatureCard>

          <FeatureCard
            title="Application data pipeline"
            description="Track candidates from apply → screening → interview → hired. One unified view for HR and candidates."
            wide
            delay={3}
          >
            <div className="flex w-full items-center justify-between">
              {[
                { icon: FileCheck, label: "Apply", color: "bg-blue-100 text-[#0066FF]" },
                { icon: Search, label: "Screen", color: "bg-indigo-100 text-indigo-600" },
                { icon: Video, label: "Interview", color: "bg-violet-100 text-violet-600" },
                { icon: UserCheck, label: "Hired", color: "bg-emerald-100 text-emerald-600" },
              ].map((step, i) => (
                <div key={step.label} className="flex items-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${step.color}`}>
                      <step.icon className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-semibold text-zinc-700">{step.label}</span>
                  </div>
                  {i < 3 && (
                    <div className="mx-2 h-0.5 w-6 shrink-0 rounded-full bg-zinc-200 sm:mx-4 sm:w-12" aria-hidden />
                  )}
                </div>
              ))}
            </div>
          </FeatureCard>

          <FeatureCard
            title="Candidate experience"
            description="Chat-based applications, clear status updates, and a smooth onboarding flow for new hires."
            delay={4}
          >
            <div className="relative h-[140px] w-[140px] rounded-full border border-zinc-200/60 bg-gradient-to-br from-zinc-50 to-transparent">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-2xl shadow-sm">
                  🕺
                </div>
              </div>
              {[
                { src: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=120&q=70", style: { left: 55, top: -4 } },
                { src: "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=120&q=70", style: { right: -4, top: 45 } },
                { src: "https://images.unsplash.com/photo-1520813792240-56fc4a3765a7?auto=format&fit=crop&w=120&q=70", style: { left: -4, top: 45 } },
                { src: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&q=70", style: { left: 55, bottom: -4 } },
              ].map((avatar, i) => (
                <div
                  key={i}
                  className="absolute h-8 w-8 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm"
                  style={avatar.style}
                >
                  <img alt="" src={avatar.src} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          </FeatureCard>
        </div>
      </div>
    </section>
  );
};

export default Features;
