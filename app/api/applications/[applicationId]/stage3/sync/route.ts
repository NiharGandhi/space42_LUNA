import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  applications,
  screeningStages,
  stage3Interviews,
} from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSessionUser } from '@/lib/auth/session';
import { getVapiClient } from '@/lib/vapi/client';
import { processStage3EndOfCall } from '@/lib/screening/stage3';

// POST /api/applications/[applicationId]/stage3/sync - HR: fetch interview from VAPI and process (when webhook wasn't received)
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }
    if (user.role !== 'hr' && user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Only HR can sync interview results' },
        { status: 403 }
      );
    }

    const { applicationId } = await params;

    const [stage3] = await db
      .select()
      .from(screeningStages)
      .where(
        and(
          eq(screeningStages.applicationId, applicationId),
          eq(screeningStages.stageNumber, 3)
        )
      )
      .limit(1);

    if (!stage3) {
      return NextResponse.json(
        { success: false, error: 'Stage 3 not found for this application' },
        { status: 404 }
      );
    }

    const [interview] = await db
      .select()
      .from(stage3Interviews)
      .where(eq(stage3Interviews.screeningStageId, stage3.id))
      .limit(1);

    if (!interview?.vapiAssistantId) {
      return NextResponse.json(
        { success: false, error: 'No VAPI assistant linked to this interview' },
        { status: 400 }
      );
    }

    const vapi = getVapiClient();
    const listResult = await vapi.calls.list({
      assistantId: interview.vapiAssistantId,
      limit: 10,
    });
    // HttpResponsePromise unwraps to .data when awaited – so listResult is Call[] directly
    const calls = Array.isArray(listResult) ? listResult : (listResult as { data?: unknown[] })?.data ?? [];
    const endedCall = (calls as Array<{ id?: string; status?: string; endedAt?: string }>)
      .filter((c) => (c.status === 'ended' || c.endedAt) && c.endedAt)
      .sort((a, b) => (b.endedAt ?? '').localeCompare(a.endedAt ?? ''))[0];

    if (!endedCall?.id) {
      return NextResponse.json(
        { success: false, error: 'No completed call found for this assistant' },
        { status: 404 }
      );
    }

    const getResult = await vapi.calls.get({ id: endedCall.id });
    // HttpResponsePromise unwraps to .data when awaited – so getResult is the Call object directly
    type CallWithArtifact = { id: string; artifact?: { transcript?: string; recordingUrl?: string; recording?: unknown; messages?: Array<{ role?: string; message?: string }> }; startedAt?: string; endedAt?: string };
    const call: CallWithArtifact | null =
      getResult && typeof getResult === 'object' && 'id' in getResult
        ? (getResult as CallWithArtifact)
        : (getResult as { data?: CallWithArtifact })?.data ?? null;
    if (!call) {
      return NextResponse.json(
        { success: false, error: 'Could not fetch call details' },
        { status: 502 }
      );
    }

    const artifact = call.artifact;
    let transcript = artifact?.transcript ?? '';
    if (!transcript && Array.isArray(artifact?.messages) && artifact.messages.length > 0) {
      transcript = artifact.messages
        .map((m: { role?: string; message?: string }) => {
          const role = (m.role === 'assistant' ? 'Assistant' : m.role === 'user' ? 'User' : m.role) ?? 'Unknown';
          return `${role}: ${m.message ?? ''}`.trim();
        })
        .filter(Boolean)
        .join('\n');
    }

    const recordingUrl =
      artifact?.recordingUrl ??
      (artifact?.recording && typeof artifact.recording === 'object'
        ? (artifact.recording as { stereoUrl?: string; mono?: { combinedUrl?: string } }).stereoUrl ??
          (artifact.recording as { mono?: { combinedUrl?: string } }).mono?.combinedUrl
        : null) ??
      null;

    let duration: number | null = null;
    if (call.startedAt && call.endedAt) {
      const start = new Date(call.startedAt).getTime();
      const end = new Date(call.endedAt).getTime();
      if (!Number.isNaN(start) && !Number.isNaN(end) && end > start) {
        duration = Math.round((end - start) / 1000);
      }
    }

    if (!transcript) {
      return NextResponse.json(
        { success: false, error: 'Call has no transcript yet; try again in a moment' },
        { status: 400 }
      );
    }

    await processStage3EndOfCall({
      vapiAssistantId: interview.vapiAssistantId,
      vapiCallId: call.id,
      transcript,
      recordingUrl: recordingUrl ?? null,
      callDurationSeconds: duration,
    });

    return NextResponse.json({ success: true, message: 'Interview results synced' });
  } catch (err) {
    console.error('Stage 3 sync error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to sync interview results' },
      { status: 500 }
    );
  }
}
