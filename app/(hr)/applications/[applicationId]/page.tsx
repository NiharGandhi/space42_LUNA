'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { applicationStageBadge } from '@/lib/utils/application-stage-badge';
import { Breadcrumbs } from '@/app/components/Breadcrumbs';
import {
  ArrowLeft,
  Briefcase,
  MapPin,
  Calendar,
  User,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Plus,
  Trash2,
  Circle,
  ListTodo,
  RotateCcw,
  FileDown,
} from 'lucide-react';
import { NotificationBell } from '@/components/NotificationBell';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { formatDistanceToNow } from 'date-fns';

type EvaluationDimension = {
  name: string;
  score: number;
  maxScore: number;
  weight?: number;
  rationale: string;
};

type EvaluationMatrix = {
  dimensions: EvaluationDimension[];
  weights?: { skills: number; experience: number; education: number };
  overallScore: number;
  fitRating: string;
};

type Stage1Analysis = {
  skillsMatch: { found?: string[]; required?: string[]; missing?: string[] } | null;
  experienceMatch: unknown;
  educationMatch: unknown;
  strengths: string[] | null;
  concerns: string[] | null;
  fitRating: string | null;
  score: string | null;
  evaluationMatrix?: EvaluationMatrix | null;
};

type Stage2Answer = {
  questionId: string;
  questionText: string;
  questionOrder: number;
  answerText: string;
  aiScore: string | null;
  aiFeedback: string | null;
};

type Stage3Interview = {
  id: string;
  transcript: string | null;
  recordingUrl: string | null;
  callDuration: number | null;
  communicationScore: string | null;
  problemSolvingScore: string | null;
  roleUnderstandingScore: string | null;
  overallScore: string | null;
  strengths: string[] | null;
  weaknesses: string[] | null;
  evaluationMatrix?: {
    dimensions: Array<{ name: string; score: number; maxScore: number; weight?: number; rationale: string }>;
    overallScore: number;
  } | null;
  completedAt: string | null;
};

type ScreeningStage = {
  id: string;
  stageNumber: number;
  status: string;
  score: string | null;
  passingThreshold: string | null;
  startedAt: string | null;
  completedAt: string | null;
  aiEvaluation: unknown;
  stage1Analysis?: Stage1Analysis | null;
  stage2Answers?: Stage2Answer[];
  stage3Interview?: Stage3Interview | null;
};

type ApplicationDetail = {
  id: string;
  jobId: string;
  candidateId: string;
  status: string;
  currentStage: number | null;
  overallScore: string | null;
  aiSummary: string | null;
  resumeUrl: string | null;
  coverLetter: string | null;
  linkedinUrl: string | null;
  portfolioUrl: string | null;
  candidateProfile: unknown;
  createdAt: string;
  updatedAt: string;
  job: {
    id: string;
    title: string;
    department: string;
    location: string;
    status: string;
    description: string;
  };
  candidate: {
    id: string;
    email: string;
    name: string | null;
  };
  screeningStages: ScreeningStage[];
};

