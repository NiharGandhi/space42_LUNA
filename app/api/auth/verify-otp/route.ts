import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyOTP } from '@/lib/auth/otp';
import { createSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const verifyOTPSchema = z.object({
  email: z.string().email('Invalid email address'),
  code: z.string().length(6, 'OTP must be 6 digits'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code } = verifyOTPSchema.parse(body);

    // Verify OTP
    const isValid = await verifyOTP(email, code);

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired OTP' },
        { status: 400 }
      );
    }

    // Find or create user - role comes from DB (existing users) or defaults to candidate (new users)
    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (!user) {
      // Create new user - default to candidate, role can be changed manually in DB
      [user] = await db
        .insert(users)
        .values({
          email: email.toLowerCase(),
          role: 'candidate',
          name: null,
        })
        .returning();
    }

    // Create session
    await createSession(user.id);

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.name,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues?.[0]?.message ?? 'Invalid input' },
        { status: 400 }
      );
    }

    console.error('Verify OTP error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to verify OTP' },
      { status: 500 }
    );
  }
}
