-- Hiring process steps (after stage 3 passed): Live Interview 1, 2, 3... HR-controlled
CREATE TYPE hiring_step_status AS ENUM ('pending', 'scheduled', 'completed', 'failed', 'cancelled');

CREATE TABLE IF NOT EXISTS hiring_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  label VARCHAR(255) NOT NULL DEFAULT 'Live Interview',
  status hiring_step_status NOT NULL DEFAULT 'pending',
  scheduled_at TIMESTAMP,
  completed_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hiring_steps_application ON hiring_steps(application_id);
