import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  hrCandidateSuggestions,
  users,
  jobs,
  applications,
} from '@/lib/db/schema';
import { getSessionUser } from '@/lib/auth/session';
import { eq, desc } from 'drizzle-orm';

// GET /api/hr/suggestions - List candidate-fit suggestions for HR (candidate failed one role but may fit others)
export async function GET() {
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
        { success: false, error: 'Only HR can view suggestions' },
        { status: 403 }
      );
    }

    const rows = await db
      .select({
        id: hrCandidateSuggestions.id,
        candidateId: hrCandidateSuggestions.candidateId,
        suggestedJobId: hrCandidateSuggestions.suggestedJobId,
        applicationId: hrCandidateSuggestions.applicationId,
        sourceStage: hrCandidateSuggestions.sourceStage,
        message: hrCandidateSuggestions.message,
        createdAt: hrCandidateSuggestions.createdAt,
        candidateEmail: users.email,
        candidateName: users.name,
        jobTitle: jobs.title,
        jobDepartment: jobs.department,
      })
      .from(hrCandidateSuggestions)
      .innerJoin(users, eq(hrCandidateSuggestions.candidateId, users.id))
      .innerJoin(jobs, eq(hrCandidateSuggestions.suggestedJobId, jobs.id))
      .orderBy(desc(hrCandidateSuggestions.createdAt))
      .limit(50);

    return NextResponse.json({
      success: true,
      suggestions: rows.map((r) => ({
        id: r.id,
        candidateId: r.candidateId,
        candidateEmail: r.candidateEmail,
        candidateName: r.candidateName,
        suggestedJobId: r.suggestedJobId,
        jobTitle: r.jobTitle,
        jobDepartment: r.jobDepartment,
        applicationId: r.applicationId,
        sourceStage: r.sourceStage,
        message: r.message,
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    console.error('HR suggestions error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch suggestions' },
      { status: 500 }
    );
  }
}
