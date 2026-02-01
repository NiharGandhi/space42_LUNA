'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Check, X, ExternalLink, Calendar, Clock } from 'lucide-react';
import { NotificationBell } from '@/components/NotificationBell';
import { applicationStageBadge } from '@/lib/utils/application-stage-badge';
import { formatDistanceToNow } from 'date-fns';

type Outcome = {
  status: string;
  stage: number | null;
  passed: boolean;
  failed: boolean;
  message: string;
  strengths: string[];
  areasToImprove: string[];
  jobTitle: string;
  jobDepartment: string;
};

type JobForCandidate = {
  id: string;
  title: string;
  department: string;
  location: string;
  status: string;
};

type ApplicationDetail = {
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

type HiringStep = {
  id: string;
  stepOrder: number;
  label: string;
  status: string;
  scheduledAt: string | null;
  completedAt: string | null;
  notes: string | null;
};

type StageState = 'done' | 'current' | 'pending' | 'failed';

function getStageStates(status: string): { 1: StageState; 2: StageState; 3: StageState } {
  const s = (status ?? '').toString().trim().toLowerCase();
  return {
    1: s === 'submitted' ? 'current' : s === 'stage1_failed' ? 'failed' : s === 'stage1_passed' || s.startsWith('stage2') || s.startsWith('stage3') || s === 'hired' || s === 'rejected' ? 'done' : 'pending',
    2: s === 'stage1_passed' ? 'current' : s === 'stage2_failed' ? 'failed' : s === 'stage2_passed' || s.startsWith('stage3') || s === 'hired' || s === 'rejected' ? 'done' : 'pending',
    3: s === 'stage2_passed' ? 'current' : s === 'stage3_failed' ? 'failed' : s === 'stage3_passed' || s === 'hired' || s === 'rejected' ? 'done' : 'pending',
  };
}

export default function ApplicationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const applicationId = params?.applicationId as string;
  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [otherJobs, setOtherJobs] = useState<JobForCandidate[]>([]);
  const [hiringSteps, setHiringSteps] = useState<HiringStep[]>([]);
  const [onboardingFlowStatus, setOnboardingFlowStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!applicationId) return;
    (async () => {
      try {
        const [sessionRes, appsRes] = await Promise.all([
          fetch('/api/auth/session'),
          fetch('/api/applications'),
        ]);
        const sessionData = await sessionRes.json();
        const appsData = await appsRes.json();

        if (!sessionData.success || !sessionData.user) {
          router.replace('/login?redirect=/my-applications/' + applicationId);
          setLoading(false);
          return;
        }
        if (sessionData.user.role !== 'candidate') {
          router.replace('/dashboard');
          setLoading(false);
          return;
        }
        if (appsData.success && Array.isArray(appsData.applications)) {
          const found = appsData.applications.find((a: { id: string }) => a.id === applicationId);
          setApplication(found ?? null);
          if (found && (found.status.endsWith('_failed') || found.status === 'stage3_passed' || found.status === 'hired' || found.status === 'rejected')) {
            const outcomeRes = await fetch(`/api/applications/${applicationId}/outcome`);
            const outcomeData = await outcomeRes.json();
            if (outcomeData.success && outcomeData.outcome) setOutcome(outcomeData.outcome);
          }
          if (found && (found.status === 'stage3_passed' || found.status === 'hired')) {
            const stepsRes = await fetch(`/api/applications/${applicationId}/hiring-steps`);
            const stepsData = await stepsRes.json();
            if (stepsData.success && Array.isArray(stepsData.steps)) setHiringSteps(stepsData.steps);
          } else {
            setHiringSteps([]);
          }
          if (found?.status === 'hired') {
            const onbRes = await fetch('/api/onboarding');
            const onbData = await onbRes.json();
            if (onbData.success && onbData.flow?.status) setOnboardingFlowStatus(onbData.flow.status);
          } else {
            setOnboardingFlowStatus(null);
          }
          const jobsRes = await fetch('/api/jobs/for-candidate?limit=5');
          const jobsData = await jobsRes.json();
          if (jobsData.success && Array.isArray(jobsData.jobs)) setOtherJobs(jobsData.jobs);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [applicationId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-sm text-gray-500">Application not found.</p>
        <Link href="/my-applications">
          <Button variant="outline" size="sm">Back to applications</Button>
        </Link>
      </div>
    );
  }

  const states = getStageStates(application.status);
  const stageLabels = [
    { num: 1, label: 'Resume screening', desc: 'Your resume is reviewed against the role.' },
    { num: 2, label: 'Questions', desc: 'Answer a few role-related questions.' },
    { num: 3, label: 'Voice interview', desc: 'Short voice interview for the role.' },
  ];
  const showStage2 = application.status === 'stage1_passed';
  const showStage3 = application.status === 'stage2_passed';

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-4 py-4">
          <Link
            href="/my-applications"
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Applications
          </Link>
          <NotificationBell />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-gray-900">{application.job.title}</h1>
            {(() => {
              const b = applicationStageBadge(application.status);
              return (
                <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${b.className}`}>
                  {b.label}
                </span>
              );
            })()}
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {application.job.department}
            {application.job.location && ` · ${application.job.location}`}
          </p>
          <p className="mt-2 text-xs text-gray-400">
            Applied {formatDistanceToNow(new Date(application.createdAt), { addSuffix: true })}
          </p>
        </div>

        {/* Unified progress: 3 screening stages → hiring steps → Hired/Rejected → Onboarding */}
        <div className="mb-8">
          <h2 className="text-sm font-medium text-gray-900">Progress</h2>
          <ul className="mt-4 space-y-0 rounded-lg border border-gray-200 overflow-hidden bg-white">
            {/* 1. Three screening stages with check marks */}
            {stageLabels.map(({ num, label, desc }) => (
              <li key={`stage-${num}`} className="flex gap-4 px-4 py-3 border-b border-gray-100 last:border-b-0">
                <div className="flex shrink-0 items-center justify-center w-9">
                  {states[num as 1 | 2 | 3] === 'done' && (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white" aria-label="Completed">
                      <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </span>
                  )}
                  {states[num as 1 | 2 | 3] === 'current' && (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-gray-900 bg-white text-sm font-semibold text-gray-900">
                      {num}
                    </span>
                  )}
                  {states[num as 1 | 2 | 3] === 'pending' && (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-gray-50 text-gray-400 text-sm font-medium">
                      {num}
                    </span>
                  )}
                  {states[num as 1 | 2 | 3] === 'failed' && (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-600">
                      <X className="h-5 w-5 shrink-0" />
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{label}</p>
                  <p className="mt-0.5 text-sm text-gray-500">{desc}</p>
                  {num === 2 && showStage2 && (
                    <Link href={`/my-applications/${application.id}/stage2`} className="mt-2 inline-block">
                      <Button size="sm" className="bg-gray-900 text-white hover:bg-gray-800">
                        Complete Stage 2
                      </Button>
                    </Link>
                  )}
                  {num === 3 && showStage3 && (
                    <Link href={`/my-applications/${application.id}/stage3`} className="mt-2 inline-block">
                      <Button size="sm" className="bg-gray-900 text-white hover:bg-gray-800">
                        Start voice interview
                      </Button>
                    </Link>
                  )}
                  {num === 3 && application.status === 'stage3_passed' && hiringSteps.length === 0 && (
                    <p className="mt-1 text-sm text-gray-500">You’ve completed all screening stages.</p>
                  )}
                </div>
              </li>
            ))}

            {/* 2. Each hiring step with checkbox (completed = check) */}
            {hiringSteps.map((step) => (
              <li key={step.id} className="flex gap-4 px-4 py-3 border-b border-gray-100 last:border-b-0 bg-gray-50/30">
                <div className="flex shrink-0 items-center">
                  {step.status === 'completed' ? (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white" aria-hidden>
                      <Check className="h-4 w-4" strokeWidth={2.5} />
                    </span>
                  ) : (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 bg-white">
                      <span className="h-3.5 w-3.5 rounded-sm border-2 border-gray-300" />
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-wrap items-center gap-2">
                  <span className="font-medium text-gray-900">{step.stepOrder}. {step.label}</span>
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                    step.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                    step.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                    step.status === 'failed' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {step.status}
                  </span>
                  {step.scheduledAt && (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(step.scheduledAt).toLocaleString()}
                    </span>
                  )}
                  {step.notes && (
                    <p className="w-full mt-0.5 text-gray-600 text-xs">{step.notes}</p>
                  )}
                </div>
              </li>
            ))}

            {/* 3. Hired or Rejected — final check */}
            {(application.status === 'hired' || application.status === 'rejected') && (
              <li className="flex gap-4 px-4 py-3 border-b border-gray-100 last:border-b-0 bg-gray-50/30">
                <div className="flex shrink-0 items-center">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-900 text-white" aria-hidden>
                    <Check className="h-4 w-4" strokeWidth={2.5} />
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 flex items-center gap-2">
                    {(() => {
                      const b = applicationStageBadge(application.status);
                      return (
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${b.className}`}>
                          {b.label}
                        </span>
                      );
                    })()}
                  </p>
                  <p className="mt-0.5 text-sm text-gray-500">
                    {application.status === 'hired'
                      ? 'You’ve been offered the role.'
                      : 'This application has been closed.'}
                  </p>
                </div>
              </li>
            )}

            {/* 4. Onboarding — checkbox (only when hired) */}
            {application.status === 'hired' && (
              <li className="flex gap-4 px-4 py-3 border-b border-gray-100 last:border-b-0 bg-gray-50/30">
                <div className="flex shrink-0 items-center">
                  {onboardingFlowStatus === 'completed' ? (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white" aria-hidden>
                      <Check className="h-4 w-4" strokeWidth={2.5} />
                    </span>
                  ) : (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 bg-white">
                      <span className="h-3.5 w-3.5 rounded-sm border-2 border-gray-300" />
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">Onboarding</p>
                  <p className="mt-0.5 text-sm text-gray-500">
                    {onboardingFlowStatus === 'completed'
                      ? 'You’ve completed onboarding.'
                      : 'Complete your pre-join tasks and documents.'}
                  </p>
                  {onboardingFlowStatus !== 'completed' && (
                    <Link href="/my-onboarding" className="mt-2 inline-block">
                      <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700">
                        Go to onboarding
                      </Button>
                    </Link>
                  )}
                </div>
              </li>
            )}
          </ul>
        </div>

        {/* Outcome / feedback when application ended (failed or passed) */}
        {outcome && (outcome.failed || outcome.passed) && (
          <div className="mb-8 rounded-lg border border-gray-200 bg-gray-50/50 p-5">
            <h2 className="text-sm font-medium text-gray-900">
              {outcome.failed ? 'Application outcome' : 'Status'}
            </h2>
            <p className="mt-2 text-sm text-gray-700">{outcome.message}</p>
            {outcome.failed && outcome.strengths.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-gray-500">Strengths noted</p>
                <ul className="mt-1 list-inside list-disc text-sm text-gray-600">
                  {outcome.strengths.slice(0, 5).map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
            {outcome.failed && outcome.areasToImprove.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium text-gray-500">Areas to consider</p>
                <ul className="mt-1 list-inside list-disc text-sm text-gray-600">
                  {outcome.areasToImprove.slice(0, 5).map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Other open positions */}
        {otherJobs.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-medium text-gray-900">Other open positions</h2>
            <p className="mt-1 text-sm text-gray-500">
              Roles you haven’t applied to yet. Apply from the career page.
            </p>
            <ul className="mt-4 space-y-3">
              {otherJobs.map((job) => (
                <li key={job.id}>
                  <Link
                    href={`/career/${job.id}`}
                    className="flex items-center justify-between gap-4 rounded-md border border-gray-200 py-3 px-4 text-left text-sm transition-colors hover:bg-gray-50"
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

        <div className="border-t border-gray-200 pt-6">
          <Link
            href={`/career/${application.jobId}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            View job posting
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      </main>
    </div>
  );
}
