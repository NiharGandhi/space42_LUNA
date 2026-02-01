import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { jobs } from '@/lib/db/schema';
import { getSessionUser } from '@/lib/auth/session';
import { eq, desc } from 'drizzle-orm';

// Schema for creating a job
const createJobSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  department: z.string().min(1, 'Department is required'),
  location: z.string().min(1, 'Location is required'),
  employmentType: z.enum(['full_time', 'part_time', 'contract', 'internship']),
  description: z.string().min(1, 'Description is required'),
  requirements: z.array(z.string()).min(1, 'At least one requirement is needed'),
  responsibilities: z.array(z.string()).min(1, 'At least one responsibility is needed'),
  salaryRangeMin: z.number().optional(),
  salaryRangeMax: z.number().optional(),
  status: z.enum(['draft', 'active', 'paused', 'closed']).default('draft'),
});

// GET /api/jobs - List all jobs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // Build query
    let query = db.select().from(jobs).orderBy(desc(jobs.createdAt));

    // Filter by status if provided
    let allJobs;
    if (status) {
      allJobs = await db
        .select()
        .from(jobs)
        .where(eq(jobs.status, status as any))
        .orderBy(desc(jobs.createdAt));
    } else {
      allJobs = await db
        .select()
        .from(jobs)
        .orderBy(desc(jobs.createdAt));
    }

    return NextResponse.json(
      { success: true, jobs: allJobs },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get jobs error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}

// POST /api/jobs - Create a new job
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Check if user is HR
    if (user.role !== 'hr' && user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Only HR can create jobs' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const jobData = createJobSchema.parse(body);

    // Create job
    const [newJob] = await db.insert(jobs).values({
      ...jobData,
      createdBy: user.id,
    }).returning();

    return NextResponse.json(
      { success: true, job: newJob },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues?.[0]?.message ?? 'Invalid input' },
        { status: 400 }
      );
    }

    console.error('Create job error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create job' },
      { status: 500 }
    );
  }
}
