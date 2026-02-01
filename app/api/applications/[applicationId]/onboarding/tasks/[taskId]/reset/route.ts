import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  applications,
  onboardingFlows,
  onboardingTasks,
} from '@/lib/db/schema';
import { getSessionUser } from '@/lib/auth/session';
import { eq, and } from 'drizzle-orm';

/**
 * POST /api/applications/[applicationId]/onboarding/tasks/[taskId]/reset
 * HR only. Resets a single onboarding task to pending (clear completedAt and attachments).
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ applicationId: string; taskId: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (user.role !== 'hr' && user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Only HR can reset tasks' }, { status: 403 });
    }

    const { applicationId, taskId } = await params;

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
      .select({ id: onboardingTasks.id })
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
        status: 'pending',
        completedAt: null,
        attachments: null,
        updatedAt: now,
      })
      .where(eq(onboardingTasks.id, taskId));

    return NextResponse.json({
      success: true,
      message: 'Task reset to pending.',
    });
  } catch (error) {
    console.error('Onboarding task reset error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reset task' },
      { status: 500 }
    );
  }
}
