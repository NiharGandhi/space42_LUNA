import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createOTP } from '@/lib/auth/otp';
import { sendOTPEmail } from '@/lib/email/nodemailer';

const sendOTPSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const isDev = process.env.NODE_ENV === 'development';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = sendOTPSchema.parse(body);

    // Generate and store OTP
    const code = await createOTP(email);

    try {
      await sendOTPEmail(email, code);
    } catch (emailError) {
      if (isDev) {
        // SMTP blocked/unreachable in dev — log OTP so auth still works
        console.log('\n--- [DEV] OTP (SMTP failed) ---');
        console.log(`Email: ${email}`);
        console.log(`Code:  ${code}`);
        console.log('-------------------------------\n');
        return NextResponse.json(
          { success: true, message: 'Check terminal for OTP (SMTP unavailable)' },
          { status: 200 }
        );
      }
      throw emailError;
    }

    return NextResponse.json(
      { success: true, message: 'OTP sent to your email' },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues?.[0]?.message ?? 'Invalid input' },
        { status: 400 }
      );
    }

    console.error('Send OTP error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send OTP' },
      { status: 500 }
    );
  }
}
