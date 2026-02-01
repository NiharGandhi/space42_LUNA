import { db } from '@/lib/db';
import { users, sessions } from '@/lib/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { cookies } from 'next/headers';

const SESSION_COOKIE_NAME = 'session_token';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  role: 'candidate' | 'hr' | 'admin';
};

// Create a new session
export async function createSession(userId: string): Promise<string> {
  const token = nanoid(32);
  const expiresAt = new Date(Date.now() + SESSION_DURATION);

  await db.insert(sessions).values({
    userId,
    token,
    expiresAt,
  });

  // Set cookie
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });

  return token;
}

// Get current session user
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const [sessionData] = await db
    .select({
      user: users,
      session: sessions,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.token, token),
        gt(sessions.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!sessionData) {
    return null;
  }

  return {
    id: sessionData.user.id,
    email: sessionData.user.email,
    name: sessionData.user.name,
    role: sessionData.user.role,
  };
}

// Delete session (logout)
export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    await db.delete(sessions).where(eq(sessions.token, token));
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

// Validate session token (for API routes)
export async function validateSessionToken(
  token: string
): Promise<SessionUser | null> {
  const [sessionData] = await db
    .select({
      user: users,
      session: sessions,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.token, token),
        gt(sessions.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!sessionData) {
    return null;
  }

  return {
    id: sessionData.user.id,
    email: sessionData.user.email,
    name: sessionData.user.name,
    role: sessionData.user.role,
  };
}
