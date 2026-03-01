-- ============================================
-- DATABASE SCHEMA — NeuroAdapt
-- ============================================
-- Auth: Auth0 handles all authentication
-- Run this in your PostgreSQL database (psql or any SQL client)

-- 1. STUDENTS TABLE
CREATE TABLE IF NOT EXISTS students (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    age INTEGER,
    grade TEXT,
    email TEXT,
    learning_mode TEXT,                -- "dyslexia" | "adhd" | "dyscalculia" | null
    assessment_result JSONB,           -- Full LLM assessment output
    assessed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. LESSONS TABLE (if not already created)
CREATE TABLE IF NOT EXISTS lessons (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    raw_text TEXT,
    subject TEXT,
    transformed JSONB,                 -- All 5 adapted formats
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. STUDENT-LESSON ASSIGNMENTS (junction table)
CREATE TABLE IF NOT EXISTS student_lessons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    lesson_id TEXT REFERENCES lessons(id) ON DELETE CASCADE,
    learning_mode TEXT,                -- Mode used for this student
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, lesson_id)      -- Prevent duplicate assignments
);

-- 4. Enable Row Level Security (optional but recommended)
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_lessons ENABLE ROW LEVEL SECURITY;

-- 5. Allow anon key to access (for development)
CREATE POLICY "Allow all for anon" ON students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON lessons FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON student_lessons FOR ALL USING (true) WITH CHECK (true);
