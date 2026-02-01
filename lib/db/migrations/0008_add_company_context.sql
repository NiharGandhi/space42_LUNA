-- Company context for onboarding AI (HR-editable)
CREATE TABLE IF NOT EXISTS company_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) NOT NULL UNIQUE,
  value TEXT,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Seed default keys so HR can edit them
INSERT INTO company_context (key, value, updated_at) VALUES
  ('company_name', 'Space42', NOW()),
  ('about', 'Welcome to Space42. We build great products and care about our people.', NOW()),
  ('handbook', 'Company handbook and guidelines will appear here. HR can edit this in Settings.', NOW()),
  ('policies', 'Policies: Remote work, PTO, Benefits. HR can add details in Settings.', NOW()),
  ('culture', 'Our culture: Collaboration, ownership, and continuous learning.', NOW())
ON CONFLICT (key) DO NOTHING;
