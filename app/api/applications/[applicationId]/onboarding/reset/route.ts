import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  applications,
  onboardingFlows,
  onboardingTasks,
  onboardingTemplateTasks,
} from '@/lib/db/schema';
import { getSessionUser } from '@/lib/auth/session';
import { eq, asc } from 'drizzle-orm';
import { ensureDefaultOnboardingTemplate } from '@/lib/onboarding/ensure-default-template';

/**
 * POST /api/applications/[applicationId]/onboarding/reset
 * HR only. Replaces the candidate's onboarding with the current default template (new steps).
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (user.role !== 'hr' && user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Only HR can reset onboarding' }, { status: 403 });
    }

    const { applicationId } = await params;

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
      .select()
      .from(onboardingFlows)
      .where(eq(onboardingFlows.applicationId, applicationId))
      .limit(1);

    if (!flow) {
      return NextResponse.json(
        { success: false, error: 'No onboarding flow to reset' },
        { status: 404 }
      );
    }

    const template = await ensureDefaultOnboardingTemplate(user.id);
    const templateTasks = await db
      .select()
      .from(onboardingTemplateTasks)
      .where(eq(onboardingTemplateTasks.templateId, template.id))
      .orderBy(asc(onboardingTemplateTasks.taskOrder));

    const now = new Date();

    await db.delete(onboardingTasks).where(eq(onboardingTasks.onboardingFlowId, flow.id));

    await db
      .update(onboardingFlows)
      .set({
        templateId: template.id,
        status: 'not_started',
        startedAt: null,
        completedAt: null,
      })
      .where(eq(onboardingFlows.id, flow.id));

    if (templateTasks.length > 0) {
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

    return NextResponse.json({
      success: true,
      message: 'Onboarding reset with current default template.',
    });
  } catch (error) {
    console.error('Onboarding reset error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reset onboarding' },
      { status: 500 }
    );
  }
}
