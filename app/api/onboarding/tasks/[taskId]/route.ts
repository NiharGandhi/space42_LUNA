import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  applications,
  onboardingFlows,
  onboardingTasks,
} from '@/lib/db/schema';
import { getSessionUser } from '@/lib/auth/session';
import { eq, and } from 'drizzle-orm';

/**
 * PATCH /api/onboarding/tasks/[taskId]
 * Candidate can mark their own onboarding task as completed (or in_progress).
 * Body: { status: 'completed' | 'in_progress' }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { taskId } = await params;
    const body = await request.json().catch(() => ({}));
    const status = body.status === 'completed' || body.status === 'in_progress' ? body.status : 'completed';

    const [app] = await db
      .select({ id: applications.id })
      .from(applications)
      .where(and(eq(applications.candidateId, user.id), eq(applications.status, 'hired')))
      .limit(1);

    if (!app || app.id === undefined) {
      return NextResponse.json({ success: false, error: 'No hiring record found' }, { status: 403 });
    }

    const [flow] = await db
      .select({ id: onboardingFlows.id })
      .from(onboardingFlows)
      .where(eq(onboardingFlows.applicationId, app.id))
      .limit(1);

    if (!flow) {
      return NextResponse.json({ success: false, error: 'No onboarding flow' }, { status: 403 });
    }

    const [task] = await db
      .select({
        id: onboardingTasks.id,
        submissionDescription: onboardingTasks.submissionDescription,
        completedAt: onboardingTasks.completedAt,
      })
      .from(onboardingTasks)
      .where(
        and(
          eq(onboardingTasks.id, taskId),
          eq(onboardingTasks.onboardingFlowId, flow.id)
        )
      )
      .limit(1);

    if (!task) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
    }

    // Upload-doc tasks: only dept can mark complete (approve). Candidate can set in_progress only.
    if (task.submissionDescription && status === 'completed') {
      return NextResponse.json(
        { success: false, error: 'This step requires approval from the team. Submit your document and they’ll mark it complete.' },
        { status: 400 }
      );
    }

    const now = new Date();
    await db
      .update(onboardingTasks)
      .set({
        status,
        ...(status === 'completed' ? { completedAt: now } : {}),
        updatedAt: now,
      })
      .where(eq(onboardingTasks.id, taskId));

    return NextResponse.json({
      success: true,
      task: { id: taskId, status, completedAt: status === 'completed' ? now : task.completedAt },
    });
  } catch (error) {
    console.error('Onboarding task PATCH error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update task' },
      { status: 500 }
    );
  }
}
