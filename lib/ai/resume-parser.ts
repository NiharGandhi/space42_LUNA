import { openai } from '@/lib/ai/openai';

export type ParsedResume = {
  name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  workAuthorization: string | null;
  experienceYears: number | null;
  skills: string[];
  education: Array<{ degree?: string; institution?: string; year?: string }>;
  workHistory: Array<{
    title?: string;
    company?: string;
    duration?: string;
    summary?: string;
  }>;
  linkedinUrl: string | null;
  portfolioUrl: string | null;
  summary: string | null;
  /** Field names that could not be extracted (ask only for these) */
  missingOrUnclear: string[];
};

export type JobMatchResult = {
  overallScore: number;
  skillsMatch: { required: string[]; found: string[]; missing: string[] };
  experienceMatch: { required: string; found: string; match: boolean };
  gaps: string[];
  summary: string;
};

/** Multi-level matrix: dimension scores (0-10) + rationales for consistent rating */
export type EvaluationMatrixResult = {
  dimensionScores: { skills: number; experience: number; education: number };
  dimensionRationales: { skills: string; experience: string; education: string };
  skillsMatch: { required: string[]; found: string[]; missing: string[] };
  experienceMatch: { required: string; found: string; match: boolean };
  gaps: string[];
  summary: string;
};

/** Weights for overall score (must sum to 1) */
export const MATRIX_WEIGHTS = { skills: 0.4, experience: 0.35, education: 0.25 } as const;
export const MATRIX_PASSING_THRESHOLD = 5;

export type ParseResumeResult = {
  parsed: ParsedResume;
  jobMatch?: JobMatchResult;
};

// OpenAI strict mode schema: root must be object with properties (no null in schema; use string or omit)
const PARSED_RESUME_SCHEMA = {
  type: 'object' as const,
  properties: {
    name: { type: 'string' as const },
    email: { type: 'string' as const },
    phone: { type: 'string' as const },
    location: { type: 'string' as const },
    workAuthorization: { type: 'string' as const },
    experienceYears: { type: 'integer' as const },
    skills: { type: 'array' as const, items: { type: 'string' as const } },
    education: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          degree: { type: 'string' as const },
          institution: { type: 'string' as const },
          year: { type: 'string' as const },
        },
        required: ['degree', 'institution', 'year'],
        additionalProperties: false,
      },
    },
    workHistory: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          title: { type: 'string' as const },
          company: { type: 'string' as const },
          duration: { type: 'string' as const },
          summary: { type: 'string' as const },
        },
        required: ['title', 'company', 'duration', 'summary'],
        additionalProperties: false,
      },
    },
    linkedinUrl: { type: 'string' as const },
    portfolioUrl: { type: 'string' as const },
    summary: { type: 'string' as const },
    missingOrUnclear: { type: 'array' as const, items: { type: 'string' as const } },
  },
  required: [
    'name', 'email', 'phone', 'location', 'workAuthorization', 'experienceYears',
    'skills', 'education', 'workHistory', 'linkedinUrl', 'portfolioUrl', 'summary', 'missingOrUnclear',
  ],
  additionalProperties: false,
};

const JOB_MATCH_SCHEMA = {
  type: 'object' as const,
  properties: {
    overallScore: { type: 'integer' as const },
    skillsMatch: {
      type: 'object' as const,
      properties: {
        required: { type: 'array' as const, items: { type: 'string' as const } },
        found: { type: 'array' as const, items: { type: 'string' as const } },
        missing: { type: 'array' as const, items: { type: 'string' as const } },
      },
      required: ['required', 'found', 'missing'],
      additionalProperties: false,
    },
    experienceMatch: {
      type: 'object' as const,
      properties: {
        required: { type: 'string' as const },
        found: { type: 'string' as const },
        match: { type: 'boolean' as const },
      },
      required: ['required', 'found', 'match'],
      additionalProperties: false,
    },
    gaps: { type: 'array' as const, items: { type: 'string' as const } },
    summary: { type: 'string' as const },
  },
  required: ['overallScore', 'skillsMatch', 'experienceMatch', 'gaps', 'summary'],
  additionalProperties: false,
};

