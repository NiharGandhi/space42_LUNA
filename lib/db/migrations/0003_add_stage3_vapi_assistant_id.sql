-- Add vapi_assistant_id to stage3_interviews for webhook matching
ALTER TABLE stage3_interviews ADD COLUMN IF NOT EXISTS vapi_assistant_id varchar(255);
