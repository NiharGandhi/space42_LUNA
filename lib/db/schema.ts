import { pgTable, uuid, varchar, text, timestamp, boolean, jsonb, integer, decimal, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['candidate', 'hr', 'admin']);
export const jobStatusEnum = pgEnum('job_status', ['draft', 'active', 'paused', 'closed']);
export const employmentTypeEnum = pgEnum('employment_type', ['full_time', 'part_time', 'contract', 'internship']);
export const applicationStatusEnum = pgEnum('application_status', [
  'submitted',
  'stage1_pending', 'stage1_passed', 'stage1_failed',
  'stage2_pending', 'stage2_passed', 'stage2_failed',
  'stage3_pending', 'stage3_passed', 'stage3_failed',
  'hired', 'rejected', 'withdrawn'
]);
export const screeningStageStatusEnum = pgEnum('screening_stage_status', ['pending', 'in_progress', 'completed', 'failed', 'skipped']);
export const onboardingStatusEnum = pgEnum('onboarding_status', ['not_started', 'in_progress', 'completed']);
export const taskStatusEnum = pgEnum('task_status', ['pending', 'in_progress', 'submitted', 'completed', 'blocked', 'skipped']);
export const taskCategoryEnum = pgEnum('task_category', ['visa', 'insurance', 'background_check', 'it_setup', 'documentation', 'other']);
export const messageRoleEnum = pgEnum('message_role', ['user', 'assistant', 'system']);
export const hiringStepStatusEnum = pgEnum('hiring_step_status', ['pending', 'scheduled', 'completed', 'failed', 'cancelled']);

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  role: userRoleEnum('role').notNull().default('candidate'),
  name: varchar('name', { length: 255 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// OTP codes table
export const otpCodes = pgTable('otp_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull(),
  code: varchar('code', { length: 6 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  used: boolean('used').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Sessions table
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Jobs table
export const jobs = pgTable('jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  department: varchar('department', { length: 255 }).notNull(),
  location: varchar('location', { length: 255 }).notNull(),
  employmentType: employmentTypeEnum('employment_type').notNull(),
  description: text('description').notNull(),
  requirements: jsonb('requirements').notNull(), // Array of strings
  responsibilities: jsonb('responsibilities').notNull(), // Array of strings
  salaryRangeMin: integer('salary_range_min'),
  salaryRangeMax: integer('salary_range_max'),
  status: jobStatusEnum('status').notNull().default('draft'),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  closedAt: timestamp('closed_at'),
});

// Applications table
export const applications = pgTable('applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  candidateId: uuid('candidate_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  resumeUrl: varchar('resume_url', { length: 500 }),
  resumeFileKey: varchar('resume_file_key', { length: 500 }),
  resumeText: text('resume_text'),
  candidateProfile: jsonb('candidate_profile'), // Built by chatbot
  coverLetter: text('cover_letter'),
  linkedinUrl: varchar('linkedin_url', { length: 500 }),
  portfolioUrl: varchar('portfolio_url', { length: 500 }),
  status: applicationStatusEnum('status').notNull().default('submitted'),
  currentStage: integer('current_stage'), // 1, 2, 3, or null
  overallScore: decimal('overall_score', { precision: 4, scale: 2 }), // 0-10
  aiSummary: text('ai_summary'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Screening stages table
export const screeningStages = pgTable('screening_stages', {
  id: uuid('id').primaryKey().defaultRandom(),
  applicationId: uuid('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
  stageNumber: integer('stage_number').notNull(), // 1, 2, or 3
  status: screeningStageStatusEnum('status').notNull().default('pending'),
  score: decimal('score', { precision: 4, scale: 2 }), // 0-10
  passingThreshold: decimal('passing_threshold', { precision: 4, scale: 2 }).notNull().default('5.0'),
  aiEvaluation: jsonb('ai_evaluation'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Stage 1: Resume analysis details
export const stage1Analysis = pgTable('stage1_analysis', {
  id: uuid('id').primaryKey().defaultRandom(),
  screeningStageId: uuid('screening_stage_id').notNull().references(() => screeningStages.id, { onDelete: 'cascade' }).unique(),
  skillsMatch: jsonb('skills_match'), // {found: [], required: [], missing: []} — keywords only
  experienceMatch: jsonb('experience_match'),
  educationMatch: jsonb('education_match'),
  strengths: jsonb('strengths'), // Array of strings
  concerns: jsonb('concerns'), // Array of strings
  fitRating: varchar('fit_rating', { length: 20 }), // 'low', 'medium', 'high'
  score: decimal('score', { precision: 4, scale: 2 }).notNull(),
  /** Multi-level evaluation matrix: dimensions with scores (0-10) and rationales */
  evaluationMatrix: jsonb('evaluation_matrix'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Stage 2: Questions for jobs
export const stage2Questions = pgTable('stage2_questions', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  questionText: text('question_text').notNull(),
  questionOrder: integer('question_order').notNull(),
  isRequired: boolean('is_required').notNull().default(true),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Stage 2: Candidate answers
export const stage2Answers = pgTable('stage2_answers', {
  id: uuid('id').primaryKey().defaultRandom(),
  screeningStageId: uuid('screening_stage_id').notNull().references(() => screeningStages.id, { onDelete: 'cascade' }),
  questionId: uuid('question_id').notNull().references(() => stage2Questions.id),
  answerText: text('answer_text').notNull(),
  aiScore: decimal('ai_score', { precision: 4, scale: 2 }), // 0-10
  aiFeedback: text('ai_feedback'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Stage 3: Voice interviews
export const stage3Interviews = pgTable('stage3_interviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  screeningStageId: uuid('screening_stage_id').notNull().references(() => screeningStages.id, { onDelete: 'cascade' }).unique(),
  vapiAssistantId: varchar('vapi_assistant_id', { length: 255 }), // VAPI assistant used for this call (to match webhook)
  vapiCallId: varchar('vapi_call_id', { length: 255 }).unique(),
  callDuration: integer('call_duration'), // seconds
  transcript: text('transcript'),
  recordingUrl: varchar('recording_url', { length: 500 }),
  communicationScore: decimal('communication_score', { precision: 4, scale: 2 }),
  problemSolvingScore: decimal('problem_solving_score', { precision: 4, scale: 2 }),
  roleUnderstandingScore: decimal('role_understanding_score', { precision: 4, scale: 2 }),
  overallScore: decimal('overall_score', { precision: 4, scale: 2 }),
  strengths: jsonb('strengths'), // Array of strings
  weaknesses: jsonb('weaknesses'), // Array of strings
  /** Evaluation matrix: dimensions (communication, problem-solving, role understanding) with scores + rationales */
  evaluationMatrix: jsonb('evaluation_matrix'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
});

// Onboarding templates
export const onboardingTemplates = pgTable('onboarding_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  isDefault: boolean('is_default').notNull().default(false),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Onboarding template tasks
export const onboardingTemplateTasks = pgTable('onboarding_template_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  templateId: uuid('template_id').notNull().references(() => onboardingTemplates.id, { onDelete: 'cascade' }),
  taskTitle: varchar('task_title', { length: 255 }).notNull(),
  taskDescription: text('task_description'),
  taskOrder: integer('task_order').notNull(),
  category: taskCategoryEnum('category').notNull(),
  isRequired: boolean('is_required').notNull().default(true),
  estimatedDays: integer('estimated_days'),
  requiresSubmission: boolean('requires_submission').notNull().default(false),
  submissionDescription: text('submission_description'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Onboarding flows
export const onboardingFlows = pgTable('onboarding_flows', {
  id: uuid('id').primaryKey().defaultRandom(),
  applicationId: uuid('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }).unique(),
  templateId: uuid('template_id').notNull().references(() => onboardingTemplates.id),
  status: onboardingStatusEnum('status').notNull().default('not_started'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Onboarding tasks
export const onboardingTasks = pgTable('onboarding_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  onboardingFlowId: uuid('onboarding_flow_id').notNull().references(() => onboardingFlows.id, { onDelete: 'cascade' }),
  templateTaskId: uuid('template_task_id').references(() => onboardingTemplateTasks.id),
  taskTitle: varchar('task_title', { length: 255 }).notNull(),
  taskDescription: text('task_description'),
  status: taskStatusEnum('status').notNull().default('pending'),
  assignedTo: uuid('assigned_to').references(() => users.id),
  dueDate: timestamp('due_date'),
  completedAt: timestamp('completed_at'),
  notes: text('notes'),
  attachments: jsonb('attachments'), // Array of file keys
  submissionDescription: text('submission_description'), // What document to submit (from template)
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Chat conversations
export const chatConversations = pgTable('chat_conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  jobId: uuid('job_id').references(() => jobs.id),
  applicationId: uuid('application_id').references(() => applications.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Chat messages
export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').notNull().references(() => chatConversations.id, { onDelete: 'cascade' }),
  role: messageRoleEnum('role').notNull(),
  content: text('content').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// HR candidate suggestions: when a candidate fails a stage, suggest other jobs they might fit
export const hrCandidateSuggestions = pgTable('hr_candidate_suggestions', {
  id: uuid('id').primaryKey().defaultRandom(),
  candidateId: uuid('candidate_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  suggestedJobId: uuid('suggested_job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  applicationId: uuid('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
  sourceStage: integer('source_stage').notNull(), // 1, 2, or 3
  message: text('message'), // short reason / fit note for HR
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// In-app notifications
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message'),
  link: varchar('link', { length: 500 }), // e.g. /my-applications/xxx or /applications/xxx
  read: boolean('read').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Company context for onboarding AI agent (HR-editable: name, about, handbook, policies, etc.)
export const companyContext = pgTable('company_context', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: varchar('key', { length: 100 }).notNull().unique(), // e.g. company_name, about, handbook, policies
  value: text('value'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Company documents: uploaded PDF/DOCX for onboarding AI to learn from (extracted text stored)
export const companyDocuments = pgTable('company_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(), // display name
  fileKey: varchar('file_key', { length: 500 }).notNull(), // R2 key
  contentType: varchar('content_type', { length: 100 }).notNull(),
  extractedText: text('extracted_text'), // text extracted for AI context
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Hiring process steps (after stage 3 passed): Live Interview 1, 2, 3... HR-controlled, visible to candidate
export const hiringSteps = pgTable('hiring_steps', {
  id: uuid('id').primaryKey().defaultRandom(),
  applicationId: uuid('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
  stepOrder: integer('step_order').notNull(), // 1, 2, 3, 4...
  label: varchar('label', { length: 255 }).notNull().default('Live Interview'),
  status: hiringStepStatusEnum('status').notNull().default('pending'),
  scheduledAt: timestamp('scheduled_at'),
  completedAt: timestamp('completed_at'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  applications: many(applications),
  jobsCreated: many(jobs),
  sessions: many(sessions),
  hrSuggestionsAsCandidate: many(hrCandidateSuggestions),
  notifications: many(notifications),
}));

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  creator: one(users, {
    fields: [jobs.createdBy],
    references: [users.id],
  }),
  applications: many(applications),
  stage2Questions: many(stage2Questions),
  hrSuggestionsForJob: many(hrCandidateSuggestions),
}));

export const applicationsRelations = relations(applications, ({ one, many }) => ({
  job: one(jobs, {
    fields: [applications.jobId],
    references: [jobs.id],
  }),
  candidate: one(users, {
    fields: [applications.candidateId],
    references: [users.id],
  }),
  screeningStages: many(screeningStages),
  hrSuggestionsFromApplication: many(hrCandidateSuggestions),
  hiringSteps: many(hiringSteps),
  onboardingFlows: many(onboardingFlows),
}));

export const screeningStagesRelations = relations(screeningStages, ({ one, many }) => ({
  application: one(applications, {
    fields: [screeningStages.applicationId],
    references: [applications.id],
  }),
  stage1Analysis: one(stage1Analysis),
  stage2Answers: many(stage2Answers),
  stage3Interview: one(stage3Interviews),
}));

export const hrCandidateSuggestionsRelations = relations(hrCandidateSuggestions, ({ one }) => ({
  candidate: one(users, {
    fields: [hrCandidateSuggestions.candidateId],
    references: [users.id],
  }),
  suggestedJob: one(jobs, {
    fields: [hrCandidateSuggestions.suggestedJobId],
    references: [jobs.id],
  }),
  application: one(applications, {
    fields: [hrCandidateSuggestions.applicationId],
    references: [applications.id],
  }),
}));

export const hiringStepsRelations = relations(hiringSteps, ({ one }) => ({
  application: one(applications, {
    fields: [hiringSteps.applicationId],
    references: [applications.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));
