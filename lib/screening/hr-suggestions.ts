import { db } from '@/lib/db';
import {
  applications,
  jobs,
  hrCandidateSuggestions,
} from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

const MAX_SUGGESTIONS_PER_FAIL = 5;

/**
 * When a candidate fails a stage, create HR suggestions for other open jobs
 * they haven't applied to. Notify HR that this candidate might fit those roles.
 */
export async function createHrCandidateSuggestions(
  applicationId: string,
  failedJobId: string,
  sourceStage: 1 | 2 | 3
): Promise<void> {
  try {
    const [app] = await db
      .select({ candidateId: applications.candidateId })
      .from(applications)
      .where(eq(applications.id, applicationId))
      .limit(1);
    if (!app) return;

    const appliedJobIds = await db
      .select({ jobId: applications.jobId })
      .from(applications)
      .where(eq(applications.candidateId, app.candidateId));
    const appliedSet = new Set(appliedJobIds.map((r) => r.jobId));

    const otherActiveJobs = await db
      .select({
        id: jobs.id,
        title: jobs.title,
        department: jobs.department,
      })
      .from(jobs)
      .where(eq(jobs.status, 'active'))
      .orderBy(desc(jobs.createdAt));

    const suggestedJobs = otherActiveJobs
      .filter((j) => j.id !== failedJobId && !appliedSet.has(j.id))
      .slice(0, MAX_SUGGESTIONS_PER_FAIL);

    if (suggestedJobs.length === 0) return;

    const stageLabel = sourceStage === 1 ? 'resume screening' : sourceStage === 2 ? 'questions' : 'voice interview';
    const message = `Candidate did not advance past ${stageLabel} for this role but has not applied to this position; consider reaching out.`;

    await db.insert(hrCandidateSuggestions).values(
      suggestedJobs.map((j) => ({
        candidateId: app.candidateId,
        suggestedJobId: j.id,
        applicationId,
        sourceStage,
        message,
      }))
    );
  } catch (err) {
    console.error('createHrCandidateSuggestions error:', err);
  }
}
