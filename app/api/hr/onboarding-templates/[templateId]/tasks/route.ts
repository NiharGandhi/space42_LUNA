import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { onboardingTemplates, onboardingTemplateTasks } from '@/lib/db/schema';
import { getSessionUser } from '@/lib/auth/session';
import { eq, asc } from 'drizzle-orm';

const VALID_CATEGORIES = ['visa', 'insurance', 'background_check', 'it_setup', 'documentation', 'other'] as const;

// GET /api/hr/onboarding-templates/[templateId]/tasks - List tasks (HR only)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
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
        { success: false, error: 'Only HR can view template tasks' },
        { status: 403 }
      );
    }

    const { templateId } = await params;

    const [template] = await db
      .select({ id: onboardingTemplates.id })
      .from(onboardingTemplates)
      .where(eq(onboardingTemplates.id, templateId))
      .limit(1);
    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    const tasks = await db
      .select()
      .from(onboardingTemplateTasks)
      .where(eq(onboardingTemplateTasks.templateId, templateId))
      .orderBy(asc(onboardingTemplateTasks.taskOrder));

    return NextResponse.json({ success: true, tasks });
  } catch (error) {
    console.error('Template tasks GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

// POST /api/hr/onboarding-templates/[templateId]/tasks - Add task (HR only). Body: { taskTitle, taskDescription?, taskOrder?, category }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
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
        { success: false, error: 'Only HR can add template tasks' },
        { status: 403 }
      );
    }

    const { templateId } = await params;

    const [template] = await db
      .select({ id: onboardingTemplates.id })
      .from(onboardingTemplates)
      .where(eq(onboardingTemplates.id, templateId))
      .limit(1);
    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const taskTitle = typeof body.taskTitle === 'string' && body.taskTitle.trim() ? body.taskTitle.trim() : 'New task';
    const taskDescription = typeof body.taskDescription === 'string' ? body.taskDescription : null;
    const category = VALID_CATEGORIES.includes(body.category) ? body.category : 'other';
    const requiresSubmission = body.requiresSubmission === true;
    const submissionDescription = requiresSubmission && typeof body.submissionDescription === 'string' && body.submissionDescription.trim()
      ? body.submissionDescription.trim()
      : null;

    const existing = await db
      .select({ taskOrder: onboardingTemplateTasks.taskOrder })
      .from(onboardingTemplateTasks)
      .where(eq(onboardingTemplateTasks.templateId, templateId));
    const maxOrder = existing.length > 0 ? Math.max(...existing.map((t) => t.taskOrder)) : 0;
    const taskOrder = typeof body.taskOrder === 'number' ? body.taskOrder : maxOrder + 1;

    const now = new Date();
    const [task] = await db
      .insert(onboardingTemplateTasks)
      .values({
        templateId,
        taskTitle,
        taskDescription,
        taskOrder,
        category,
        isRequired: body.isRequired !== false,
        estimatedDays: typeof body.estimatedDays === 'number' ? body.estimatedDays : null,
        requiresSubmission,
        submissionDescription,
        createdAt: now,
      })
      .returning();

    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Failed to create task' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, task });
  } catch (error) {
    console.error('Template tasks POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create task' },
      { status: 500 }
    );
  }
}
