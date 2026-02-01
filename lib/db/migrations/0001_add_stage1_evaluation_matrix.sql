-- Add evaluation_matrix column to stage1_analysis for multi-level matrix rating.
-- Run this once (e.g. in Neon SQL editor or: psql $DATABASE_URL -f lib/db/migrations/0001_add_stage1_evaluation_matrix.sql)
-- Or run: npm run db:push
ALTER TABLE "stage1_analysis" ADD COLUMN IF NOT EXISTS "evaluation_matrix" jsonb;
