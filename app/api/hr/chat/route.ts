import { NextRequest, NextResponse } from 'next/server';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { openai } from '@/lib/ai/openai';
import {
  hrAgentTools,
  hrAgentSystemPrompt,
  executeHRAgentTool,
} from '@/lib/ai/agents/hr-agent';
import { getSessionUser } from '@/lib/auth/session';

type Message = ChatCompletionMessageParam;

function buildMessages(
  bodyMessages: { role: 'user' | 'assistant' | 'system'; content: string }[]
): Message[] {
  return [
    { role: 'system', content: hrAgentSystemPrompt },
    ...bodyMessages.map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    })),
  ];
}

async function runAgentLoop(messages: Message[], hrUserId: string): Promise<string> {
  const currentMessages = [...messages];
  const maxTurns = 12;

  for (let turn = 0; turn < maxTurns; turn++) {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: currentMessages,
      tools: hrAgentTools,
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
        const fn = (tc as { function?: { name?: string; arguments?: string } }).function;
        const name = fn?.name ?? '';
        const args = JSON.parse(fn?.arguments ?? '{}');
        const result = await executeHRAgentTool(name, args, hrUserId);
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

  return "I wasn't able to complete that. Please try again.";
}

function isDbOrNetworkError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  const cause = error instanceof Error && 'cause' != null ? (error as { cause?: { message?: string; code?: string } }).cause : null;
  const causeMsg = cause && typeof cause === 'object' && 'message' in cause ? String((cause as { message?: string }).message) : '';
  const causeCode = cause && typeof cause === 'object' && 'code' in cause ? String((cause as { code?: string }).code) : '';
  return (
    msg.includes('Failed query') ||
    msg.includes('Error connecting to database') ||
    msg.includes('fetch failed') ||
    causeMsg.includes('fetch failed') ||
    causeMsg.includes('Connect Timeout') ||
    causeCode === 'UND_ERR_CONNECT_TIMEOUT'
  );
}

export async function POST(request: NextRequest) {
  try {
    let user;
    try {
      user = await getSessionUser();
    } catch (sessionError) {
      if (isDbOrNetworkError(sessionError)) {
        console.error('HR chat API (session):', sessionError);
        return NextResponse.json(
          { success: false, error: 'Service temporarily unavailable. Please check your connection and try again.' },
          { status: 503 }
        );
      }
      throw sessionError;
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }
    if (user.role !== 'hr' && user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Only HR or Admin can use the HR agent' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { messages = [] }: { messages?: { role: 'user' | 'assistant' | 'system'; content: string }[] } = body;

    const chatMessages = buildMessages(messages);
    let fullResponse: string;
    try {
      fullResponse = await runAgentLoop(chatMessages, user.id);
    } catch (agentError) {
      if (isDbOrNetworkError(agentError)) {
        console.error('HR chat API (agent):', agentError);
        return NextResponse.json(
          { success: false, error: 'Service temporarily unavailable. Please check your connection and try again.' },
          { status: 503 }
        );
      }
      throw agentError;
    }

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
    console.error('HR chat API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get response' },
      { status: 500 }
    );
  }
}
