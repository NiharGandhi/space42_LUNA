import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  applications,
  jobs,
  screeningStages,
  stage2Questions,
  stage2Answers,
} from '@/lib/db/schema';
import { getSessionUser } from '@/lib/auth/session';
import { eq, and, asc } from 'drizzle-orm';
import { runStage2Screening } from '@/lib/screening/stage2';

const submitAnswersSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string().uuid(),
      answerText: z.string().min(1),
    })
  ),
});

// GET /api/applications/[applicationId]/stage2 - Get Stage 2 questions for this application (candidate: only if stage1_passed and no stage 2 yet)
export async function GET(
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

    const { applicationId } = await params;

    const [app] = await db
      .select({
        id: applications.id,
        jobId: applications.jobId,
        status: applications.status,
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

    if (app.candidateId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Not your application' },
        { status: 403 }
      );
    }

    const canAnswer =
      app.status === 'stage1_passed' ||
      app.status.startsWith('stage2_');

    if (!canAnswer) {
      return NextResponse.json(
        {
          success: false,
          error: 'Stage 2 is not available for this application yet',
          status: app.status,
        },
        { status: 400 }
      );
    }

    const [stage2Row] = await db
      .select()
      .from(screeningStages)
      .where(
        and(
          eq(screeningStages.applicationId, applicationId),
          eq(screeningStages.stageNumber, 2)
        )
      )
      .limit(1);

    const questions = await db
      .select({
        id: stage2Questions.id,
        questionText: stage2Questions.questionText,
        questionOrder: stage2Questions.questionOrder,
        isRequired: stage2Questions.isRequired,
      })
      .from(stage2Questions)
      .where(eq(stage2Questions.jobId, app.jobId))
      .orderBy(asc(stage2Questions.questionOrder));

    if (questions.length === 0) {
      return NextResponse.json(
        {
          success: true,
          applicationId,
          jobId: app.jobId,
          questions: [],
        alreadySubmitted: !!stage2Row,
        message: 'No Stage 2 questions configured for this job.',
        },
        { status: 200 }
      );
    }

    const [jobRow] = await db
      .select({ title: jobs.title })
      .from(jobs)
      .where(eq(jobs.id, app.jobId))
      .limit(1);

    return NextResponse.json(
      {
        success: true,
        applicationId,
        jobId: app.jobId,
        jobTitle: jobRow?.title ?? '',
        questions,
        alreadySubmitted: !!stage2Row,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get Stage 2 questions error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch questions' },
      { status: 500 }
    );
  }
}

// POST /api/applications/[applicationId]/stage2 - Submit Stage 2 answers (candidate)
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

    const { applicationId } = await params;
    const body = await request.json();
    const data = submitAnswersSchema.parse(body);

    const [app] = await db
      .select({
        id: applications.id,
        jobId: applications.jobId,
        status: applications.status,
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

    if (app.candidateId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Not your application' },
        { status: 403 }
      );
    }

    if (app.status !== 'stage1_passed') {
      return NextResponse.json(
        {
          success: false,
          error: 'Stage 2 is not available for this application',
          status: app.status,
        },
        { status: 400 }
      );
    }

    const [existingStage2] = await db
      .select({ id: screeningStages.id })
      .from(screeningStages)
      .where(
        and(
          eq(screeningStages.applicationId, applicationId),
          eq(screeningStages.stageNumber, 2)
        )
      )
      .limit(1);

    if (existingStage2) {
      return NextResponse.json(
        { success: false, error: 'Stage 2 already submitted for this application' },
        { status: 400 }
      );
    }

    const jobQuestions = await db
      .select({ id: stage2Questions.id })
      .from(stage2Questions)
      .where(eq(stage2Questions.jobId, app.jobId));

    const questionIds = new Set(jobQuestions.map((q) => q.id));
    const submittedIds = new Set(data.answers.map((a) => a.questionId));

    if (submittedIds.size !== questionIds.size || [...questionIds].some((id) => !submittedIds.has(id))) {
      return NextResponse.json(
        { success: false, error: 'You must answer all questions' },
        { status: 400 }
      );
    }

    const [newStage] = await db
      .insert(screeningStages)
      .values({
        applicationId,
        stageNumber: 2,
        status: 'in_progress',
        passingThreshold: '5',
        startedAt: new Date(),
      })
      .returning();

    if (!newStage) {
      return NextResponse.json(
        { success: false, error: 'Failed to create Stage 2' },
        { status: 500 }
      );
    }

    for (const a of data.answers) {
      if (!questionIds.has(a.questionId)) continue;
      await db.insert(stage2Answers).values({
        screeningStageId: newStage.id,
        questionId: a.questionId,
        answerText: a.answerText.trim(),
      });
    }

    await runStage2Screening(newStage.id);

    return NextResponse.json(
      {
        success: true,
        message: 'Stage 2 answers submitted. Your application will be reviewed.',
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues?.[0]?.message ?? 'Invalid input' },
        { status: 400 }
      );
    }
    console.error('Submit Stage 2 error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit answers' },
      { status: 500 }
    );
  }
}
