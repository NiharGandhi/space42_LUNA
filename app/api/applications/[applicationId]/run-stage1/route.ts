import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { screeningStages } from '@/lib/db/schema';
import { getSessionUser } from '@/lib/auth/session';
import { eq, and } from 'drizzle-orm';
import { runStage1Screening } from '@/lib/screening/stage1';

// POST /api/applications/[applicationId]/run-stage1 - Run Stage 1 screening for one application (HR only)
export async function POST(
  request: NextRequest,
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
        { success: false, error: 'Only HR can run Stage 1 screening' },
        { status: 403 }
      );
    }

    const { applicationId } = await params;

    // Re-run: delete existing Stage 1 screening stage (cascade deletes stage1_analysis)
    await db
      .delete(screeningStages)
      .where(
        and(
          eq(screeningStages.applicationId, applicationId),
          eq(screeningStages.stageNumber, 1)
        )
      );

    await runStage1Screening(applicationId);

    return NextResponse.json(
      { success: true, message: 'Stage 1 screening completed' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Run Stage 1 error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to run Stage 1 screening' },
      { status: 500 }
    );
  }
}
