import nodemailer from 'nodemailer';

const SEND_TIMEOUT_MS = 12_000; // Fail fast — SMTP often blocked/unreachable locally

// Create reusable transporter with short timeouts to avoid 60+ second hangs
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465',
  auth: process.env.SMTP_USER && process.env.SMTP_PASSWORD
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
    : undefined,
  connectionTimeout: SEND_TIMEOUT_MS,
  greetingTimeout: SEND_TIMEOUT_MS,
  socketTimeout: SEND_TIMEOUT_MS,
});

export async function sendOTPEmail(email: string, code: string): Promise<void> {
  const mailOptions = {
    from: process.env.SMTP_FROM || 'noreply@space42.com',
    to: email,
    subject: 'Your Space42 Login Code',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #0066FF; }
            .content { padding: 30px 0; }
            .code { background: #f7f9fc; border: 2px solid #0066FF; border-radius: 8px; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0066FF; margin: 20px 0; }
            .footer { text-align: center; padding: 20px 0; border-top: 1px solid #e3e8ef; color: #697386; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; color: #0066FF;">Space42</h1>
            </div>
            <div class="content">
              <h2>Your verification code</h2>
              <p>Use the code below to log in to your Space42 account:</p>
              <div class="code">${code}</div>
              <p>This code will expire in 10 minutes.</p>
              <p>If you didn't request this code, you can safely ignore this email.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Space42. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Your Space42 verification code is: ${code}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this code, you can safely ignore this email.`,
  };

  await Promise.race([
    transporter.sendMail(mailOptions),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('SMTP connection timed out (12s)')), SEND_TIMEOUT_MS)
    ),
  ]);
}

export async function sendApplicationReceivedEmail(
  email: string,
  jobTitle: string
): Promise<void> {
  const mailOptions = {
    from: process.env.SMTP_FROM || 'noreply@space42.com',
    to: email,
    subject: `Application Received - ${jobTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #0066FF;">Application Received</h1>
            <p>Thank you for applying to the <strong>${jobTitle}</strong> position at Space42.</p>
            <p>Your application is now being reviewed. We'll notify you once it progresses through our screening stages.</p>
            <p>Best regards,<br>The Space42 Team</p>
          </div>
        </body>
      </html>
    `,
  };

  await transporter.sendMail(mailOptions);
}

const baseHtml = (title: string, content: string) => `
  <!DOCTYPE html>
  <html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #0066FF;">Space42</h1>
      <h2 style="color: #333;">${title}</h2>
      ${content}
      <p style="margin-top: 24px; color: #697386; font-size: 14px;">Best regards,<br>The Space42 Team</p>
    </div>
  </body>
  </html>
`;

/** Notify candidate: stage result (passed or failed) */
export async function sendStageResultEmail(
  email: string,
  jobTitle: string,
  passed: boolean,
  stageLabel: string
): Promise<void> {
  const title = passed ? 'You advanced to the next stage' : 'Update on your application';
  const content = passed
    ? `<p>Congratulations! You have advanced past <strong>${stageLabel}</strong> for the role <strong>${jobTitle}</strong>.</p><p>Log in to your dashboard to see next steps.</p>`
    : `<p>Thank you for your interest in <strong>${jobTitle}</strong>. After reviewing your application, we have decided not to move forward with your application at this stage.</p><p>We encourage you to apply for other open positions that match your profile.</p>`;
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'noreply@space42.com',
    to: email,
    subject: `Space42 – ${title}`,
    html: baseHtml(title, content),
  });
}

/** Notify candidate: hiring step (e.g. live interview) scheduled */
export async function sendHiringStepScheduledEmail(
  email: string,
  jobTitle: string,
  stepLabel: string,
  scheduledAt: Date
): Promise<void> {
  const formatted = scheduledAt.toLocaleString();
  const content = `<p>An interview step has been scheduled for your application to <strong>${jobTitle}</strong>.</p><p><strong>${stepLabel}</strong> – ${formatted}</p><p>Log in to your dashboard for details.</p>`;
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'noreply@space42.com',
    to: email,
    subject: `Space42 – Interview scheduled: ${stepLabel}`,
    html: baseHtml('Interview scheduled', content),
  });
}

/** Notify candidate: hired */
export async function sendHiredEmail(
  email: string,
  jobTitle: string
): Promise<void> {
  const content = `<p>Congratulations! We are pleased to offer you the position of <strong>${jobTitle}</strong> at Space42.</p><p>Log in to your dashboard to complete onboarding.</p>`;
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'noreply@space42.com',
    to: email,
    subject: `Space42 – You're hired: ${jobTitle}`,
    html: baseHtml("You're hired!", content),
  });
}

/** Notify HR: new application */
export async function sendNewApplicationEmail(
  hrEmail: string,
  jobTitle: string,
  candidateNameOrEmail: string,
  applicationId: string
): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const link = `${appUrl}/applications/${applicationId}`;
  const content = `<p>A new application was submitted for <strong>${jobTitle}</strong>.</p><p>Candidate: ${candidateNameOrEmail}</p><p><a href="${link}">View application</a></p>`;
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'noreply@space42.com',
    to: hrEmail,
    subject: `Space42 – New application: ${jobTitle}`,
    html: baseHtml('New application', content),
  });
}
