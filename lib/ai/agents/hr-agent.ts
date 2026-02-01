/**
 * HR AI Agent: full access to candidates, applications, jobs, onboarding.
 * HR/Admin can ask about candidates, applications; agent can create jobs, mark hired, manage onboarding.
 */

import { db } from '@/lib/db';
import {
  users,
  jobs,
  applications,
  screeningStages,
  stage1Analysis,
  stage2Answers,
  stage2Questions,
  stage3Interviews,
  onboardingTemplates,
  onboardingTemplateTasks,
  onboardingFlows,
  onboardingTasks,
} from '@/lib/db/schema';
import { eq, and, desc, asc, inArray, sql, like, or } from 'drizzle-orm';
import { ensureDefaultOnboardingTemplate } from '@/lib/onboarding/ensure-default-template';
import { createNotification } from '@/lib/notifications/create';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isUUID(s: string): boolean {
  return UUID_REGEX.test((s ?? '').trim());
}

export const hrAgentTools = [
  {
    type: 'function' as const,
    function: {
      name: 'get_dashboard_stats',
      description:
        'Get high-level HR dashboard stats: open roles, total jobs, applications count, hired count, offers extended (stage3_passed), applicants in last 7 days.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_jobs',
      description: 'List all jobs. Optionally filter by status (draft, active, paused, closed), department, or location.',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['draft', 'active', 'paused', 'closed'],
            description: 'Filter by job status',
          },
          department: { type: 'string', description: 'Filter by department' },
          location: { type: 'string', description: 'Filter by location' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_job_details',
      description: 'Get full details of a job by ID (title, department, location, description, requirements, responsibilities, status, salary range).',
      parameters: {
        type: 'object',
        properties: {
          jobId: { type: 'string', description: 'Job UUID' },
        },
        required: ['jobId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_job',
      description:
        'Create a new job posting. Requires title, department, location, employmentType, description, requirements (array of strings), responsibilities (array of strings). Optional: salaryRangeMin, salaryRangeMax, status (default draft).',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          department: { type: 'string' },
          location: { type: 'string' },
          employmentType: {
            type: 'string',
            enum: ['full_time', 'part_time', 'contract', 'internship'],
          },
          description: { type: 'string' },
          requirements: {
            type: 'array',
            items: { type: 'string' },
            description: 'At least one requirement',
          },
          responsibilities: {
            type: 'array',
            items: { type: 'string' },
            description: 'At least one responsibility',
          },
          salaryRangeMin: { type: 'number' },
          salaryRangeMax: { type: 'number' },
          status: {
            type: 'string',
            enum: ['draft', 'active', 'paused', 'closed'],
            description: 'Default draft',
          },
        },
        required: [
          'title',
          'department',
          'location',
          'employmentType',
          'description',
          'requirements',
          'responsibilities',
        ],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_job_status',
      description: 'Update a job status (draft, active, paused, closed).',
      parameters: {
        type: 'object',
        properties: {
          jobId: { type: 'string' },
          status: {
            type: 'string',
            enum: ['draft', 'active', 'paused', 'closed'],
          },
        },
        required: ['jobId', 'status'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_applications',
      description:
        'List applications with job and candidate info. Optionally filter by jobId or status.',
      parameters: {
        type: 'object',
        properties: {
          jobId: { type: 'string', description: 'Filter by job UUID' },
          status: {
            type: 'string',
            description:
              'Filter by status e.g. submitted, stage1_passed, hired, etc.',
          },
          limit: {
            type: 'number',
            description: 'Max results (default 20)',
          },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_application_details',
      description:
        'Get full application details: candidate, job, status, resume summary, screening stages (stage 1/2/3 scores and evaluations). Use when HR asks about a specific applicant.',
      parameters: {
        type: 'object',
        properties: {
          applicationId: { type: 'string', description: 'Application UUID' },
        },
        required: ['applicationId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_candidates',
      description:
        'List candidates (users who have at least one application). Optionally search by name or email (partial match).',
      parameters: {
        type: 'object',
        properties: {
          search: {
            type: 'string',
            description: 'Partial match on name or email',
          },
          limit: { type: 'number', description: 'Max results (default 20)' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_candidate_details',
      description:
        'Get a candidate by ID: profile and list of their applications with job titles and statuses.',
      parameters: {
        type: 'object',
        properties: {
          candidateId: { type: 'string', description: 'User/candidate UUID' },
        },
        required: ['candidateId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'mark_as_hired',
      description:
        'Mark an application as hired (only for applications that passed all 3 stages — status stage3_passed). Creates onboarding flow from default template and notifies the candidate.',
      parameters: {
        type: 'object',
        properties: {
          applicationId: { type: 'string', description: 'Application UUID' },
        },
        required: ['applicationId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_onboarding_templates',
      description: 'List onboarding templates with task counts. Use to see available templates for new hires.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_onboarding_template',
      description: 'Get one onboarding template with its tasks (title, category, order).',
      parameters: {
        type: 'object',
        properties: {
          templateId: { type: 'string' },
        },
        required: ['templateId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_onboarding_flows',
      description:
        'List onboarding flows for hired applications (candidate name, job title, flow status). Optionally filter by status (not_started, in_progress, completed).',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['not_started', 'in_progress', 'completed'],
          },
          limit: { type: 'number' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_onboarding_flow',
      description:
        'Get onboarding flow and tasks for a specific application (only for hired applications).',
      parameters: {
        type: 'object',
        properties: {
          applicationId: { type: 'string' },
        },
        required: ['applicationId'],
      },
    },
  },
];

export const hrAgentSystemPrompt = `You are the HR AI assistant for the company. You have full access to candidates, applications, jobs, and onboarding. Your goal is to make HR and Admin life easier by answering questions and taking actions.

You can:
- Answer questions about candidates (who applied, their details, applications)
- Answer questions about applications (status, stages, scores, summaries)
- List and describe jobs; create new jobs; update job status (e.g. publish a draft)
- Mark candidates as hired (for applications that passed all 3 stages) and start their onboarding
- List and describe onboarding templates and flows; show onboarding progress for a hire

When HR asks for "details" about a candidate or application, use get_application_details or get_candidate_details and summarize clearly (avoid dumping raw JSON). When creating a job, use create_job with all required fields; you can set status to "active" to publish immediately or "draft" to save for later.

Be concise, actionable, and professional. If something is not allowed (e.g. hiring an application that hasn't passed stage 3), explain why and suggest next steps. Always confirm success after an action (e.g. "Job created. You can view it at /jobs/<id>." or "Candidate marked as hired; onboarding flow created.").

Format your responses for readability:
- Use **bold** for emphasis and section labels.
- Use bullet or numbered lists when listing items (jobs, applications, candidates, tasks).
- Include clickable links so HR can open items in the app: after creating or mentioning a job, add the path /jobs/<jobId>; for applications use /applications/<applicationId>; for dashboard use /dashboard. You can write them as plain paths (e.g. "View at /applications/abc-123") or as markdown links [View application](/applications/abc-123). Either will become clickable.
- For IDs (application ID, job ID) you can use inline \`code\` so they are easy to copy.`;

export async function executeHRAgentTool(
  toolName: string,
  args: Record<string, unknown>,
  hrUserId: string
): Promise<string> {
  switch (toolName) {
    case 'get_dashboard_stats':
      return await getDashboardStats();
    case 'list_jobs':
      return await listJobs(args);
    case 'get_job_details':
      return await getJobDetails(args);
    case 'create_job':
      return await createJob(args, hrUserId);
    case 'update_job_status':
      return await updateJobStatus(args);
    case 'list_applications':
      return await listApplications(args);
    case 'get_application_details':
      return await getApplicationDetails(args);
    case 'list_candidates':
      return await listCandidates(args);
    case 'get_candidate_details':
      return await getCandidateDetails(args);
    case 'mark_as_hired':
      return await markAsHired(args, hrUserId);
    case 'list_onboarding_templates':
      return await listOnboardingTemplates();
    case 'get_onboarding_template':
      return await getOnboardingTemplate(args);
    case 'list_onboarding_flows':
      return await listOnboardingFlows(args);
    case 'get_onboarding_flow':
      return await getOnboardingFlow(args);
    default:
      return JSON.stringify({ error: 'Unknown tool' });
  }
}

async function getDashboardStats(): Promise<string> {
  const [openRoles] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(jobs)
    .where(eq(jobs.status, 'active'));

  const [totalJobs] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(jobs);

  const [totalApplications] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(applications);

  const [hiredCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(applications)
    .where(eq(applications.status, 'hired'));

  const [offersExtended] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(applications)
    .where(eq(applications.status, 'stage3_passed'));

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const [applicants7d] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(applications)
    .where(sql`${applications.createdAt} >= ${sevenDaysAgo}`);

  return JSON.stringify({
    openRoles: openRoles?.count ?? 0,
    totalJobs: totalJobs?.count ?? 0,
    totalApplications: totalApplications?.count ?? 0,
    hiredCount: hiredCount?.count ?? 0,
    offersExtended: offersExtended?.count ?? 0,
    applicantsLast7Days: applicants7d?.count ?? 0,
  });
}

async function listJobs(args: Record<string, unknown>): Promise<string> {
  const status = args.status as string | undefined;
  const department = args.department as string | undefined;
  const location = args.location as string | undefined;

  const conditions = [];
  if (status) conditions.push(eq(jobs.status, status as any));
  if (department) conditions.push(eq(jobs.department, department));
  if (location) conditions.push(eq(jobs.location, location));

  const allJobs = conditions.length
    ? await db
        .select()
        .from(jobs)
        .where(and(...conditions))
        .orderBy(desc(jobs.createdAt))
    : await db.select().from(jobs).orderBy(desc(jobs.createdAt));

  const simplified = allJobs.map((j) => ({
    id: j.id,
    title: j.title,
    department: j.department,
    location: j.location,
    employmentType: j.employmentType,
    status: j.status,
    salaryRange:
      j.salaryRangeMin != null && j.salaryRangeMax != null
        ? `$${j.salaryRangeMin.toLocaleString()} - $${j.salaryRangeMax.toLocaleString()}`
        : null,
  }));
  return JSON.stringify({ jobs: simplified, count: simplified.length });
}

async function getJobDetails(args: Record<string, unknown>): Promise<string> {
  const jobId = (args.jobId as string)?.trim();
  if (!jobId || !isUUID(jobId)) {
    return JSON.stringify({ error: 'Valid jobId required' });
  }
  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  if (!job) return JSON.stringify({ error: 'Job not found' });
  return JSON.stringify({
    id: job.id,
    title: job.title,
    department: job.department,
    location: job.location,
    employmentType: job.employmentType,
    description: job.description,
    requirements: job.requirements,
    responsibilities: job.responsibilities,
    status: job.status,
    salaryRangeMin: job.salaryRangeMin,
    salaryRangeMax: job.salaryRangeMax,
    createdAt: job.createdAt,
  });
}

async function createJob(
  args: Record<string, unknown>,
  hrUserId: string
): Promise<string> {
  const title = (args.title as string)?.trim();
  const department = (args.department as string)?.trim();
  const location = (args.location as string)?.trim();
  const employmentType = args.employmentType as string;
  const description = (args.description as string)?.trim();
  const reqs = args.requirements as string[];
  const resps = args.responsibilities as string[];
  const salaryRangeMin =
    typeof args.salaryRangeMin === 'number' ? args.salaryRangeMin : undefined;
  const salaryRangeMax =
    typeof args.salaryRangeMax === 'number' ? args.salaryRangeMax : undefined;
  const status = (args.status as string) || 'draft';

  if (
    !title ||
    !department ||
    !location ||
    !employmentType ||
    !description ||
    !Array.isArray(reqs) ||
    reqs.length === 0 ||
    !Array.isArray(resps) ||
    resps.length === 0
  ) {
    return JSON.stringify({
      error:
        'Missing required fields: title, department, location, employmentType, description, requirements (array), responsibilities (array)',
    });
  }
  const validStatuses = ['draft', 'active', 'paused', 'closed'];
  if (!validStatuses.includes(status)) {
    return JSON.stringify({ error: 'Invalid status' });
  }
  const validTypes = ['full_time', 'part_time', 'contract', 'internship'];
  if (!validTypes.includes(employmentType)) {
    return JSON.stringify({ error: 'Invalid employmentType' });
  }

  const [newJob] = await db
    .insert(jobs)
    .values({
      title,
      department,
      location,
      employmentType: employmentType as any,
      description,
      requirements: reqs,
      responsibilities: resps,
      salaryRangeMin: salaryRangeMin ?? null,
      salaryRangeMax: salaryRangeMax ?? null,
      status: status as any,
      createdBy: hrUserId,
    })
    .returning();

  if (!newJob) return JSON.stringify({ error: 'Failed to create job' });
  return JSON.stringify({
    success: true,
    job: {
      id: newJob.id,
      title: newJob.title,
      department: newJob.department,
      status: newJob.status,
    },
    message: `Job "${newJob.title}" created. View at /jobs/${newJob.id}.`,
  });
}

async function updateJobStatus(args: Record<string, unknown>): Promise<string> {
  const jobId = (args.jobId as string)?.trim();
  const status = args.status as string;
  if (!jobId || !isUUID(jobId)) {
    return JSON.stringify({ error: 'Valid jobId required' });
  }
  const validStatuses = ['draft', 'active', 'paused', 'closed'];
  if (!validStatuses.includes(status)) {
    return JSON.stringify({ error: 'Invalid status' });
  }
  const [updated] = await db
    .update(jobs)
    .set({ status: status as any, updatedAt: new Date() })
    .where(eq(jobs.id, jobId))
    .returning({ id: jobs.id, title: jobs.title, status: jobs.status });
  if (!updated) return JSON.stringify({ error: 'Job not found' });
  return JSON.stringify({
    success: true,
    job: { id: updated.id, title: updated.title, status: updated.status },
    message: `Job status updated to ${status}.`,
  });
}

async function listApplications(args: Record<string, unknown>): Promise<string> {
  const jobId = (args.jobId as string)?.trim();
  const status = args.status as string | undefined;
  const limit = Math.min(
    50,
    typeof args.limit === 'number' ? args.limit : 20
  );

  const base = db
    .select({
      id: applications.id,
      jobId: applications.jobId,
      candidateId: applications.candidateId,
      status: applications.status,
      currentStage: applications.currentStage,
      overallScore: applications.overallScore,
      createdAt: applications.createdAt,
      jobTitle: jobs.title,
      candidateEmail: users.email,
      candidateName: users.name,
    })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .innerJoin(users, eq(applications.candidateId, users.id))
    .orderBy(desc(applications.createdAt))
    .limit(limit);

  const conditions: ReturnType<typeof eq>[] = [];
  if (jobId && isUUID(jobId)) conditions.push(eq(applications.jobId, jobId));
  if (status) conditions.push(eq(applications.status, status as (typeof applications.status.enumValues)[number]));

  const list = conditions.length
    ? await db
        .select({
          id: applications.id,
          jobId: applications.jobId,
          candidateId: applications.candidateId,
          status: applications.status,
          currentStage: applications.currentStage,
          overallScore: applications.overallScore,
          createdAt: applications.createdAt,
          jobTitle: jobs.title,
          candidateEmail: users.email,
          candidateName: users.name,
        })
        .from(applications)
        .innerJoin(jobs, eq(applications.jobId, jobs.id))
        .innerJoin(users, eq(applications.candidateId, users.id))
        .where(and(...conditions))
        .orderBy(desc(applications.createdAt))
        .limit(limit)
    : await db
        .select({
          id: applications.id,
          jobId: applications.jobId,
          candidateId: applications.candidateId,
          status: applications.status,
          currentStage: applications.currentStage,
          overallScore: applications.overallScore,
          createdAt: applications.createdAt,
          jobTitle: jobs.title,
          candidateEmail: users.email,
          candidateName: users.name,
        })
        .from(applications)
        .innerJoin(jobs, eq(applications.jobId, jobs.id))
        .innerJoin(users, eq(applications.candidateId, users.id))
        .orderBy(desc(applications.createdAt))
        .limit(limit);

  const applicationsList = list.map((row) => ({
    id: row.id,
    jobId: row.jobId,
    candidateId: row.candidateId,
    status: row.status,
    currentStage: row.currentStage,
    overallScore: row.overallScore,
    createdAt: row.createdAt,
    job: { id: row.jobId, title: row.jobTitle },
    candidate: {
      id: row.candidateId,
      email: row.candidateEmail,
      name: row.candidateName,
    },
  }));
  return JSON.stringify({
    applications: applicationsList,
    count: applicationsList.length,
  });
}

async function getApplicationDetails(
  args: Record<string, unknown>
): Promise<string> {
  const applicationId = (args.applicationId as string)?.trim();
  if (!applicationId || !isUUID(applicationId)) {
    return JSON.stringify({ error: 'Valid applicationId required' });
  }

  const [row] = await db
    .select({
      id: applications.id,
      jobId: applications.jobId,
      candidateId: applications.candidateId,
      status: applications.status,
      currentStage: applications.currentStage,
      overallScore: applications.overallScore,
      aiSummary: applications.aiSummary,
      resumeText: applications.resumeText,
      candidateProfile: applications.candidateProfile,
      coverLetter: applications.coverLetter,
      createdAt: applications.createdAt,
      jobTitle: jobs.title,
      jobDepartment: jobs.department,
      candidateEmail: users.email,
      candidateName: users.name,
    })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .innerJoin(users, eq(applications.candidateId, users.id))
    .where(eq(applications.id, applicationId))
    .limit(1);

  if (!row) return JSON.stringify({ error: 'Application not found' });

  const stages = await db
    .select()
    .from(screeningStages)
    .where(eq(screeningStages.applicationId, applicationId))
    .orderBy(asc(screeningStages.stageNumber));

  const stage1Ids = stages.filter((s) => s.stageNumber === 1).map((s) => s.id);
  let stage1Rows: Array<{ screeningStageId: string; score: string; fitRating: string | null; strengths: unknown; concerns: unknown }> = [];
  if (stage1Ids.length > 0) {
    stage1Rows = await db
      .select({
        screeningStageId: stage1Analysis.screeningStageId,
        score: stage1Analysis.score,
        fitRating: stage1Analysis.fitRating,
        strengths: stage1Analysis.strengths,
        concerns: stage1Analysis.concerns,
      })
      .from(stage1Analysis)
      .where(inArray(stage1Analysis.screeningStageId, stage1Ids));
  }

  const stage3Ids = stages.filter((s) => s.stageNumber === 3).map((s) => s.id);
  const stage3Rows =
    stage3Ids.length > 0
      ? await db
          .select()
          .from(stage3Interviews)
          .where(inArray(stage3Interviews.screeningStageId, stage3Ids))
      : [];

  const stage2Ids = stages.filter((s) => s.stageNumber === 2).map((s) => s.id);
  const stage2Rows =
    stage2Ids.length > 0
      ? await db
          .select({
            screeningStageId: stage2Answers.screeningStageId,
            answerText: stage2Answers.answerText,
            aiScore: stage2Answers.aiScore,
            aiFeedback: stage2Answers.aiFeedback,
            questionText: stage2Questions.questionText,
          })
          .from(stage2Answers)
          .innerJoin(stage2Questions, eq(stage2Answers.questionId, stage2Questions.id))
          .where(inArray(stage2Answers.screeningStageId, stage2Ids))
      : [];

  const stagesWithDetails = stages.map((stage) => {
    const base = {
      stageNumber: stage.stageNumber,
      status: stage.status,
      score: stage.score,
    };
    if (stage.stageNumber === 1) {
      const a = stage1Rows.find((r) => r.screeningStageId === stage.id);
      return {
        ...base,
        stage1: a
          ? {
              score: a.score,
              fitRating: a.fitRating,
              strengths: a.strengths,
              concerns: a.concerns,
            }
          : null,
      };
    }
    if (stage.stageNumber === 2) {
      const answers = stage2Rows
        .filter((r) => r.screeningStageId === stage.id)
        .map((r) => ({
          question: r.questionText,
          answer: r.answerText,
          aiScore: r.aiScore,
          aiFeedback: r.aiFeedback,
        }));
      return { ...base, stage2Answers: answers };
    }
    if (stage.stageNumber === 3) {
      const i = stage3Rows.find((r) => r.screeningStageId === stage.id);
      return {
        ...base,
        stage3: i
          ? {
              overallScore: i.overallScore,
              strengths: i.strengths,
              weaknesses: i.weaknesses,
              completedAt: i.completedAt,
            }
          : null,
      };
    }
    return base;
  });

  return JSON.stringify({
    id: row.id,
    status: row.status,
    currentStage: row.currentStage,
    overallScore: row.overallScore,
    aiSummary: row.aiSummary,
    resumeSnippet: row.resumeText
      ? String(row.resumeText).slice(0, 500) + (row.resumeText.length > 500 ? '…' : '')
      : null,
    candidateProfile: row.candidateProfile,
    coverLetter: row.coverLetter,
    createdAt: row.createdAt,
    job: {
      id: row.jobId,
      title: row.jobTitle,
      department: row.jobDepartment,
    },
    candidate: {
      id: row.candidateId,
      email: row.candidateEmail,
      name: row.candidateName,
    },
    screeningStages: stagesWithDetails,
  });
}

async function listCandidates(args: Record<string, unknown>): Promise<string> {
  const search = (args.search as string)?.trim();
  const limit = Math.min(
    50,
    typeof args.limit === 'number' ? args.limit : 20
  );

  const candidateIds = await db
    .selectDistinct({ candidateId: applications.candidateId })
    .from(applications);

  const ids = candidateIds.map((r) => r.candidateId);
  if (ids.length === 0) {
    return JSON.stringify({ candidates: [], count: 0 });
  }

  let cond: ReturnType<typeof inArray> | ReturnType<typeof and> = inArray(users.id, ids);
  if (search) {
    const term = `%${search}%`;
    cond = and(
      inArray(users.id, ids),
      or(
        like(users.email, term),
        sql`COALESCE(${users.name}, '')::text LIKE ${term}`
      )!
    ) as any;
  }

  const list = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(cond)
    .limit(limit);

  const withCounts = await Promise.all(
    list.map(async (u) => {
      const [c] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(applications)
        .where(eq(applications.candidateId, u.id));
      return {
        id: u.id,
        email: u.email,
        name: u.name,
        createdAt: u.createdAt,
        applicationsCount: c?.count ?? 0,
      };
    })
  );

  return JSON.stringify({
    candidates: withCounts,
    count: withCounts.length,
  });
}

async function getCandidateDetails(
  args: Record<string, unknown>
): Promise<string> {
  const candidateId = (args.candidateId as string)?.trim();
  if (!candidateId || !isUUID(candidateId)) {
    return JSON.stringify({ error: 'Valid candidateId required' });
  }

  const [user] = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, candidateId))
    .limit(1);

  if (!user) return JSON.stringify({ error: 'Candidate not found' });

  const apps = await db
    .select({
      id: applications.id,
      status: applications.status,
      currentStage: applications.currentStage,
      overallScore: applications.overallScore,
      createdAt: applications.createdAt,
      jobTitle: jobs.title,
      jobId: jobs.id,
    })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .where(eq(applications.candidateId, candidateId))
    .orderBy(desc(applications.createdAt));

  return JSON.stringify({
    candidate: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    applications: apps.map((a) => ({
      id: a.id,
      jobId: a.jobId,
      jobTitle: a.jobTitle,
      status: a.status,
      currentStage: a.currentStage,
      overallScore: a.overallScore,
      createdAt: a.createdAt,
    })),
    count: apps.length,
  });
}

async function markAsHired(
  args: Record<string, unknown>,
  hrUserId: string
): Promise<string> {
  const applicationId = (args.applicationId as string)?.trim();
  if (!applicationId || !isUUID(applicationId)) {
    return JSON.stringify({ error: 'Valid applicationId required' });
  }

  const [app] = await db
    .select({
      id: applications.id,
      status: applications.status,
      jobId: applications.jobId,
      candidateId: applications.candidateId,
    })
    .from(applications)
    .where(eq(applications.id, applicationId))
    .limit(1);

  if (!app) return JSON.stringify({ error: 'Application not found' });
  if (app.status !== 'stage3_passed') {
    return JSON.stringify({
      error:
        'Only applications that passed all 3 stages can be marked as hired. Current status: ' +
        app.status,
    });
  }

  const template = await ensureDefaultOnboardingTemplate(hrUserId);
  const templateTasks = await db
    .select()
    .from(onboardingTemplateTasks)
    .where(eq(onboardingTemplateTasks.templateId, template.id))
    .orderBy(asc(onboardingTemplateTasks.taskOrder));

  const now = new Date();
  await db
    .update(applications)
    .set({ status: 'hired', updatedAt: now })
    .where(eq(applications.id, applicationId));

  const [flow] = await db
    .insert(onboardingFlows)
    .values({
      applicationId,
      templateId: template.id,
      status: 'not_started',
      createdAt: now,
    })
    .returning();

  if (flow && templateTasks.length > 0) {
    await db.insert(onboardingTasks).values(
      templateTasks.map((t) => ({
        onboardingFlowId: flow.id,
        templateTaskId: t.id,
        taskTitle: t.taskTitle,
        taskDescription: t.taskDescription,
        status: 'pending' as const,
        submissionDescription: t.submissionDescription ?? null,
        createdAt: now,
        updatedAt: now,
      }))
    );
  }

  const [jobRow] = await db
    .select({ title: jobs.title })
    .from(jobs)
    .where(eq(jobs.id, app.jobId))
    .limit(1);
  const jobTitle = jobRow?.title ?? 'the role';

  await createNotification(app.candidateId, "You're hired!", {
    message: `You have been offered the position: ${jobTitle}. Complete onboarding in your dashboard.`,
    link: '/my-applications',
  });

  return JSON.stringify({
    success: true,
    applicationId,
    onboardingFlowId: flow?.id,
    message: `Candidate marked as hired. Onboarding flow created. They can complete tasks in their dashboard.`,
  });
}

async function listOnboardingTemplates(): Promise<string> {
  const templates = await db
    .select()
    .from(onboardingTemplates)
    .orderBy(asc(onboardingTemplates.createdAt));

  const withCounts = await Promise.all(
    templates.map(async (t) => {
      const tasks = await db
        .select({ id: onboardingTemplateTasks.id })
        .from(onboardingTemplateTasks)
        .where(eq(onboardingTemplateTasks.templateId, t.id));
      return {
        id: t.id,
        name: t.name,
        description: t.description,
        isDefault: t.isDefault,
        taskCount: tasks.length,
      };
    })
  );
  return JSON.stringify({ templates: withCounts, count: withCounts.length });
}

async function getOnboardingTemplate(
  args: Record<string, unknown>
): Promise<string> {
  const templateId = (args.templateId as string)?.trim();
  if (!templateId || !isUUID(templateId)) {
    return JSON.stringify({ error: 'Valid templateId required' });
  }

  const [t] = await db
    .select()
    .from(onboardingTemplates)
    .where(eq(onboardingTemplates.id, templateId))
    .limit(1);
  if (!t) return JSON.stringify({ error: 'Template not found' });

  const tasks = await db
    .select()
    .from(onboardingTemplateTasks)
    .where(eq(onboardingTemplateTasks.templateId, templateId))
    .orderBy(asc(onboardingTemplateTasks.taskOrder));

  return JSON.stringify({
    template: {
      id: t.id,
      name: t.name,
      description: t.description,
      isDefault: t.isDefault,
    },
    tasks: tasks.map((task) => ({
      id: task.id,
      taskTitle: task.taskTitle,
      taskOrder: task.taskOrder,
      category: task.category,
      isRequired: task.isRequired,
    })),
  });
}

async function listOnboardingFlows(
  args: Record<string, unknown>
): Promise<string> {
  const status = args.status as string | undefined;
  const limit = Math.min(
    50,
    typeof args.limit === 'number' ? args.limit : 20
  );

  const conditions = [eq(applications.status, 'hired')];
  if (status) conditions.push(eq(onboardingFlows.status, status as any));

  const list = await db
    .select({
      flowId: onboardingFlows.id,
      flowStatus: onboardingFlows.status,
      applicationId: applications.id,
      jobTitle: jobs.title,
      candidateName: users.name,
      candidateEmail: users.email,
    })
    .from(onboardingFlows)
    .innerJoin(applications, eq(onboardingFlows.applicationId, applications.id))
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .innerJoin(users, eq(applications.candidateId, users.id))
    .where(and(...conditions))
    .orderBy(desc(onboardingFlows.createdAt))
    .limit(limit);

  const flows = list.map((row) => ({
    flowId: row.flowId,
    flowStatus: row.flowStatus,
    applicationId: row.applicationId,
    jobTitle: row.jobTitle,
    candidateName: row.candidateName,
    candidateEmail: row.candidateEmail,
  }));
  return JSON.stringify({ flows, count: flows.length });
}

async function getOnboardingFlow(
  args: Record<string, unknown>
): Promise<string> {
  const applicationId = (args.applicationId as string)?.trim();
  if (!applicationId || !isUUID(applicationId)) {
    return JSON.stringify({ error: 'Valid applicationId required' });
  }

  const [app] = await db
    .select({
      applicationStatus: applications.status,
      applicationId: applications.id,
    })
    .from(applications)
    .where(eq(applications.id, applicationId))
    .limit(1);

  if (!app) return JSON.stringify({ error: 'Application not found' });
  if (app.applicationStatus !== 'hired') {
    return JSON.stringify({
      error: 'Onboarding exists only for hired applications.',
      applicationStatus: app.applicationStatus,
    });
  }

  const [flow] = await db
    .select()
    .from(onboardingFlows)
    .where(eq(onboardingFlows.applicationId, applicationId))
    .limit(1);

  if (!flow) {
    return JSON.stringify({
      message: 'Onboarding flow not yet created for this application.',
      applicationId,
    });
  }

  const tasks = await db
    .select()
    .from(onboardingTasks)
    .where(eq(onboardingTasks.onboardingFlowId, flow.id))
    .orderBy(asc(onboardingTasks.createdAt));

  return JSON.stringify({
    flow: {
      id: flow.id,
      status: flow.status,
      startedAt: flow.startedAt,
      completedAt: flow.completedAt,
    },
    tasks: tasks.map((t) => ({
      id: t.id,
      taskTitle: t.taskTitle,
      status: t.status,
      dueDate: t.dueDate,
      completedAt: t.completedAt,
    })),
  });
}
