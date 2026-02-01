import { db } from '@/lib/db';
import { otpCodes } from '@/lib/db/schema';
import { eq, and, gt, lt } from 'drizzle-orm';

// Generate a 6-digit OTP
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Store OTP in database
export async function createOTP(email: string): Promise<string> {
  const code = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await db.insert(otpCodes).values({
    email: email.toLowerCase(),
    code,
    expiresAt,
    used: false,
  });

  return code;
}

// Verify OTP
export async function verifyOTP(
  email: string,
  code: string
): Promise<boolean> {
  const [otpRecord] = await db
    .select()
    .from(otpCodes)
    .where(
      and(
        eq(otpCodes.email, email.toLowerCase()),
        eq(otpCodes.code, code),
        eq(otpCodes.used, false),
        gt(otpCodes.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!otpRecord) {
    return false;
  }

  // Mark OTP as used
  await db
    .update(otpCodes)
    .set({ used: true })
    .where(eq(otpCodes.id, otpRecord.id));

  return true;
}

// Clean up expired OTPs (optional, for maintenance)
export async function cleanupExpiredOTPs() {
  await db.delete(otpCodes).where(lt(otpCodes.expiresAt, new Date()));
}
