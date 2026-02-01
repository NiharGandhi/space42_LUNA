'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MessageCircle, Send, Check, Circle, ChevronDown, ChevronUp, Sparkles, Upload, FileCheck, Clock } from 'lucide-react';
import { CandidateNavbar } from '@/app/components/CandidateNavbar';
import { Breadcrumbs } from '@/app/components/Breadcrumbs';

type OnboardingTask = {
  id: string;
  taskTitle: string;
  taskDescription: string | null;
  status: string;
  dueDate: string | null;
  completedAt: string | null;
  submissionDescription?: string | null;
  attachments?: string[];
  notes?: string | null;
};

type OnboardingData = {
  flow: { id: string; status: string; startedAt: string | null; completedAt: string | null } | null;
  tasks: OnboardingTask[];
  job: { title: string; department: string } | null;
  applicationStatus?: string | null;
  hasApplication?: boolean;
  applicationId?: string | null;
  message?: string;
};

type ChatMessage = { role: 'user' | 'assistant'; content: string };

const SUGGESTED_PROMPTS = [
  "What's my first step?",
  "Who do I contact for IT or equipment?",
  "What's in the handbook?",
  "I have a question about visa or documents",
];

export default function MyOnboardingPage() {
  const router = useRouter();
  const [data, setData] = useState<OnboardingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [uploadingTaskId, setUploadingTaskId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const loadOnboarding = async () => {
    try {
      const onboardingRes = await fetch('/api/onboarding');
      const onboardingData = await onboardingRes.json();
      if (onboardingData.success) {
        setData({
          flow: onboardingData.flow,
          tasks: onboardingData.tasks ?? [],
          job: onboardingData.job,
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const [sessionRes, onboardingRes] = await Promise.all([
          fetch('/api/auth/session'),
          fetch('/api/onboarding'),
        ]);
        const sessionData = await sessionRes.json();
        const onboardingData = await onboardingRes.json();

        if (!sessionData.success || !sessionData.user) {
          router.replace('/login?redirect=/my-onboarding');
          setLoading(false);
          return;
        }
        if (sessionData.user.role !== 'candidate') {
          router.replace('/dashboard');
          setLoading(false);
          return;
        }
        if (onboardingData.success) {
          setData({
            flow: onboardingData.flow,
            tasks: onboardingData.tasks ?? [],
            job: onboardingData.job,
            applicationStatus: onboardingData.applicationStatus,
            hasApplication: onboardingData.hasApplication,
            applicationId: onboardingData.applicationId,
            message: onboardingData.message,
          });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const sendMessage = async (text?: string) => {
    const toSend = (text ?? chatInput).trim();
    if (!toSend || chatLoading || !data?.flow) return;

    if (!text) setChatInput('');
    setChatMessages((prev) => [...prev, { role: 'user', content: toSend }]);
    setChatLoading(true);

    try {
      const res = await fetch('/api/onboarding/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...chatMessages, { role: 'user', content: toSend }],
        }),
      });
      const result = await res.json();
      if (result.success && result.message) {
        setChatMessages((prev) => [...prev, result.message]);
      } else {
        setChatMessages((prev) => [
          ...prev,
          { role: 'assistant', content: result.error || "Something went wrong. Try again?" },
        ]);
      }
    } catch (e) {
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: "I couldn't get a response right now. Try again in a moment." },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const markTaskComplete = async (taskId: string) => {
    if (updatingTaskId || !data?.tasks) return;
    setUpdatingTaskId(taskId);
    try {
      const res = await fetch(`/api/onboarding/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });
      const result = await res.json();
      if (result.success) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                tasks: prev.tasks.map((t) =>
                  t.id === taskId
                    ? { ...t, status: 'completed', completedAt: result.task?.completedAt ?? null }
                    : t
                ),
              }
            : null
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const uploadTaskDocument = async (taskId: string, file: File) => {
    if (uploadingTaskId || !data?.tasks) return;
    setUploadingTaskId(taskId);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`/api/onboarding/tasks/${taskId}/upload`, {
        method: 'POST',
        body: formData,
      });
      const result = await res.json();
      if (result.success && result.attachments) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                tasks: prev.tasks.map((t) =>
                  t.id === taskId
                    ? { ...t, attachments: result.attachments, status: 'submitted' }
                    : t
                ),
              }
            : null
        );
      } else {
        alert(result.error || 'Upload failed');
      }
    } catch (e) {
      alert('Upload failed');
    } finally {
      setUploadingTaskId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    );
  }

  if (!data?.flow) {
    const isHiredNoFlow = data?.applicationStatus === 'hired' && data?.hasApplication;
    const hasApplicationNotHired = data?.hasApplication && data?.applicationStatus && data.applicationStatus !== 'hired';
    const noApplication = !data?.hasApplication;

    let title = "You don't have onboarding yet.";
    let description = "Onboarding appears here after you've been marked as hired for a role.";
    if (noApplication) {
      title = "No applications yet.";
      description = "Apply to a role first. Once you're hired, your onboarding will appear here.";
    } else if (hasApplicationNotHired) {
      title = "Onboarding isn't ready yet.";
      description = "It will show up here after you've been marked as hired. Check your application status below.";
    } else if (isHiredNoFlow) {
      title = "Onboarding is being set up.";
      description = data?.message ?? "Your checklist will appear here soon. If it doesn't, ask HR.";
    }

    const applicationLink = data?.applicationId ? `/my-applications/${data.applicationId}` : '/my-applications';

    return (
      <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center gap-6 px-4">
        <div className="text-center max-w-md">
          <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
          <p className="mt-2 text-sm text-gray-500">{description}</p>
        </div>
        <div className="flex flex-wrap gap-3 justify-center">
          {hasApplicationNotHired && data?.applicationId && (
            <Link href={applicationLink}>
              <Button size="sm" className="bg-gray-900 hover:bg-gray-800 text-white">
                View application status
              </Button>
            </Link>
          )}
          <Link href="/my-applications">
            <Button variant="outline" size="sm">
              My applications
            </Button>
          </Link>
          {noApplication && (
            <Link href="/career">
              <Button size="sm" className="bg-gray-900 hover:bg-gray-800 text-white">
                Open positions
              </Button>
            </Link>
          )}
        </div>
      </div>
    );
  }

  const completedCount = data.tasks.filter((t) => t.status === 'completed').length;
  const totalTasks = data.tasks.length;

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <CandidateNavbar />
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4">
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/my-dashboard' },
              { label: 'Applications', href: '/my-applications' },
              { label: 'Onboarding' },
            ]}
          />
        </div>
        <div className="max-w-2xl mb-6">
          <Link
            href="/my-applications"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Applications
          </Link>
          {data.job && (
            <span className="text-[13px] text-slate-500 truncate max-w-[200px] ml-2" title={data.job.title}>
              · {data.job.title}
            </span>
          )}
        </div>

      <main className="max-w-2xl">
        {/* Stripe-like card: assistant */}
        <div className="rounded-xl border border-gray-200/80 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 bg-gray-50/80 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-900 text-white">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-base font-semibold text-gray-900">Onboarding assistant</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  Ask anything—visa, IT, paperwork, handbook, or what to do next.
                </p>
              </div>
            </div>
          </div>

          <div className="min-h-[320px] max-h-[420px] overflow-y-auto p-5 space-y-4">
            {chatMessages.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-gray-500">
                  Say hi or pick a question below to get started.
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => sendMessage(prompt)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 text-sm transition-colors"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {chatMessages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[90%] rounded-2xl px-4 py-2.5 text-sm ${
                    m.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-md'
                      : 'bg-gray-100 text-gray-900 rounded-bl-md'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md bg-gray-100 px-4 py-2.5 text-sm text-gray-500">
                  Thinking…
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="border-t border-gray-100 p-4 bg-white">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Ask anything…"
                className="flex-1 rounded-lg border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm placeholder:text-gray-400 focus:border-gray-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-gray-900"
              />
              <Button
                size="sm"
                onClick={() => sendMessage()}
                disabled={chatLoading || !chatInput.trim()}
                className="rounded-lg bg-gray-900 hover:bg-gray-800 text-white"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Checklist — Stripe-like card with progress */}
        {data.tasks.length > 0 && (
          <div className="mt-8 rounded-xl border border-gray-200/80 bg-white shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => setChecklistOpen((o) => !o)}
              className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left border-b border-gray-100 hover:bg-gray-50/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
                  <Check className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <span className="text-base font-semibold text-gray-900">Your checklist</span>
                  <span className="ml-2 text-sm text-gray-500">
                    {completedCount} of {totalTasks} completed
                  </span>
                </div>
              </div>
              <div className="h-2 w-24 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${(completedCount / totalTasks) * 100}%` }}
                />
              </div>
              {checklistOpen ? (
                <ChevronUp className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              )}
            </button>
            {checklistOpen && (
              <ul className="divide-y divide-gray-100">
                {data.tasks.map((t, i) => {
                  const isUploadStep = !!t.submissionDescription;
                  const statusLabel =
                    t.status === 'completed'
                      ? 'Approved'
                      : t.status === 'submitted'
                        ? 'Pending review'
                        : t.status === 'in_progress'
                          ? 'In progress'
                          : null;
                  return (
                    <li
                      key={t.id}
                      className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/50 transition-colors"
                    >
                      {t.status === 'completed' ? (
                        <Check className="h-5 w-5 shrink-0 text-emerald-500" />
                      ) : isUploadStep ? (
                        <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-600" title={statusLabel ?? 'Pending'}>
                          {t.status === 'submitted' ? (
                            <Clock className="h-3.5 w-3.5" />
                          ) : (
                            <Circle className="h-4 w-4 text-amber-500" />
                          )}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => markTaskComplete(t.id)}
                          disabled={updatingTaskId === t.id}
                          className="shrink-0 rounded-full border-2 border-gray-300 hover:border-emerald-500 hover:bg-emerald-50 p-0.5 transition-colors disabled:opacity-50"
                          aria-label={`Mark "${t.taskTitle}" done`}
                        >
                          <Circle className="h-4 w-4 text-gray-400" />
                        </button>
                      )}
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm ${
                            t.status === 'completed' ? 'text-gray-500 line-through' : 'font-medium text-gray-900'
                          }`}
                        >
                          {i + 1}. {t.taskTitle}
                        </p>
                        {t.taskDescription && (
                          <p className="mt-0.5 text-xs text-gray-500">{t.taskDescription}</p>
                        )}
                        {t.submissionDescription && (
                          <p className="mt-1 text-xs text-amber-700">
                            Submit: {t.submissionDescription}
                            {(t.attachments?.length ?? 0) > 0 ? (
                              <span className="ml-2 inline-flex items-center gap-1 text-emerald-600">
                                <FileCheck className="h-3.5 w-3.5" /> Submitted
                              </span>
                            ) : (
                              <label className="ml-2 inline-flex items-center gap-1 cursor-pointer text-gray-600 hover:text-gray-900">
                                <Upload className="h-3.5 w-3.5" />
                                {uploadingTaskId === t.id ? 'Uploading…' : 'Upload'}
                                <input
                                  type="file"
                                  className="hidden"
                                  accept=".pdf,.docx,image/*,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                  disabled={uploadingTaskId === t.id}
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) uploadTaskDocument(t.id, f);
                                    e.target.value = '';
                                  }}
                                />
                              </label>
                            )}
                          </p>
                        )}
                        {isUploadStep && statusLabel && (
                          <p className="mt-0.5 text-xs text-gray-500">
                            Status: {statusLabel}
                          </p>
                        )}
                        {t.notes && (
                          <p className="mt-0.5 text-xs text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                            Feedback: {t.notes}
                          </p>
                        )}
                      </div>
                      {!isUploadStep && t.status !== 'completed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 shrink-0 font-medium"
                          onClick={() => markTaskComplete(t.id)}
                          disabled={updatingTaskId === t.id}
                        >
                          {updatingTaskId === t.id ? '…' : 'Mark done'}
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </main>
      </div>
    </div>
  );
}
