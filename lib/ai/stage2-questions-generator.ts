import { openai } from '@/lib/ai/openai';

export type SuggestedQuestion = {
  questionText: string;
  isRequired: boolean;
};

const SUGGEST_SCHEMA = {
  type: 'object' as const,
  properties: {
    questions: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          questionText: { type: 'string' as const },
          isRequired: { type: 'boolean' as const },
        },
        required: ['questionText', 'isRequired'],
        additionalProperties: false,
      },
    },
  },
  required: ['questions'],
  additionalProperties: false,
};

/**
 * Generate Stage 2 screening questions from job context and optional HR input.
 * - If hrContext is empty: AI decides from job only (full AI).
 * - If hrContext is provided: AI uses it to tailor questions (guided).
 */
export async function suggestStage2Questions(
  jobContext: {
    title: string;
    description: string;
    requirements: string[];
    responsibilities: string[];
  },
  hrContext?: string
): Promise<SuggestedQuestion[]> {
  const systemPrompt = `You are an HR expert creating screening questions for the second stage of candidate evaluation.
Stage 1 already screened the resume. Stage 2 is written questions the candidate answers (e.g. short paragraphs).

Your task: Generate 3–5 clear, job-relevant screening questions. Each should:
- Be specific to the role and company (use the job description).
- Probe competencies, experience, or mindset (not yes/no).
- Be answerable in a few sentences (candidate will type in a text box).
- Avoid discriminatory or illegal topics.

Return a JSON object with a "questions" array. Each item: { "questionText": "...", "isRequired": true/false }.
Mark 1–2 as optional (isRequired: false) if you want; the rest required.`;

  const jobBlock = `Job title: ${jobContext.title}

Description:
${jobContext.description.slice(0, 2000)}

Requirements: ${JSON.stringify(jobContext.requirements ?? [])}

Responsibilities: ${JSON.stringify(jobContext.responsibilities ?? [])}`;

  const hrBlock = hrContext?.trim()
    ? `\n\nHR guidance (use this to tailor questions):\n${hrContext.slice(0, 1000)}`
    : '';

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `${jobBlock}${hrBlock}\n\nGenerate 3–5 screening questions for Stage 2. Return JSON only.`,
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'suggested_questions',
        strict: true,
        schema: SUGGEST_SCHEMA,
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('No suggestion response');
  const parsed = JSON.parse(content) as { questions: SuggestedQuestion[] };
  const list = Array.isArray(parsed.questions) ? parsed.questions : [];
  return list.slice(0, 10).map((q) => ({
    questionText: String(q.questionText ?? '').trim(),
    isRequired: Boolean(q.isRequired),
  })).filter((q) => q.questionText.length > 0);
}
