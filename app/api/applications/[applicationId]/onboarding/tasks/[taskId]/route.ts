import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  applications,
  onboardingFlows,
  onboardingTasks,
} from '@/lib/db/schema';
import { getSessionUser } from '@/lib/auth/session';
import { eq, and } from 'drizzle-orm';

const ALLOWED_STATUSES = ['pending', 'in_progress', 'completed'] as const;

/**
 * PATCH /api/applications/[applicationId]/onboarding/tasks/[taskId]
 * HR only. Update task status (approve upload, request changes, or mark in progress/complete).
 * Body: { status: 'pending' | 'in_progress' | 'completed', notes?: string }
 * - completed = approve (for upload steps) or mark done (e.g. IT step)
 * - pending + notes = request changes (candidate can re-upload)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string; taskId: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (user.role !== 'hr' && user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Only HR can update onboarding tasks' }, { status: 403 });
    }

    const { applicationId, taskId } = await params;
    const body = await request.json().catch(() => ({}));
    const status = typeof body.status === 'string' && ALLOWED_STATUSES.includes(body.status as (typeof ALLOWED_STATUSES)[number])
      ? (body.status as (typeof ALLOWED_STATUSES)[number])
      : null;
    const notes = typeof body.notes === 'string' ? body.notes.trim() || null : null;

    if (!status) {
      return NextResponse.json(
        { success: false, error: 'status must be one of: pending, in_progress, completed' },
        { status: 400 }
      );
    }

    const [app] = await db
      .select({ id: applications.id, status: applications.status })
      .from(applications)
      .where(eq(applications.id, applicationId))
      .limit(1);

    if (!app || app.status !== 'hired') {
      return NextResponse.json(
        { success: false, error: 'Application not found or not hired' },
        { status: 404 }
      );
    }

    const [flow] = await db
      .select({ id: onboardingFlows.id })
      .from(onboardingFlows)
      .where(eq(onboardingFlows.applicationId, applicationId))
      .limit(1);

    if (!flow) {
      return NextResponse.json(
        { success: false, error: 'No onboarding flow' },
        { status: 404 }
      );
    }

    const [task] = await db
      .select()
      .from(onboardingTasks)
      .where(
        and(
          eq(onboardingTasks.id, taskId),
          eq(onboardingTasks.onboardingFlowId, flow.id)
        )
      )
      .limit(1);

    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    const now = new Date();
    await db
      .update(onboardingTasks)
      .set({
        status,
        ...(status === 'completed' ? { completedAt: now } : { completedAt: null }),
        ...(notes !== undefined ? { notes } : {}),
        updatedAt: now,
      })
      .where(eq(onboardingTasks.id, taskId));

    const [updated] = await db
      .select()
      .from(onboardingTasks)
      .where(eq(onboardingTasks.id, taskId))
      .limit(1);

    return NextResponse.json({
      success: true,
      task: updated
        ? {
            id: updated.id,
            taskTitle: updated.taskTitle,
            status: updated.status,
            completedAt: updated.completedAt,
            notes: updated.notes,
          }
        : null,
    });
  } catch (error) {
    console.error('HR onboarding task PATCH error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update task' },
      { status: 500 }
    );
  }
}
