import { NextRequest, NextResponse } from 'next/server';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { openai } from '@/lib/ai/openai';
import {
  candidateAgentTools,
  candidateAgentSystemPrompt,
  executeAgentTool,
} from '@/lib/ai/agents/candidate-agent';
import { getSessionUser } from '@/lib/auth/session';
import { sanitizeChatMessages } from '@/lib/chat/sanitize-messages';

type Message = ChatCompletionMessageParam;

function buildMessages(
  bodyMessages: Array<{ role?: string; content?: unknown }>,
  jobId?: string
): Message[] {
  let systemContent = candidateAgentSystemPrompt;
  if (jobId && isUUID(jobId)) {
    systemContent += `\n\nThe candidate is currently viewing or applying to job ID: ${jobId}. When relevant, use get_job_details or create_application with this job ID.`;
  }
  const sanitized = sanitizeChatMessages(bodyMessages);
  const messages: Message[] = [
    { role: 'system', content: systemContent },
    ...sanitized.map((m) => ({ role: m.role, content: m.content })),
  ];
  return messages;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isUUID(s: string): boolean {
  return UUID_REGEX.test((s ?? '').trim());
}

async function runAgentLoop(
  messages: Message[],
  userId: string | null,
  resumeContext: {
    resumeUrl?: string;
    resumeFileKey?: string;
    resumeText?: string;
  } | null,
  pageJobId?: string
): Promise<string> {
  const currentMessages = [...messages];
  const maxTurns = 10;

  for (let turn = 0; turn < maxTurns; turn++) {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: currentMessages,
      tools: candidateAgentTools,
      tool_choice: 'auto',
    });

    const choice = response.choices[0];
    if (!choice?.message) {
      return 'Sorry, I could not generate a response.';
    }

    const assistantMessage = choice.message;

    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      currentMessages.push({
        role: 'assistant',
        content: assistantMessage.content ?? null,
        tool_calls: assistantMessage.tool_calls,
      });

      for (const tc of assistantMessage.tool_calls) {
        // OpenAI types: function tool call has 'function', others may not
        // @ts-ignore: OpenAI returns tool_calls with {function}
        const fn = (tc as any).function;
        const name = fn?.name ?? '';
        const args = JSON.parse(fn?.arguments ?? '{}');
        if (name === 'create_application') {
          if (resumeContext) {
            if (resumeContext.resumeUrl) args.resumeUrl = resumeContext.resumeUrl;
            if (resumeContext.resumeFileKey) args.resumeFileKey = resumeContext.resumeFileKey;
            if (resumeContext.resumeText) args.resumeText = resumeContext.resumeText;
          }
          // Use page job ID when the model passed a title/slug instead of UUID (e.g. from career/[jobId] page)
          if (pageJobId && isUUID(pageJobId) && !isUUID(args.jobId)) {
            args.jobId = pageJobId;
          }
        }
        const result = await executeAgentTool(name, args, userId ?? undefined);
        currentMessages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: result,
        });
      }
      continue;
    }

    const text = assistantMessage.content?.trim();
    if (text) {
      return text;
    }
  }

  return "I'm sorry, I wasn't able to complete that. Please try again.";
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    const body = await request.json();
    const {
      messages = [],
      jobId,
      resumeUrl,
      resumeFileKey,
      resumeText,
    }: {
      messages?: Array<{ role?: string; content?: unknown }>;
      jobId?: string;
      resumeUrl?: string;
      resumeFileKey?: string;
      resumeText?: string;
    } = body;

    // Keep resume text in context for every turn so the agent never "forgets" it (conversation is stateless; tool results like parse_resume are not persisted).
    // If we have resumeText and no message in the thread already contains it, append it so the agent can parse and use it on any turn.
    const resumeTextTrimmed = resumeText?.trim();
    const resumeSnippet = resumeTextTrimmed?.slice(0, 200) ?? '';
    const someMessageHasResume =
      resumeSnippet.length > 0 &&
      messages.some(
        (m) =>
          m.role === 'user' &&
          typeof m.content === 'string' &&
          m.content.includes(resumeSnippet)
      );
    // If resume text not already in thread, add it so the agent has it on every turn (avoids losing context after "Yes I can" etc.)
    const messagesWithResume =
      resumeTextTrimmed && !someMessageHasResume
        ? [
            ...messages.slice(0, -1),
            {
              role: 'user' as const,
              content: `Here is my resume text:\n\n${resumeTextTrimmed}`,
            },
            messages[messages.length - 1],
          ]
        : messages;

    const chatMessages = buildMessages(
      Array.isArray(messagesWithResume) ? messagesWithResume : [],
      typeof jobId === 'string' ? jobId.trim() : undefined
    );
    const resumeContext =
      resumeUrl || resumeFileKey || resumeText
        ? { resumeUrl, resumeFileKey, resumeText }
        : null;
    const fullResponse = await runAgentLoop(
      chatMessages,
      user?.id ?? null,
      resumeContext,
      jobId
    );

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const chunkSize = 32;
        for (let i = 0; i < fullResponse.length; i += chunkSize) {
          controller.enqueue(encoder.encode(fullResponse.slice(i, i + chunkSize)));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get response' },
      { status: 500 }
    );
  }
}
