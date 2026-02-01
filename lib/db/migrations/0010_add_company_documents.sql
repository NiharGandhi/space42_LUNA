-- Company documents: uploaded files (PDF/DOCX) for onboarding AI; extracted text stored for context
CREATE TABLE IF NOT EXISTS company_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  file_key VARCHAR(500) NOT NULL,
  content_type VARCHAR(100) NOT NULL,
  extracted_text TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Optional context keys for URLs and department contacts (HR can set via UI)
INSERT INTO company_context (key, value, updated_at) VALUES
  ('company_urls', '', NOW()),
  ('department_contacts', '', NOW())
ON CONFLICT (key) DO NOTHING;
