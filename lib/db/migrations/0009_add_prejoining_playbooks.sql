-- Pre-joining playbooks: HR-editable instructions so the onboarding AI can guide
-- candidates on visa, background checks, IT setup, ID/documents (reduces HR load).
INSERT INTO company_context (key, value, updated_at) VALUES
  ('visa_instructions', '', NOW()),
  ('background_check_instructions', '', NOW()),
  ('it_setup_instructions', '', NOW()),
  ('id_help_instructions', '', NOW())
ON CONFLICT (key) DO NOTHING;
