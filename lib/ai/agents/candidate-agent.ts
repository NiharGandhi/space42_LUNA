import { db } from '@/lib/db';
import { jobs, applications } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { parseResumeWithAI } from '@/lib/ai/resume-parser';
import { runStage1Screening } from '@/lib/screening/stage1';

// Define the tools available to the agent
export const candidateAgentTools = [
  {
    type: 'function' as const,
    function: {
      name: 'parse_resume',
      description: 'Parse resume text into structured JSON (name, email, skills, experience, etc.) and optionally score it against the current job. Call this as soon as you have resume text (from paste or upload). Use the result to know what is already available and what to ask (only missingOrUnclear fields).',
      parameters: {
        type: 'object',
        properties: {
          resumeText: {
            type: 'string',
            description: 'The full resume text from the candidate (pasted or extracted from upload)',
          },
          jobId: {
            type: 'string',
            description: 'If the candidate is applying to a specific job, pass the job ID to get a job-resume match score and gaps. Omit if no job context.',
          },
        },
        required: ['resumeText'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'search_jobs',
      description:
        'Search for active job openings. Call with NO parameters to return ALL active jobs. Only pass department or location when the candidate explicitly specifies one (e.g. "in Cyber Security" or "in Abu Dhabi"). When they ask "what roles/jobs are there?" or "what positions are open?" without naming a department or location, call search_jobs with no arguments.',
      parameters: {
        type: 'object',
        properties: {
          department: {
            type: 'string',
            description: 'Filter by department only if the candidate clearly said one (e.g. Cyber Security, Software Engineering)',
          },
          location: {
            type: 'string',
            description: 'Filter by location only if the candidate clearly said one (e.g. Remote, Abu Dhabi)',
          },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_job_details',
      description: 'Get full details about a specific job posting by job ID. Call this whenever the candidate asks about requirements, responsibilities, description, or details for a role. Use the job id from search_jobs results or from the current conversation context.',
      parameters: {
        type: 'object',
        properties: {
          jobId: {
            type: 'string',
            description: 'The unique identifier for the job (from search_jobs or the page context)',
          },
        },
        required: ['jobId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_application',
      description: 'Submit a job application for the candidate. Only call this after collecting all required information.',
      parameters: {
        type: 'object',
        properties: {
          jobId: {
            type: 'string',
            description: 'The job ID to apply for',
          },
          candidateData: {
            type: 'object',
            description: 'Candidate information collected during conversation',
            properties: {
              name: { type: 'string' },
              email: { type: 'string' },
              phone: { type: 'string' },
              location: { type: 'string' },
              workAuthorization: { type: 'string' },
              experienceYears: { type: 'number' },
              skills: { type: 'array', items: { type: 'string' } },
              linkedinUrl: { type: 'string' },
              portfolioUrl: { type: 'string' },
            },
          },
          resumeText: {
            type: 'string',
            description: 'The resume text provided by candidate',
          },
        },
        required: ['jobId', 'candidateData'],
      },
    },
  },
];

// System prompt for the candidate agent
export const candidateAgentSystemPrompt = `You are an AI hiring assistant representing the company's HR team.
Your job is to guide candidates through the job application process in a calm, friendly, and professional way.

You are NOT a human recruiter. You do NOT make final hiring decisions. You do NOT provide guarantees or feedback about being hired.

LISTING JOBS:
- When the candidate asks "what roles/jobs are there?", "what positions are open?", "what do you have?", or similar WITHOUT specifying a department or location, call search_jobs with NO parameters to return ALL active jobs. Do not assume or infer a department from an earlier message unless they clearly just said one (e.g. they said "Software Engineering" or "Cyber Security" in that same turn).
- Only pass department or location to search_jobs when the candidate explicitly names one (e.g. "roles in Cyber Security" or "jobs in Abu Dhabi").

FORMATTING (so responses are readable and interactive):
- Use **bold** for job titles and section labels (e.g. **Cyber Security Analyst**).
- When listing jobs, use a numbered or bullet list with clear lines: Department, Location, Employment Type, Salary Range.
- For each job you list, include a clickable link so the candidate can open the role: add the path /career/[jobId] (use the actual job id from search_jobs). For example: "View role: /career/abc-123-def" or at the end of each item add "— /career/[jobId]". This lets them click through to the job page.
- Keep paragraphs short. Use line breaks between list items.

RESUME-FIRST FLOW (you MUST follow this order):

1. Greet the candidate and confirm the role they are applying for (if they have one in mind).

2. Ask for the resume FIRST. Say they can paste their resume in the message box or use the paperclip to upload a PDF/DOCX (upload requires login). Do not ask for name, email, phone, etc. until you have the resume.

3. As soon as you have resume text (from a message like "Here is my resume text:" or from the candidate pasting/uploading), call parse_resume with that text and the jobId if they are applying to a specific job. This returns structured data (name, email, skills, experience, etc.) and a job-match score. Do not skip this step.

4. Use the parse_resume result:
   - You already have the parsed fields (name, email, phone, skills, experienceYears, etc.). Do NOT ask again for information that is present and clear in the parsed result.
   - Only ask for fields listed in missingOrUnclear, or to confirm/clarify something important (e.g. work authorization if missing).
   - If jobMatch was returned, use it internally to know fit; do not tell the candidate their "score". You may say one brief positive line if the match is strong (e.g. "Your background looks relevant to this role") but do not share numbers or gaps in a negative way.

5. Ask only what's missing or needs confirmation: one question at a time. For example, if missingOrUnclear contains "workAuthorization", ask only about work authorization. If email is missing, ask only for email.

6. Once you have everything needed (parsed data + any missing fields from the candidate), call create_application with the combined candidateData. Use the parsed resume fields and merge any answers the candidate gave in chat. Include resumeText when calling create_application.

7. If create_application fails because the user is not authenticated, tell them: "To submit your application, please sign in using the 'Sign in to apply' form below. Enter your email, then enter the 6-digit code we send you. Once you're signed in, say 'I'm ready' or 'Submit my application' and we'll complete it."

8. Answer any questions the candidate has about the role or process. End with next steps (screening/interview).

Rules:
- Do not ask for information you already have from parse_resume. Check parsed and missingOrUnclear every time.
- Do not reject unless eligibility requirements are clearly not met. Do not ask sensitive or illegal questions.
- Be polite, one question at a time, short and clear.

When the candidate asks about requirements or details for a role, call get_job_details with the job ID and share the actual requirements. Never give generic requirements.

End every completed application with:
"Thank you for applying. Your information has been submitted for the next stage of screening."`;

// Tool execution functions
export async function executeAgentTool(
  toolName: string,
  args: any,
  userId?: string
): Promise<string> {
  switch (toolName) {
    case 'parse_resume':
      return await parseResume(args);

    case 'search_jobs':
      return await searchJobs(args);

    case 'get_job_details':
      return await getJobDetails(args);

    case 'create_application':
      if (!userId) {
        return JSON.stringify({ error: 'User must be authenticated to apply' });
      }
      return await createApplication(args, userId);

    default:
      return JSON.stringify({ error: 'Unknown tool' });
  }
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUUID(s: string): boolean {
  return UUID_REGEX.test(s.trim());
}

async function parseResume(args: {
  resumeText: string;
  jobId?: string;
}): Promise<string> {
  try {
    let jobContext: {
      title: string;
      description: string;
      requirements: string[];
      responsibilities: string[];
    } | undefined;

    if (args.jobId?.trim() && isUUID(args.jobId)) {
      const [job] = await db
        .select()
        .from(jobs)
        .where(eq(jobs.id, args.jobId.trim()))
        .limit(1);
      if (job) {
        jobContext = {
          title: job.title,
          description: job.description,
          requirements: Array.isArray(job.requirements) ? job.requirements : [],
          responsibilities: Array.isArray(job.responsibilities) ? job.responsibilities : [],
        };
      }
    }

    const result = await parseResumeWithAI(
      args.resumeText.slice(0, 20000),
      jobContext
    );

    return JSON.stringify(result);
  } catch (error) {
    console.error('Parse resume error:', error);
    return JSON.stringify({ error: 'Failed to parse resume. Please try pasting again or re-upload.' });
  }
}

async function searchJobs(args:
  {
    department?: string;
    location?: string
  }): Promise<string> {
  try {

    const jobResults = await db.query.jobs.findMany({
      limit: 10,
      where: (jobs, { and, eq }) =>
        and(
          eq(jobs.status, 'active'),
          args.department ? eq(jobs.department, args.department) : undefined,
          args.location ? eq(jobs.location, args.location) : undefined,
        )
    })

    const simplified = jobResults.map((job) => ({
      id: job.id,
      title: job.title,
      department: job.department,
      location: job.location,
      employmentType: job.employmentType,
      salaryRange: job.salaryRangeMin && job.salaryRangeMax
        ? `$${job.salaryRangeMin.toLocaleString()} - $${job.salaryRangeMax.toLocaleString()}`
        : null,
    }));

    return JSON.stringify({
      jobs: simplified,
      count: simplified.length,
    });
  } catch (error) {
    console.error('Search jobs error:', error);
    return JSON.stringify({ error: 'Failed to search jobs' });
  }
}

async function getJobDetails(args: { jobId: string }): Promise<string> {
  try {
    const [job] = await db
      .select()
      .from(jobs)
      .where(eq(jobs.id, args.jobId))
      .limit(1);

    if (!job) {
      return JSON.stringify({ error: 'Job not found' });
    }

    return JSON.stringify({
      id: job.id,
      title: job.title,
      department: job.department,
      location: job.location,
      employmentType: job.employmentType,
      description: job.description,
      requirements: job.requirements,
      responsibilities: job.responsibilities,
      salaryRange: job.salaryRangeMin && job.salaryRangeMax
        ? `$${job.salaryRangeMin.toLocaleString()} - $${job.salaryRangeMax.toLocaleString()}`
        : null,
    });
  } catch (error) {
    console.error('Get job details error:', error);
    return JSON.stringify({ error: 'Failed to get job details' });
  }
}

async function createApplication(
  args: {
    jobId: string;
    candidateData: Record<string, unknown>;
    resumeText?: string;
    resumeUrl?: string;
    resumeFileKey?: string;
  },
  userId: string
): Promise<string> {
  try {
    if (!isUUID(args.jobId)) {
      return JSON.stringify({
        error:
          "Invalid job ID. The job ID must be a UUID from the job listing (e.g. from get_job_details or the career page URL). Ask the candidate which role they are applying for, then call get_job_details or search_jobs to get the correct job id before calling create_application again.",
      });
    }

    // Verify the job exists (e.g. not deleted/closed or wrong ID)
    const [job] = await db
      .select({ id: jobs.id })
      .from(jobs)
      .where(eq(jobs.id, args.jobId))
      .limit(1);
    if (!job) {
      return JSON.stringify({
        error:
          "This job does not exist or may have been closed. Ask the candidate to apply from the career page for the role they want, so the correct job ID is used.",
      });
    }

    // Check if already applied
    const existing = await db.query.applications.findFirst({
      where: (applications, { and, eq }) =>
        and(
          eq(applications.candidateId, userId),
          eq(applications.jobId, args.jobId),
        ),
    });

    if (existing) {
      return JSON.stringify({
        error: "You have already applied to this job",
        applicationId: existing.id,
      });
    }

    // Create application
    const [newApp] = await db
      .insert(applications)
      .values({
        jobId: args.jobId,
        candidateId: userId,
        candidateProfile: args.candidateData,
        resumeText: args.resumeText,
        resumeUrl: args.resumeUrl,
        resumeFileKey: args.resumeFileKey,
        status: "submitted",
        currentStage: null,
      })
      .returning();

    // Auto-run Stage 1 (resume) screening
    try {
      await runStage1Screening(newApp.id);
    } catch (stage1Err) {
      console.error("Stage 1 screening error after create_application:", stage1Err);
    }

    return JSON.stringify({
      success: true,
      applicationId: newApp.id,
      message: "Application submitted successfully",
    });
  } catch (error) {
    console.error("Create application error:", error);
    return JSON.stringify({ error: "Failed to create application" });
  }
}

