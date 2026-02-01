import { db } from '@/lib/db';
import {
  applications,
  jobs,
  screeningStages,
  stage2Answers,
  stage2Questions,
  users,
} from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { openai } from '@/lib/ai/openai';
import { createHrCandidateSuggestions } from '@/lib/screening/hr-suggestions';
import { createNotification } from '@/lib/notifications/create';
import { sendStageResultEmail } from '@/lib/email/nodemailer';

const STAGE2_PASSING_THRESHOLD = 5;

/** Weights for Stage 2 evaluation matrix (must sum to 1) */
const STAGE2_MATRIX_WEIGHTS = {
  relevance: 0.4,
  clarity: 0.3,
  role_fit: 0.3,
} as const;

/**
 * Run Stage 2 (custom questions) screening: evaluate answers with AI, update scores and application status.
 * Call after candidate has submitted Stage 2 answers.
 */
export async function runStage2Screening(screeningStageId: string): Promise<void> {
  const [stage] = await db
    .select()
    .from(screeningStages)
    .where(eq(screeningStages.id, screeningStageId))
    .limit(1);

  if (!stage || stage.stageNumber !== 2) return;

  const applicationId = stage.applicationId;

  const answersWithQuestions = await db
    .select({
      answerId: stage2Answers.id,
      questionText: stage2Questions.questionText,
      answerText: stage2Answers.answerText,
    })
    .from(stage2Answers)
    .innerJoin(stage2Questions, eq(stage2Answers.questionId, stage2Questions.id))
    .where(eq(stage2Answers.screeningStageId, screeningStageId))
    .orderBy(asc(stage2Questions.questionOrder));

  if (answersWithQuestions.length === 0) return;

  const [appRow] = await db
    .select({ jobId: applications.jobId, candidateId: applications.candidateId })
    .from(applications)
    .where(eq(applications.id, applicationId))
    .limit(1);
  if (!appRow) return;

  const [jobRow] = await db
    .select({
      title: jobs.title,
      description: jobs.description,
      requirements: jobs.requirements,
    })
    .from(jobs)
    .where(eq(jobs.id, appRow.jobId))
    .limit(1);
  if (!jobRow) return;

  const requirements = Array.isArray(jobRow.requirements) ? jobRow.requirements : [];

  try {
    const evaluations = await evaluateAnswersWithAI({
      jobTitle: jobRow.title,
      jobDescription: jobRow.description ?? '',
      requirements,
      answers: answersWithQuestions.map((a) => ({
        question: a.questionText,
        answer: a.answerText,
      })),
    });

    if (evaluations.length !== answersWithQuestions.length) {
      throw new Error('Evaluation count mismatch');
    }

    for (let i = 0; i < answersWithQuestions.length; i++) {
      const { answerId } = answersWithQuestions[i];
      const ev = evaluations[i];
      const score = Math.min(10, Math.max(0, ev.score));
      await db
        .update(stage2Answers)
        .set({
          aiScore: String(score),
          aiFeedback: ev.feedback ?? null,
        })
        .where(eq(stage2Answers.id, answerId));
    }

    const qaBlock = answersWithQuestions
      .map(
        (a, i) =>
          `Q${i + 1}: ${a.questionText}\nA${i + 1}: ${a.answerText}`
      )
      .join('\n\n');

    const matrix = await buildStage2EvaluationMatrix({
      jobTitle: jobRow.title,
      jobDescription: jobRow.description ?? '',
      requirements,
      qaBlock,
      perAnswerScores: evaluations.map((e) => Math.min(10, Math.max(0, e.score))),
    });

    const overallScore = matrix.overallScore;
    const passed = overallScore >= STAGE2_PASSING_THRESHOLD;
    const completedAt = new Date();

    await db
      .update(screeningStages)
      .set({
        status: 'completed',
        score: String(Math.round(overallScore * 100) / 100),
        aiEvaluation: matrix,
        completedAt,
        updatedAt: completedAt,
      })
      .where(eq(screeningStages.id, screeningStageId));

    await db
      .update(applications)
      .set({
        status: passed ? 'stage2_passed' : 'stage2_failed',
        currentStage: 2,
        overallScore: String(Math.round(overallScore * 100) / 100),
        aiSummary: evaluations.summary ?? null,
        updatedAt: completedAt,
      })
      .where(eq(applications.id, applicationId));
    if (!passed) {
      await createHrCandidateSuggestions(applicationId, appRow.jobId, 2);
    }
    const [candidateRow] = await db.select({ email: users.email }).from(users).where(eq(users.id, appRow.candidateId)).limit(1);
    if (jobRow && candidateRow) {
      await createNotification(appRow.candidateId, passed ? 'You advanced to the next stage' : 'Update on your application', {
        message: passed ? `You passed questions for ${jobRow.title}.` : `Your application for ${jobRow.title} did not advance past questions.`,
        link: '/my-applications',
      });
      try {
        await sendStageResultEmail(candidateRow.email, jobRow.title, passed, 'questions');
      } catch (e) {
        console.error('sendStageResultEmail error:', e);
      }
    }
  } catch (err) {
    console.error('Stage 2 screening error:', err);
    await db
      .update(screeningStages)
      .set({
        status: 'failed',
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(screeningStages.id, screeningStageId));
    await db
      .update(applications)
      .set({
        status: 'stage2_failed',
        currentStage: 2,
        updatedAt: new Date(),
      })
      .where(eq(applications.id, applicationId));
    await createHrCandidateSuggestions(applicationId, appRow.jobId, 2);
    const [candidateRow] = await db.select({ email: users.email }).from(users).where(eq(users.id, appRow.candidateId)).limit(1);
    if (jobRow && candidateRow) {
      await createNotification(appRow.candidateId, 'Update on your application', {
        message: `Your application for ${jobRow.title} did not advance past questions.`,
        link: '/my-applications',
      });
      try {
        await sendStageResultEmail(candidateRow.email, jobRow.title, false, 'questions');
      } catch (e) {
        console.error('sendStageResultEmail error:', e);
      }
    }
  }
}

function buildEvaluationSchema(numAnswers: number) {
  return {
    type: 'object' as const,
    properties: {
      evaluations: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          properties: {
            score: { type: 'integer' as const },
            feedback: { type: 'string' as const },
          },
          required: ['score', 'feedback'],
          additionalProperties: false,
        },
        minItems: numAnswers,
        maxItems: numAnswers,
      },
      summary: { type: 'string' as const },
    },
    required: ['evaluations', 'summary'],
    additionalProperties: false,
  };
}

