import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { stage2Questions } from '@/lib/db/schema';
import { getSessionUser } from '@/lib/auth/session';
import { eq, and } from 'drizzle-orm';

const updateQuestionSchema = z.object({
  questionText: z.string().min(1).optional(),
  questionOrder: z.number().int().min(0).optional(),
  isRequired: z.boolean().optional(),
});

// PATCH /api/jobs/[jobId]/questions/[questionId] - Update question (HR only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string; questionId: string }> }
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
        { success: false, error: 'Only HR can update questions' },
        { status: 403 }
      );
    }

    const { jobId, questionId } = await params;
    const body = await request.json();
    const data = updateQuestionSchema.parse(body);

    const [updated] = await db
      .update(stage2Questions)
      .set({
        ...(data.questionText != null && { questionText: data.questionText }),
        ...(data.questionOrder != null && { questionOrder: data.questionOrder }),
        ...(data.isRequired != null && { isRequired: data.isRequired }),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(stage2Questions.id, questionId),
          eq(stage2Questions.jobId, jobId)
        )
      )
      .returning();

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Question not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, question: updated }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues?.[0]?.message ?? 'Invalid input' },
        { status: 400 }
      );
    }
    console.error('Update question error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update question' },
      { status: 500 }
    );
  }
}

// DELETE /api/jobs/[jobId]/questions/[questionId] - Delete question (HR only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string; questionId: string }> }
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
        { success: false, error: 'Only HR can delete questions' },
        { status: 403 }
      );
    }

    const { jobId, questionId } = await params;

    const [deleted] = await db
      .delete(stage2Questions)
      .where(
        and(
          eq(stage2Questions.id, questionId),
          eq(stage2Questions.jobId, jobId)
        )
      )
      .returning();

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Question not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Question deleted' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Delete question error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete question' },
      { status: 500 }
    );
  }
}
