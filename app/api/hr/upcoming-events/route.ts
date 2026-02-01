import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { applications, hiringSteps, jobs, users } from '@/lib/db/schema';
import { getSessionUser } from '@/lib/auth/session';
import { eq, and, gte, lte, isNotNull } from 'drizzle-orm';

/**
 * GET /api/hr/upcoming-events
 * Returns hiring steps with scheduledAt for the calendar. HR/Admin only.
 * Query: ?start=ISO_DATE&end=ISO_DATE (optional, defaults to current month ± 1 month)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }
    if (user.role !== 'hr' && user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Only HR can view upcoming events' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');

    const now = new Date();
    const start = startParam ? new Date(startParam) : new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = endParam
      ? new Date(endParam)
      : new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59);

    const steps = await db
      .select({
        id: hiringSteps.id,
        applicationId: hiringSteps.applicationId,
        stepOrder: hiringSteps.stepOrder,
        label: hiringSteps.label,
        status: hiringSteps.status,
        scheduledAt: hiringSteps.scheduledAt,
        completedAt: hiringSteps.completedAt,
        jobTitle: jobs.title,
        candidateName: users.name,
        candidateEmail: users.email,
      })
      .from(hiringSteps)
      .innerJoin(applications, eq(hiringSteps.applicationId, applications.id))
      .innerJoin(jobs, eq(applications.jobId, jobs.id))
      .innerJoin(users, eq(applications.candidateId, users.id))
      .where(
        and(
          isNotNull(hiringSteps.scheduledAt),
          gte(hiringSteps.scheduledAt, start),
          lte(hiringSteps.scheduledAt, end)
        )
      )
      .orderBy(hiringSteps.scheduledAt);

    const events = steps.map((s) => ({
      id: s.id,
      applicationId: s.applicationId,
      label: s.label,
      status: s.status,
      scheduledAt: s.scheduledAt,
      completedAt: s.completedAt,
      jobTitle: s.jobTitle,
      candidateName: s.candidateName,
      candidateEmail: s.candidateEmail,
    }));

    return NextResponse.json({
      success: true,
      events,
    });
  } catch (error) {
    console.error('Get upcoming events error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch upcoming events' },
      { status: 500 }
    );
  }
}
