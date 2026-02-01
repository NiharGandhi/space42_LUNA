import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { applications, jobs, users } from '@/lib/db/schema';
import { getSessionUser } from '@/lib/auth/session';
import { eq, and, sql } from 'drizzle-orm';
import { createNotification } from '@/lib/notifications/create';
import { sendNewApplicationEmail } from '@/lib/email/nodemailer';

const createApplicationSchema = z.object({
  jobId: z.string().uuid(),
  resumeFileKey: z.string().optional(),
  resumeUrl: z.string().optional(),
  resumeText: z.string().optional(),
  candidateProfile: z.any().optional(),
  coverLetter: z.string().optional(),
  linkedinUrl: z.string().url().optional(),
  portfolioUrl: z.string().url().optional(),
});

// POST /api/applications - Create application
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    if (user.role !== 'candidate') {
      return NextResponse.json(
        { success: false, error: 'Only candidates can apply' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const data = createApplicationSchema.parse(body);

    // Check if already applied
    const [existingApplication] = await db
      .select()
      .from(applications)
      .where(and(eq(applications.candidateId, user.id), eq(applications.jobId, data.jobId)))
      .limit(1);

    if (existingApplication) {
      return NextResponse.json(
        { success: false, error: 'You have already applied to this job' },
        { status: 400 }
      );
    }

    // Create application
    const [newApplication] = await db
      .insert(applications)
      .values({
        jobId: data.jobId,
        candidateId: user.id,
        resumeFileKey: data.resumeFileKey,
        resumeUrl: data.resumeUrl,
        resumeText: data.resumeText,
        candidateProfile: data.candidateProfile,
        coverLetter: data.coverLetter,
        linkedinUrl: data.linkedinUrl,
        portfolioUrl: data.portfolioUrl,
        status: 'submitted',
        currentStage: null,
      })
      .returning();

    if (newApplication) {
      const [jobRow] = await db
        .select({ title: jobs.title, createdBy: jobs.createdBy })
        .from(jobs)
        .where(eq(jobs.id, data.jobId))
        .limit(1);
      if (jobRow) {
        const [hrUser] = await db
          .select({ id: users.id, email: users.email })
          .from(users)
          .where(eq(users.id, jobRow.createdBy))
          .limit(1);
        if (hrUser) {
          await createNotification(hrUser.id, 'New application', {
            message: `New application for ${jobRow.title}`,
            link: `/applications/${newApplication.id}`,
          });
          try {
            await sendNewApplicationEmail(
              hrUser.email,
              jobRow.title,
              user.name || user.email,
              newApplication.id
            );
          } catch (e) {
            console.error('sendNewApplicationEmail error:', e);
          }
        }
      }
    }

    return NextResponse.json(
      { success: true, application: newApplication },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0]?.message ?? 'Validation error' },
        { status: 400 }
      );
    }

    console.error('Create application error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create application' },
      { status: 500 }
    );
  }
}

// GET /api/applications - List applications (with job + candidate for dashboards)
// Query: ?jobId=xxx to filter by job (HR/admin only)
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId') || undefined;

    const list =
      user.role === 'candidate'
        ? await db
            .select({
              id: applications.id,
              jobId: applications.jobId,
              candidateId: applications.candidateId,
              status: applications.status,
              currentStage: applications.currentStage,
              overallScore: applications.overallScore,
              aiSummary: applications.aiSummary,
              createdAt: applications.createdAt,
              updatedAt: applications.updatedAt,
              resumeUrl: applications.resumeUrl,
              jobTitle: jobs.title,
              jobDepartment: jobs.department,
              jobLocation: jobs.location,
              jobStatus: jobs.status,
              candidateEmail: users.email,
              candidateName: users.name,
            })
            .from(applications)
            .innerJoin(jobs, eq(applications.jobId, jobs.id))
            .innerJoin(users, eq(applications.candidateId, users.id))
            .where(eq(applications.candidateId, user.id))
        : await db
            .select({
              id: applications.id,
              jobId: applications.jobId,
              candidateId: applications.candidateId,
              status: applications.status,
              currentStage: applications.currentStage,
              overallScore: applications.overallScore,
              aiSummary: applications.aiSummary,
              createdAt: applications.createdAt,
              updatedAt: applications.updatedAt,
              resumeUrl: applications.resumeUrl,
              jobTitle: jobs.title,
              jobDepartment: jobs.department,
              jobLocation: jobs.location,
              jobStatus: jobs.status,
              candidateEmail: users.email,
              candidateName: users.name,
            })
            .from(applications)
            .innerJoin(jobs, eq(applications.jobId, jobs.id))
            .innerJoin(users, eq(applications.candidateId, users.id))
            .where(jobId ? eq(applications.jobId, jobId) : sql`1=1`);

    const applicationsList = list.map((row) => ({
      id: row.id,
      jobId: row.jobId,
      candidateId: row.candidateId,
      status: row.status,
      currentStage: row.currentStage,
      overallScore: row.overallScore,
      aiSummary: row.aiSummary,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      resumeUrl: row.resumeUrl,
      job: {
        id: row.jobId,
        title: row.jobTitle,
        department: row.jobDepartment,
        location: row.jobLocation,
        status: row.jobStatus,
      },
      ...(user.role === 'hr' || user.role === 'admin'
        ? {
            candidate: {
              id: row.candidateId,
              email: row.candidateEmail,
              name: row.candidateName,
            },
          }
        : {}),
    }));

    return NextResponse.json(
      { success: true, applications: applicationsList },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get applications error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch applications' },
      { status: 500 }
    );
  }
}
