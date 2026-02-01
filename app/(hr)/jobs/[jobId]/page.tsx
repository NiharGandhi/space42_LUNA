'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Edit, Trash2, Plus, GripVertical, Sparkles, Loader2, Users, ChevronRight, ChevronDown, Check, X } from 'lucide-react';
import { Breadcrumbs } from '@/app/components/Breadcrumbs';
import { applicationStageBadge } from '@/lib/utils/application-stage-badge';

type Stage2Question = {
  id: string;
  questionText: string;
  questionOrder: number;
  isRequired: boolean;
};

type Job = {
  id: string;
  title: string;
  department: string;
  location: string;
  employmentType: string;
  status: string;
  description: string;
  requirements: string[];
  responsibilities: string[];
  salaryRangeMin: number | null;
  salaryRangeMax: number | null;
  createdAt: string;
};

function statusBadge(status: string) {
  if (status === 'active') return 'bg-emerald-50 text-emerald-700';
  if (status === 'paused') return 'bg-amber-50 text-amber-700';
  if (status === 'closed') return 'bg-slate-100 text-slate-600';
  return 'bg-slate-100 text-slate-600';
}

function employmentLabel(type: string) {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

type ApplicationPreview = {
  id: string;
  status: string;
  candidate?: { name: string | null; email: string };
};

export default function HRJobDetailPage({ params }: { params: Promise<{ jobId: string }> }) {
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [jobId, setJobId] = useState<string>('');
  const [applications, setApplications] = useState<ApplicationPreview[]>([]);
  const [stage2Questions, setStage2Questions] = useState<Stage2Question[]>([]);
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionRequired, setNewQuestionRequired] = useState(true);
  const [suggesting, setSuggesting] = useState(false);
  const [hrContext, setHrContext] = useState('');
  const [suggestedQuestions, setSuggestedQuestions] = useState<{ questionText: string; isRequired: boolean }[]>([]);
  const [savingSuggested, setSavingSuggested] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editingQuestionText, setEditingQuestionText] = useState('');
  const [editingQuestionRequired, setEditingQuestionRequired] = useState(true);
  const [savingQuestion, setSavingQuestion] = useState(false);

  useEffect(() => {
    params.then((p) => {
      setJobId(p.jobId);
      fetchJob(p.jobId);
    });
  }, [params]);

  const fetchJob = async (id: string) => {
    try {
      const response = await fetch(`/api/jobs/${id}`);
      const data = await response.json();
      if (data.success) setJob(data.job);
    } catch (error) {
      console.error('Failed to fetch job:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStage2Questions = async (id: string) => {
    try {
      const res = await fetch(`/api/jobs/${id}/questions`);
      const data = await res.json();
      if (data.success) setStage2Questions(data.questions);
    } catch (e) {
      console.error('Failed to fetch Stage 2 questions:', e);
    }
  };

  useEffect(() => {
    if (jobId) {
      fetchStage2Questions(jobId);
      fetch(`/api/applications?jobId=${jobId}`)
        .then((r) => r.json())
        .then((d) => d.success && setApplications(d.applications))
        .catch(console.error);
    }
  }, [jobId]);

  const handleAddQuestion = async () => {
    if (!newQuestionText.trim() || !jobId) return;
    try {
      const res = await fetch(`/api/jobs/${jobId}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionText: newQuestionText.trim(),
          questionOrder: stage2Questions.length,
          isRequired: newQuestionRequired,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStage2Questions((prev) => [...prev, data.question]);
        setNewQuestionText('');
        setNewQuestionRequired(true);
        setAddingQuestion(false);
      } else {
        alert(data.error ?? 'Failed to add question');
      }
    } catch (e) {
      alert('Failed to add question');
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Delete this question?')) return;
    try {
      const res = await fetch(`/api/jobs/${jobId}/questions/${questionId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setStage2Questions((prev) => prev.filter((q) => q.id !== questionId));
        if (editingQuestionId === questionId) setEditingQuestionId(null);
      } else {
        alert(data.error ?? 'Failed to delete');
      }
    } catch (e) {
      alert('Failed to delete question');
    }
  };

  const handleStartEditQuestion = (q: Stage2Question) => {
    setEditingQuestionId(q.id);
    setEditingQuestionText(q.questionText);
    setEditingQuestionRequired(q.isRequired);
  };

  const handleCancelEditQuestion = () => {
    setEditingQuestionId(null);
    setEditingQuestionText('');
    setEditingQuestionRequired(true);
  };

  const handleUpdateQuestion = async () => {
    if (!editingQuestionId || !editingQuestionText.trim() || !jobId) return;
    setSavingQuestion(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/questions/${editingQuestionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionText: editingQuestionText.trim(),
          isRequired: editingQuestionRequired,
        }),
      });
      const data = await res.json();
      if (data.success && data.question) {
        setStage2Questions((prev) =>
          prev.map((q) => (q.id === editingQuestionId ? data.question : q))
        );
        setEditingQuestionId(null);
        setEditingQuestionText('');
        setEditingQuestionRequired(true);
      } else {
        alert(data.error ?? 'Failed to update question');
      }
    } catch (e) {
      alert('Failed to update question');
    } finally {
      setSavingQuestion(false);
    }
  };

  const handleSuggestQuestions = async (useHrContext: boolean) => {
    if (!jobId) return;
    setSuggesting(true);
    setSuggestedQuestions([]);
    try {
      const res = await fetch(`/api/jobs/${jobId}/questions/suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(useHrContext && hrContext.trim() ? { hrContext: hrContext.trim() } : {}),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.suggestedQuestions)) {
        setSuggestedQuestions(data.suggestedQuestions);
      } else {
        alert(data.error ?? 'Failed to suggest questions');
      }
    } catch (e) {
      alert('Failed to suggest questions');
    } finally {
      setSuggesting(false);
    }
  };

  const updateSuggestedQuestion = (index: number, field: 'questionText' | 'isRequired', value: string | boolean) => {
    setSuggestedQuestions((prev) => {
      const next = [...prev];
      if (!next[index]) return next;
      if (field === 'questionText') next[index] = { ...next[index], questionText: value as string };
      else next[index] = { ...next[index], isRequired: value as boolean };
      return next;
    });
  };

  const removeSuggestedQuestion = (index: number) => {
    setSuggestedQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveSuggestedQuestions = async () => {
    if (!jobId || suggestedQuestions.length === 0) return;
    const valid = suggestedQuestions.filter((q) => q.questionText.trim());
    if (valid.length === 0) {
      alert('Add at least one question with text.');
      return;
    }
    setSavingSuggested(true);
    try {
      let order = stage2Questions.length;
      for (const q of valid) {
        const res = await fetch(`/api/jobs/${jobId}/questions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            questionText: q.questionText.trim(),
            questionOrder: order++,
            isRequired: q.isRequired,
          }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error ?? 'Failed to save');
      }
      setSuggestedQuestions([]);
      await fetchStage2Questions(jobId);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to save questions');
    } finally {
      setSavingSuggested(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await response.json();
      if (data.success) setJob(data.job);
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to close this job posting?')) return;
    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'DELETE',
      });
      if (response.ok) router.push('/jobs');
    } catch (error) {
      console.error('Failed to delete job:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <p className="text-[14px] text-slate-500">Loading…</p>
      </div>
    );
  }

  if (!job) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <p className="text-[14px] text-slate-600 mb-4">Job not found</p>
          <Link
            href="/jobs"
            className="inline-flex items-center gap-2 px-3 py-2 text-[13px] font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Jobs
          </Link>
        </div>
      </main>
    );
  }

  const applicantsUrl = `/applications?jobId=${jobId}&jobTitle=${encodeURIComponent(job.title)}`;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4">
        <Breadcrumbs
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Jobs', href: '/jobs' },
            { label: job.title },
          ]}
        />
      </div>

      {/* Page header */}
      <div className="flex flex-col gap-4 mb-6">
        <div>
          <h1 className="text-[22px] font-semibold text-slate-900">{job.title}</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">
            {job.department} · {job.location} · {employmentLabel(job.employmentType)}
          </p>
        </div>

        {/* Consolidated action bar */}
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
          <Link
            href={applicantsUrl}
            className="inline-flex items-center gap-2 px-3 py-2 text-[13px] font-medium rounded-lg bg-slate-900 text-white hover:bg-slate-800"
          >
            <Users className="h-4 w-4" />
            View applicants ({applications.length})
          </Link>
          <Link
            href={`/jobs/${jobId}/edit`}
            className="inline-flex items-center gap-2 px-3 py-2 text-[13px] font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <Edit className="h-4 w-4" />
            Edit
          </Link>
          {job.status !== 'closed' && (
            <>
              <span className="w-px h-6 bg-slate-200" />
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setStatusMenuOpen((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  <span className={`inline-block w-2 h-2 rounded-full ${job.status === 'active' ? 'bg-emerald-500' : job.status === 'paused' ? 'bg-amber-500' : 'bg-slate-400'}`} />
                  {job.status === 'active' ? 'Open' : job.status === 'paused' ? 'Paused' : 'Draft'}
                  <ChevronDown className="h-4 w-4" />
                </button>
                {statusMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setStatusMenuOpen(false)} />
                    <div className="absolute left-0 top-full mt-1 z-20 min-w-[140px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                      {job.status !== 'active' && (
                        <button
                          type="button"
                          onClick={() => { handleStatusChange('active'); setStatusMenuOpen(false); }}
                          className="w-full px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50"
                        >
                          Make active
                        </button>
                      )}
                      {job.status !== 'paused' && (
                        <button
                          type="button"
                          onClick={() => { handleStatusChange('paused'); setStatusMenuOpen(false); }}
                          className="w-full px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50"
                        >
                          Pause
                        </button>
                      )}
                      {job.status !== 'draft' && (
                        <button
                          type="button"
                          onClick={() => { handleStatusChange('draft'); setStatusMenuOpen(false); }}
                          className="w-full px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50"
                        >
                          Move to draft
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </>
          )}
          {job.status !== 'closed' && (
            <>
              <span className="w-px h-6 bg-slate-200 ml-auto" />
              <button
                type="button"
                onClick={handleDelete}
                className="inline-flex items-center gap-2 px-3 py-2 text-[13px] font-medium rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                Close job
              </button>
            </>
          )}
        </div>

        {/* Applicants bridge */}
        <Link
          href={applicantsUrl}
          className="block rounded-xl border border-slate-200 bg-white p-4 hover:bg-slate-50/50 transition-colors"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                <Users className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <h3 className="text-[14px] font-medium text-slate-900">
                  {applications.length} applicant{applications.length !== 1 ? 's' : ''}
                </h3>
                <p className="text-[12px] text-slate-500">
                  {applications.length > 0 ? 'Review and manage candidates for this role' : 'Candidates will appear here when they apply'}
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </div>
          {applications.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
              {applications.slice(0, 3).map((app) => {
                const b = applicationStageBadge(app.status);
                return (
                  <div
                    key={app.id}
                    className="flex items-center justify-between text-[13px]"
                  >
                    <span className="text-slate-700 truncate">
                      {app.candidate?.name || app.candidate?.email || '—'}
                    </span>
                    <span className={`shrink-0 px-2 py-0.5 rounded text-[11px] font-medium ${b.className}`}>
                      {b.label}
                    </span>
                  </div>
                );
              })}
              {applications.length > 3 && (
                <p className="text-[12px] text-slate-500 pt-1">
                  +{applications.length - 3} more
                </p>
              )}
            </div>
          )}
        </Link>
      </div>

      {/* Job details: single flowing card */}
      <div className="space-y-6">
        <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="p-6 space-y-6">
            <div>
              <h2 className="text-[13px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Description</h2>
              <p className="text-[14px] text-slate-700 whitespace-pre-line leading-relaxed">{job.description}</p>
            </div>
            <div>
              <h2 className="text-[13px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Responsibilities</h2>
              <ul className="space-y-1.5">
                {job.responsibilities.map((resp, i) => (
                  <li key={i} className="flex items-start gap-2 text-[14px] text-slate-700">
                    <span className="text-slate-400">·</span>
                    <span>{resp}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-[13px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Requirements</h2>
              <ul className="space-y-1.5">
                {job.requirements.map((req, i) => (
                  <li key={i} className="flex items-start gap-2 text-[14px] text-slate-700">
                    <span className="text-slate-400">·</span>
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>
            {(job.salaryRangeMin || job.salaryRangeMax) && (
              <div>
                <h2 className="text-[13px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Salary range</h2>
                <p className="text-[14px] text-slate-700">
                  ${job.salaryRangeMin?.toLocaleString() ?? '—'} – ${job.salaryRangeMax?.toLocaleString() ?? '—'} USD
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Stage 2 questions */}
          <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-[14px] font-semibold text-slate-900">Stage 2 screening questions</h2>
                <p className="text-[12px] text-slate-500 mt-0.5">
                  Candidates who pass Stage 1 answer these. Add at least one to enable Stage 2.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={suggesting}
                  onClick={() => handleSuggestQuestions(false)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {suggesting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  Suggest
                </button>
                <button
                  type="button"
                  disabled={suggesting}
                  onClick={() => handleSuggestQuestions(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Suggest (guided)
                </button>
              </div>
            </div>
            <div className="p-4 space-y-6">
              {/* AI context input (when using guided) */}
              <textarea
                placeholder="What to probe? (e.g. communication, technical depth). Leave blank for AI to decide."
                value={hrContext}
                onChange={(e) => setHrContext(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-[13px] rounded-lg border border-slate-200 bg-slate-50/50 resize-none outline-none focus:ring-2 focus:ring-slate-900/5"
              />

              {/* Suggested (editable) */}
              {suggestedQuestions.length > 0 && (
                <div className="rounded-lg border border-slate-200 bg-slate-50/30 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-[13px] font-medium text-slate-900">Suggested questions</h4>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSaveSuggestedQuestions}
                        disabled={savingSuggested}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
                      >
                        {savingSuggested && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        Save all
                      </button>
                      <button
                        type="button"
                        onClick={() => setSuggestedQuestions([])}
                        className="px-2.5 py-1.5 text-[12px] font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                      >
                        Discard
                      </button>
                    </div>
                  </div>
                  {suggestedQuestions.map((q, i) => (
                    <div key={i} className="space-y-2">
                      <textarea
                        value={q.questionText}
                        onChange={(e) => updateSuggestedQuestion(i, 'questionText', e.target.value)}
                        rows={2}
                        placeholder="Question text"
                        className="w-full px-3 py-2 text-[13px] rounded-lg border border-slate-200 bg-white resize-none outline-none focus:ring-2 focus:ring-slate-900/5"
                      />
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-[13px] text-slate-600">
                          <input
                            type="checkbox"
                            checked={q.isRequired}
                            onChange={(e) => updateSuggestedQuestion(i, 'isRequired', e.target.checked)}
                            className="rounded border-slate-300"
                          />
                          Required
                        </label>
                        <button
                          type="button"
                          onClick={() => removeSuggestedQuestion(i)}
                          className="text-[12px] font-medium text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Current questions list */}
              <div className="space-y-2">
                {stage2Questions.map((q, i) => (
                  <div
                    key={q.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-white"
                  >
                    <span className="text-slate-400 mt-0.5 shrink-0">
                      <GripVertical className="h-4 w-4" />
                    </span>
                    {editingQuestionId === q.id ? (
                      <div className="flex-1 min-w-0 space-y-3">
                        <textarea
                          value={editingQuestionText}
                          onChange={(e) => setEditingQuestionText(e.target.value)}
                          placeholder="Question text"
                          rows={2}
                          className="w-full px-3 py-2 text-[13px] rounded-lg border border-slate-200 resize-none outline-none focus:ring-2 focus:ring-slate-900/5"
                          autoFocus
                        />
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 text-[13px] text-slate-600">
                            <input
                              type="checkbox"
                              checked={editingQuestionRequired}
                              onChange={(e) => setEditingQuestionRequired(e.target.checked)}
                              className="rounded border-slate-300"
                            />
                            Required
                          </label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={handleUpdateQuestion}
                              disabled={!editingQuestionText.trim() || savingQuestion}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
                            >
                              {savingQuestion ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEditQuestion}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                            >
                              <X className="h-3.5 w-3.5" />
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-medium text-slate-900">
                            {i + 1}. {q.questionText}
                            {q.isRequired && (
                              <span className="text-slate-400 font-normal ml-1">(required)</span>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEditQuestion(q)}
                            className="p-1.5 text-slate-400 hover:text-slate-900 rounded"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {addingQuestion ? (
                  <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 space-y-3">
                    <textarea
                      placeholder="Question text"
                      value={newQuestionText}
                      onChange={(e) => setNewQuestionText(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 text-[13px] rounded-lg border border-slate-200 bg-white resize-none outline-none focus:ring-2 focus:ring-slate-900/5"
                    />
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-[13px] text-slate-600">
                        <input
                          type="checkbox"
                          checked={newQuestionRequired}
                          onChange={(e) => setNewQuestionRequired(e.target.checked)}
                          className="rounded border-slate-300"
                        />
                        Required
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleAddQuestion}
                          disabled={!newQuestionText.trim()}
                          className="px-3 py-2 text-[13px] font-medium rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => setAddingQuestion(false)}
                          className="px-3 py-2 text-[13px] font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddingQuestion(true)}
                    className="inline-flex items-center gap-2 px-3 py-2 text-[13px] font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                  >
                    <Plus className="h-4 w-4" />
                    Add question
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>
    </main>
  );
}
