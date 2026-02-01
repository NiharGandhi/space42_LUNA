import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { onboardingTemplateTasks, onboardingTasks } from '@/lib/db/schema';
import { getSessionUser } from '@/lib/auth/session';
import { eq, and } from 'drizzle-orm';

const VALID_CATEGORIES = ['visa', 'insurance', 'background_check', 'it_setup', 'documentation', 'other'] as const;

// PATCH /api/hr/onboarding-templates/[templateId]/tasks/[taskId] - Update task (HR only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string; taskId: string }> }
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
        { success: false, error: 'Only HR can update template tasks' },
        { status: 403 }
      );
    }

    const { templateId, taskId } = await params;

    const [task] = await db
      .select()
      .from(onboardingTemplateTasks)
      .where(and(
        eq(onboardingTemplateTasks.id, taskId),
        eq(onboardingTemplateTasks.templateId, templateId)
      ))
      .limit(1);

    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const updates: Record<string, unknown> = {};
    if (typeof body.taskTitle === 'string' && body.taskTitle.trim()) updates.taskTitle = body.taskTitle.trim();
    if (body.taskDescription !== undefined) updates.taskDescription = body.taskDescription === null || body.taskDescription === '' ? null : String(body.taskDescription);
    if (typeof body.taskOrder === 'number') updates.taskOrder = body.taskOrder;
    if (VALID_CATEGORIES.includes(body.category)) updates.category = body.category;
    if (typeof body.isRequired === 'boolean') updates.isRequired = body.isRequired;
    if (body.estimatedDays !== undefined) updates.estimatedDays = body.estimatedDays === null ? null : Number(body.estimatedDays);

    if (Object.keys(updates).length > 0) {
      await db
        .update(onboardingTemplateTasks)
        .set(updates as Partial<typeof onboardingTemplateTasks.$inferInsert>)
        .where(eq(onboardingTemplateTasks.id, taskId));
    }

    const [updated] = await db
      .select()
      .from(onboardingTemplateTasks)
      .where(eq(onboardingTemplateTasks.id, taskId))
      .limit(1);

    return NextResponse.json({ success: true, task: updated });
  } catch (error) {
    console.error('Template task PATCH error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update task' },
      { status: 500 }
    );
  }
}

// DELETE /api/hr/onboarding-templates/[templateId]/tasks/[taskId] - Delete task (HR only)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ templateId: string; taskId: string }> }
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
        { success: false, error: 'Only HR can delete template tasks' },
        { status: 403 }
      );
    }

    const { templateId, taskId } = await params;

    const [task] = await db
      .select({ id: onboardingTemplateTasks.id })
      .from(onboardingTemplateTasks)
      .where(and(
        eq(onboardingTemplateTasks.id, taskId),
        eq(onboardingTemplateTasks.templateId, templateId)
      ))
      .limit(1);

    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    // Unlink any onboarding_tasks that reference this template task (they keep their title/description)
    await db
      .update(onboardingTasks)
      .set({ templateTaskId: null, updatedAt: new Date() })
      .where(eq(onboardingTasks.templateTaskId, taskId));

    await db.delete(onboardingTemplateTasks).where(eq(onboardingTemplateTasks.id, taskId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Template task DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete task' },
      { status: 500 }
    );
  }
}
