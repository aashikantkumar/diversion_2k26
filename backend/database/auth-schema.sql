-- ============================================
-- AUTH SCHEMA — Organizations, Users, Invites
-- ============================================
-- Run this in your neuroadapt PostgreSQL database:
-- psql -U neuroadapt_user -d neuroadapt -f database/auth-schema.sql

-- Organizations (teacher's classrooms)
CREATE TABLE IF NOT EXISTS organizations (
    id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    name        TEXT NOT NULL,
    teacher_id  TEXT NOT NULL,            -- Auth0 sub of the teacher (e.g. auth0|abc123)
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Users (synced from Auth0 after every login)
CREATE TABLE IF NOT EXISTS users (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    auth0_id        TEXT UNIQUE NOT NULL,  -- Auth0 'sub' (e.g. auth0|abc123)
    email           TEXT UNIQUE NOT NULL,
    name            TEXT,
    role            TEXT NOT NULL CHECK (role IN ('teacher', 'org_student', 'individual')),
    org_id          TEXT REFERENCES organizations(id) ON DELETE SET NULL,
    neurodiversity  TEXT[] DEFAULT '{}',   -- ['dyslexia', 'adhd', 'dyscalculia']
    signup_type     TEXT CHECK (signup_type IN ('individual', 'org')),
    onboarded       BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Org invites (teacher invites student via email link)
CREATE TABLE IF NOT EXISTS org_invites (
    id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    org_id      TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email       TEXT NOT NULL,
    token       TEXT UNIQUE NOT NULL,     -- UUID sent in invite URL
    used        BOOLEAN DEFAULT FALSE,
    expires_at  TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_auth0_id ON users(auth0_id);
CREATE INDEX IF NOT EXISTS idx_users_org_id ON users(org_id);
CREATE INDEX IF NOT EXISTS idx_org_invites_token ON org_invites(token);
CREATE INDEX IF NOT EXISTS idx_org_invites_org_id ON org_invites(org_id);
CREATE INDEX IF NOT EXISTS idx_organizations_teacher_id ON organizations(teacher_id);
