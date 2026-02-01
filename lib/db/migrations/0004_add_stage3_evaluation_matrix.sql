-- Add evaluation_matrix to stage3_interviews (dimensions with scores + rationales).
ALTER TABLE "stage3_interviews" ADD COLUMN IF NOT EXISTS "evaluation_matrix" jsonb;