/** Multi-level evaluation matrix schema: dimension scores 0-10 + rationales; skills as keywords only */
const EVALUATION_MATRIX_SCHEMA = {
  type: 'object' as const,
  properties: {
    dimensionScores: {
      type: 'object' as const,
      properties: {
        skills: { type: 'integer' as const },
        experience: { type: 'integer' as const },
        education: { type: 'integer' as const },
      },
      required: ['skills', 'experience', 'education'],
      additionalProperties: false,
    },
    dimensionRationales: {
      type: 'object' as const,
      properties: {
        skills: { type: 'string' as const },
        experience: { type: 'string' as const },
        education: { type: 'string' as const },
      },
      required: ['skills', 'experience', 'education'],
      additionalProperties: false,
    },
    skillsMatch: {
      type: 'object' as const,
      properties: {
        required: { type: 'array' as const, items: { type: 'string' as const } },
        found: { type: 'array' as const, items: { type: 'string' as const } },
        missing: { type: 'array' as const, items: { type: 'string' as const } },
      },
      required: ['required', 'found', 'missing'],
      additionalProperties: false,
    },
    experienceMatch: {
      type: 'object' as const,
      properties: {
        required: { type: 'string' as const },
        found: { type: 'string' as const },
        match: { type: 'boolean' as const },
      },
      required: ['required', 'found', 'match'],
      additionalProperties: false,
    },
    gaps: { type: 'array' as const, items: { type: 'string' as const } },
    summary: { type: 'string' as const },
  },
  required: [
    'dimensionScores',
    'dimensionRationales',
    'skillsMatch',
    'experienceMatch',
    'gaps',
    'summary',
  ],
  additionalProperties: false,
};

const PARSE_SYSTEM = `You are a resume parser. Extract structured data from resume text into the exact JSON schema.
- Use empty string "" for any field not found. For arrays use [] if none. For experienceYears use 0 if unclear.
- For missingOrUnclear, list the schema field names (e.g. "email", "workAuthorization") that were not clearly in the resume so we only ask for those.
- Normalize skills: lowercase, no duplicates. Keep workHistory to last 2-3 roles.`;

const JOB_MATCH_SYSTEM = `You are a job-resume matcher. Compare parsed resume to the job.
- overallScore: 0-10 (10 = strong match). Be fair.
- skillsMatch: required = key skills from job; found = from resume; missing = required but not in resume.
- experienceMatch: required = what job asks; found = what resume shows; match = boolean.
- gaps: 1-3 short items to optionally clarify. summary: one line for the agent (do not show score to candidate).`;

const EVALUATION_MATRIX_SYSTEM = `You are a structured resume evaluator. Score the candidate against the job on three dimensions (each 0-10). Be consistent and fair.

RULES:
1. dimensionScores: Give an integer 0-10 for each dimension.
   - skills: How well do resume skills match job requirements? 10 = all key skills present, 0 = none.
   - experience: How relevant is work history to the role? Consider years and relevance. 10 = ideal match, 0 = no relevant experience.
   - education: How well does education match job requirements? 10 = strong match, 0 = no relevant education.

2. dimensionRationales: One short sentence per dimension explaining the score (for HR to read).

3. skillsMatch: Use KEYWORDS ONLY — short skill/tech names (e.g. "python", "react", "html", "sql"). Do NOT put full requirement sentences in required or missing.
   - required: Extract 5-15 key skill keywords from the job (technologies, tools, methods).
   - found: Skills from the resume that match or relate to job requirements (keywords only).
   - missing: Required job skills not clearly present in resume (keywords only).

4. experienceMatch: required = brief description of what job asks; found = what resume shows; match = true if experience is relevant.

5. gaps: 1-3 short clarification items. summary: One line for HR (no score).`;

function toNull(s: string): string | null {
  return s == null || s === '' ? null : s;
}
function toNum(n: number): number | null {
  return n == null ? null : Number(n);
}

