import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { onboardingTemplates, onboardingTemplateTasks } from '@/lib/db/schema';
import { getSessionUser } from '@/lib/auth/session';
import { eq, asc } from 'drizzle-orm';

// GET /api/hr/onboarding-templates - List all templates with task counts (HR only)
export async function GET() {
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

    const templates = await db
      .select()
      .from(onboardingTemplates)
      .orderBy(asc(onboardingTemplates.createdAt));

    const withCounts = await Promise.all(
      templates.map(async (t) => {
        const tasks = await db
          .select({ id: onboardingTemplateTasks.id })
          .from(onboardingTemplateTasks)
          .where(eq(onboardingTemplateTasks.templateId, t.id));
        return {
          id: t.id,
          name: t.name,
          description: t.description,
          isDefault: t.isDefault,
          createdBy: t.createdBy,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
          taskCount: tasks.length,
        };
      })
    );

    return NextResponse.json({ success: true, templates: withCounts });
  } catch (error) {
    console.error('Onboarding templates GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

// POST /api/hr/onboarding-templates - Create template (HR only). Body: { name, description?, isDefault? }
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
        { success: false, error: 'Only HR can create onboarding templates' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : 'New onboarding';
    const description = typeof body.description === 'string' ? body.description : null;
    const isDefault = body.isDefault === true;

    const now = new Date();
    if (isDefault) {
      await db
        .update(onboardingTemplates)
        .set({ isDefault: false, updatedAt: now })
        .where(eq(onboardingTemplates.isDefault, true));
    }

    const [template] = await db
      .insert(onboardingTemplates)
      .values({
        name,
        description,
        isDefault: isDefault || false,
        createdBy: user.id,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Failed to create template' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, template });
  } catch (error) {
    console.error('Onboarding templates POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create template' },
      { status: 500 }
    );
  }
}
