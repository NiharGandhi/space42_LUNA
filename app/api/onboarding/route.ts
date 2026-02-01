import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  applications,
  jobs,
  onboardingFlows,
  onboardingTasks,
} from '@/lib/db/schema';
import { getSessionUser } from '@/lib/auth/session';
import { eq, asc, and } from 'drizzle-orm';

/**
 * GET /api/onboarding
 * Returns the current user's onboarding flow and tasks (if they have one, i.e. status = hired).
 */
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const [app] = await db
      .select({
        id: applications.id,
        jobId: applications.jobId,
        status: applications.status,
      })
      .from(applications)
      .where(and(eq(applications.candidateId, user.id), eq(applications.status, 'hired')))
      .limit(1);

    if (!app) {
      const [anyApp] = await db
        .select({
          id: applications.id,
          status: applications.status,
          jobId: applications.jobId,
        })
        .from(applications)
        .where(eq(applications.candidateId, user.id))
        .orderBy(asc(applications.createdAt))
        .limit(1);
      let jobTitle: string | null = null;
      if (anyApp?.jobId) {
        const [j] = await db
          .select({ title: jobs.title })
          .from(jobs)
          .where(eq(jobs.id, anyApp.jobId))
          .limit(1);
        jobTitle = j?.title ?? null;
      }
      return NextResponse.json({
        success: true,
        flow: null,
        tasks: [],
        job: jobTitle ? { title: jobTitle, department: '' } : null,
        applicationStatus: anyApp?.status ?? null,
        hasApplication: !!anyApp,
        applicationId: anyApp?.id ?? null,
      });
    }

    const [flow] = await db
      .select()
      .from(onboardingFlows)
      .where(eq(onboardingFlows.applicationId, app.id))
      .limit(1);

    if (!flow) {
      return NextResponse.json({
        success: true,
        flow: null,
        tasks: [],
        job: null,
        applicationStatus: 'hired',
        hasApplication: true,
        message: 'Onboarding not set up yet—HR may still be creating it.',
      });
    }

    const [jobRow] = await db
      .select({ title: jobs.title, department: jobs.department })
      .from(jobs)
      .where(eq(jobs.id, app.jobId))
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
      },
      tasks: tasks.map((t) => ({
        id: t.id,
        taskTitle: t.taskTitle,
        taskDescription: t.taskDescription,
        status: t.status,
        dueDate: t.dueDate,
        completedAt: t.completedAt,
        submissionDescription: t.submissionDescription ?? null,
        attachments: Array.isArray(t.attachments) ? t.attachments : [],
        notes: t.notes ?? null,
      })),
      job: jobRow
        ? { title: jobRow.title, department: jobRow.department }
        : null,
    });
  } catch (error) {
    console.error('Onboarding GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch onboarding' },
      { status: 500 }
    );
  }
}
