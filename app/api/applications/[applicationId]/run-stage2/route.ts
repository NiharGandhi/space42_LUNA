import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { screeningStages } from '@/lib/db/schema';
import { getSessionUser } from '@/lib/auth/session';
import { eq, and } from 'drizzle-orm';
import { runStage2Screening } from '@/lib/screening/stage2';

// POST /api/applications/[applicationId]/run-stage2 - Re-run Stage 2 screening (HR only)
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
        { success: false, error: 'Only HR can re-run Stage 2 screening' },
        { status: 403 }
      );
    }

    const { applicationId } = await params;

    const [stage2] = await db
      .select({ id: screeningStages.id })
      .from(screeningStages)
      .where(
        and(
          eq(screeningStages.applicationId, applicationId),
          eq(screeningStages.stageNumber, 2)
        )
      )
      .limit(1);

    if (!stage2) {
      return NextResponse.json(
        { success: false, error: 'Stage 2 not started for this application (candidate must submit answers first)' },
        { status: 400 }
      );
    }

    await runStage2Screening(stage2.id);

    return NextResponse.json(
      { success: true, message: 'Stage 2 screening re-run completed' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Run Stage 2 error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to re-run Stage 2 screening' },
      { status: 500 }
    );
  }
}
