'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileText, Check, Circle, X, ChevronRight, ExternalLink } from 'lucide-react';
import { CandidateNavbar } from '@/app/components/CandidateNavbar';
import { Breadcrumbs } from '@/app/components/Breadcrumbs';
import { applicationStageBadge } from '@/lib/utils/application-stage-badge';
import { formatDistanceToNow } from 'date-fns';

type JobForCandidate = {
  id: string;
  title: string;
  department: string;
  location: string;
  status: string;
};

type ApplicationItem = {
  id: string;
  jobId: string;
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
};

type StageState = 'done' | 'current' | 'pending' | 'failed';

function getStageStates(status: string): { 1: StageState; 2: StageState; 3: StageState } {
  const s = status;
  return {
    1: s === 'submitted' ? 'current' : s === 'stage1_failed' ? 'failed' : s === 'stage1_passed' || s.startsWith('stage2') || s.startsWith('stage3') ? 'done' : 'pending',
    2: s === 'stage1_passed' ? 'current' : s === 'stage2_failed' ? 'failed' : s === 'stage2_passed' || s.startsWith('stage3') ? 'done' : s === 'submitted' || s === 'stage1_failed' ? 'pending' : 'pending',
    3: s === 'stage2_passed' ? 'current' : s === 'stage3_failed' ? 'failed' : s === 'stage3_passed' ? 'done' : 'pending',
  };
}

function StageStepper({ status }: { status: string }) {
  const states = getStageStates(status);
  let currentLabel = '';
  if (states[1] === 'current') currentLabel = 'Resume';
  else if (states[2] === 'current') currentLabel = 'Questions';
  else if (states[3] === 'current') currentLabel = 'Interview';
  else if (status === 'stage3_passed') currentLabel = 'Complete';
  else if (status.endsWith('_failed')) currentLabel = 'Ended';
  return (
    <div className="flex items-center gap-0 text-xs">
      {([1, 2, 3] as const).map((stage, i) => (
        <span key={stage} className="flex items-center">
          {states[stage] === 'done' && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black text-white">
              <Check className="h-3 w-3" />
            </span>
          )}
          {states[stage] === 'current' && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-black bg-white font-medium">
              {stage}
            </span>
          )}
          {states[stage] === 'pending' && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-400">
              {stage}
            </span>
          )}
          {states[stage] === 'failed' && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-red-300 bg-red-50 text-red-600">
              <X className="h-3 w-3" />
            </span>
          )}
          {i < 2 && (
            <span
              className={`mx-0.5 h-px w-4 ${
                states[stage] === 'done' ? 'bg-black' : 'bg-gray-200'
              }`}
            />
          )}
        </span>
      ))}
      {currentLabel && <span className="ml-2 text-gray-500">{currentLabel}</span>}
    </div>
  );
}

export default function MyApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [otherJobs, setOtherJobs] = useState<JobForCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ email: string; role: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [sessionRes, appsRes] = await Promise.all([
          fetch('/api/auth/session'),
          fetch('/api/applications'),
        ]);
        const sessionData = await sessionRes.json();
        const appsData = await appsRes.json();

        if (!sessionData.success || !sessionData.user) {
          router.replace('/login?redirect=/my-applications');
          return;
        }
        if (sessionData.user.role === 'hr' || sessionData.user.role === 'admin') {
          router.replace('/dashboard');
          return;
        }
        setUser(sessionData.user);
        if (appsData.success) setApplications(appsData.applications);
        const jobsRes = await fetch('/api/jobs/for-candidate?limit=5');
        const jobsData = await jobsRes.json();
        if (jobsData.success && Array.isArray(jobsData.jobs)) setOtherJobs(jobsData.jobs);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-sm text-gray-500">Loading applications…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <CandidateNavbar />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4">
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/my-dashboard' },
              { label: 'Applications' },
            ]}
          />
        </div>
        {applications.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50/50 py-16 text-center">
            <FileText className="mx-auto h-10 w-10 text-gray-300" />
            <h2 className="mt-4 text-base font-medium text-gray-900">No applications yet</h2>
            <p className="mt-1 text-sm text-gray-500">
              Apply to a job from the career page and it will show here.
            </p>
            <Link href="/career" className="mt-6 inline-block">
              <Button size="sm" className="bg-gray-900 text-white hover:bg-gray-800">
                Browse open positions
              </Button>
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {applications.map((app) => {
              const showStage2 = app.status === 'stage1_passed';
              const showStage3 = app.status === 'stage2_passed';
              return (
                <li key={app.id}>
                  <div className="flex items-start justify-between gap-4 py-5 text-left transition-colors hover:bg-gray-50/50">
                    <Link
                      href={`/my-applications/${app.id}`}
                      className="min-w-0 flex-1"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-medium text-gray-900">{app.job.title}</h2>
                        {(() => {
                          const b = applicationStageBadge(app.status);
                          return (
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${b.className}`}>
                              {b.label}
                            </span>
                          );
                        })()}
                      </div>
                      <p className="mt-0.5 text-sm text-gray-500">
                        {app.job.department}
                        {app.job.location && ` · ${app.job.location}`}
                      </p>
                      <div className="mt-3">
                        <StageStepper status={app.status} />
                      </div>
                      <p className="mt-2 text-xs text-gray-400">
                        Applied {formatDistanceToNow(new Date(app.createdAt), { addSuffix: true })}
                      </p>
                    </Link>
                    <div className="flex shrink-0 items-center gap-2">
                      {app.status === 'hired' && (
                        <Link
                          href="/my-onboarding"
                          className="rounded-md bg-green-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Onboarding
                        </Link>
                      )}
                      {showStage2 && (
                        <span className="rounded-md bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-white">
                          Do Stage 2
                        </span>
                      )}
                      {showStage3 && (
                        <span className="rounded-md bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-white">
                          Do interview
                        </span>
                      )}
                      <Link
                        href={`/my-applications/${app.id}`}
                        className="text-gray-400 hover:text-gray-600"
                        aria-label="View application"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {otherJobs.length > 0 && (
          <div className="mt-10 rounded-lg border border-gray-200 bg-gray-50/50 p-5">
            <h2 className="text-sm font-medium text-gray-900">Explore other roles</h2>
            <p className="mt-1 text-sm text-gray-500">
              Open positions you haven’t applied to yet.
            </p>
            <ul className="mt-4 space-y-3">
              {otherJobs.map((job) => (
                <li key={job.id}>
                  <Link
                    href={`/career/${job.id}`}
                    className="flex items-center justify-between gap-4 rounded-md border border-gray-200 bg-white py-3 px-4 text-left text-sm transition-colors hover:bg-gray-50"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{job.title}</p>
                      <p className="text-gray-500">
                        {job.department}
                        {job.location && ` · ${job.location}`}
                      </p>
                    </div>
                    <ExternalLink className="h-4 w-4 shrink-0 text-gray-400" />
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/career" className="mt-3 inline-block text-sm font-medium text-gray-700 hover:text-gray-900">
              Browse all open positions
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
