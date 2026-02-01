import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { applications, screeningStages, jobs, users } from '@/lib/db/schema';
import { getSessionUser } from '@/lib/auth/session';
import { eq } from 'drizzle-orm';
import { createHrCandidateSuggestions } from '@/lib/screening/hr-suggestions';
import { createNotification } from '@/lib/notifications/create';
import { sendStageResultEmail } from '@/lib/email/nodemailer';

type Action = 'pass' | 'fail';
type Stage = 1 | 2 | 3;

const VALID_PASS: Record<Stage, string[]> = {
  1: ['submitted', 'stage1_failed'],
  2: ['stage1_passed', 'stage2_failed'],
  3: ['stage2_passed', 'stage3_failed'],
};
const VALID_FAIL: Record<Stage, string[]> = {
  1: ['submitted'],
  2: ['stage1_passed'],
  3: ['stage2_passed'],
};
const NEXT_STATUS_PASS: Record<Stage, string> = {
  1: 'stage1_passed',
  2: 'stage2_passed',
  3: 'stage3_passed',
};
const NEXT_STATUS_FAIL: Record<Stage, string> = {
  1: 'stage1_failed',
  2: 'stage2_failed',
  3: 'stage3_failed',
};

/**
 * POST /api/applications/[applicationId]/status
 * Body: { action: 'pass' | 'fail', stage: 1 | 2 | 3 }
 * HR only. Manually set application to passed or failed for the given stage.
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
        { success: false, error: 'Only HR can update application status' },
        { status: 403 }
      );
    }

    const { applicationId } = await params;
    const body = await request.json();
    const action = body?.action as Action | undefined;
    const stage = body?.stage as Stage | undefined;

    if (action !== 'pass' && action !== 'fail') {
      return NextResponse.json(
        { success: false, error: 'Invalid action; use pass or fail' },
        { status: 400 }
      );
    }
    if (stage !== 1 && stage !== 2 && stage !== 3) {
      return NextResponse.json(
        { success: false, error: 'Invalid stage; use 1, 2, or 3' },
        { status: 400 }
      );
    }

    const [app] = await db
      .select({ id: applications.id, status: applications.status, jobId: applications.jobId, candidateId: applications.candidateId })
      .from(applications)
      .where(eq(applications.id, applicationId))
      .limit(1);

    if (!app) {
      return NextResponse.json(
        { success: false, error: 'Application not found' },
        { status: 404 }
      );
    }

    const validStatuses = action === 'pass' ? VALID_PASS[stage] : VALID_FAIL[stage];
    if (!validStatuses.includes(app.status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot ${action} stage ${stage} when application status is ${app.status}`,
        },
        { status: 400 }
      );
    }

    const newStatus = action === 'pass' ? NEXT_STATUS_PASS[stage] : NEXT_STATUS_FAIL[stage];
    const stageStatus = action === 'pass' ? 'completed' : 'failed';
    const now = new Date();

    // Ensure screening stage row exists
    const existingStages = await db
      .select({ id: screeningStages.id, stageNumber: screeningStages.stageNumber })
      .from(screeningStages)
      .where(eq(screeningStages.applicationId, applicationId));
    const existingStageForN = existingStages.find((s) => s.stageNumber === stage);

    if (!existingStageForN) {
      const [inserted] = await db
        .insert(screeningStages)
        .values({
          applicationId,
          stageNumber: stage,
          status: stageStatus,
          completedAt: now,
          updatedAt: now,
        })
        .returning();
      if (!inserted) {
        return NextResponse.json(
          { success: false, error: 'Failed to create screening stage' },
          { status: 500 }
        );
      }
    } else {
      await db
        .update(screeningStages)
        .set({
          status: stageStatus,
          completedAt: now,
          updatedAt: now,
        })
        .where(eq(screeningStages.id, existingStageForN.id));
    }

    await db
      .update(applications)
      .set({
        status: newStatus as (typeof applications.$inferSelect)['status'],
        currentStage: stage,
        updatedAt: now,
      })
      .where(eq(applications.id, applicationId));

    if (action === 'fail') {
      await createHrCandidateSuggestions(applicationId, app.jobId, stage);
    }

    const stageLabel = stage === 1 ? 'resume screening' : stage === 2 ? 'questions' : 'voice interview';
    const passed = action === 'pass';
    const [jobRow] = await db.select({ title: jobs.title }).from(jobs).where(eq(jobs.id, app.jobId)).limit(1);
    const [candidateRow] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.id, app.candidateId))
      .limit(1);
    if (candidateRow && jobRow) {
      await createNotification(candidateRow.id, passed ? 'You advanced to the next stage' : 'Update on your application', {
        message: passed
          ? `You passed ${stageLabel} for ${jobRow.title}. Check your dashboard for next steps.`
          : `Your application for ${jobRow.title} did not advance past ${stageLabel}.`,
        link: '/my-applications',
      });
      try {
        await sendStageResultEmail(candidateRow.email, jobRow.title, passed, stageLabel);
      } catch (e) {
        console.error('sendStageResultEmail error:', e);
      }
    }

    return NextResponse.json({
      success: true,
      status: newStatus,
      message: `Application ${action === 'pass' ? 'passed' : 'failed'} stage ${stage}`,
    });
  } catch (error) {
    console.error('Update application status error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update status' },
      { status: 500 }
    );
  }
}
