-- Allow score values 0-10 (numeric(3,2) max is 9.99; numeric(4,2) allows 10.00)
ALTER TABLE applications ALTER COLUMN overall_score TYPE numeric(4, 2);
ALTER TABLE screening_stages ALTER COLUMN score TYPE numeric(4, 2);
ALTER TABLE screening_stages ALTER COLUMN passing_threshold TYPE numeric(4, 2);
ALTER TABLE stage1_analysis ALTER COLUMN score TYPE numeric(4, 2);
ALTER TABLE stage2_answers ALTER COLUMN ai_score TYPE numeric(4, 2);
ALTER TABLE stage3_interviews ALTER COLUMN communication_score TYPE numeric(4, 2);
ALTER TABLE stage3_interviews ALTER COLUMN problem_solving_score TYPE numeric(4, 2);
ALTER TABLE stage3_interviews ALTER COLUMN role_understanding_score TYPE numeric(4, 2);
ALTER TABLE stage3_interviews ALTER COLUMN overall_score TYPE numeric(4, 2);
