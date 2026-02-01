/**
 * AI-generated onboarding flow: given HR prompt + optional company context/docs/URLs,
 * returns a list of suggested tasks (taskTitle, category, taskDescription, requiresSubmission, submissionDescription).
 */

const CATEGORIES = ['visa', 'insurance', 'background_check', 'it_setup', 'documentation', 'other'];

export type GeneratedTask = {
  taskTitle: string;
  category: string;
  taskDescription: string | null;
  requiresSubmission: boolean;
  submissionDescription: string | null;
};

function buildSystemPrompt(params: {
  companyContext?: Record<string, string>;
  documentsText?: string;
  urlsText?: string;
  existingTasks?: GeneratedTask[];
}): string {
  const { companyContext, documentsText, urlsText, existingTasks } = params;
  const companyName = companyContext?.company_name?.trim() || 'the company';
  let context = `You are an HR onboarding expert. Generate an onboarding flow (checklist of tasks) for new hires at ${companyName}.`;
  if (documentsText && documentsText.length > 0) {
    context += `\n\n## Company documents (use for context)\n${documentsText.slice(0, 15000)}`;
  }
  if (urlsText && urlsText.length > 0) {
    context += `\n\n## Content from company URLs\n${urlsText.slice(0, 8000)}`;
  }
  if (companyContext?.about || companyContext?.handbook) {
    context += `\n\n## Company info\n${companyContext.about || ''}\n${companyContext.handbook || ''}`.slice(0, 3000);
  }
  context += `\n\nOutput a JSON array of tasks. Each task: { "taskTitle": string, "category": "${CATEGORIES.join('" | "')}", "taskDescription": string | null, "requiresSubmission": boolean, "submissionDescription": string | null }.
- taskTitle: short label (e.g. "Visa & work authorization", "Submit signed offer letter").
- category: one of the categories above.
- taskDescription: optional 1-2 sentences for the candidate.
- requiresSubmission: true if the candidate must submit a document (ID, signed form, etc.).
- submissionDescription: if requiresSubmission, what to submit (e.g. "Government ID", "Signed offer letter and tax form W-4"). Otherwise null.
Include visa, background check, IT setup, paperwork, handbook, and any document-submission steps that make sense. If the user provided existing tasks, refine or add to them per their prompt. Output only the JSON array, no markdown.`;
  if (existingTasks && existingTasks.length > 0) {
    context += `\n\nExisting tasks (user may ask to add, remove, or refine):\n${JSON.stringify(existingTasks)}`;
  }
  return context;
}

export async function generateOnboardingFlow(params: {
  prompt: string;
  companyContext?: Record<string, string>;
  documentsText?: string;
  urlsText?: string;
  existingTasks?: GeneratedTask[];
}): Promise<GeneratedTask[]> {
  const { openai } = await import('@/lib/ai/openai');
  const systemPrompt = buildSystemPrompt({
    companyContext: params.companyContext,
    documentsText: params.documentsText,
    urlsText: params.urlsText,
    existingTasks: params.existingTasks,
  });
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: params.prompt },
    ],
    max_tokens: 2000,
  });
  const content = response.choices[0]?.message?.content?.trim();
  if (!content) return [];
  const cleaned = content.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    const arr = JSON.parse(cleaned) as unknown[];
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((t): t is Record<string, unknown> => t != null && typeof t === 'object')
      .map((t) => ({
        taskTitle: typeof t.taskTitle === 'string' && t.taskTitle.trim() ? t.taskTitle.trim() : 'Task',
        category: CATEGORIES.includes(String(t.category)) ? String(t.category) : 'other',
        taskDescription: typeof t.taskDescription === 'string' && t.taskDescription.trim() ? t.taskDescription.trim() : null,
        requiresSubmission: Boolean(t.requiresSubmission),
        submissionDescription: typeof t.submissionDescription === 'string' && t.submissionDescription.trim() ? t.submissionDescription.trim() : null,
      }));
  } catch {
    return [];
  }
}