type HiringStep = {
  id: string;
  applicationId: string;
  stepOrder: number;
  label: string;
  status: string;
  scheduledAt: string | null;
  completedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

type OnboardingTask = {
  id: string;
  taskTitle: string;
  taskDescription: string | null;
  status: string;
  completedAt: string | null;
  submissionDescription?: string | null;
  notes?: string | null;
  attachments?: string[];
};

type OnboardingData = {
  flow: { id: string; status: string; startedAt: string | null; completedAt: string | null } | null;
  tasks: OnboardingTask[];
  job: { title: string; department: string } | null;
  candidate: { id: string; email: string; name: string | null } | null;
};

export default function HRApplicationDetailPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const router = useRouter();
  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [applicationId, setApplicationId] = useState<string>('');
  const [runningStage1, setRunningStage1] = useState(false);
  const [runningStage2, setRunningStage2] = useState(false);
  const [syncingStage3, setSyncingStage3] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null); // e.g. 'pass-1', 'fail-2'
  const [hiringSteps, setHiringSteps] = useState<HiringStep[]>([]);
  const [hiringStepsLoading, setHiringStepsLoading] = useState(false);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [addingStep, setAddingStep] = useState(false);
  const [hiringStepType, setHiringStepType] = useState('Live Interview');
  const [hiring, setHiring] = useState(false);
  const [onboarding, setOnboarding] = useState<OnboardingData | null>(null);
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [resettingOnboarding, setResettingOnboarding] = useState(false);
  const [resettingTaskId, setResettingTaskId] = useState<string | null>(null);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [loadingAttachmentsTaskId, setLoadingAttachmentsTaskId] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => {
      setApplicationId(p.applicationId);
      fetchApplication(p.applicationId);
    });
  }, [params]);

  const fetchApplication = async (id: string) => {
    try {
      const [sessionRes, appRes] = await Promise.all([
        fetch('/api/auth/session'),
        fetch(`/api/applications/${id}`),
      ]);
      const sessionData = await sessionRes.json();
      const appData = await appRes.json();

      if (!sessionData.success || !sessionData.user) {
        router.replace('/login?redirect=/applications/' + id);
        return;
      }
      if (sessionData.user.role !== 'hr' && sessionData.user.role !== 'admin') {
        router.replace('/my-applications');
        return;
      }
      if (appData.success) {
        setApplication(appData.application);
        if (appData.application?.status === 'stage3_passed') {
          setHiringStepsLoading(true);
          try {
            const stepsRes = await fetch(`/api/applications/${id}/hiring-steps`);
            const stepsData = await stepsRes.json();
            if (stepsData.success && Array.isArray(stepsData.steps)) setHiringSteps(stepsData.steps);
          } catch {
            // ignore
          } finally {
            setHiringStepsLoading(false);
          }
        } else {
          setHiringSteps([]);
        }
        if (appData.application?.status === 'hired') {
          setOnboardingLoading(true);
          try {
            const onbRes = await fetch(`/api/applications/${id}/onboarding`);
            const onbData = await onbRes.json();
            if (onbData.success && onbData.flow !== undefined) {
              setOnboarding({
                flow: onbData.flow,
                tasks: onbData.tasks ?? [],
                job: onbData.job ?? null,
                candidate: onbData.candidate ?? null,
              });
            }
          } catch {
            // ignore
          } finally {
            setOnboardingLoading(false);
          }
        } else {
          setOnboarding(null);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getStageStatusIcon = (status: string) => {
    if (status === 'completed') return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    if (status === 'failed') return <XCircle className="h-5 w-5 text-red-600" />;
    return <Clock className="h-5 w-5 text-amber-600" />;
  };

  const getStageStatusLabel = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const runStage1 = async () => {
    if (!applicationId || runningStage1) return;
    setRunningStage1(true);
    try {
      const res = await fetch(`/api/applications/${applicationId}/run-stage1`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        await fetchApplication(applicationId);
      } else {
        alert(data.error || 'Failed to run Stage 1');
      }
    } catch (e) {
      alert('Failed to run Stage 1');
    } finally {
      setRunningStage1(false);
    }
  };

  const runStage2 = async () => {
    if (!applicationId || runningStage2) return;
    setRunningStage2(true);
    try {
      const res = await fetch(`/api/applications/${applicationId}/run-stage2`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        await fetchApplication(applicationId);
      } else {
        alert(data.error || 'Failed to re-run Stage 2');
      }
    } catch (e) {
      alert('Failed to re-run Stage 2');
    } finally {
      setRunningStage2(false);
    }
  };

  const syncStage3 = async () => {
    if (!applicationId || syncingStage3) return;
    setSyncingStage3(true);
    try {
      const res = await fetch(`/api/applications/${applicationId}/stage3/sync`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        await fetchApplication(applicationId);
      } else {
        alert(data.error || 'Failed to fetch interview results');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to fetch interview results');
    } finally {
      setSyncingStage3(false);
    }
  };

  const updateStageStatus = async (action: 'pass' | 'fail', stage: 1 | 2 | 3) => {
    if (!applicationId || updatingStatus) return;
    const key = `${action}-${stage}`;
    setUpdatingStatus(key);
    try {
      const res = await fetch(`/api/applications/${applicationId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, stage }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchApplication(applicationId);
      } else {
        alert(data.error || `Failed to ${action} stage ${stage}`);
      }
    } catch (e) {
      console.error(e);
      alert(`Failed to ${action} stage ${stage}`);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const canPassStage = (stageNum: 1 | 2 | 3) => {
    const s = application?.status ?? '';
    if (stageNum === 1) return s === 'submitted' || s === 'stage1_failed';
    if (stageNum === 2) return s === 'stage1_passed' || s === 'stage2_failed';
    if (stageNum === 3) return s === 'stage2_passed' || s === 'stage3_failed';
    return false;
  };
  const canFailStage = (stageNum: 1 | 2 | 3) => {
    const s = application?.status ?? '';
    if (stageNum === 1) return s === 'submitted';
    if (stageNum === 2) return s === 'stage1_passed';
    if (stageNum === 3) return s === 'stage2_passed';
    return false;
  };

  const refetchHiringSteps = async () => {
    if (!applicationId || application?.status !== 'stage3_passed') return;
    setHiringStepsLoading(true);
    try {
      const res = await fetch(`/api/applications/${applicationId}/hiring-steps`);
      const data = await res.json();
      if (data.success && Array.isArray(data.steps)) setHiringSteps(data.steps);
    } finally {
      setHiringStepsLoading(false);
    }
  };

  const HIRING_STEP_TYPES = [
    'Live Interview',
    'Technical Interview',
    'HR Round',
    'Final Interview',
    'Final Round',
    'Other',
  ];

  const addHiringStep = async (labelOverride?: string) => {
    if (!applicationId || addingStep) return;
    const label = labelOverride?.trim() || hiringStepType;
    setAddingStep(true);
    try {
      const res = await fetch(`/api/applications/${applicationId}/hiring-steps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label }),
      });
      const data = await res.json();
      if (data.success && data.step) setHiringSteps((prev) => [...prev, data.step].sort((a, b) => a.stepOrder - b.stepOrder));
      else alert(data.error || 'Failed to add step');
    } catch (e) {
      alert('Failed to add step');
    } finally {
      setAddingStep(false);
    }
  };

  const markAsHired = async () => {
    if (!applicationId || hiring || application?.status !== 'stage3_passed') return;
    if (!confirm('Mark this candidate as hired and start onboarding? This will create their onboarding flow.')) return;
    setHiring(true);
    try {
      const res = await fetch(`/api/applications/${applicationId}/hire`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        await fetchApplication(applicationId);
        alert('Candidate marked as hired. Onboarding flow created.');
      } else {
        alert(data.error || 'Failed to mark as hired');
      }
    } catch (e) {
      alert('Failed to mark as hired');
    } finally {
      setHiring(false);
    }
  };

  const fetchOnboarding = async (id: string) => {
    try {
      const onbRes = await fetch(`/api/applications/${id}/onboarding`);
      const onbData = await onbRes.json();
      if (onbData.success && onbData.flow !== undefined) {
        setOnboarding({
          flow: onbData.flow,
          tasks: onbData.tasks ?? [],
          job: onbData.job ?? null,
          candidate: onbData.candidate ?? null,
        });
      }
    } catch {
      // ignore
    }
  };

  const handleResetOnboarding = async () => {
    if (!applicationId || resettingOnboarding) return;
    if (!confirm('Replace this candidate’s onboarding with the current default template? All existing steps will be removed and recreated.')) return;
    setResettingOnboarding(true);
    try {
      const res = await fetch(`/api/applications/${applicationId}/onboarding/reset`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        await fetchOnboarding(applicationId);
        alert('Onboarding reset with current template.');
      } else {
        alert(data.error || 'Failed to reset onboarding');
      }
    } catch (e) {
      alert('Failed to reset onboarding');
    } finally {
      setResettingOnboarding(false);
    }
  };

  const handleResetTask = async (taskId: string) => {
    if (!applicationId) return;
    if (!confirm('Reset this step to pending? Completed state and any attachments will be cleared.')) return;
    setResettingTaskId(taskId);
    try {
      const res = await fetch(`/api/applications/${applicationId}/onboarding/tasks/${taskId}/reset`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        await fetchOnboarding(applicationId);
      } else {
        alert(data.error || 'Failed to reset step');
      }
    } catch (e) {
      alert('Failed to reset step');
    } finally {
      setResettingTaskId(null);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, status: 'pending' | 'in_progress' | 'completed', notes?: string) => {
    if (!applicationId) return;
    setUpdatingTaskId(taskId);
    try {
      const res = await fetch(`/api/applications/${applicationId}/onboarding/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, ...(notes !== undefined ? { notes } : {}) }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchOnboarding(applicationId);
      } else {
        alert(data.error || 'Failed to update step');
      }
    } catch (e) {
      alert('Failed to update step');
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const handleRequestChanges = (taskId: string) => {
    const notes = window.prompt('Add a note for the candidate (e.g. "Please re-upload with signature"):');
    if (notes === null) return;
    handleUpdateTaskStatus(taskId, 'pending', notes.trim() || undefined);
  };

  const handleViewDocuments = async (taskId: string) => {
    if (!applicationId) return;
    setLoadingAttachmentsTaskId(taskId);
    try {
      const res = await fetch(`/api/applications/${applicationId}/onboarding/tasks/${taskId}/attachments`);
      const data = await res.json();
      if (data.success && Array.isArray(data.attachments)) {
        data.attachments.forEach((a: { name: string; url: string }) => {
          window.open(a.url, '_blank', 'noopener,noreferrer');
        });
      } else {
        alert(data.error || 'Could not load documents');
      }
    } catch (e) {
      alert('Failed to load documents');
    } finally {
      setLoadingAttachmentsTaskId(null);
    }
  };

  const updateHiringStep = async (stepId: string, updates: Partial<HiringStep>) => {
    if (!applicationId) return;
    try {
      const res = await fetch(`/api/applications/${applicationId}/hiring-steps/${stepId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.success && data.step) {
        setHiringSteps((prev) => prev.map((s) => (s.id === stepId ? data.step : s)));
        setEditingStepId(null);
      } else alert(data.error || 'Failed to update');
    } catch (e) {
      alert('Failed to update step');
    }
  };

  const deleteHiringStep = async (stepId: string) => {
    if (!applicationId || !confirm('Remove this hiring step?')) return;
    try {
      const res = await fetch(`/api/applications/${applicationId}/hiring-steps/${stepId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) setHiringSteps((prev) => prev.filter((s) => s.id !== stepId));
      else alert(data.error || 'Failed to delete');
    } catch (e) {
      alert('Failed to delete step');
    }
  };

  const hiringStepStatusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'completed', label: 'Completed' },
    { value: 'failed', label: 'Failed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading application...</p>
      </div>
    );
  }

  if (!application) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4">
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Applications', href: '/applications' },
              { label: 'Not found' },
            ]}
          />
        </div>
        <p className="text-slate-600 mb-4">Application not found.</p>
        <Link href="/applications" className="inline-flex items-center gap-2 px-3 py-2 text-[13px] font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50">
          <ArrowLeft className="h-4 w-4" />
          Back to Applications
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <div className="max-w-4xl">
        <div className="mb-4">
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Applications', href: '/applications' },
              { label: application.candidate?.name || application.candidate?.email || 'Application' },
            ]}
          />
        </div>

        {/* Action bar */}
        <div className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200/80 bg-white shadow-sm px-3 sm:px-4 py-2.5">
          <Link
            href="/applications"
            className="inline-flex items-center gap-2 px-3 py-2 text-[13px] font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <Link
            href={`/jobs/${application.jobId}`}
            className="inline-flex items-center gap-2 px-3 py-2 text-[13px] font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            View job
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          <div className="ml-auto">
            <NotificationBell />
          </div>
        </div>

        {/* Header: Candidate + Job + Status */}
        <Card className="p-5 sm:p-6 mb-6 border border-slate-200/80 rounded-xl shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                {application.job.title}
              </h1>
              <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-2">
                <span className="flex items-center gap-1">
                  <Briefcase className="h-4 w-4" />
                  {application.job.department}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {application.job.location}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <User className="h-4 w-4" />
                {application.candidate.name || application.candidate.email}
                {application.candidate.name && (
                  <span className="text-gray-500">· {application.candidate.email}</span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(() => {
                const b = applicationStageBadge(application.status);
                return (
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${b.className}`}>
                    {b.label}
                  </span>
                );
              })()}
              {application.overallScore != null && (
                <span className="text-sm font-medium text-gray-700">
                  Score: {application.overallScore}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Applied {formatDistanceToNow(new Date(application.createdAt), { addSuffix: true })}
            </span>
          </div>
        </Card>

        {/* Tabbed content */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full flex flex-wrap gap-1 mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="screening">Screening</TabsTrigger>
            <TabsTrigger value="hiring">Hiring & Onboarding</TabsTrigger>
            <TabsTrigger value="analysis">Full Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-0">
            {/* AI Summary */}
            {application.aiSummary && (
              <Card className="p-5 sm:p-6 mb-6 border border-slate-200/80 rounded-xl shadow-sm">
                <h2 className="text-base font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-500" />
                  AI Summary
                </h2>
                <p className="text-slate-700 whitespace-pre-wrap text-sm leading-relaxed">{application.aiSummary}</p>
              </Card>
            )}

            {/* Links */}
            {(application.resumeUrl || application.linkedinUrl || application.portfolioUrl) && (
              <Card className="p-5 sm:p-6 mb-6 border border-slate-200/80 rounded-xl shadow-sm">
                <h2 className="text-base font-semibold text-slate-900 mb-3">Links</h2>
            <div className="flex flex-wrap gap-3">
              {application.resumeUrl && (
                <a
                  href={application.resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-600 hover:underline"
                >
                  Resume
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
              {application.linkedinUrl && (
                <a
                  href={application.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-600 hover:underline"
                >
                  LinkedIn
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
              {application.portfolioUrl && (
                <a
                  href={application.portfolioUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-600 hover:underline text-sm"
                >
                  Portfolio
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
              </Card>
            )}
            {!application.aiSummary && !(application.resumeUrl || application.linkedinUrl || application.portfolioUrl) && (
              <p className="text-slate-500 text-sm">No overview content yet.</p>
            )}
          </TabsContent>

          <TabsContent value="screening" className="mt-0">
        <Card className="overflow-hidden border border-slate-200/80 rounded-xl shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-[14px] font-semibold text-slate-900">Screening stages</h2>
            <p className="text-[12px] text-slate-500 mt-0.5">Resume, questions, and interview evaluation</p>
          </div>
          <div className="divide-y divide-slate-100">
          {[1, 2, 3].map((stageNum) => {
            const stage = application.screeningStages.find((s) => s.stageNumber === stageNum);
            const stageTitle =
              stageNum === 1 ? 'Stage 1: Resume' : stageNum === 2 ? 'Stage 2: Questions' : 'Stage 3: Interview';
            const showRun1 = stageNum === 1 && (!stage || stage.status !== 'pending');
            const showRun2 = stageNum === 2 && stage && (stage.stage2Answers?.length ?? 0) > 0;
            const showSync3 = stageNum === 3 && stage?.stage3Interview && !stage.stage3Interview.transcript && (stage.stage3Interview.overallScore == null || stage.stage3Interview.completedAt == null);
            const showPassFail = canPassStage(stageNum as 1 | 2 | 3) || canFailStage(stageNum as 1 | 2 | 3);
            const hasAnyAction = (stageNum === 1 && !stage) || showRun1 || showRun2 || showSync3 || showPassFail;
            return (
              <div key={stageNum} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="shrink-0 mt-0.5">
                      {stage ? getStageStatusIcon(stage.status) : <Clock className="h-5 w-5 text-slate-400" />}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[14px] font-medium text-slate-900">{stageTitle}</h3>
                        {stage ? (
                          <>
                            <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium ${
                              stage.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                              stage.status === 'failed' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                            }`}>
                              {getStageStatusLabel(stage.status)}
                            </span>
                            {stage.score != null && (
                              <span className="text-[12px] text-slate-500">
                                Score: {stage.score}{stage.passingThreshold != null ? ` / ${stage.passingThreshold}` : ''}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-[12px] text-slate-500">Not started</span>
                        )}
                      </div>
                      {stage?.completedAt && (
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Completed {formatDistanceToNow(new Date(stage.completedAt), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                  </div>
                  {/* Consolidated actions */}
                  {hasAnyAction && (
                    <div className="flex flex-wrap items-center gap-2">
                      {stageNum === 1 && (!stage || showRun1) && (
                        <button
                          type="button"
                          disabled={runningStage1}
                          onClick={runStage1}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                          {runningStage1 ? 'Running…' : stage ? 'Re-run' : 'Run'}
                        </button>
                      )}
                      {showRun2 && (
                        <button
                          type="button"
                          disabled={runningStage2}
                          onClick={runStage2}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                          {runningStage2 ? 'Running…' : 'Re-run'}
                        </button>
                      )}
                      {showSync3 && (
                        <button
                          type="button"
                          disabled={syncingStage3}
                          onClick={syncStage3}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                          {syncingStage3 ? 'Syncing…' : 'Fetch results'}
                        </button>
                      )}
                      {showPassFail && (
                        <>
                          {canPassStage(stageNum as 1 | 2 | 3) && (
                            <button
                              type="button"
                              disabled={!!updatingStatus}
                              onClick={() => updateStageStatus('pass', stageNum as 1 | 2 | 3)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              {updatingStatus === `pass-${stageNum}` ? 'Updating…' : 'Pass'}
                            </button>
                          )}
                          {canFailStage(stageNum as 1 | 2 | 3) && (
                            <button
                              type="button"
                              disabled={!!updatingStatus}
                              onClick={() => updateStageStatus('fail', stageNum as 1 | 2 | 3)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium rounded-lg border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
                            >
                              {updatingStatus === `fail-${stageNum}` ? 'Updating…' : 'Fail'}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
                {/* Stage content: evaluation, Q&A, interview */}
                {stageNum === 2 &&
                      stage?.aiEvaluation &&
                      typeof stage.aiEvaluation === "object" &&
                      stage.aiEvaluation !== null &&
                      Array.isArray(
                        (stage.aiEvaluation as { dimensions?: unknown })?.dimensions
                      )
                      ? (
                        <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
                          <h4 className="text-sm font-semibold text-gray-800 mb-3">
                            Evaluation matrix
                          </h4>
                          <div className="space-y-3">
                            {((stage.aiEvaluation as any)
                              .dimensions as Array<{
                              name: string;
                              score: number;
                              maxScore?: number;
                              weight?: number;
                              rationale: string;
                            }> | undefined)?.map((dim, i) => (
                              <div key={i} className="text-sm">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <span className="font-medium text-gray-700">
                                    {dim.name}
                                  </span>
                                  <span className="tabular-nums text-gray-600">
                                    {dim.score}/{dim.maxScore ?? 10}
                                    {dim.weight != null && (
                                      <span className="text-gray-400 font-normal ml-1">
                                        (×{(dim.weight * 100).toFixed(0)}%)
                                      </span>
                                    )}
                                  </span>
                                </div>
                                <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-blue-500"
                                    style={{
                                      width: `${Math.min(
                                        100,
                                        (dim.score / (dim.maxScore ?? 10)) * 100
                                      )}%`,
                                    }}
                                  />
                                </div>
                                <p className="mt-1 text-gray-600 text-xs">
                                  {dim.rationale}
                                </p>
                              </div>
                            ))}
                            <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                              <span className="font-medium text-gray-800">
                                Overall
                              </span>
                              <span className="flex items-center gap-2">
                                <span className="tabular-nums font-semibold text-gray-900">
                                  {typeof (stage.aiEvaluation as any).overallScore ===
                                  "number"
                                    ? (stage.aiEvaluation as any).overallScore.toFixed(
                                        2
                                      )
                                    : stage.score}
                                  /10
                                </span>
                                {(stage.aiEvaluation as any).fitRating && (
                                  <Badge
                                    variant={
                                      (stage.aiEvaluation as any).fitRating === "high"
                                        ? "success"
                                        : (stage.aiEvaluation as any).fitRating ===
                                          "medium"
                                        ? "warning"
                                        : "outline"
                                    }
                                  >
                                    {(stage.aiEvaluation as { fitRating: string }).fitRating}
                                  </Badge>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                      : null}
                    {stageNum === 1 && stage?.stage1Analysis?.evaluationMatrix && (
                      <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
                        <h4 className="text-sm font-semibold text-gray-800 mb-3">Evaluation matrix</h4>
                        <div className="space-y-3">
                          {(stage.stage1Analysis.evaluationMatrix.dimensions ?? []).map((dim, i) => (
                            <div key={i} className="text-sm">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="font-medium text-gray-700">{dim.name}</span>
                                <span className="tabular-nums text-gray-600">
                                  {dim.score}/{dim.maxScore}
                                  {dim.weight != null && (
                                    <span className="text-gray-400 font-normal ml-1">
                                      (×{(dim.weight * 100).toFixed(0)}%)
                                    </span>
                                  )}
                                </span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-blue-500"
                                  style={{
                                    width: `${Math.min(100, (dim.score / (dim.maxScore || 10)) * 100)}%`,
                                  }}
                                />
                              </div>
                              <p className="mt-1 text-gray-600 text-xs">{dim.rationale}</p>
                            </div>
                          ))}
                          <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                            <span className="font-medium text-gray-800">Overall</span>
                            <span className="flex items-center gap-2">
                              <span className="tabular-nums font-semibold text-gray-900">
                                {typeof stage.stage1Analysis.evaluationMatrix.overallScore === 'number'
                                  ? stage.stage1Analysis.evaluationMatrix.overallScore.toFixed(2)
                                  : stage.stage1Analysis.score}
                                /10
                              </span>
                              {stage.stage1Analysis.evaluationMatrix.fitRating && (
                                <Badge variant={stage.stage1Analysis.evaluationMatrix.fitRating === 'high' ? 'success' : stage.stage1Analysis.evaluationMatrix.fitRating === 'medium' ? 'warning' : 'outline'}>
                                  {stage.stage1Analysis.evaluationMatrix.fitRating}
                                </Badge>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Stage 2: Q&A and AI scores */}
                    {stageNum === 2 && stage?.stage2Answers && stage.stage2Answers.length > 0 && (
                      <div className="mt-4 space-y-4 rounded-lg border border-gray-200 bg-white p-4">
                        <h4 className="text-sm font-semibold text-gray-800 mb-3">Questions & answers</h4>
                        <div className="space-y-4">
                          {[...stage.stage2Answers]
                            .sort((a, b) => a.questionOrder - b.questionOrder)
                            .map((qa, i) => (
                              <div key={qa.questionId} className="text-sm border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                                <p className="font-medium text-gray-700 mb-1">{i + 1}. {qa.questionText}</p>
                                <p className="text-gray-600 mb-2 whitespace-pre-wrap">{qa.answerText}</p>
                                {qa.aiScore != null && (
                                  <p className="text-xs text-gray-500">
                                    Score: {qa.aiScore}/10
                                    {qa.aiFeedback && (
                                      <span className="block mt-1 text-gray-600">{qa.aiFeedback}</span>
                                    )}
                                  </p>
                                )}
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                    {/* Stage 3: Voice interview transcript and evaluation matrix */}
                    {stageNum === 3 && stage?.stage3Interview && (
                      <div className="mt-4 space-y-4 rounded-lg border border-gray-200 bg-white p-4">
                        <h4 className="text-sm font-semibold text-gray-800 mb-3">Voice interview</h4>
                        {!stage.stage3Interview.transcript && stage.stage3Interview.overallScore == null && (
                          <p className="text-sm text-gray-500 mb-3">
                            Interview completed; results not yet synced. If the candidate already finished the call, click &quot;Fetch interview results&quot; above to load transcript and grading from VAPI.
                          </p>
                        )}
                        {stage.stage3Interview.evaluationMatrix && stage.stage3Interview.evaluationMatrix.dimensions?.length > 0 ? (
                          <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
                            <h4 className="text-sm font-semibold text-gray-800 mb-3">Evaluation matrix</h4>
                            <div className="space-y-3">
                              {stage.stage3Interview.evaluationMatrix.dimensions.map((dim, i) => (
                                <div key={i} className="text-sm">
                                  <div className="flex items-center justify-between gap-2 mb-1">
                                    <span className="font-medium text-gray-700">{dim.name}</span>
                                    <span className="tabular-nums text-gray-600">
                                      {dim.score}/{dim.maxScore}
                                      {dim.weight != null && (
                                        <span className="text-gray-400 font-normal ml-1">
                                          (×{((dim.weight ?? 0) * 100).toFixed(0)}%)
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                  <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-blue-500"
                                      style={{
                                        width: `${Math.min(100, (dim.score / (dim.maxScore || 10)) * 100)}%`,
                                      }}
                                    />
                                  </div>
                                  {dim.rationale && (
                                    <p className="mt-1 text-gray-600 text-xs">{dim.rationale}</p>
                                  )}
                                </div>
                              ))}
                              <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                                <span className="font-medium text-gray-800">Overall</span>
                                <span className="tabular-nums font-semibold text-gray-900">
                                  {typeof stage.stage3Interview.evaluationMatrix.overallScore === 'number'
                                    ? stage.stage3Interview.evaluationMatrix.overallScore.toFixed(2)
                                    : stage.stage3Interview.overallScore}
                                  /10
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (stage.stage3Interview.communicationScore != null || stage.stage3Interview.overallScore != null) ? (
                          <div className="flex flex-wrap gap-4 text-sm mb-3">
                            {stage.stage3Interview.communicationScore != null && (
                              <span className="text-gray-600">
                                Communication: <strong>{stage.stage3Interview.communicationScore}</strong>/10
                              </span>
                            )}
                            {stage.stage3Interview.problemSolvingScore != null && (
                              <span className="text-gray-600">
                                Problem-solving: <strong>{stage.stage3Interview.problemSolvingScore}</strong>/10
                              </span>
                            )}
                            {stage.stage3Interview.roleUnderstandingScore != null && (
                              <span className="text-gray-600">
                                Role understanding: <strong>{stage.stage3Interview.roleUnderstandingScore}</strong>/10
                              </span>
                            )}
                            {stage.stage3Interview.overallScore != null && (
                              <span className="font-medium text-gray-800">
                                Overall: {stage.stage3Interview.overallScore}/10
                              </span>
                            )}
                          </div>
                        ) : null}
                        {stage.stage3Interview.callDuration != null && (
                          <p className="text-xs text-gray-500 mb-2">
                            Duration: {Math.floor(stage.stage3Interview.callDuration / 60)}m {stage.stage3Interview.callDuration % 60}s
                          </p>
                        )}
                        {stage.stage3Interview.recordingUrl && (
                          <a
                            href={stage.stage3Interview.recordingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline"
                          >
                            Listen to recording
                          </a>
                        )}
                        {stage.stage3Interview.transcript && (
                          <div className="mt-3">
                            <span className="font-medium text-gray-700 block mb-1">Transcript</span>
                            <pre className="text-xs text-gray-600 whitespace-pre-wrap bg-gray-50 p-3 rounded border border-gray-100 max-h-64 overflow-y-auto">
                              {stage.stage3Interview.transcript}
                            </pre>
                          </div>
                        )}
                        {(stage.stage3Interview.strengths ?? []).length > 0 && (
                          <div>
                            <span className="font-medium text-gray-700 block mb-1">Strengths</span>
                            <ul className="list-disc list-inside text-sm text-gray-600">
                              {(stage.stage3Interview.strengths ?? []).map((s, i) => (
                                <li key={i}>{s}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {(stage.stage3Interview.weaknesses ?? []).length > 0 && (
                          <div>
                            <span className="font-medium text-gray-700 block mb-1">Weaknesses</span>
                            <ul className="list-disc list-inside text-sm text-gray-600">
                              {(stage.stage3Interview.weaknesses ?? []).map((w, i) => (
                                <li key={i}>{w}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                    {/* Stage 1 analysis details (legacy / fallback) */}
                    {stageNum === 1 && stage?.stage1Analysis && (
                      <div className="mt-4 space-y-4 rounded-lg bg-gray-50 p-4 text-sm">
                        {stage.stage1Analysis.fitRating && !stage.stage1Analysis.evaluationMatrix && (
                          <div>
                            <span className="font-medium text-gray-700">Fit rating: </span>
                            <span className="capitalize">{stage.stage1Analysis.fitRating}</span>
                          </div>
                        )}
                        {stage.stage1Analysis.skillsMatch && (
                          <div>
                            <span className="font-medium text-gray-700 block mb-1">Skills match</span>
                            <div className="flex flex-wrap gap-2">
                              {(stage.stage1Analysis.skillsMatch.found ?? []).length > 0 && (
                                <span className="text-green-700">
                                  Found: {(stage.stage1Analysis.skillsMatch.found ?? []).join(', ')}
                                </span>
                              )}
                              {(stage.stage1Analysis.skillsMatch.missing ?? []).length > 0 && (
                                <span className="text-amber-700">
                                  Missing: {(stage.stage1Analysis.skillsMatch.missing ?? []).join(', ')}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        {(stage.stage1Analysis.strengths ?? []).length > 0 && (
                          <div>
                            <span className="font-medium text-gray-700 block mb-1">Strengths</span>
                            <ul className="list-disc list-inside text-gray-600">
                              {(stage.stage1Analysis.strengths ?? []).map((s, i) => (
                                <li key={i}>{s}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {(stage.stage1Analysis.concerns ?? []).length > 0 && (
                          <div>
                            <span className="font-medium text-gray-700 block mb-1">Concerns</span>
                            <ul className="list-disc list-inside text-gray-600">
                              {(stage.stage1Analysis.concerns ?? []).map((c, i) => (
                                <li key={i}>{c}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
              </div>
            );
          })}
          </div>
        </Card>
          </TabsContent>

          <TabsContent value="hiring" className="mt-0">
        {application.status === 'stage3_passed' && (
          <Card className="mb-6 overflow-hidden">
            <div className="border-b border-slate-100 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-[14px] font-semibold text-slate-900">Hiring process</h2>
                <p className="text-[12px] text-slate-500 mt-0.5">
                  Manage interviews and next steps. Updates are visible to the candidate.
                </p>
              </div>
              <button
                type="button"
                disabled={hiring}
                onClick={markAsHired}
                className="inline-flex items-center gap-2 px-3 py-2 text-[13px] font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {hiring ? 'Processing…' : 'Mark as hired & start onboarding'}
              </button>
            </div>
            {hiringStepsLoading ? (
              <p className="text-sm text-gray-500">Loading steps…</p>
            ) : (
              <>
                <ul className="space-y-3 mb-4">
                  {hiringSteps.map((step) => (
                    <li key={step.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-gray-50/50 p-3">
                      {editingStepId === step.id ? (
                        <div className="flex-1 min-w-0 space-y-2">
                          <input
                            type="text"
                            defaultValue={step.label}
                            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                            id={`label-${step.id}`}
                            placeholder="Label"
                          />
                          <select
                            defaultValue={step.status}
                            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
                            id={`status-${step.id}`}
                          >
                            {hiringStepStatusOptions.map((o) => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                          <div className="flex gap-2">
                            <input
                              type="datetime-local"
                              defaultValue={step.scheduledAt ? new Date(step.scheduledAt).toISOString().slice(0, 16) : ''}
                              className="rounded border border-gray-300 px-2 py-1.5 text-sm"
                              id={`scheduled-${step.id}`}
                            />
                            <input
                              type="datetime-local"
                              defaultValue={step.completedAt ? new Date(step.completedAt).toISOString().slice(0, 16) : ''}
                              className="rounded border border-gray-300 px-2 py-1.5 text-sm"
                              id={`completed-${step.id}`}
                            />
                          </div>
                          <textarea
                            defaultValue={step.notes ?? ''}
                            rows={2}
                            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                            id={`notes-${step.id}`}
                            placeholder="Notes"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => {
                                const label = (document.getElementById(`label-${step.id}`) as HTMLInputElement)?.value?.trim() || step.label;
                                const status = (document.getElementById(`status-${step.id}`) as HTMLSelectElement)?.value || step.status;
                                const scheduled = (document.getElementById(`scheduled-${step.id}`) as HTMLInputElement)?.value;
                                const completed = (document.getElementById(`completed-${step.id}`) as HTMLInputElement)?.value;
                                const notes = (document.getElementById(`notes-${step.id}`) as HTMLTextAreaElement)?.value ?? '';
                                updateHiringStep(step.id, {
                                  label,
                                  status,
                                  scheduledAt: scheduled ? new Date(scheduled).toISOString() : null,
                                  completedAt: completed ? new Date(completed).toISOString() : null,
                                  notes: notes || null,
                                });
                              }}
                            >
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingStepId(null)}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-1 flex-wrap items-center gap-3 w-full">
                          <span className="font-medium text-gray-900">{step.stepOrder}. {step.label}</span>
                          <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium ${
                            step.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                            step.status === 'failed' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {step.status}
                          </span>
                          {step.scheduledAt && (
                            <span className="text-xs text-gray-500">
                              Scheduled: {new Date(step.scheduledAt).toLocaleString()}
                            </span>
                          )}
                          {step.completedAt && (
                            <span className="text-xs text-gray-500">
                              Completed: {new Date(step.completedAt).toLocaleString()}
                            </span>
                          )}
                          <div className="flex gap-1 ml-auto">
                            <button type="button" onClick={() => setEditingStepId(step.id)} className="px-2 py-1 text-[12px] font-medium text-slate-600 hover:text-slate-900">
                              Edit
                            </button>
                            <button type="button" onClick={() => deleteHiringStep(step.id)} className="p-1 text-slate-500 hover:text-red-600">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                  <select
                    value={hiringStepType}
                    onChange={(e) => setHiringStepType(e.target.value)}
                    className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[12px]"
                  >
                    {HIRING_STEP_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => addHiringStep()} disabled={addingStep} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                    <Plus className="h-3.5 w-3.5" />
                    {addingStep ? 'Adding…' : 'Add step'}
                  </button>
                </div>
              </>
            )}
          </Card>
        )}

        {/* Onboarding flow (when candidate is hired) — Stripe-like */}
        {application.status === 'hired' && (
          <Card className="overflow-hidden border border-gray-200/80 shadow-sm">
            <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4">
              <div className="flex items-center gap-2">
                <ListTodo className="h-5 w-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">Onboarding</h2>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Candidate&apos;s checklist and progress. They see this at My onboarding.
              </p>
            </div>
            <div className="p-6">
              {onboardingLoading ? (
                <p className="text-sm text-gray-500">Loading onboarding…</p>
              ) : onboarding?.flow ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        {onboarding.job?.title}
                        {onboarding.job?.department && ` · ${onboarding.job.department}`}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 capitalize">
                        Flow: {onboarding.flow.status.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-32 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{
                            width: `${onboarding.tasks.length ? (onboarding.tasks.filter((t) => t.status === 'completed').length / onboarding.tasks.length) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResetOnboarding}
                        disabled={resettingOnboarding}
                        className="shrink-0"
                      >
                        <RotateCcw className="h-4 w-4 mr-1.5" />
                        {resettingOnboarding ? 'Resetting…' : 'Reset onboarding'}
                      </Button>
                    </div>
                  </div>
                  <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100 overflow-hidden bg-white">
                    {onboarding.tasks.map((t, i) => {
                      const isUploadStep = !!t.submissionDescription;
                      const isSubmitted = t.status === 'submitted';
                      const isCompleted = t.status === 'completed';
                      const isBusy = updatingTaskId === t.id || resettingTaskId === t.id;
                      const hasAttachments = (t.attachments?.length ?? 0) > 0;
                      return (
                        <li
                          key={t.id}
                          className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm"
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                          ) : (
                            <Circle className="h-5 w-5 shrink-0 text-gray-300" />
                          )}
                          <div className="min-w-0 flex-1">
                            <span className={isCompleted ? 'text-gray-500 line-through' : 'font-medium text-gray-900'}>
                              {i + 1}. {t.taskTitle}
                            </span>
                            {isUploadStep && (
                              <span className="ml-1.5 text-xs text-amber-600">(upload)</span>
                            )}
                            {t.notes && (
                              <p className="mt-0.5 text-xs text-gray-500">Note: {t.notes}</p>
                            )}
                          </div>
                          <span className="text-xs text-gray-400 capitalize">{t.status.replace(/_/g, ' ')}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {hasAttachments && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                                onClick={() => handleViewDocuments(t.id)}
                                disabled={loadingAttachmentsTaskId === t.id}
                              >
                                <FileDown className="h-3.5 w-3.5 mr-1" />
                                {loadingAttachmentsTaskId === t.id ? 'Opening…' : `View doc${(t.attachments?.length ?? 0) > 1 ? 's' : ''}`}
                              </Button>
                            )}
                            {isSubmitted && isUploadStep && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                  onClick={() => handleUpdateTaskStatus(t.id, 'completed')}
                                  disabled={isBusy}
                                >
                                  {updatingTaskId === t.id ? '…' : 'Approve'}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2 text-xs text-amber-600 border-amber-200 hover:bg-amber-50"
                                  onClick={() => handleRequestChanges(t.id)}
                                  disabled={isBusy}
                                >
                                  Request changes
                                </Button>
                              </>
                            )}
                            {!isCompleted && (t.status === 'pending' || t.status === 'submitted') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-gray-600"
                                onClick={() => handleUpdateTaskStatus(t.id, 'in_progress')}
                                disabled={isBusy}
                              >
                                {updatingTaskId === t.id ? '…' : 'In progress'}
                              </Button>
                            )}
                            {!isCompleted && !(isSubmitted && isUploadStep) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-emerald-600"
                                onClick={() => handleUpdateTaskStatus(t.id, 'completed')}
                                disabled={isBusy}
                              >
                                {updatingTaskId === t.id ? '…' : 'Mark complete'}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-gray-500 hover:text-gray-700"
                              onClick={() => handleResetTask(t.id)}
                              disabled={isBusy}
                            >
                              {resettingTaskId === t.id ? 'Resetting…' : 'Reset step'}
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </>
              ) : (
                <p className="text-sm text-gray-500">
                  Onboarding flow not found. It may still be creating—refresh in a moment.
                </p>
              )}
            </div>
          </Card>
        )}
        {application.status !== 'stage3_passed' && application.status !== 'hired' && (
          <p className="text-slate-500 text-sm py-6">
            Hiring steps and onboarding appear here once the candidate passes all screening stages.
          </p>
        )}
          </TabsContent>

          <TabsContent value="analysis" className="mt-0">
            <Card className="p-5 sm:p-6 border border-slate-200/80 rounded-xl shadow-sm">
              <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-500" />
                Full candidate analysis
              </h2>
              <div className="space-y-6">
                {application.aiSummary && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 mb-2">AI summary</h3>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{application.aiSummary}</p>
                  </div>
                )}
                {application.screeningStages.map((stage) => {
                  if (stage.stageNumber === 1 && stage.stage1Analysis) {
                    const a = stage.stage1Analysis;
                    return (
                      <div key={stage.id}>
                        <h3 className="text-sm font-semibold text-slate-800 mb-2">Stage 1: Resume</h3>
                        <div className="text-sm text-slate-700 space-y-1">
                          <p>Score: {a.score ?? stage.score}/10 · Fit: {a.fitRating ?? '—'}</p>
                          {(a.evaluationMatrix?.dimensions?.length ?? 0) > 0 && (
                            <ul className="list-disc list-inside mt-2">
                              {((a.evaluationMatrix?.dimensions) ?? []).map((d, i) => (
                                <li key={i}>{d.name}: {d.score}/10 — {d.rationale}</li>
                              ))}
                            </ul>
                          )}
                          {(a.strengths ?? []).length > 0 && <p className="mt-2"><strong>Strengths:</strong> {(a.strengths ?? []).join('; ')}</p>}
                          {(a.concerns ?? []).length > 0 && <p><strong>Concerns:</strong> {(a.concerns ?? []).join('; ')}</p>}
                        </div>
                      </div>
                    );
                  }
                  if (stage.stageNumber === 2 && (stage.stage2Answers?.length ?? 0) > 0) {
                    const ev = stage.aiEvaluation as { overallScore?: number; dimensions?: Array<{ name: string; score: number; rationale: string }> } | undefined;
                    return (
                      <div key={stage.id}>
                        <h3 className="text-sm font-semibold text-slate-800 mb-2">Stage 2: Questions</h3>
                        <div className="text-sm text-slate-700">
                          <p>Overall: {typeof ev?.overallScore === 'number' ? ev.overallScore.toFixed(2) : stage.score}/10</p>
                          {((ev?.dimensions)?.length ?? 0) > 0 && (
                            <ul className="list-disc list-inside mt-2">
                              {(ev?.dimensions ?? []).map((d, i) => (
                                <li key={i}>{d.name}: {d.score}/10 — {d.rationale}</li>
                              ))}
                            </ul>
                          )}
                          <div className="mt-2 space-y-2">
                            {stage.stage2Answers!.map((qa, i) => (
                              <div key={i} className="border-l-2 border-slate-200 pl-2">
                                <p className="font-medium text-slate-800">{qa.questionText}</p>
                                <p className="text-slate-600">{qa.answerText.slice(0, 200)}{qa.answerText.length > 200 ? '…' : ''}</p>
                                {qa.aiScore != null && <span className="text-xs text-slate-500">Score: {qa.aiScore}/10</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  }
                  if (stage.stageNumber === 3 && stage.stage3Interview) {
                    const i = stage.stage3Interview;
                    return (
                      <div key={stage.id}>
                        <h3 className="text-sm font-semibold text-slate-800 mb-2">Stage 3: Voice interview</h3>
                        <div className="text-sm text-slate-700 space-y-2">
                          <p>Communication: {i.communicationScore ?? '—'}/10 · Problem-solving: {i.problemSolvingScore ?? '—'}/10 · Role: {i.roleUnderstandingScore ?? '—'}/10 · Overall: {i.overallScore ?? '—'}/10</p>
                          {(i.evaluationMatrix?.dimensions?.length ?? 0) > 0 && (
                            <ul className="list-disc list-inside">
                              {(i.evaluationMatrix?.dimensions ?? []).map((d, j) => (
                                <li key={j}>{d.name}: {d.score}/10 — {d.rationale}</li>
                              ))}
                            </ul>
                          )}
                          {(i.strengths ?? []).length > 0 && <p><strong>Strengths:</strong> {(i.strengths ?? []).join('; ')}</p>}
                          {(i.weaknesses ?? []).length > 0 && <p><strong>Weaknesses:</strong> {(i.weaknesses ?? []).join('; ')}</p>}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
              {application.screeningStages.length === 0 && !application.aiSummary && (
                <p className="text-slate-500 text-sm">No analysis data yet.</p>
              )}
            </Card>
          </TabsContent>
        </Tabs>

      </div>
    </main>
  );
}
