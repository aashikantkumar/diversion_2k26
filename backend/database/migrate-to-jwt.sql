-- ============================================
-- MIGRATION — Remove Auth0, Add Custom JWT Auth
-- ============================================
-- Run once on your existing database:
-- psql $DATABASE_URL -f database/migrate-to-jwt.sql

-- 1. Add password_hash column (nullable — managed students have no password)
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- 2. Make auth0_id nullable (keeps old data intact, stops being required)
ALTER TABLE users ALTER COLUMN auth0_id DROP NOT NULL;

-- 3. Create refresh_tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT UNIQUE NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id    ON refresh_tokens(user_id);

-- 4. Add default value for role (in case new rows omit it)
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'individual';

-- Done — existing users keep their rows; they just need to re-register
--        (or an admin can set a temporary password for them)
