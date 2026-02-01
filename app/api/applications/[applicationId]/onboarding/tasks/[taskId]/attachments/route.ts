import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  applications,
  onboardingFlows,
  onboardingTasks,
} from '@/lib/db/schema';
import { getSessionUser } from '@/lib/auth/session';
import { eq, and } from 'drizzle-orm';
import { getSignedUrlForKey } from '@/lib/storage/r2';

/**
 * GET /api/applications/[applicationId]/onboarding/tasks/[taskId]/attachments
 * HR only. Returns signed download URLs for the candidate's uploaded documents (1h expiry).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ applicationId: string; taskId: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (user.role !== 'hr' && user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Only HR can view onboarding attachments' },
        { status: 403 }
      );
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
      .select({ id: onboardingTasks.id, attachments: onboardingTasks.attachments })
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

    const fileKeys = Array.isArray(task.attachments) ? task.attachments : [];
    if (fileKeys.length === 0) {
      return NextResponse.json({
        success: true,
        attachments: [],
      });
    }

    const attachments = await Promise.all(
      fileKeys.map(async (fileKey: string) => {
        const url = await getSignedUrlForKey(fileKey);
        const name = fileKey.split('/').pop() ?? fileKey;
        return { fileKey, name, url };
      })
    );

    return NextResponse.json({
      success: true,
      attachments,
    });
  } catch (error) {
    console.error('HR onboarding attachments GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get attachment URLs' },
      { status: 500 }
    );
  }
}
