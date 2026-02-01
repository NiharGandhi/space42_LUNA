import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { jobs, stage2Questions } from '@/lib/db/schema';
import { getSessionUser } from '@/lib/auth/session';
import { eq, asc } from 'drizzle-orm';

const createQuestionSchema = z.object({
  questionText: z.string().min(1),
  questionOrder: z.number().int().min(0),
  isRequired: z.boolean().optional().default(true),
});

// GET /api/jobs/[jobId]/questions - List Stage 2 questions for a job (HR only)
export async function GET(
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
        { success: false, error: 'Only HR can view job questions' },
        { status: 403 }
      );
    }

    const { jobId } = await params;

    const [job] = await db.select({ id: jobs.id }).from(jobs).where(eq(jobs.id, jobId)).limit(1);
    if (!job) {
      return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
    }

    const questions = await db
      .select()
      .from(stage2Questions)
      .where(eq(stage2Questions.jobId, jobId))
      .orderBy(asc(stage2Questions.questionOrder));

    return NextResponse.json({ success: true, questions }, { status: 200 });
  } catch (error) {
    console.error('Get job questions error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch questions' },
      { status: 500 }
    );
  }
}

// POST /api/jobs/[jobId]/questions - Add Stage 2 question (HR only)
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
        { success: false, error: 'Only HR can add questions' },
        { status: 403 }
      );
    }

    const { jobId } = await params;
    const body = await request.json();
    const data = createQuestionSchema.parse(body);

    const [job] = await db.select({ id: jobs.id }).from(jobs).where(eq(jobs.id, jobId)).limit(1);
    if (!job) {
      return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
    }

    const [question] = await db
      .insert(stage2Questions)
      .values({
        jobId,
        questionText: data.questionText,
        questionOrder: data.questionOrder,
        isRequired: data.isRequired ?? true,
        createdBy: user.id,
      })
      .returning();

    return NextResponse.json({ success: true, question }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    console.error('Create question error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create question' },
      { status: 500 }
    );
  }
}
