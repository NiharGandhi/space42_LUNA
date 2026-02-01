import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { applications, jobs } from '@/lib/db/schema';
import { getSessionUser } from '@/lib/auth/session';
import { eq, desc } from 'drizzle-orm';

// GET /api/jobs/for-candidate - Active jobs the candidate has not applied to (for "Other roles" suggestions)
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }
    if (user.role !== 'candidate') {
      return NextResponse.json(
        { success: false, error: 'Only candidates can use this endpoint' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(20, Math.max(1, Number(searchParams.get('limit')) || 5));
    const appliedJobIds = await db
      .select({ jobId: applications.jobId })
      .from(applications)
      .where(eq(applications.candidateId, user.id));
    const ids = appliedJobIds.map((r) => r.jobId);
    if (ids.length === 0) {
      const allActive = await db
        .select()
        .from(jobs)
        .where(eq(jobs.status, 'active'))
        .orderBy(desc(jobs.createdAt))
        .limit(limit);
      return NextResponse.json({ success: true, jobs: allActive });
    }

    const allActive = await db
      .select()
      .from(jobs)
      .where(eq(jobs.status, 'active'))
      .orderBy(desc(jobs.createdAt));

    const notApplied = allActive.filter((j) => !ids.includes(j.id));
    const suggested = notApplied.slice(0, limit);

    return NextResponse.json({ success: true, jobs: suggested });
  } catch (error) {
    console.error('Jobs for candidate error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}
