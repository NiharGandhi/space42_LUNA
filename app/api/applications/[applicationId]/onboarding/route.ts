import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  applications,
  jobs,
  users,
  onboardingFlows,
  onboardingTasks,
} from '@/lib/db/schema';
import { getSessionUser } from '@/lib/auth/session';
import { eq, asc } from 'drizzle-orm';

/**
 * GET /api/applications/[applicationId]/onboarding
 * HR only. Returns onboarding flow and tasks for this application (when status = hired).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (user.role !== 'hr' && user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Only HR can view application onboarding' }, { status: 403 });
    }

    const { applicationId } = await params;

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

    if (!app) {
      return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 });
    }

    if (app.status !== 'hired') {
      return NextResponse.json({
        success: true,
        flow: null,
        tasks: [],
        job: null,
        candidate: null,
        message: 'Onboarding exists only for hired applications.',
      });
    }

    const [flow] = await db
      .select()
      .from(onboardingFlows)
      .where(eq(onboardingFlows.applicationId, applicationId))
      .limit(1);

    if (!flow) {
      const [jobRow] = await db
        .select({ title: jobs.title, department: jobs.department })
        .from(jobs)
        .where(eq(jobs.id, app.jobId))
        .limit(1);
      const [candidate] = await db
        .select({ id: users.id, email: users.email, name: users.name })
        .from(users)
        .where(eq(users.id, app.candidateId))
        .limit(1);
      return NextResponse.json({
        success: true,
        flow: null,
        tasks: [],
        job: jobRow ? { title: jobRow.title, department: jobRow.department } : null,
        candidate: candidate ? { id: candidate.id, email: candidate.email, name: candidate.name } : null,
        message: 'Onboarding flow not found for this application.',
      });
    }

    const [jobRow] = await db
      .select({ title: jobs.title, department: jobs.department })
      .from(jobs)
      .where(eq(jobs.id, app.jobId))
      .limit(1);

    const [candidate] = await db
      .select({ id: users.id, email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, app.candidateId))
      .limit(1);

    const tasks = await db
      .select()
      .from(onboardingTasks)
      .where(eq(onboardingTasks.onboardingFlowId, flow.id))
      .orderBy(asc(onboardingTasks.createdAt));

    return NextResponse.json({
      success: true,
      flow: {
        id: flow.id,
        status: flow.status,
        startedAt: flow.startedAt,
        completedAt: flow.completedAt,
        createdAt: flow.createdAt,
      },
      tasks: tasks.map((t) => ({
        id: t.id,
        taskTitle: t.taskTitle,
        taskDescription: t.taskDescription,
        status: t.status,
        dueDate: t.dueDate,
        completedAt: t.completedAt,
        createdAt: t.createdAt,
        submissionDescription: t.submissionDescription ?? null,
        notes: t.notes ?? null,
        attachments: Array.isArray(t.attachments) ? t.attachments : [],
      })),
      job: jobRow ? { title: jobRow.title, department: jobRow.department } : null,
      candidate: candidate ? { id: candidate.id, email: candidate.email, name: candidate.name } : null,
    });
  } catch (error) {
    console.error('Application onboarding GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch onboarding' },
      { status: 500 }
    );
  }
}
