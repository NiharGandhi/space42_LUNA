import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { notifications } from '@/lib/db/schema';
import { getSessionUser } from '@/lib/auth/session';
import { eq, and } from 'drizzle-orm';

// PATCH /api/notifications/[id] - Mark one as read
export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { id } = await params;

    await db
      .update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, user.id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Notification PATCH error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update notification' },
      { status: 500 }
    );
  }
}
