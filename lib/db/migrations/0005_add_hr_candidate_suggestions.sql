-- HR candidate suggestions: when a candidate fails a stage, suggest other jobs they might fit
CREATE TABLE IF NOT EXISTS hr_candidate_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  suggested_job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  source_stage INTEGER NOT NULL,
  message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_suggestions_candidate ON hr_candidate_suggestions(candidate_id);
CREATE INDEX IF NOT EXISTS idx_hr_suggestions_job ON hr_candidate_suggestions(suggested_job_id);
CREATE INDEX IF NOT EXISTS idx_hr_suggestions_application ON hr_candidate_suggestions(application_id);
