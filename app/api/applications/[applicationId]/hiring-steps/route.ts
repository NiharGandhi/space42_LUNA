import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { applications, hiringSteps } from '@/lib/db/schema';
import { getSessionUser } from '@/lib/auth/session';
import { eq, asc } from 'drizzle-orm';

/**
 * GET /api/applications/[applicationId]/hiring-steps
 * Returns hiring steps for an application. HR can view any; candidate can view only their own.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { applicationId } = await params;

    const [app] = await db
      .select({ id: applications.id, status: applications.status, candidateId: applications.candidateId })
      .from(applications)
      .where(eq(applications.id, applicationId))
      .limit(1);

    if (!app) {
      return NextResponse.json(
        { success: false, error: 'Application not found' },
        { status: 404 }
      );
    }

    if (user.role !== 'hr' && user.role !== 'admin') {
      if (app.candidateId !== user.id) {
        return NextResponse.json(
          { success: false, error: 'Not allowed to view this application' },
          { status: 403 }
        );
      }
    }

    const steps = await db
      .select()
      .from(hiringSteps)
      .where(eq(hiringSteps.applicationId, applicationId))
      .orderBy(asc(hiringSteps.stepOrder));

    return NextResponse.json({
      success: true,
      steps: steps.map((s) => ({
        id: s.id,
        applicationId: s.applicationId,
        stepOrder: s.stepOrder,
        label: s.label,
        status: s.status,
        scheduledAt: s.scheduledAt,
        completedAt: s.completedAt,
        notes: s.notes,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Get hiring steps error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch hiring steps' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/applications/[applicationId]/hiring-steps
 * Body: { label?: string, stepOrder?: number }
 * HR only. Application must be stage3_passed. Adds a new hiring step.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
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
        { success: false, error: 'Only HR can add hiring steps' },
        { status: 403 }
      );
    }

    const { applicationId } = await params;

    const [app] = await db
      .select({ id: applications.id, status: applications.status })
      .from(applications)
      .where(eq(applications.id, applicationId))
      .limit(1);

    if (!app) {
      return NextResponse.json(
        { success: false, error: 'Application not found' },
        { status: 404 }
      );
    }
    if (app.status !== 'stage3_passed') {
      return NextResponse.json(
        { success: false, error: 'Hiring steps are only for applications that passed all 3 stages' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const label = typeof body.label === 'string' && body.label.trim() ? body.label.trim() : 'Live Interview';
    let stepOrder = typeof body.stepOrder === 'number' ? body.stepOrder : undefined;

    if (stepOrder === undefined) {
      const existing = await db
        .select({ stepOrder: hiringSteps.stepOrder })
        .from(hiringSteps)
        .where(eq(hiringSteps.applicationId, applicationId));
      const maxOrder = existing.length > 0 ? Math.max(...existing.map((r) => r.stepOrder)) : 0;
      stepOrder = maxOrder + 1;
    }

    const now = new Date();
    const [inserted] = await db
      .insert(hiringSteps)
      .values({
        applicationId,
        stepOrder,
        label,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (!inserted) {
      return NextResponse.json(
        { success: false, error: 'Failed to create hiring step' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      step: {
        id: inserted.id,
        applicationId: inserted.applicationId,
        stepOrder: inserted.stepOrder,
        label: inserted.label,
        status: inserted.status,
        scheduledAt: inserted.scheduledAt,
        completedAt: inserted.completedAt,
        notes: inserted.notes,
        createdAt: inserted.createdAt,
        updatedAt: inserted.updatedAt,
      },
    });
  } catch (error) {
    console.error('Create hiring step error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create hiring step' },
      { status: 500 }
    );
  }
}
