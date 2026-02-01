import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  applications,
  onboardingFlows,
  onboardingTasks,
} from '@/lib/db/schema';
import { getSessionUser } from '@/lib/auth/session';
import { eq, and } from 'drizzle-orm';
import { uploadOnboardingSubmissionToR2 } from '@/lib/storage/r2';

const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * POST /api/onboarding/tasks/[taskId]/upload
 * Candidate uploads a document for this onboarding task. Appends to task.attachments.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { taskId } = await params;

    const [app] = await db
      .select({ id: applications.id })
      .from(applications)
      .where(and(eq(applications.candidateId, user.id), eq(applications.status, 'hired')))
      .limit(1);

    if (!app?.id) {
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
        attachments: onboardingTasks.attachments,
        submissionDescription: onboardingTasks.submissionDescription,
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

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Only PDF, DOCX, and images are allowed' },
        { status: 400 }
      );
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File must be under 10MB' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { fileKey } = await uploadOnboardingSubmissionToR2(
      buffer,
      file.name,
      file.type,
      flow.id,
      taskId
    );

    const current = Array.isArray(task.attachments) ? task.attachments : [];
    const attachments = [...current, fileKey];
    const now = new Date();
    // Upload-doc tasks: set status to 'submitted' so dept can approve; candidate sees "Pending review"
    const isUploadDocTask = !!task.submissionDescription;
    await db
      .update(onboardingTasks)
      .set({
        attachments,
        ...(isUploadDocTask ? { status: 'submitted' as const } : {}),
        updatedAt: now,
      })
      .where(eq(onboardingTasks.id, taskId));

    return NextResponse.json({
      success: true,
      fileKey,
      attachments,
    });
  } catch (error) {
    console.error('Onboarding task upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload' },
      { status: 500 }
    );
  }
}
