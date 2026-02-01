'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { applicationStageBadge } from '@/lib/utils/application-stage-badge';
import {
  FileText,
  ChevronRight,
  Zap,
  X,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Breadcrumbs } from '@/app/components/Breadcrumbs';

type ApplicationItem = {
  id: string;
  jobId: string;
  candidateId: string;
  status: string;
  currentStage: number | null;
  overallScore: string | null;
  createdAt: string;
  job: {
    id: string;
    title: string;
    department: string;
    location: string;
    status: string;
  };
  candidate: {
    id: string;
    email: string;
    name: string | null;
  };
};

function HRApplicationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobId = searchParams.get('jobId') || undefined;
  const jobTitle = searchParams.get('jobTitle') || undefined;
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState<{
    total: number;
    completed: number;
    failed: number;
    skipped: number;
  } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const url = jobId ? `/api/applications?jobId=${jobId}` : '/api/applications';
        const [sessionRes, appsRes] = await Promise.all([
          fetch('/api/auth/session'),
          fetch(url),
        ]);
        const sessionData = await sessionRes.json();
        const appsData = await appsRes.json();

        if (!sessionData.success || !sessionData.user) {
          router.replace('/login?redirect=/applications');
          return;
        }
        if (sessionData.user.role !== 'hr' && sessionData.user.role !== 'admin') {
          router.replace('/my-applications');
          return;
        }
        if (appsData.success) setApplications(appsData.applications);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [router, jobId]);

  const fetchApplications = async () => {
    try {
      const url = jobId ? `/api/applications?jobId=${jobId}` : '/api/applications';
      const appsRes = await fetch(url);
      const appsData = await appsRes.json();
      if (appsData.success) setApplications(appsData.applications);
    } catch (e) {
      console.error(e);
    }
  };

  const runBackfillStage1 = async () => {
    if (backfilling) return;
    setBackfilling(true);
    setBackfillResult(null);
    try {
      const res = await fetch('/api/applications/backfill-stage1', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setBackfillResult({
          total: data.total,
          completed: data.completed,
          failed: data.failed,
          skipped: data.skipped,
        });
        await fetchApplications();
      } else {
        alert(data.error || 'Backfill failed');
      }
    } catch (e) {
      alert('Backfill failed');
    } finally {
      setBackfilling(false);
    }
  };

  const total = applications.length;
  const passed = applications.filter(
    (a) => a.status.includes('_passed') || a.status === 'hired'
  ).length;
  const failed = applications.filter(
    (a) =>
      a.status.includes('_failed') ||
      a.status === 'rejected' ||
      a.status === 'withdrawn'
  ).length;
  const pending = applications.filter(
    (a) =>
      a.status === 'submitted' || a.status.includes('_pending')
  ).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <p className="text-[14px] text-slate-500">Loading…</p>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            ...(jobId
              ? [
                  { label: 'Applications', href: '/applications' },
                  { label: jobTitle || 'This job' },
                ]
              : [{ label: 'Applications' }]),
          ]}
        />
      </div>

      {/* Job filter indicator */}
      {jobId && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2">
          <span className="text-[13px] text-slate-600">
            Filtering by job: <strong>{jobTitle || 'This job'}</strong>
          </span>
          <Link
            href="/applications"
            className="ml-auto inline-flex items-center gap-1 text-[12px] font-medium text-slate-500 hover:text-slate-900"
          >
            <X className="h-3.5 w-3.5" />
            Clear filter
          </Link>
        </div>
      )}

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-[22px] font-semibold text-slate-900">
              {jobId ? `Applications for this job` : 'Applications'}
            </h1>
            <p className="text-[13px] text-slate-500 mt-0.5">
              {jobId ? `Review candidates for this position` : 'Review and manage all candidate applications'}
            </p>
          </div>
          <button
            type="button"
            onClick={runBackfillStage1}
            disabled={backfilling}
            className="inline-flex items-center gap-2 px-3 py-2 text-[13px] font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Zap className="h-4 w-4" />
            {backfilling ? 'Running…' : 'Backfill Stage 1'}
          </button>
        </div>

        {/* Backfill result */}
        {backfillResult != null && (
          <div className="mb-6 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-[13px] text-slate-700">
              Backfill complete: ran Stage 1 for <strong>{backfillResult.total}</strong> application(s)
              {backfillResult.completed > 0 && (
                <span className="text-slate-500"> — {backfillResult.completed} completed</span>
              )}
              {backfillResult.failed > 0 && (
                <span className="text-slate-500"> — {backfillResult.failed} failed</span>
              )}
              {backfillResult.skipped > 0 && (
                <span className="text-slate-500"> — {backfillResult.skipped} already had Stage 1</span>
              )}
            </p>
          </div>
        )}

        {/* Stats */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <span className="block text-[12px] font-medium text-slate-500 uppercase tracking-wide">
              Total
            </span>
            <span className="block text-[22px] font-semibold text-slate-900 mt-1">{total}</span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <span className="block text-[12px] font-medium text-slate-500 uppercase tracking-wide">
              Pending
            </span>
            <span className="block text-[22px] font-semibold text-slate-900 mt-1">{pending}</span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <span className="block text-[12px] font-medium text-slate-500 uppercase tracking-wide">
              Passed
            </span>
            <span className="block text-[22px] font-semibold text-slate-900 mt-1">{passed}</span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <span className="block text-[12px] font-medium text-slate-500 uppercase tracking-wide">
              Failed / Rejected
            </span>
            <span className="block text-[22px] font-semibold text-slate-900 mt-1">{failed}</span>
          </div>
        </section>

        {/* Application list */}
        <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h2 className="text-[14px] font-semibold text-slate-900">
              {jobId ? 'Candidates' : 'All applications'}
            </h2>
          </div>

          {applications.length === 0 ? (
            <div className="px-4 py-16 text-center">
              <FileText className="mx-auto h-12 w-12 text-slate-300" />
              <h3 className="mt-4 text-[15px] font-medium text-slate-900">No applications yet</h3>
              <p className="mt-1 text-[13px] text-slate-500">
                Applications will appear here when candidates apply.
              </p>
              <Link
                href="/career"
                className="mt-6 inline-block text-[13px] font-medium text-slate-900 hover:text-slate-700"
              >
                View career page →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {applications.map((app) => {
                const b = applicationStageBadge(app.status);
                return (
                  <Link
                    key={app.id}
                    href={`/applications/${app.id}`}
                    className="flex items-center justify-between gap-4 px-4 py-4 hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[14px] font-medium text-slate-900 truncate">
                          {app.job.title}
                        </p>
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0 ${b.className}`}
                        >
                          {b.label}
                        </span>
                        {app.overallScore != null && (
                          <span className="text-[12px] text-slate-500">Score: {app.overallScore}</span>
                        )}
                      </div>
                      <p className="text-[13px] text-slate-500 mt-0.5 truncate">
                        {app.job.department} · {app.job.location}
                      </p>
                      <p className="text-[12px] text-slate-500 mt-0.5 truncate">
                        {app.candidate?.name || app.candidate?.email || '—'}
                        {app.candidate?.email && app.candidate?.name && (
                          <span className="text-slate-400"> · {app.candidate.email}</span>
                        )}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Applied {formatDistanceToNow(new Date(app.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                  </Link>
                );
              })}
            </div>
          )}
        </section>
    </main>
  );
}

export default function HRApplicationsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <p className="text-[14px] text-slate-500">Loading…</p>
      </div>
    }>
      <HRApplicationsContent />
    </Suspense>
  );
}
