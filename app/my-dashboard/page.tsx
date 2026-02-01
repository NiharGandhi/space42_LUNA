'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FileText,
  Calendar,
  ClipboardCheck,
  Bot,
  ChevronRight,
  Briefcase,
  ExternalLink,
} from 'lucide-react';
import { CandidateNavbar } from '@/app/components/CandidateNavbar';
import { Breadcrumbs } from '@/app/components/Breadcrumbs';
import { applicationStageBadge } from '@/lib/utils/application-stage-badge';
import { formatDistanceToNow } from 'date-fns';

type ApplicationItem = {
  id: string;
  jobId: string;
  status: string;
  createdAt: string;
  job: { id: string; title: string; department: string; location: string };
};

export default function CandidateDashboardPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [user, setUser] = useState<{ email: string; name: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [upcomingInterviews, setUpcomingInterviews] = useState<number | null>(null);
  const [onboardingTasksPending, setOnboardingTasksPending] = useState<number | null>(null);
  const [onboardingTasksTotal, setOnboardingTasksTotal] = useState<number>(0);
  const [onboardingJobTitle, setOnboardingJobTitle] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [sessionRes, appsRes, statsRes] = await Promise.all([
          fetch('/api/auth/session'),
          fetch('/api/applications'),
          fetch('/api/candidate/dashboard-stats'),
        ]);
        const sessionData = await sessionRes.json();
        const appsData = await appsRes.json();
        const statsData = await statsRes.json();

        if (!sessionData.success || !sessionData.user) {
          router.replace('/login?redirect=/my-dashboard');
          return;
        }
        if (sessionData.user.role !== 'candidate') {
          router.replace('/dashboard');
          return;
        }
        setUser(sessionData.user);
        if (appsData.success) setApplications(appsData.applications ?? []);
        if (statsData.success) {
          setUpcomingInterviews(statsData.upcomingInterviews ?? 0);
          setOnboardingTasksPending(statsData.onboardingTasksPending ?? 0);
          setOnboardingTasksTotal(statsData.onboardingTasksTotal ?? 0);
          setOnboardingJobTitle(statsData.onboardingJobTitle ?? null);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const activeCount = applications.filter(
    (a) => !['rejected', 'hired'].includes(a.status) && !a.status.endsWith('_failed')
  ).length;
  const hiredCount = applications.filter((a) => a.status === 'hired').length;
  const hasOnboarding = hiredCount > 0;
  const onboardingCompleted = hasOnboarding && onboardingTasksTotal > 0
    ? onboardingTasksTotal - (onboardingTasksPending ?? 0)
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <p className="text-[14px] text-slate-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <CandidateNavbar />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4">
          <Breadcrumbs items={[{ label: 'Dashboard' }]} />
        </div>
        {/* Cards */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-medium text-slate-500">Active applications</span>
              <FileText className="h-4 w-4 text-slate-300" />
            </div>
            <span className="block text-[22px] font-semibold text-slate-900">{activeCount}</span>
            <p className="text-[12px] text-slate-500 mt-1">In progress</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-medium text-slate-500">Upcoming interviews</span>
              <Calendar className="h-4 w-4 text-slate-300" />
            </div>
            <span className="block text-[22px] font-semibold text-slate-900">
              {loading ? '—' : upcomingInterviews ?? 0}
            </span>
            <p className="text-[12px] text-slate-500 mt-1">Scheduled (next 14 days)</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-medium text-slate-500">Onboarding tasks</span>
              <ClipboardCheck className="h-4 w-4 text-slate-300" />
            </div>
            <span className="block text-[22px] font-semibold text-slate-900">
              {loading ? '—' : hasOnboarding && onboardingTasksTotal > 0 ? `${onboardingTasksPending ?? 0} / ${onboardingTasksTotal}` : 0}
            </span>
            <p className="text-[12px] text-slate-500 mt-1">
              {hasOnboarding ? 'After offer accepted' : 'After offer accepted'}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-medium text-slate-500">AI Assistant</span>
              <Bot className="h-4 w-4 text-slate-300" />
            </div>
            <span className="block text-[22px] font-semibold text-slate-900">24/7</span>
            <p className="text-[12px] text-slate-500 mt-1">Resume, applications, prep</p>
          </div>
        </section>

        {/* Onboarding status widget — shown when hired and has onboarding */}
        {hasOnboarding && (
          <Link
            href="/my-onboarding"
            className="block mb-6 rounded-xl border border-slate-200 bg-white overflow-hidden hover:bg-slate-50/50 transition-colors"
          >
            <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                  <ClipboardCheck className="h-6 w-6 text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-[15px] font-semibold text-slate-900">
                    Onboarding
                    {onboardingJobTitle && (
                      <span className="font-normal text-slate-600"> · {onboardingJobTitle}</span>
                    )}
                  </h3>
                  <p className="text-[13px] text-slate-500 mt-0.5">
                    {onboardingTasksTotal > 0
                      ? `${onboardingCompleted} of ${onboardingTasksTotal} tasks completed`
                      : 'Complete your onboarding checklist'}
                  </p>
                </div>
              </div>
              {onboardingTasksTotal > 0 && (
                <div className="flex items-center gap-3 shrink-0">
                  <div className="w-24 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{
                        width: `${Math.min(100, (onboardingCompleted / onboardingTasksTotal) * 100)}%`,
                      }}
                    />
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>
              )}
              {onboardingTasksTotal === 0 && (
                <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
              )}
            </div>
          </Link>
        )}

        {/* Applications */}
        <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h2 className="text-[14px] font-semibold text-slate-900">Your applications</h2>
            <Link
              href="/my-applications"
              className="text-[13px] font-medium text-slate-900 hover:text-slate-700"
            >
              View all
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {applications.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <FileText className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-3 text-[14px] font-medium text-slate-900">No applications yet</p>
                <p className="mt-1 text-[13px] text-slate-500">
                  Apply from the career page and they’ll appear here.
                </p>
                <Link
                  href="/career"
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-[13px] font-medium rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                >
                  Browse open positions
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              applications.slice(0, 6).map((app) => (
                <div
                  key={app.id}
                  className="flex items-center justify-between gap-4 px-4 py-4 hover:bg-slate-50/50 transition-colors"
                >
                  <Link
                    href={`/my-applications/${app.id}`}
                    className="min-w-0 flex-1 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium text-slate-900">{app.job.title}</p>
                      <p className="text-[12px] text-slate-500 mt-0.5">
                        {app.job.department}
                        {app.job.location && ` · ${app.job.location}`}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Applied {formatDistanceToNow(new Date(app.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                  </Link>
                  <div className="flex items-center gap-2 shrink-0">
                    {(() => {
                      const b = applicationStageBadge(app.status);
                      return (
                        <span className={`inline-flex px-2 py-1 rounded-full text-[11px] font-medium ${b.className}`}>
                          {b.label}
                        </span>
                      );
                    })()}
                    {app.status === 'hired' && (
                      <Link
                        href="/my-onboarding"
                        className="text-[12px] font-medium text-emerald-600 hover:underline"
                      >
                        Onboarding
                      </Link>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Quick links */}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/career"
            className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Briefcase className="h-4 w-4" />
            Browse jobs
          </Link>
          <Link
            href="/my-applications"
            className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <FileText className="h-4 w-4" />
            All applications
          </Link>
          {hiredCount > 0 && (
            <Link
              href="/my-onboarding"
              className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-medium rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
            >
              <ClipboardCheck className="h-4 w-4" />
              Onboarding
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}
