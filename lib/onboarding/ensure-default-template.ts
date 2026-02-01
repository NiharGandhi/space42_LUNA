import { db } from '@/lib/db';
import {
  onboardingTemplates,
  onboardingTemplateTasks,
} from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';

// Simple default: HR can add more in Settings. Names are short and friendly.
const DEFAULT_TASKS = [
  { taskTitle: 'Visa & work authorization', taskOrder: 1, category: 'visa' as const },
  { taskTitle: 'Background check', taskOrder: 2, category: 'background_check' as const },
  { taskTitle: 'IT & equipment', taskOrder: 3, category: 'it_setup' as const },
  { taskTitle: 'Paperwork & documents', taskOrder: 4, category: 'documentation' as const },
  { taskTitle: 'Read the handbook', taskOrder: 5, category: 'documentation' as const },
  { taskTitle: 'Meet your manager', taskOrder: 6, category: 'other' as const },
];

/**
 * Ensure at least one onboarding template exists. If none, create a default one with tasks.
 * Returns the default or first template. Caller must pass hrUserId for createdBy.
 */
export async function ensureDefaultOnboardingTemplate(hrUserId: string) {
  let [template] = await db
    .select()
    .from(onboardingTemplates)
    .where(eq(onboardingTemplates.isDefault, true))
    .limit(1);
  if (!template) {
    [template] = await db
      .select()
      .from(onboardingTemplates)
      .orderBy(asc(onboardingTemplates.createdAt))
      .limit(1);
  }
  if (template) return template;

  const now = new Date();
  const [newTemplate] = await db
    .insert(onboardingTemplates)
    .values({
      name: 'Default',
      description: 'Add or edit tasks in Settings → Onboarding',
      isDefault: true,
      createdBy: hrUserId,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  if (!newTemplate) throw new Error('Failed to create default onboarding template');

  await db.insert(onboardingTemplateTasks).values(
    DEFAULT_TASKS.map((t) => ({
      templateId: newTemplate.id,
      taskTitle: t.taskTitle,
      taskOrder: t.taskOrder,
      category: t.category,
      isRequired: true,
      createdAt: now,
    }))
  );

  return newTemplate;
}
