/**
 * Onboarding AI agent: system prompt built from company context + uploaded docs + URLs + contacts + new hire's job and tasks.
 * Covers offered → joining: visa, background checks, IT setup, ID/documents, plus company/handbook.
 * Used by POST /api/onboarding/chat.
 */

const MAX_DOCS_CHARS = 50000;
const MAX_URLS_CHARS = 40000;

export function buildOnboardingAgentSystemPrompt(params: {
  companyContext: Record<string, string>;
  companyDocumentsText?: string;
  companyUrlsText?: string;
  departmentContacts?: string;
  jobTitle: string;
  jobDepartment: string;
  onboardingTasks: Array<{ taskTitle: string; taskDescription: string | null; status: string; category: string }>;
  candidateName: string | null;
}): string {
  const {
    companyContext,
    companyDocumentsText,
    companyUrlsText,
    departmentContacts,
    jobTitle,
    jobDepartment,
    onboardingTasks,
    candidateName,
  } = params;

  const companyName = companyContext.company_name?.trim() || 'the company';
  const about = companyContext.about?.trim() || '';
  const handbook = companyContext.handbook?.trim() || '';
  const policies = companyContext.policies?.trim() || '';
  const culture = companyContext.culture?.trim() || '';

  const visaInstructions = companyContext.visa_instructions?.trim() || '';
  const backgroundCheckInstructions = companyContext.background_check_instructions?.trim() || '';
  const itSetupInstructions = companyContext.it_setup_instructions?.trim() || '';
  const idHelpInstructions = companyContext.id_help_instructions?.trim() || '';

  const docsSection =
    companyDocumentsText && companyDocumentsText.length > 0
      ? `
## Uploaded company documents (use this as source of truth)
${companyDocumentsText.length > MAX_DOCS_CHARS ? companyDocumentsText.slice(0, MAX_DOCS_CHARS) + '…' : companyDocumentsText}
`
      : '';

  const urlsSection =
    companyUrlsText && companyUrlsText.length > 0
      ? `
## Content from company URLs
${companyUrlsText.length > MAX_URLS_CHARS ? companyUrlsText.slice(0, MAX_URLS_CHARS) + '…' : companyUrlsText}
`
      : '';

  const contactsSection =
    departmentContacts && departmentContacts.trim().length > 0
      ? `
## Department contacts (emails / who to contact)
${departmentContacts.trim()}
`
      : '';

  const tasksText =
    onboardingTasks.length > 0
      ? onboardingTasks
          .map(
            (t) =>
              `- ${t.taskTitle} (${t.status})${t.taskDescription ? `: ${t.taskDescription}` : ''}`
          )
          .join('\n')
      : 'No tasks assigned yet.';

  const hasPrejoining =
    visaInstructions || backgroundCheckInstructions || itSetupInstructions || idHelpInstructions;
  const prejoiningSection = hasPrejoining
    ? `
## Pre-joining (offered → joining) — use this to answer visa, background check, IT, ID questions
${visaInstructions ? `**Visa & work authorization:** ${visaInstructions}` : ''}
${backgroundCheckInstructions ? `**Background checks:** ${backgroundCheckInstructions}` : ''}
${itSetupInstructions ? `**IT setup & equipment:** ${itSetupInstructions}` : ''}
${idHelpInstructions ? `**ID & documents:** ${idHelpInstructions}` : ''}
`
    : '';

  return `You are the friendly onboarding assistant for ${companyName}. You help new hires from offer through joining—visa, background checks, IT, documents, handbook, and their checklist. Keep answers short and practical. One topic per reply when possible.

## Company context
${companyName ? `**Company:** ${companyName}` : ''}
${about ? `**About:** ${about}` : ''}
${handbook ? `**Handbook / guidelines:** ${handbook}` : ''}
${policies ? `**Policies (PTO, remote, benefits):** ${policies}` : ''}
${culture ? `**Culture & values:** ${culture}` : ''}
${docsSection}
${urlsSection}
${contactsSection}
${prejoiningSection}

## This new hire
- **Name:** ${candidateName || 'New hire'}
- **Role:** ${jobTitle}${jobDepartment ? ` (${jobDepartment})` : ''}

## Their onboarding tasks
${tasksText}
(Task categories: visa, background_check, it_setup, documentation, other — use the matching playbook above when they ask about a task.)

## Your role
- Be warm and concise. Answer one thing at a time when possible.
- Use the context above for company, policies, handbook, visa, background check, IT, and documents. Give clear next steps and contacts so they don't have to chase HR.
- If you don't have info for something, say so briefly and suggest they ask HR.
- When they ask "what's my first step?" or "what do I do next?", point them to the next incomplete task from their list and any relevant playbook (visa, IT, etc.).
- Do not make up details—only use what's provided.`;
}
