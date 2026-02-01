import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  applications,
  hiringSteps,
  jobs,
  onboardingFlows,
  onboardingTasks,
} from '@/lib/db/schema';
import { getSessionUser } from '@/lib/auth/session';
import { eq, and, gte, lte, inArray, sql } from 'drizzle-orm';

/**
 * GET /api/candidate/dashboard-stats
 * Returns stats for candidate dashboard: upcoming interviews, onboarding tasks.
 * Candidate only.
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
    if (user.role !== 'candidate') {
      return NextResponse.json(
        { success: false, error: 'Only candidates can view dashboard stats' },
        { status: 403 }
      );
    }

    const now = new Date();
    const in14Days = new Date(now);
    in14Days.setDate(in14Days.getDate() + 14);

    // Upcoming interviews: hiring steps with scheduledAt in next 14 days, for candidate's applications
    const upcomingSteps = await db
      .select({ id: hiringSteps.id })
      .from(hiringSteps)
      .innerJoin(applications, eq(hiringSteps.applicationId, applications.id))
      .where(
        and(
          eq(applications.candidateId, user.id),
          sql`${hiringSteps.scheduledAt} IS NOT NULL`,
          gte(hiringSteps.scheduledAt, now),
          lte(hiringSteps.scheduledAt, in14Days),
          inArray(hiringSteps.status, ['pending', 'scheduled'])
        )
      );

    // Onboarding tasks: for candidate's hired application
    const [hiredApp] = await db
      .select({ id: applications.id, jobId: applications.jobId })
      .from(applications)
      .where(
        and(
          eq(applications.candidateId, user.id),
          eq(applications.status, 'hired')
        )
      )
      .limit(1);

    let onboardingTotal = 0;
    let onboardingPending = 0;
    let onboardingJobTitle: string | null = null;

    if (hiredApp) {
      if (hiredApp.jobId) {
        const [job] = await db
          .select({ title: jobs.title })
          .from(jobs)
          .where(eq(jobs.id, hiredApp.jobId))
          .limit(1);
        onboardingJobTitle = job?.title ?? null;
      }
      const [flow] = await db
        .select({ id: onboardingFlows.id })
        .from(onboardingFlows)
        .where(eq(onboardingFlows.applicationId, hiredApp.id))
        .limit(1);

      if (flow) {
        const tasks = await db
          .select({
            status: onboardingTasks.status,
          })
          .from(onboardingTasks)
          .where(eq(onboardingTasks.onboardingFlowId, flow.id));

        onboardingTotal = tasks.length;
        onboardingPending = tasks.filter(
          (t) =>
            t.status === 'pending' ||
            t.status === 'in_progress' ||
            t.status === 'submitted' ||
            t.status === 'blocked'
        ).length;
      }
    }

    return NextResponse.json({
      success: true,
      upcomingInterviews: upcomingSteps.length,
      onboardingTasksTotal: onboardingTotal,
      onboardingTasksPending: onboardingPending,
      onboardingJobTitle,
    });
  } catch (error) {
    console.error('Candidate dashboard stats error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}
