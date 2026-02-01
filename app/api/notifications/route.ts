import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { notifications } from '@/lib/db/schema';
import { getSessionUser } from '@/lib/auth/session';
import { eq, desc } from 'drizzle-orm';

// GET /api/notifications - List notifications for current user (unread first, then by date)
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const list = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(50);

    const unreadCount = list.filter((n) => !n.read).length;

    return NextResponse.json({
      success: true,
      notifications: list.map((n) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        link: n.link,
        read: n.read,
        createdAt: n.createdAt,
      })),
      unreadCount,
    });
  } catch (error) {
    console.error('Notifications GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

// PATCH /api/notifications - Mark all as read (body: { read: true })
export async function PATCH(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    if (body.read === true) {
      await db
        .update(notifications)
        .set({ read: true })
        .where(eq(notifications.userId, user.id));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Notifications PATCH error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update notifications' },
      { status: 500 }
    );
  }
}
