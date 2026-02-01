import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { onboardingTemplates, onboardingTemplateTasks } from '@/lib/db/schema';
import { getSessionUser } from '@/lib/auth/session';
import { eq, asc } from 'drizzle-orm';

// GET /api/hr/onboarding-templates/[templateId] - Get template with tasks (HR only)
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
        { success: false, error: 'Only HR can view onboarding templates' },
        { status: 403 }
      );
    }

    const { templateId } = await params;

    const [template] = await db
      .select()
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

    return NextResponse.json({
      success: true,
      template: {
        id: template.id,
        name: template.name,
        description: template.description,
        isDefault: template.isDefault,
        createdBy: template.createdBy,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
      },
      tasks,
    });
  } catch (error) {
    console.error('Onboarding template GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch template' },
      { status: 500 }
    );
  }
}

// PATCH /api/hr/onboarding-templates/[templateId] - Update template (HR only)
export async function PATCH(
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
        { success: false, error: 'Only HR can update onboarding templates' },
        { status: 403 }
      );
    }

    const { templateId } = await params;
    const body = await request.json().catch(() => ({}));

    const [template] = await db
      .select()
      .from(onboardingTemplates)
      .where(eq(onboardingTemplates.id, templateId))
      .limit(1);

    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    const updates: { name?: string; description?: string | null; isDefault?: boolean; updatedAt: Date } = {
      updatedAt: new Date(),
    };
    if (typeof body.name === 'string' && body.name.trim()) updates.name = body.name.trim();
    if (body.description !== undefined) updates.description = body.description === null || body.description === '' ? null : String(body.description);
    if (body.isDefault === true) {
      updates.isDefault = true;
      await db
        .update(onboardingTemplates)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(eq(onboardingTemplates.isDefault, true));
    } else if (body.isDefault === false) updates.isDefault = false;

    await db
      .update(onboardingTemplates)
      .set(updates)
      .where(eq(onboardingTemplates.id, templateId));

    const [updated] = await db
      .select()
      .from(onboardingTemplates)
      .where(eq(onboardingTemplates.id, templateId))
      .limit(1);

    return NextResponse.json({ success: true, template: updated });
  } catch (error) {
    console.error('Onboarding template PATCH error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update template' },
      { status: 500 }
    );
  }
}

// DELETE /api/hr/onboarding-templates/[templateId] - Delete template (HR only)
export async function DELETE(
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
        { success: false, error: 'Only HR can delete onboarding templates' },
        { status: 403 }
      );
    }

    const { templateId } = await params;

    await db.delete(onboardingTemplates).where(eq(onboardingTemplates.id, templateId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Onboarding template DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}
