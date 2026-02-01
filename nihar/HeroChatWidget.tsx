'use client';

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Maximize2, X } from "lucide-react";
import { CareerChat } from "@/app/components/CareerChat";

/**
 * LUNA chat widget — default full chat on right, expand pops large modal overlay.
 */
export function HeroChatWidget() {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      {/* Default chat window — full chat visible on right */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="flex h-[440px] w-full max-w-[440px] shrink-0 flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl shadow-zinc-200/60"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-100 bg-gradient-to-r from-blue-50 to-indigo-50/50 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0066FF] text-white shadow-lg shadow-blue-500/25">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-sm font-bold text-zinc-900">LUNA</span>
              <span className="block text-xs text-zinc-500">AI application assistant</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="rounded-full p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Expand chat"
          >
            <Maximize2 className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          <CareerChat
            headerTitle="LUNA"
            hideHeader
            className="!h-full !min-h-0 !border-0 !shadow-none"
            expanded
            initialMessage="Hi! I'm LUNA, your AI application assistant. Which role are you interested in? I can help you explore opportunities or start an application."
          />
        </div>
      </motion.div>

      {/* Expanded modal — pops on screen, bigger size */}
      <AnimatePresence>
        {expanded && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setExpanded(false)}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
              aria-hidden
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-4 z-50 flex items-center justify-center sm:inset-8 md:inset-12"
            >
              <div className="relative flex h-full max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl">
                <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 bg-gradient-to-r from-blue-50 to-indigo-50/50 px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0066FF] text-white shadow-lg shadow-blue-500/25">
                      <MessageCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="block text-sm font-bold text-zinc-900">LUNA</span>
                      <span className="block text-xs text-zinc-500">AI application assistant</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpanded(false)}
                    className="rounded-full p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  <CareerChat
                    headerTitle="LUNA"
                    hideHeader
                    className="!h-full !min-h-0 !border-0 !shadow-none"
                    expanded
                    initialMessage="Hi! I'm LUNA, your AI application assistant. Which role are you interested in? I can help you explore opportunities or start an application."
                  />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