export async function parseResumeWithAI(
  resumeText: string,
  jobContext?: {
    title: string;
    description: string;
    requirements: string[];
    responsibilities: string[];
  }
): Promise<ParseResumeResult> {
  const parseResponse = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: PARSE_SYSTEM },
      {
        role: 'user',
        content: `Parse this resume into the required JSON.\n\n---\n${resumeText.slice(0, 15000)}`,
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'parsed_resume',
        strict: true,
        schema: PARSED_RESUME_SCHEMA,
      },
    },
  });

  const content = parseResponse.choices[0]?.message?.content;
  if (!content) throw new Error('Failed to parse resume');
  const raw = JSON.parse(content) as Record<string, unknown>;

  const normalized: ParsedResume = {
    name: toNull(raw.name as string),
    email: toNull(raw.email as string),
    phone: toNull(raw.phone as string),
    location: toNull(raw.location as string),
    workAuthorization: toNull(raw.workAuthorization as string),
    experienceYears: toNum(raw.experienceYears as number),
    skills: Array.isArray(raw.skills) ? raw.skills : [],
    education: Array.isArray(raw.education) ? raw.education : [],
    workHistory: Array.isArray(raw.workHistory) ? raw.workHistory : [],
    linkedinUrl: toNull(raw.linkedinUrl as string),
    portfolioUrl: toNull(raw.portfolioUrl as string),
    summary: toNull(raw.summary as string),
    missingOrUnclear: Array.isArray(raw.missingOrUnclear) ? raw.missingOrUnclear : [],
  };

  if (!jobContext) return { parsed: normalized };

  const matchResponse = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: JOB_MATCH_SYSTEM },
      {
        role: 'user',
        content: `Job: ${jobContext.title}\nRequirements: ${JSON.stringify(jobContext.requirements)}\n\nResume: skills=${JSON.stringify(normalized.skills)}, experienceYears=${normalized.experienceYears}, workHistory=${JSON.stringify(normalized.workHistory)}`,
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'job_match',
        strict: true,
        schema: JOB_MATCH_SCHEMA,
      },
    },
  });

  const matchContent = matchResponse.choices[0]?.message?.content;
  if (!matchContent) return { parsed: normalized };
  const jobMatch = JSON.parse(matchContent) as JobMatchResult;
  return { parsed: normalized, jobMatch };
}

/**
 * Multi-level matrix evaluation: dimension scores (0-10) + rationales; skills as keywords only.
 * Use this for Stage 1 screening. Compute overallScore = weighted sum of dimensionScores in caller.
 * Returns matrix and parsed resume (so caller can use education etc. without parsing twice).
 */
export async function evaluateResumeMatrix(
  resumeText: string,
  jobContext: {
    title: string;
    description: string;
    requirements: string[];
    responsibilities: string[];
  }
): Promise<{ matrix: EvaluationMatrixResult; parsed: ParsedResume }> {
  const parseResult = await parseResumeWithAI(resumeText);
  const parsed = parseResult.parsed;

  const matchResponse = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: EVALUATION_MATRIX_SYSTEM },
      {
        role: 'user',
        content: `Job: ${jobContext.title}\nDescription: ${jobContext.description.slice(0, 1500)}\nRequirements: ${JSON.stringify(jobContext.requirements)}\nResponsibilities: ${JSON.stringify(jobContext.responsibilities)}\n\nResume: skills=${JSON.stringify(parsed.skills)}, experienceYears=${parsed.experienceYears}, workHistory=${JSON.stringify(parsed.workHistory)}, education=${JSON.stringify(parsed.education)}`,
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'evaluation_matrix',
        strict: true,
        schema: EVALUATION_MATRIX_SCHEMA,
      },
    },
  });

  const content = matchResponse.choices[0]?.message?.content;
  if (!content) throw new Error('Failed to get evaluation matrix');
  const raw = JSON.parse(content) as EvaluationMatrixResult;

  const d = raw.dimensionScores;
  const clamp = (n: number) => Math.min(10, Math.max(0, Number(n)));
  const matrix: EvaluationMatrixResult = {
    dimensionScores: {
      skills: clamp(d.skills),
      experience: clamp(d.experience),
      education: clamp(d.education),
    },
    dimensionRationales: raw.dimensionRationales,
    skillsMatch: raw.skillsMatch,
    experienceMatch: raw.experienceMatch,
    gaps: Array.isArray(raw.gaps) ? raw.gaps : [],
    summary: typeof raw.summary === 'string' ? raw.summary : '',
  };
  return { matrix, parsed };
}
