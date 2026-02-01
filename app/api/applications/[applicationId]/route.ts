import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  applications,
  jobs,
  users,
  screeningStages,
  stage1Analysis,
  stage2Answers,
  stage2Questions,
  stage3Interviews,
} from '@/lib/db/schema';
import { getSessionUser } from '@/lib/auth/session';
import { eq, inArray, asc } from 'drizzle-orm';

// GET /api/applications/[applicationId] - Get one application with job, candidate, stages, stage1 analysis (HR only)
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
    if (user.role !== 'hr' && user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Only HR can view application details' },
        { status: 403 }
      );
    }

    const { applicationId } = await params;

    // Application + job + candidate
    const [row] = await db
      .select({
        id: applications.id,
        jobId: applications.jobId,
        candidateId: applications.candidateId,
        status: applications.status,
        currentStage: applications.currentStage,
        overallScore: applications.overallScore,
        aiSummary: applications.aiSummary,
        resumeUrl: applications.resumeUrl,
        resumeFileKey: applications.resumeFileKey,
        coverLetter: applications.coverLetter,
        linkedinUrl: applications.linkedinUrl,
        portfolioUrl: applications.portfolioUrl,
        candidateProfile: applications.candidateProfile,
        createdAt: applications.createdAt,
        updatedAt: applications.updatedAt,
        jobTitle: jobs.title,
        jobDepartment: jobs.department,
        jobLocation: jobs.location,
        jobStatus: jobs.status,
        jobDescription: jobs.description,
        candidateEmail: users.email,
        candidateName: users.name,
      })
      .from(applications)
      .innerJoin(jobs, eq(applications.jobId, jobs.id))
      .innerJoin(users, eq(applications.candidateId, users.id))
      .where(eq(applications.id, applicationId))
      .limit(1);

    if (!row) {
      return NextResponse.json(
        { success: false, error: 'Application not found' },
        { status: 404 }
      );
    }

    // Screening stages for this application
    const stages = await db
      .select()
      .from(screeningStages)
      .where(eq(screeningStages.applicationId, applicationId))
      .orderBy(asc(screeningStages.stageNumber));

    // Stage 1 analysis (try full select including evaluation_matrix; fallback to columns without it if column not migrated yet)
    const stage1Ids = stages.filter((s) => s.stageNumber === 1).map((s) => s.id);
    let stage1Rows: Array<{
      id: string;
      screeningStageId: string;
      skillsMatch: unknown;
      experienceMatch: unknown;
      educationMatch: unknown;
      strengths: unknown;
      concerns: unknown;
      fitRating: string | null;
      score: string;
      evaluationMatrix?: unknown;
    }> = [];
    if (stage1Ids.length > 0) {
      try {
        stage1Rows = await db
          .select()
          .from(stage1Analysis)
          .where(inArray(stage1Analysis.screeningStageId, stage1Ids));
      } catch {
        stage1Rows = await db
          .select({
            id: stage1Analysis.id,
            screeningStageId: stage1Analysis.screeningStageId,
            skillsMatch: stage1Analysis.skillsMatch,
            experienceMatch: stage1Analysis.experienceMatch,
            educationMatch: stage1Analysis.educationMatch,
            strengths: stage1Analysis.strengths,
            concerns: stage1Analysis.concerns,
            fitRating: stage1Analysis.fitRating,
            score: stage1Analysis.score,
          })
          .from(stage1Analysis)
          .where(inArray(stage1Analysis.screeningStageId, stage1Ids))
          .then((rows) => rows.map((r) => ({ ...r, evaluationMatrix: null })));
      }
    }

    // Stage 3 interviews for stage 3 screening
    const stage3Ids = stages.filter((s) => s.stageNumber === 3).map((s) => s.id);
    const stage3InterviewRows =
      stage3Ids.length > 0
        ? await db
            .select()
            .from(stage3Interviews)
            .where(inArray(stage3Interviews.screeningStageId, stage3Ids))
        : [];

    // Stage 2 answers (with question text) for stage 2 screening
    const stage2Ids = stages.filter((s) => s.stageNumber === 2).map((s) => s.id);
    const stage2AnswerRows =
      stage2Ids.length > 0
        ? await db
            .select({
              id: stage2Answers.id,
              screeningStageId: stage2Answers.screeningStageId,
              questionId: stage2Answers.questionId,
              questionText: stage2Questions.questionText,
              questionOrder: stage2Questions.questionOrder,
              answerText: stage2Answers.answerText,
              aiScore: stage2Answers.aiScore,
              aiFeedback: stage2Answers.aiFeedback,
            })
            .from(stage2Answers)
            .innerJoin(stage2Questions, eq(stage2Answers.questionId, stage2Questions.id))
            .where(inArray(stage2Answers.screeningStageId, stage2Ids))
            .orderBy(asc(stage2Questions.questionOrder))
        : [];

    // Build stages with nested stage1Analysis for stage 1, stage2Answers for stage 2
    const stagesWithDetails = stages.map((stage) => {
      const base = {
        id: stage.id,
        stageNumber: stage.stageNumber,
        status: stage.status,
        score: stage.score,
        passingThreshold: stage.passingThreshold,
        startedAt: stage.startedAt,
        completedAt: stage.completedAt,
        aiEvaluation: stage.aiEvaluation,
      };
      if (stage.stageNumber === 1) {
        const analysis = stage1Rows.find(
          (r) => r.screeningStageId === stage.id
        );
        return {
          ...base,
          stage1Analysis: analysis
            ? {
                skillsMatch: analysis.skillsMatch,
                experienceMatch: analysis.experienceMatch,
                educationMatch: analysis.educationMatch,
                strengths: analysis.strengths,
                concerns: analysis.concerns,
                fitRating: analysis.fitRating,
                score: analysis.score,
                evaluationMatrix: (analysis as { evaluationMatrix?: unknown }).evaluationMatrix ?? null,
              }
            : null,
        };
      }
      if (stage.stageNumber === 2) {
        const answers = stage2AnswerRows
          .filter((r) => r.screeningStageId === stage.id)
          .map((r) => ({
            questionId: r.questionId,
            questionText: r.questionText,
            questionOrder: r.questionOrder,
            answerText: r.answerText,
            aiScore: r.aiScore,
            aiFeedback: r.aiFeedback,
          }));
        return { ...base, stage2Answers: answers };
      }
      if (stage.stageNumber === 3) {
        const interview = stage3InterviewRows.find(
          (r) => r.screeningStageId === stage.id
        );
        return {
          ...base,
          stage3Interview: interview
            ? {
                id: interview.id,
                transcript: interview.transcript,
                recordingUrl: interview.recordingUrl,
                callDuration: interview.callDuration,
                communicationScore: interview.communicationScore,
                problemSolvingScore: interview.problemSolvingScore,
                roleUnderstandingScore: interview.roleUnderstandingScore,
                overallScore: interview.overallScore,
                strengths: interview.strengths,
                weaknesses: interview.weaknesses,
                evaluationMatrix: (interview as { evaluationMatrix?: unknown }).evaluationMatrix ?? null,
                completedAt: interview.completedAt,
              }
            : null,
        };
      }
      return base;
    });

    const payload = {
      id: row.id,
      jobId: row.jobId,
      candidateId: row.candidateId,
      status: row.status,
      currentStage: row.currentStage,
      overallScore: row.overallScore,
      aiSummary: row.aiSummary,
      resumeUrl: row.resumeUrl,
      resumeFileKey: row.resumeFileKey,
      coverLetter: row.coverLetter,
      linkedinUrl: row.linkedinUrl,
      portfolioUrl: row.portfolioUrl,
      candidateProfile: row.candidateProfile,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      job: {
        id: row.jobId,
        title: row.jobTitle,
        department: row.jobDepartment,
        location: row.jobLocation,
        status: row.jobStatus,
        description: row.jobDescription,
      },
      candidate: {
        id: row.candidateId,
        email: row.candidateEmail,
        name: row.candidateName,
      },
      screeningStages: stagesWithDetails,
    };

    return NextResponse.json({ success: true, application: payload }, { status: 200 });
  } catch (error) {
    console.error('Get application error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch application' },
      { status: 500 }
    );
  }
}
