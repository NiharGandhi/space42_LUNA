import { NextRequest, NextResponse } from 'next/server';
import { processStage3EndOfCall } from '@/lib/screening/stage3';

type VapiWebhookBody = {
  message?: {
    type?: string;
    call?: { id?: string; assistantId?: string; startedAt?: string; endedAt?: string };
    artifact?: {
      transcript?: string;
      recordingUrl?: string;
      recording?: { mono?: { url?: string }; stereoUrl?: string; videoUrl?: string };
      messages?: Array<{ role?: string; message?: string }>;
    };
    startedAt?: string;
    endedAt?: string;
  };
};

function parseDurationSeconds(startedAt?: string, endedAt?: string): number | null {
  if (!startedAt || !endedAt) return null;
  const start = new Date(startedAt).getTime();
  const end = new Date(endedAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return null;
  return Math.round((end - start) / 1000);
}

function transcriptFromMessages(messages: Array<{ role?: string; message?: string }> | undefined): string {
  if (!Array.isArray(messages) || messages.length === 0) return '';
  return messages
    .map((m) => {
      const role = (m.role === 'assistant' ? 'Assistant' : m.role === 'user' ? 'User' : m.role) ?? 'Unknown';
      return `${role}: ${m.message ?? ''}`.trim();
    })
    .filter(Boolean)
    .join('\n');
}

// POST /api/webhooks/vapi - VAPI server webhook (end-of-call-report, etc.)
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as VapiWebhookBody;
    const message = body?.message;
    if (!message || !message.type) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    if (message.type === 'end-of-call-report') {
      const call = message.call;
      const artifact = message.artifact;
      const assistantId = call?.assistantId;
      const callId = call?.id;
      let transcript = artifact?.transcript ?? '';
      if (!transcript && artifact?.messages?.length) {
        transcript = transcriptFromMessages(artifact.messages);
      }
      const recordingUrl =
        artifact?.recordingUrl ??
        (artifact?.recording && typeof artifact.recording === 'object'
          ? (artifact.recording as { mono?: { url?: string }; stereoUrl?: string }).stereoUrl ??
            (artifact.recording as { mono?: { url?: string } }).mono?.url
          : null) ??
        null;
      const startedAt = call?.startedAt ?? message.startedAt;
      const endedAt = call?.endedAt ?? message.endedAt;
      const duration = parseDurationSeconds(startedAt, endedAt);

      if (assistantId && transcript) {
        await processStage3EndOfCall({
          vapiAssistantId: assistantId,
          vapiCallId: callId ?? '',
          transcript,
          recordingUrl,
          callDurationSeconds: duration,
        });
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('VAPI webhook error:', error);
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