async function evaluateAnswersWithAI(params: {
  jobTitle: string;
  jobDescription: string;
  requirements: string[];
  answers: { question: string; answer: string }[];
}): Promise<{ score: number; feedback: string }[] & { summary: string }> {
  const n = params.answers.length;
  const systemPrompt = `You are an HR screening assistant. Evaluate each candidate answer to a screening question.
Score each answer 0-10 for: relevance to the question, clarity, and fit for the role.
Be fair and objective. Provide one short sentence of feedback per answer.
You must return exactly ${n} evaluations, one for each Q&A pair, in the same order as the pairs.
Then provide a brief overall summary (2-3 sentences) for HR.`;

  const userContent = `Job: ${params.jobTitle}
Description: ${params.jobDescription.slice(0, 1500)}
Requirements: ${JSON.stringify(params.requirements)}

Evaluate these ${n} Q&A pairs. Return exactly ${n} evaluations in the same order (evaluation 1 for Q1/A1, evaluation 2 for Q2/A2, etc.).

${params.answers
  .map(
    (a, i) =>
      `Q${i + 1}: ${a.question}\nA${i + 1}: ${a.answer}`
  )
  .join('\n\n')}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'stage2_evaluation',
        strict: true,
        schema: buildEvaluationSchema(n),
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('No evaluation response');
  const parsed = JSON.parse(content) as {
    evaluations: { score: number; feedback: string }[];
    summary: string;
  };
  return Object.assign(parsed.evaluations, { summary: parsed.summary });
}

const STAGE2_MATRIX_SCHEMA = {
  type: 'object' as const,
  properties: {
    dimensionScores: {
      type: 'object' as const,
      properties: {
        relevance: { type: 'integer' as const },
        clarity: { type: 'integer' as const },
        role_fit: { type: 'integer' as const },
      },
      required: ['relevance', 'clarity', 'role_fit'],
      additionalProperties: false,
    },
    dimensionRationales: {
      type: 'object' as const,
      properties: {
        relevance: { type: 'string' as const },
        clarity: { type: 'string' as const },
        role_fit: { type: 'string' as const },
      },
      required: ['relevance', 'clarity', 'role_fit'],
      additionalProperties: false,
    },
  },
  required: ['dimensionScores', 'dimensionRationales'],
  additionalProperties: false,
};

type Stage2EvaluationMatrix = {
  dimensions: Array<{
    name: string;
    score: number;
    maxScore: number;
    weight: number;
    rationale: string;
  }>;
  weights: typeof STAGE2_MATRIX_WEIGHTS;
  overallScore: number;
  fitRating: string;
};

async function buildStage2EvaluationMatrix(params: {
  jobTitle: string;
  jobDescription: string;
  requirements: string[];
  qaBlock: string;
  perAnswerScores: number[];
}): Promise<Stage2EvaluationMatrix> {
  const systemPrompt = `You are an HR screening expert. Score the candidate's Stage 2 written answers on three dimensions (each 0-10). Be consistent and fair.

Dimensions:
1. Relevance: Do the answers directly address the questions? Are they on-topic and substantive?
2. Clarity: Is the communication clear, structured, and professional?
3. Role fit: Do the answers show alignment with the job requirements and company context?

Return a JSON object with dimensionScores (relevance, clarity, role_fit as integers 0-10) and dimensionRationales (one short sentence per dimension explaining the score).`;

  const userContent = `Job: ${params.jobTitle}
Description: ${params.jobDescription.slice(0, 1200)}
Requirements: ${JSON.stringify(params.requirements)}

Candidate Q&A and per-answer scores (for context): ${params.perAnswerScores.join(', ')}

Q&A:
${params.qaBlock.slice(0, 4000)}

Score each dimension 0-10 and provide a short rationale per dimension.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'stage2_matrix',
        strict: true,
        schema: STAGE2_MATRIX_SCHEMA,
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('No matrix response');
  const parsed = JSON.parse(content) as {
    dimensionScores: { relevance: number; clarity: number; role_fit: number };
    dimensionRationales: { relevance: string; clarity: string; role_fit: string };
  };

  const d = parsed.dimensionScores;
  const clamp = (n: number) => Math.min(10, Math.max(0, Number(n)));
  const relevance = clamp(d.relevance);
  const clarity = clamp(d.clarity);
  const role_fit = clamp(d.role_fit);

  const overallScore =
    STAGE2_MATRIX_WEIGHTS.relevance * relevance +
    STAGE2_MATRIX_WEIGHTS.clarity * clarity +
    STAGE2_MATRIX_WEIGHTS.role_fit * role_fit;
  const roundedOverall = Math.round(overallScore * 100) / 100;
  const fitRating =
    roundedOverall >= 7 ? 'high' : roundedOverall >= 4 ? 'medium' : 'low';

  return {
    dimensions: [
      {
        name: 'Relevance',
        score: relevance,
        maxScore: 10,
        weight: STAGE2_MATRIX_WEIGHTS.relevance,
        rationale: parsed.dimensionRationales.relevance ?? '',
      },
      {
        name: 'Clarity',
        score: clarity,
        maxScore: 10,
        weight: STAGE2_MATRIX_WEIGHTS.clarity,
        rationale: parsed.dimensionRationales.clarity ?? '',
      },
      {
        name: 'Role fit',
        score: role_fit,
        maxScore: 10,
        weight: STAGE2_MATRIX_WEIGHTS.role_fit,
        rationale: parsed.dimensionRationales.role_fit ?? '',
      },
    ],
    weights: STAGE2_MATRIX_WEIGHTS,
    overallScore: roundedOverall,
    fitRating,
  };
}
