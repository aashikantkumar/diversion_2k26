-- ============================================
-- AUTH SCHEMA — Organizations, Users, Invites
-- ============================================
-- Auth provider: Auth0 (JWT validation via express-oauth2-jwt-bearer)
-- This schema stores the app-level user profile synced from Auth0 after login.
-- Run: psql -U neuroadapt_user -d neuroadapt -f database/auth-schema.sql

-- Organizations (teacher's classrooms)
CREATE TABLE IF NOT EXISTS organizations (
    id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    name        TEXT NOT NULL,
    teacher_id  TEXT NOT NULL,            -- Auth0 sub of the teacher (e.g. auth0|abc123)
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Users — custom JWT auth (no Auth0)
CREATE TABLE IF NOT EXISTS users (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    email           TEXT UNIQUE NOT NULL,
    name            TEXT,
    password_hash   TEXT,                  -- NULL for managed/offline students
    role            TEXT NOT NULL DEFAULT 'individual' CHECK (role IN ('teacher', 'org_student', 'individual')),
    org_id          TEXT REFERENCES organizations(id) ON DELETE SET NULL,
    neurodiversity  TEXT[] DEFAULT '{}',   -- ['dyslexia', 'adhd', 'dyscalculia']
    signup_type     TEXT CHECK (signup_type IN ('individual', 'org')),
    onboarded       BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Refresh tokens (one-time-use, rotated on every refresh)
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT UNIQUE NOT NULL,   -- SHA-256 of the raw token
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id    ON refresh_tokens(user_id);

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
