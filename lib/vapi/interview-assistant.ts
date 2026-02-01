import type { Vapi } from '@vapi-ai/server-sdk';
import { getVapiWebhookBaseUrl } from './client';

/**
 * Build VAPI CreateAssistantDto for a Stage 3 voice interview.
 * Assistant asks role-specific questions and evaluates communication, problem-solving, role understanding.
 */
export function buildInterviewAssistantDto(params: {
  jobTitle: string;
  jobDescription: string;
  stage3InterviewId: string;
}): Vapi.CreateAssistantDto {
  const webhookUrl = `${getVapiWebhookBaseUrl()}/api/webhooks/vapi`;
  const systemContent = `You are an HR interview assistant conducting a structured voice interview for a job role.

Job title: ${params.jobTitle}
Job context (use for relevance only): ${params.jobDescription.slice(0, 800)}

Your role:
- Introduce yourself briefly and explain this is a short voice interview for the ${params.jobTitle} role.
- Ask 3–4 clear, role-relevant questions (e.g. experience, approach to problems, why they're interested).
- Keep each question concise. Let the candidate answer fully before moving on.
- Be professional and neutral. Do not comment on tone, accent, or personality.
- After you have asked 3–4 questions and thanked the candidate, say something like "That concludes our interview. Thank you." and then call the endCall tool to end the call. Do not keep talking after thanking them—end the call.

Do not analyze emotions or appearance. Focus only on the conversation content.`;

  // VAPI assistant name must be ≤40 characters (UUID is 36 chars)
  const name = `S3-${params.stage3InterviewId}`.slice(0, 40);
  return {
    name,
    firstMessage: "Hi, this is a short voice interview for the role you applied for. I'll ask a few questions—please answer when you're ready. Let's begin.",
    firstMessageMode: 'assistant-speaks-first',
    server: { url: webhookUrl },
    serverMessages: ['end-of-call-report', 'status-update'],
    /** When the assistant says any of these phrases, the call ends automatically. */
    endCallPhrases: [
      'that concludes our interview',
      'that concludes the interview',
      'the interview is complete',
      'thank you, that\'s all the questions',
      'we\'re done with the interview',
    ],
    model: {
      provider: 'openai',
      model: 'gpt-4.1-mini',
      temperature: 0.5,
      messages: [{ role: 'system', content: systemContent }],
      tools: [{ type: 'endCall' as const }],
    },
    voice: {
      provider: '11labs',
      voiceId: '21m00Tcm4TlvDq8ikWAM',
    },
    maxDurationSeconds: 600, // 10 min
  };
}
