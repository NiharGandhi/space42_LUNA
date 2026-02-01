import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  applications,
  jobs,
  screeningStages,
  stage1Analysis,
  stage2Answers,
  stage3Interviews,
} from '@/lib/db/schema';
import { getSessionUser } from '@/lib/auth/session';
import { eq, and } from 'drizzle-orm';

// GET /api/applications/[applicationId]/outcome - Candidate: get outcome and optional feedback when application ended (failed or passed)
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
    if (user.role !== 'candidate') {
      return NextResponse.json(
        { success: false, error: 'Only candidates can view outcome' },
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

    if (!app || app.candidateId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Application not found' },
        { status: 404 }
      );
    }

    const isFailed = app.status.endsWith('_failed');
    const isPassed = app.status === 'stage3_passed';
    const stage = app.status.startsWith('stage1')
      ? 1
      : app.status.startsWith('stage2')
        ? 2
        : app.status.startsWith('stage3')
          ? 3
          : null;

    let message = '';
    let strengths: string[] = [];
    let areasToImprove: string[] = [];

    if (isFailed && stage) {
      if (stage === 1) {
        message =
          'Your application did not advance past resume screening for this role. We encourage you to apply to other positions that match your experience.';
        const [stageRow] = await db
          .select()
          .from(screeningStages)
          .where(
            and(
              eq(screeningStages.applicationId, applicationId),
              eq(screeningStages.stageNumber, 1)
            )
          )
          .limit(1);
        if (stageRow) {
          const [analysis] = await db
            .select()
            .from(stage1Analysis)
            .where(eq(stage1Analysis.screeningStageId, stageRow.id))
            .limit(1);
          if (analysis) {
            strengths = Array.isArray(analysis.strengths) ? (analysis.strengths as string[]) : [];
            areasToImprove = Array.isArray(analysis.concerns) ? (analysis.concerns as string[]) : [];
          }
        }
      } else if (stage === 2) {
        message =
          'Your application did not advance past the questions stage for this role. Consider applying to other open positions.';
        const [stageRow] = await db
          .select()
          .from(screeningStages)
          .where(
            and(
              eq(screeningStages.applicationId, applicationId),
              eq(screeningStages.stageNumber, 2)
            )
          )
          .limit(1);
        if (stageRow) {
          const answers = await db
            .select({ aiFeedback: stage2Answers.aiFeedback })
            .from(stage2Answers)
            .where(eq(stage2Answers.screeningStageId, stageRow.id));
          const feedbacks = answers.map((a) => a.aiFeedback).filter(Boolean) as string[];
          if (feedbacks.length) areasToImprove = feedbacks.slice(0, 3);
        }
      } else if (stage === 3) {
        message =
          'Your application did not advance past the voice interview for this role. We encourage you to explore other roles that fit your profile.';
        const [stageRow] = await db
          .select()
          .from(screeningStages)
          .where(
            and(
              eq(screeningStages.applicationId, applicationId),
              eq(screeningStages.stageNumber, 3)
            )
          )
          .limit(1);
        if (stageRow) {
          const [interview] = await db
            .select()
            .from(stage3Interviews)
            .where(eq(stage3Interviews.screeningStageId, stageRow.id))
            .limit(1);
          if (interview) {
            strengths = Array.isArray(interview.strengths) ? (interview.strengths as string[]) : [];
            areasToImprove = Array.isArray(interview.weaknesses) ? (interview.weaknesses as string[]) : [];
          }
        }
      }
    }

    if (isPassed) {
      message = 'You’ve completed all stages for this role. We’ll be in touch if we move forward.';
    }

    const [job] = await db
      .select({ title: jobs.title, department: jobs.department })
      .from(jobs)
      .where(eq(jobs.id, app.jobId))
      .limit(1);

    return NextResponse.json({
      success: true,
      outcome: {
        status: app.status,
        stage,
        passed: isPassed,
        failed: isFailed,
        message: message || (isFailed ? 'This application has ended.' : ''),
        strengths,
        areasToImprove,
        jobTitle: job?.title ?? '',
        jobDepartment: job?.department ?? '',
      },
    });
  } catch (err) {
    console.error('Outcome API error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to load outcome' },
      { status: 500 }
    );
  }
}
