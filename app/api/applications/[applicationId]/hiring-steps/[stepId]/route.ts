import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { applications, hiringSteps, jobs, users } from '@/lib/db/schema';
import { getSessionUser } from '@/lib/auth/session';
import { eq, and } from 'drizzle-orm';
import { createNotification } from '@/lib/notifications/create';
import { sendHiringStepScheduledEmail } from '@/lib/email/nodemailer';

const VALID_STATUSES = ['pending', 'scheduled', 'completed', 'failed', 'cancelled'] as const;

/**
 * PATCH /api/applications/[applicationId]/hiring-steps/[stepId]
 * Body: { label?: string, status?: string, scheduledAt?: string | null, completedAt?: string | null, notes?: string | null, stepOrder?: number }
 * HR only.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string; stepId: string }> }
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
        { success: false, error: 'Only HR can update hiring steps' },
        { status: 403 }
      );
    }

    const { applicationId, stepId } = await params;

    const [existingStep] = await db
      .select()
      .from(hiringSteps)
      .where(and(eq(hiringSteps.id, stepId), eq(hiringSteps.applicationId, applicationId)))
      .limit(1);

    if (!existingStep) {
      return NextResponse.json(
        { success: false, error: 'Hiring step not found' },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const updates: Partial<{
      label: string;
      status: typeof VALID_STATUSES[number];
      scheduledAt: Date | null;
      completedAt: Date | null;
      notes: string | null;
      stepOrder: number;
      updatedAt: Date;
    }> = { updatedAt: new Date() };

    if (typeof body.label === 'string' && body.label.trim()) updates.label = body.label.trim();
    if (VALID_STATUSES.includes(body.status)) updates.status = body.status;
    if (body.scheduledAt === null || body.scheduledAt === '') updates.scheduledAt = null;
    else if (body.scheduledAt) updates.scheduledAt = new Date(body.scheduledAt);
    if (body.completedAt === null || body.completedAt === '') updates.completedAt = null;
    else if (body.completedAt) updates.completedAt = new Date(body.completedAt);
    if (body.notes !== undefined) updates.notes = body.notes === null || body.notes === '' ? null : String(body.notes);
    if (typeof body.stepOrder === 'number') updates.stepOrder = body.stepOrder;

    await db
      .update(hiringSteps)
      .set(updates)
      .where(eq(hiringSteps.id, stepId));

    const [updated] = await db
      .select()
      .from(hiringSteps)
      .where(eq(hiringSteps.id, stepId))
      .limit(1);

    if (updated && updates.status === 'scheduled' && updated.scheduledAt) {
      const [app] = await db
        .select({ candidateId: applications.candidateId, jobId: applications.jobId })
        .from(applications)
        .where(eq(applications.id, updated.applicationId))
        .limit(1);
      if (app) {
        const [jobRow] = await db.select({ title: jobs.title }).from(jobs).where(eq(jobs.id, app.jobId)).limit(1);
        const [candidateRow] = await db.select({ email: users.email }).from(users).where(eq(users.id, app.candidateId)).limit(1);
        if (jobRow && candidateRow) {
          await createNotification(app.candidateId, 'Interview scheduled', {
            message: `${updated.label} for ${jobRow.title} – ${new Date(updated.scheduledAt).toLocaleString()}`,
            link: '/my-applications',
          });
          try {
            await sendHiringStepScheduledEmail(
              candidateRow.email,
              jobRow.title,
              updated.label,
              new Date(updated.scheduledAt)
            );
          } catch (e) {
            console.error('sendHiringStepScheduledEmail error:', e);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      step: updated
        ? {
            id: updated.id,
            applicationId: updated.applicationId,
            stepOrder: updated.stepOrder,
            label: updated.label,
            status: updated.status,
            scheduledAt: updated.scheduledAt,
            completedAt: updated.completedAt,
            notes: updated.notes,
            createdAt: updated.createdAt,
            updatedAt: updated.updatedAt,
          }
        : null,
    });
  } catch (error) {
    console.error('Update hiring step error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update hiring step' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/applications/[applicationId]/hiring-steps/[stepId]
 * HR only.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ applicationId: string; stepId: string }> }
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
        { success: false, error: 'Only HR can delete hiring steps' },
        { status: 403 }
      );
    }

    const { applicationId, stepId } = await params;

    const [existingStep] = await db
      .select({ id: hiringSteps.id })
      .from(hiringSteps)
      .where(and(eq(hiringSteps.id, stepId), eq(hiringSteps.applicationId, applicationId)))
      .limit(1);

    if (!existingStep) {
      return NextResponse.json(
        { success: false, error: 'Hiring step not found' },
        { status: 404 }
      );
    }

    await db.delete(hiringSteps).where(eq(hiringSteps.id, stepId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete hiring step error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete hiring step' },
      { status: 500 }
    );
  }
}
