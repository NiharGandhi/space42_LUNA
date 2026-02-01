'use client';

import { useRef, useEffect, useState } from 'react';
import { Breadcrumbs } from '@/app/components/Breadcrumbs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, Send, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { ChatMessageContent } from '@/app/components/ChatMessageContent';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

const WELCOME_MESSAGE = `I'm your HR AI assistant. I can help you:

• **Candidates & applications** — Ask who applied, application status, screening scores, or details about any candidate or application.
• **Jobs** — List jobs, get job details, create new jobs, or change job status (e.g. publish a draft).
• **Hiring** — Mark candidates as hired (for applications that passed all 3 stages) and start their onboarding.
• **Onboarding** — List onboarding templates and flows, or check a new hire's onboarding progress.

Try: "How many applications do we have?" or "Create a job for Senior Engineer in Engineering, remote."`;

export default function HRAgentPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: WELCOME_MESSAGE,
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const assistantId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: 'assistant', content: '' },
    ]);

    try {
      const bodyMessages = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const res = await fetch('/api/hr/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: bodyMessages }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to get response');
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let streamed = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          streamed += decoder.decode(value, { stream: true });
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: streamed } : m
            )
          );
        }
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: errorMessage } : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'AI Agent' }]} />
        <div className="flex items-center gap-2 text-[13px] text-slate-500">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <span>HR assistant with full access</span>
        </div>
      </div>

      <Card className="flex flex-col overflow-hidden border-2 border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
          <MessageCircle className="h-5 w-5 text-slate-700" />
          <span className="font-semibold text-slate-900">HR AI Agent</span>
        </div>

        <div
          ref={messagesContainerRef}
          className="flex-1 min-h-[420px] max-h-[60vh] overflow-y-auto p-4 space-y-4"
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'flex',
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  'max-w-[90%] rounded-2xl px-4 py-2.5 text-[14px]',
                  msg.role === 'user'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-900'
                )}
              >
                {msg.role === 'assistant' && isLoading && !msg.content ? (
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Thinking…
                  </span>
                ) : msg.role === 'assistant' ? (
                  <ChatMessageContent
                    content={msg.content}
                    linkifyPaths
                  />
                ) : (
                  <div className="whitespace-pre-wrap wrap-break-word">
                    {msg.content}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div aria-hidden />
        </div>

        <div className="shrink-0 border-t border-slate-200 p-3">
          <div className="flex gap-2 items-end">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about candidates, applications, jobs, or create a job…"
              disabled={isLoading}
              className="min-h-[44px] max-h-[120px] resize-none flex-1 py-2.5 text-[14px]"
              rows={2}
            />
            <Button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              size="default"
              className="shrink-0 bg-slate-900 hover:bg-slate-800"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="mt-2 text-[12px] text-slate-500">
            Examples: &quot;List applications for [job]&quot;, &quot;Details for application [id]&quot;, &quot;Create a job for…&quot;, &quot;Mark [applicationId] as hired&quot;
          </p>
        </div>
      </Card>
    </main>
  );
}
