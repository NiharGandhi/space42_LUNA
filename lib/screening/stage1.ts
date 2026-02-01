import { db } from '@/lib/db';
import {
  applications,
  jobs,
  screeningStages,
  stage1Analysis,
  users,
} from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import {
  evaluateResumeMatrix,
  MATRIX_WEIGHTS,
  MATRIX_PASSING_THRESHOLD,
} from '@/lib/ai/resume-parser';
import { createHrCandidateSuggestions } from '@/lib/screening/hr-suggestions';
import { createNotification } from '@/lib/notifications/create';
import { sendStageResultEmail } from '@/lib/email/nodemailer';

const STAGE1_PASSING_THRESHOLD = MATRIX_PASSING_THRESHOLD;

/**
 * Run Stage 1 (resume) screening for an application.
 * Creates screening_stage + stage1_analysis, updates application status/score/aiSummary.
 * Call after application is created. No-op if no resume text or job not found.
 */
export async function runStage1Screening(applicationId: string): Promise<void> {
  const [appRow] = await db
    .select({
      id: applications.id,
      jobId: applications.jobId,
      candidateId: applications.candidateId,
      resumeText: applications.resumeText,
    })
    .from(applications)
    .where(eq(applications.id, applicationId))
    .limit(1);

  if (!appRow) return;
  if (!appRow.resumeText?.trim()) {
    await markStage1Skipped(applicationId, 'No resume text');
    return;
  }

  const [jobRow] = await db
    .select({
      id: jobs.id,
      title: jobs.title,
      description: jobs.description,
      requirements: jobs.requirements,
      responsibilities: jobs.responsibilities,
    })
    .from(jobs)
    .where(eq(jobs.id, appRow.jobId))
    .limit(1);

  if (!jobRow) {
    await markStage1Skipped(applicationId, 'Job not found');
    return;
  }

  const requirements = Array.isArray(jobRow.requirements)
    ? jobRow.requirements
    : [];
  const responsibilities = Array.isArray(jobRow.responsibilities)
    ? jobRow.responsibilities
    : [];

  const jobContext = {
    title: jobRow.title,
    description: jobRow.description ?? '',
    requirements,
    responsibilities,
  };

  const startedAt = new Date();

  const [newStage] = await db
    .insert(screeningStages)
    .values({
      applicationId,
      stageNumber: 1,
      status: 'in_progress',
      passingThreshold: String(STAGE1_PASSING_THRESHOLD),
      startedAt,
    })
    .returning();

  if (!newStage) return;

  try {
    const { matrix, parsed } = await evaluateResumeMatrix(
      appRow.resumeText.trim(),
      jobContext
    );

    const d = matrix.dimensionScores;
    const score = Math.round(
      (MATRIX_WEIGHTS.skills * d.skills +
        MATRIX_WEIGHTS.experience * d.experience +
        MATRIX_WEIGHTS.education * d.education) *
        100
    ) / 100;
    const clampedScore = Math.min(10, Math.max(0, score));
    const passed = clampedScore >= STAGE1_PASSING_THRESHOLD;
    const fitRating =
      clampedScore >= 7 ? 'high' : clampedScore >= 4 ? 'medium' : 'low';

    const strengths: string[] = [];
    if (matrix.skillsMatch.found.length > 0) {
      strengths.push(`Skills: ${matrix.skillsMatch.found.join(', ')}`);
    }
    if (matrix.experienceMatch.match) {
      strengths.push(`Experience: ${matrix.experienceMatch.found}`);
    }
    if (matrix.dimensionScores.education >= 5) {
      strengths.push(`Education: ${matrix.dimensionRationales.education}`);
    }
    if (strengths.length === 0) strengths.push('Resume submitted');

    const concerns: string[] = [
      ...(matrix.skillsMatch.missing.length > 0
        ? [`Missing skills: ${matrix.skillsMatch.missing.join(', ')}`]
        : []),
      ...matrix.gaps,
    ].filter(Boolean);

    const evaluationMatrix = {
      dimensions: [
        {
          name: 'Skills',
          score: d.skills,
          maxScore: 10,
          weight: MATRIX_WEIGHTS.skills,
          rationale: matrix.dimensionRationales.skills,
        },
        {
          name: 'Experience',
          score: d.experience,
          maxScore: 10,
          weight: MATRIX_WEIGHTS.experience,
          rationale: matrix.dimensionRationales.experience,
        },
        {
          name: 'Education',
          score: d.education,
          maxScore: 10,
          weight: MATRIX_WEIGHTS.education,
          rationale: matrix.dimensionRationales.education,
        },
      ],
      weights: MATRIX_WEIGHTS,
      overallScore: clampedScore,
      fitRating,
    };

    await db.insert(stage1Analysis).values({
      screeningStageId: newStage.id,
      skillsMatch: matrix.skillsMatch,
      experienceMatch: matrix.experienceMatch,
      educationMatch: parsed.education?.length
        ? { education: parsed.education }
        : null,
      strengths,
      concerns: concerns.length > 0 ? concerns : null,
      fitRating,
      score: String(clampedScore),
      evaluationMatrix,
    });

    const completedAt = new Date();
    await db
      .update(screeningStages)
      .set({
        status: 'completed',
        score: String(clampedScore),
        completedAt,
        updatedAt: completedAt,
      })
      .where(eq(screeningStages.id, newStage.id));

    await db
      .update(applications)
      .set({
        status: passed ? 'stage1_passed' : 'stage1_failed',
        currentStage: 1,
        overallScore: String(clampedScore),
        aiSummary: matrix.summary,
        updatedAt: completedAt,
      })
      .where(eq(applications.id, applicationId));
    if (!passed) {
      await createHrCandidateSuggestions(applicationId, appRow.jobId, 1);
    }
    const [jobRow] = await db.select({ title: jobs.title }).from(jobs).where(eq(jobs.id, appRow.jobId)).limit(1);
    const [candidateRow] = await db.select({ email: users.email }).from(users).where(eq(users.id, appRow.candidateId)).limit(1);
    if (jobRow && candidateRow) {
      await createNotification(appRow.candidateId, passed ? 'You advanced to the next stage' : 'Update on your application', {
        message: passed ? `You passed resume screening for ${jobRow.title}.` : `Your application for ${jobRow.title} did not advance.`,
        link: '/my-applications',
      });
      try {
        await sendStageResultEmail(candidateRow.email, jobRow.title, passed, 'resume screening');
      } catch (e) {
        console.error('sendStageResultEmail error:', e);
      }
    }
  } catch (err) {
    console.error('Stage 1 screening error:', err);
    await db
      .update(screeningStages)
      .set({
        status: 'failed',
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(screeningStages.id, newStage.id));
    await db
      .update(applications)
      .set({
        status: 'stage1_failed',
        currentStage: 1,
        updatedAt: new Date(),
      })
      .where(eq(applications.id, applicationId));
    await createHrCandidateSuggestions(applicationId, appRow.jobId, 1);
    const [jobRow] = await db.select({ title: jobs.title }).from(jobs).where(eq(jobs.id, appRow.jobId)).limit(1);
    const [candidateRow] = await db.select({ email: users.email }).from(users).where(eq(users.id, appRow.candidateId)).limit(1);
    if (jobRow && candidateRow) {
      await createNotification(appRow.candidateId, 'Update on your application', {
        message: `Your application for ${jobRow.title} did not advance past resume screening.`,
        link: '/my-applications',
      });
      try {
        await sendStageResultEmail(candidateRow.email, jobRow.title, false, 'resume screening');
      } catch (e) {
        console.error('sendStageResultEmail error:', e);
      }
    }
  }
}

async function markStage1Skipped(
  applicationId: string,
  _reason: string
): Promise<void> {
  const [stage] = await db
    .insert(screeningStages)
    .values({
      applicationId,
      stageNumber: 1,
      status: 'skipped',
      passingThreshold: String(STAGE1_PASSING_THRESHOLD),
    })
    .returning();
  if (stage) {
    await db
      .update(screeningStages)
      .set({ completedAt: new Date(), updatedAt: new Date() })
      .where(eq(screeningStages.id, stage.id));
  }
  await db
    .update(applications)
    .set({
      status: 'stage1_failed',
      currentStage: 1,
      updatedAt: new Date(),
    })
    .where(eq(applications.id, applicationId));
}

async function completeStage1NoMatch(
  applicationId: string,
  stageId: string
): Promise<void> {
  const [app] = await db
    .select({ jobId: applications.jobId })
    .from(applications)
    .where(eq(applications.id, applicationId))
    .limit(1);
  const completedAt = new Date();
  await db
    .update(screeningStages)
    .set({
      status: 'completed',
      score: '0',
      completedAt,
      updatedAt: completedAt,
    })
    .where(eq(screeningStages.id, stageId));
  await db
    .update(applications)
    .set({
      status: 'stage1_failed',
      currentStage: 1,
      overallScore: '0',
      aiSummary: 'Resume parsed but job match could not be computed.',
      updatedAt: completedAt,
    })
    .where(eq(applications.id, applicationId));
  if (app) await createHrCandidateSuggestions(applicationId, app.jobId, 1);
}
