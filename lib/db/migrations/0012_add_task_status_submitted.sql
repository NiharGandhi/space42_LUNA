-- Add 'submitted' for upload-doc tasks (candidate submitted, waiting for dept approval)
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'submitted';
