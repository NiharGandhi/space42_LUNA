import { db } from '@/lib/db';
import {
  applications,
  jobs,
  screeningStages,
  stage3Interviews,
  users,
} from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createHrCandidateSuggestions } from '@/lib/screening/hr-suggestions';
import { createNotification } from '@/lib/notifications/create';
import { sendStageResultEmail } from '@/lib/email/nodemailer';
import { openai } from '@/lib/ai/openai';

const STAGE3_PASSING_THRESHOLD = 5;

export type Stage3Evaluation = {
  communicationScore: number;
  problemSolvingScore: number;
  roleUnderstandingScore: number;
  communicationRationale: string;
  problemSolvingRationale: string;
  roleUnderstandingRationale: string;
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  /** For HR display: dimensions with score + rationale (like Stage 1 matrix) */
  evaluationMatrix: {
    dimensions: Array<{ name: string; score: number; maxScore: number; weight?: number; rationale: string }>;
    overallScore: number;
  };
};

/**
 * Evaluate interview transcript and return scores + strengths/weaknesses.
 */
export async function evaluateInterviewTranscript(params: {
  transcript: string;
  jobTitle: string;
  jobDescription: string;
}): Promise<Stage3Evaluation> {
  const schema = {
    type: 'object' as const,
    properties: {
      communicationScore: { type: 'number' as const },
      problemSolvingScore: { type: 'number' as const },
      roleUnderstandingScore: { type: 'number' as const },
      communicationRationale: { type: 'string' as const },
      problemSolvingRationale: { type: 'string' as const },
      roleUnderstandingRationale: { type: 'string' as const },
      strengths: {
        type: 'array' as const,
        items: { type: 'string' as const },
      },
      weaknesses: {
        type: 'array' as const,
        items: { type: 'string' as const },
      },
    },
    required: [
      'communicationScore',
      'problemSolvingScore',
      'roleUnderstandingScore',
      'communicationRationale',
      'problemSolvingRationale',
      'roleUnderstandingRationale',
      'strengths',
      'weaknesses',
    ],
    additionalProperties: false,
  };

  const systemPrompt = `You are an HR screening expert. Evaluate a voice interview transcript.

Score the candidate on three dimensions (each 0-10) and provide a short rationale for each:
1. Communication: Clarity, structure, and professionalism of responses.
2. Problem-solving: How they approach questions, give examples, and reason.
3. Role understanding: Alignment with the job and awareness of the role.

Be objective. Do not analyze tone, accent, or personality. Focus on content.
Return: communicationScore, problemSolvingScore, roleUnderstandingScore (0-10), communicationRationale, problemSolvingRationale, roleUnderstandingRationale (short strings), strengths (array of short strings), weaknesses (array of short strings).`;

  const userContent = `Job: ${params.jobTitle}
Description: ${params.jobDescription.slice(0, 600)}

Interview transcript:
${params.transcript.slice(0, 12000)}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'stage3_evaluation',
        strict: true,
        schema,
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('No evaluation response');
  const parsed = JSON.parse(content) as {
    communicationScore: number;
    problemSolvingScore: number;
    roleUnderstandingScore: number;
    communicationRationale: string;
    problemSolvingRationale: string;
    roleUnderstandingRationale: string;
    strengths: string[];
    weaknesses: string[];
  };

  const clamp = (n: number) => Math.min(10, Math.max(0, Number(n)));
  const comm = clamp(parsed.communicationScore);
  const problem = clamp(parsed.problemSolvingScore);
  const role = clamp(parsed.roleUnderstandingScore);
  const overallScore =
    Math.round((comm * 0.4 + problem * 0.35 + role * 0.25) * 100) / 100;

  const evaluationMatrix = {
    dimensions: [
      { name: 'Communication', score: comm, maxScore: 10, weight: 0.4, rationale: String(parsed.communicationRationale ?? '').slice(0, 500) },
      { name: 'Problem-solving', score: problem, maxScore: 10, weight: 0.35, rationale: String(parsed.problemSolvingRationale ?? '').slice(0, 500) },
      { name: 'Role understanding', score: role, maxScore: 10, weight: 0.25, rationale: String(parsed.roleUnderstandingRationale ?? '').slice(0, 500) },
    ],
    overallScore,
  };

  return {
    communicationScore: comm,
    problemSolvingScore: problem,
    roleUnderstandingScore: role,
    communicationRationale: String(parsed.communicationRationale ?? ''),
    problemSolvingRationale: String(parsed.problemSolvingRationale ?? ''),
    roleUnderstandingRationale: String(parsed.roleUnderstandingRationale ?? ''),
    overallScore,
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
    weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
    evaluationMatrix,
  };
}

/**
 * Process end-of-call: save transcript/recording/duration, run evaluation, update stage3 + screening_stage + application.
 */
export async function processStage3EndOfCall(params: {
  vapiAssistantId: string;
  vapiCallId: string;
  transcript: string;
  recordingUrl?: string | null;
  callDurationSeconds?: number | null;
}): Promise<void> {
  const [interview] = await db
    .select({
      id: stage3Interviews.id,
      screeningStageId: stage3Interviews.screeningStageId,
    })
    .from(stage3Interviews)
    .where(eq(stage3Interviews.vapiAssistantId, params.vapiAssistantId))
    .limit(1);

  if (!interview) {
    console.warn('Stage 3: no interview found for assistant', params.vapiAssistantId);
    return;
  }

  const [stage] = await db
    .select({ applicationId: screeningStages.applicationId })
    .from(screeningStages)
    .where(eq(screeningStages.id, interview.screeningStageId))
    .limit(1);

  if (!stage) return;

  const [app] = await db
    .select({ jobId: applications.jobId, candidateId: applications.candidateId })
    .from(applications)
    .where(eq(applications.id, stage.applicationId))
    .limit(1);

  if (!app) return;

  const [job] = await db
    .select({
      title: jobs.title,
      description: jobs.description,
    })
    .from(jobs)
    .where(eq(jobs.id, app.jobId))
    .limit(1);

  if (!job) return;

  try {
    const evaluation = await evaluateInterviewTranscript({
      transcript: params.transcript,
      jobTitle: job.title,
      jobDescription: job.description ?? '',
    });

    const passed = evaluation.overallScore >= STAGE3_PASSING_THRESHOLD;
    const completedAt = new Date();

    await db
      .update(stage3Interviews)
      .set({
        vapiCallId: params.vapiCallId,
        transcript: params.transcript,
        recordingUrl: params.recordingUrl ?? null,
        callDuration: params.callDurationSeconds ?? null,
        communicationScore: String(evaluation.communicationScore),
        problemSolvingScore: String(evaluation.problemSolvingScore),
        roleUnderstandingScore: String(evaluation.roleUnderstandingScore),
        overallScore: String(evaluation.overallScore),
        strengths: evaluation.strengths,
        weaknesses: evaluation.weaknesses,
        evaluationMatrix: evaluation.evaluationMatrix,
        completedAt,
      })
      .where(eq(stage3Interviews.id, interview.id));

    await db
      .update(screeningStages)
      .set({
        status: 'completed',
        score: String(evaluation.overallScore),
        completedAt,
        updatedAt: completedAt,
      })
      .where(eq(screeningStages.id, interview.screeningStageId));

    await db
      .update(applications)
      .set({
        status: passed ? 'stage3_passed' : 'stage3_failed',
        currentStage: 3,
        overallScore: String(evaluation.overallScore),
        updatedAt: completedAt,
      })
      .where(eq(applications.id, stage.applicationId));
    if (!passed) {
      await createHrCandidateSuggestions(stage.applicationId, app.jobId, 3);
    }
    const [candidateRow] = await db.select({ email: users.email }).from(users).where(eq(users.id, app.candidateId)).limit(1);
    if (job && candidateRow) {
      await createNotification(app.candidateId, passed ? 'You advanced to the next stage' : 'Update on your application', {
        message: passed ? `You passed the voice interview for ${job.title}.` : `Your application for ${job.title} did not advance past the voice interview.`,
        link: '/my-applications',
      });
      try {
        await sendStageResultEmail(candidateRow.email, job.title, passed, 'voice interview');
      } catch (e) {
        console.error('sendStageResultEmail error:', e);
      }
    }
  } catch (err) {
    console.error('Stage 3 process end-of-call error:', err);
    await db
      .update(stage3Interviews)
      .set({
        vapiCallId: params.vapiCallId,
        transcript: params.transcript,
        recordingUrl: params.recordingUrl ?? null,
        callDuration: params.callDurationSeconds ?? null,
        completedAt: new Date(),
      })
      .where(eq(stage3Interviews.id, interview.id));
    await db
      .update(screeningStages)
      .set({
        status: 'failed',
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(screeningStages.id, interview.screeningStageId));
    await db
      .update(applications)
      .set({
        status: 'stage3_failed',
        currentStage: 3,
        updatedAt: new Date(),
      })
      .where(eq(applications.id, stage.applicationId));
    await createHrCandidateSuggestions(stage.applicationId, app.jobId, 3);
    const [candidateRow] = await db.select({ email: users.email }).from(users).where(eq(users.id, app.candidateId)).limit(1);
    if (job && candidateRow) {
      await createNotification(app.candidateId, 'Update on your application', {
        message: `Your application for ${job.title} did not advance past the voice interview.`,
        link: '/my-applications',
      });
      try {
        await sendStageResultEmail(candidateRow.email, job.title, false, 'voice interview');
      } catch (e) {
        console.error('sendStageResultEmail error:', e);
      }
    }
  }
}
