import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { jobs } from '@/lib/db/schema';
import { getSessionUser } from '@/lib/auth/session';
import { eq } from 'drizzle-orm';
import { suggestStage2Questions } from '@/lib/ai/stage2-questions-generator';

const suggestSchema = z.object({
  hrContext: z.string().max(2000).optional(),
});

// POST /api/jobs/[jobId]/questions/suggest - AI suggests Stage 2 questions (HR only). Optional hrContext for guided mode.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
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
        { success: false, error: 'Only HR can suggest questions' },
        { status: 403 }
      );
    }

    const { jobId } = await params;
    const body = await request.json().catch(() => ({}));
    const { hrContext } = suggestSchema.parse(body);

    const [job] = await db
      .select({
        id: jobs.id,
        title: jobs.title,
        description: jobs.description,
        requirements: jobs.requirements,
        responsibilities: jobs.responsibilities,
      })
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .limit(1);

    if (!job) {
      return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
    }

    const requirements = Array.isArray(job.requirements) ? job.requirements : [];
    const responsibilities = Array.isArray(job.responsibilities) ? job.responsibilities : [];

    const suggestedQuestions = await suggestStage2Questions(
      {
        title: job.title,
        description: job.description ?? '',
        requirements,
        responsibilities,
      },
      hrContext
    );

    return NextResponse.json(
      { success: true, suggestedQuestions },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues?.[0]?.message ?? 'Invalid input' },
        { status: 400 }
      );
    }
    console.error('Suggest questions error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to suggest questions' },
      { status: 500 }
    );
  }
}
