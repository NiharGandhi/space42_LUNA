import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  applications,
  jobs,
  screeningStages,
  stage3Interviews,
} from '@/lib/db/schema';
import type { InferSelectModel } from 'drizzle-orm';
import { getSessionUser } from '@/lib/auth/session';
import { eq, and } from 'drizzle-orm';
import { getVapiClient, getVapiPublicKey } from '@/lib/vapi/client';
import { buildInterviewAssistantDto } from '@/lib/vapi/interview-assistant';

type ScreeningStageRow = InferSelectModel<typeof screeningStages>;
type Stage3InterviewRow = InferSelectModel<typeof stage3Interviews>;

const STAGE3_PASSING_THRESHOLD = 5;

// GET /api/applications/[applicationId]/stage3/config - Get VAPI config to start Stage 3 voice interview (candidate only)
export async function GET(
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

    if (app.status !== 'stage2_passed') {
      return NextResponse.json(
        {
          success: false,
          error: 'Stage 3 is only available after passing Stage 2',
          status: app.status,
        },
        { status: 400 }
      );
    }

    // Find or create Stage 3 screening stage and stage3_interviews
    const existingStages = await db
      .select()
      .from(screeningStages)
      .where(
        and(
          eq(screeningStages.applicationId, applicationId),
          eq(screeningStages.stageNumber, 3)
        )
      )
      .limit(1);

    let stage3Row!: ScreeningStageRow;
    if (existingStages[0]) {
      stage3Row = existingStages[0];
    } else {
      const [newStage] = await db
        .insert(screeningStages)
        .values({
          applicationId,
          stageNumber: 3,
          status: 'pending',
          passingThreshold: String(STAGE3_PASSING_THRESHOLD),
        })
        .returning();
      if (!newStage) {
        return NextResponse.json(
          { success: false, error: 'Failed to create Stage 3' },
          { status: 500 }
        );
      }
      stage3Row = newStage;
    }

    const existingInterview = await db
      .select()
      .from(stage3Interviews)
      .where(eq(stage3Interviews.screeningStageId, stage3Row.id))
      .limit(1);

    let interview!: Stage3InterviewRow;
    if (existingInterview[0]) {
      interview = existingInterview[0];
    } else {
      const [newInterview] = await db
        .insert(stage3Interviews)
        .values({ screeningStageId: stage3Row.id })
        .returning();
      if (!newInterview) {
        return NextResponse.json(
          { success: false, error: 'Stage 3 interview record not found' },
          { status: 500 }
        );
      }
      interview = newInterview;
    }

    let assistantId = interview.vapiAssistantId;

    if (!assistantId) {
      const [jobRow] = await db
        .select({
          title: jobs.title,
          description: jobs.description,
        })
        .from(jobs)
        .where(eq(jobs.id, app.jobId))
        .limit(1);

      if (!jobRow) {
        return NextResponse.json(
          { success: false, error: 'Job not found' },
          { status: 404 }
        );
      }

      const vapi = getVapiClient();
      const assistantDto = buildInterviewAssistantDto({
        jobTitle: jobRow.title,
        jobDescription: jobRow.description ?? '',
        stage3InterviewId: interview.id,
      });

      const assistant = await vapi.assistants.create(assistantDto);
      assistantId = assistant.id;

      await db
        .update(stage3Interviews)
        .set({ vapiAssistantId: assistantId })
        .where(eq(stage3Interviews.id, interview.id));
    }

    const publicKey = getVapiPublicKey();

    const [jobRow] = await db
      .select({ title: jobs.title })
      .from(jobs)
      .where(eq(jobs.id, app.jobId))
      .limit(1);

    return NextResponse.json({
      success: true,
      publicKey,
      assistantId,
      jobTitle: jobRow?.title ?? '',
    });
  } catch (err) {
    console.error('Stage 3 config error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to get Stage 3 config' },
      { status: 500 }
    );
  }
}
