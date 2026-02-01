-- Document submission on onboarding tasks
ALTER TABLE onboarding_template_tasks
  ADD COLUMN IF NOT EXISTS requires_submission BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS submission_description TEXT;

ALTER TABLE onboarding_tasks
  ADD COLUMN IF NOT EXISTS submission_description TEXT;
