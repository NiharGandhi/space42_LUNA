import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { jobs } from '@/lib/db/schema';
import { getSessionUser } from '@/lib/auth/session';
import { eq } from 'drizzle-orm';

// Schema for updating a job
const updateJobSchema = z.object({
  title: z.string().optional(),
  department: z.string().optional(),
  location: z.string().optional(),
  employmentType: z.enum(['full_time', 'part_time', 'contract', 'internship']).optional(),
  description: z.string().optional(),
  requirements: z.array(z.string()).optional(),
  responsibilities: z.array(z.string()).optional(),
  salaryRangeMin: z.number().optional(),
  salaryRangeMax: z.number().optional(),
  status: z.enum(['draft', 'active', 'paused', 'closed']).optional(),
});

// GET /api/jobs/[jobId] - Get single job
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    const [job] = await db
      .select()
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .limit(1);

    if (!job) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, job },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get job error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch job' },
      { status: 500 }
    );
  }
}

// PATCH /api/jobs/[jobId] - Update job
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    if (user.role !== 'hr' && user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Only HR can update jobs' },
        { status: 403 }
      );
    }

    const { jobId } = await params;
    const body = await request.json();
    const updateData = updateJobSchema.parse(body);

    // Update job
    const [updatedJob] = await db
      .update(jobs)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, jobId))
      .returning();

    if (!updatedJob) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, job: updatedJob },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues?.[0]?.message ?? 'Invalid input' },
        { status: 400 }
      );
    }

    console.error('Update job error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update job' },
      { status: 500 }
    );
  }
}

// DELETE /api/jobs/[jobId] - Delete job (soft delete by setting status to closed)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    if (user.role !== 'hr' && user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Only HR can delete jobs' },
        { status: 403 }
      );
    }

    const { jobId } = await params;

    // Soft delete by setting status to closed
    const [deletedJob] = await db
      .update(jobs)
      .set({
        status: 'closed',
        closedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, jobId))
      .returning();

    if (!deletedJob) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Job closed successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Delete job error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete job' },
      { status: 500 }
    );
  }
}
