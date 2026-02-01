import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { applications, screeningStages } from '@/lib/db/schema';
import { getSessionUser } from '@/lib/auth/session';
import { eq } from 'drizzle-orm';
import { runStage1Screening } from '@/lib/screening/stage1';

// POST /api/applications/backfill-stage1 - Run Stage 1 for all applications that don't have it yet (HR only)
export async function POST(request: NextRequest) {
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
        { success: false, error: 'Only HR can run backfill' },
        { status: 403 }
      );
    }

    const rowsWithStage1 = await db
      .select({ applicationId: screeningStages.applicationId })
      .from(screeningStages)
      .where(eq(screeningStages.stageNumber, 1));

    const idsWithStage1 = new Set(
      rowsWithStage1.map((r) => r.applicationId)
    );

    const allApps = await db
      .select({ id: applications.id })
      .from(applications);

    const toRun = allApps.filter((app) => !idsWithStage1.has(app.id));

    let completed = 0;
    let failed = 0;
    for (const app of toRun) {
      try {
        await runStage1Screening(app.id);
        completed++;
      } catch (err) {
        console.error(`Stage 1 backfill failed for ${app.id}:`, err);
        failed++;
      }
    }

    return NextResponse.json(
      {
        success: true,
        total: toRun.length,
        completed,
        failed,
        skipped: allApps.length - toRun.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Backfill Stage 1 error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to run backfill' },
      { status: 500 }
    );
  }
}
