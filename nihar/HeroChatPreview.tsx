'use client';

import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";

/**
 * Static mock of the candidate chat window for the Hero section.
 */
export function HeroChatPreview() {
  const messages = [
    { role: "assistant" as const, text: "Hi! I'm your application assistant. Which role are you interested in?" },
    { role: "user" as const, text: "Software Engineer" },
    { role: "assistant" as const, text: "Great choice! I'll guide you through the application. Ready to start?" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.6 }}
      className="w-full max-w-[320px] overflow-hidden rounded-2xl border border-white/10 bg-zinc-800/90 shadow-2xl backdrop-blur-sm"
    >
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0066FF]">
          <MessageCircle className="h-4 w-4 text-white" />
        </div>
        <span className="text-sm font-semibold text-white">Application assistant</span>
      </div>

      <div className="space-y-4 p-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                msg.role === "user"
                  ? "bg-[#0066FF] text-white"
                  : "bg-zinc-700/80 text-zinc-200"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-white/10 px-4 py-3">
        <div className="rounded-xl border border-white/10 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-500">
          Type your message...
        </div>
      </div>
    </motion.div>
  );
}
