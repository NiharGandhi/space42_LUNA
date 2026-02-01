import { db } from '@/lib/db';
import { notifications } from '@/lib/db/schema';

/**
 * Create an in-app notification for a user. Call from APIs when key events happen.
 */
export async function createNotification(
  userId: string,
  title: string,
  options?: { message?: string; link?: string }
): Promise<void> {
  try {
    await db.insert(notifications).values({
      userId,
      title,
      message: options?.message ?? null,
      link: options?.link ?? null,
      read: false,
    });
  } catch (err) {
    console.error('createNotification error:', err);
  }
}
