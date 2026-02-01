import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  applications,
  jobs,
  users,
  onboardingTemplates,
  onboardingTemplateTasks,
  onboardingFlows,
  onboardingTasks,
} from '@/lib/db/schema';
import { getSessionUser } from '@/lib/auth/session';
import { eq, asc } from 'drizzle-orm';
import { createNotification } from '@/lib/notifications/create';
import { sendHiredEmail } from '@/lib/email/nodemailer';
import { ensureDefaultOnboardingTemplate } from '@/lib/onboarding/ensure-default-template';

/**
 * POST /api/applications/[applicationId]/hire
 * HR only. Mark application as hired and create onboarding flow from default template.
 */
export async function POST(
  _request: Request,
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
        { success: false, error: 'Only HR can mark as hired' },
        { status: 403 }
      );
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
      return NextResponse.json(
        { success: false, error: 'Application not found' },
        { status: 404 }
      );
    }
    if (app.status !== 'stage3_passed') {
      return NextResponse.json(
        { success: false, error: 'Only applications that passed all 3 stages can be marked as hired' },
        { status: 400 }
      );
    }

    // Default template: isDefault true, or first template; if none, create default
    let template = await ensureDefaultOnboardingTemplate(user.id);

    const templateTasks = await db
      .select()
      .from(onboardingTemplateTasks)
      .where(eq(onboardingTemplateTasks.templateId, template.id))
      .orderBy(asc(onboardingTemplateTasks.taskOrder));

    const now = new Date();

    await db
      .update(applications)
      .set({ status: 'hired', updatedAt: now })
      .where(eq(applications.id, applicationId));

    const [flow] = await db
      .insert(onboardingFlows)
      .values({
        applicationId,
        templateId: template.id,
        status: 'not_started',
        createdAt: now,
      })
      .returning();

    if (flow && templateTasks.length > 0) {
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

    const [jobRow] = await db
      .select({ title: jobs.title })
      .from(jobs)
      .where(eq(jobs.id, app.jobId))
      .limit(1);
    const jobTitle = jobRow?.title ?? 'the role';

    const [candidate] = await db
      .select({ email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, app.candidateId))
      .limit(1);

    if (candidate) {
      await createNotification(app.candidateId, "You're hired!", {
        message: `You have been offered the position: ${jobTitle}. Complete onboarding in your dashboard.`,
        link: '/my-applications',
      });
      try {
        await sendHiredEmail(candidate.email, jobTitle);
      } catch (e) {
        console.error('sendHiredEmail error:', e);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Candidate marked as hired and onboarding flow created',
      onboardingFlowId: flow?.id,
    });
  } catch (error) {
    console.error('Hire application error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to mark as hired' },
      { status: 500 }
    );
  }
}
