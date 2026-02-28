#!/usr/bin/env node
/**
 * migrate.js — Run once against production DB to set up all tables.
 * Usage:  DATABASE_URL=postgres://... node scripts/migrate.js
 *
 * Safe to re-run: all statements use IF NOT EXISTS / IF NOT EXISTS.
 */

require("dotenv").config();
const { Pool } = require("pg");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    console.error("❌ DATABASE_URL is not set");
    process.exit(1);
}

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // required for DO / Neon / Railway managed DBs
});

async function run() {
    const client = await pool.connect();
    try {
        console.log("🚀 Running migrations against:", DATABASE_URL.replace(/:\/\/.*@/, "://<credentials>@"));

        // ── 1. pgvector extension ──────────────────────────────────────────────
        console.log("  [1/4] Enabling pgvector extension...");
        await client.query(`CREATE EXTENSION IF NOT EXISTS vector;`);

        // ── 2. RAG table (lesson_chunks) ───────────────────────────────────────
        console.log("  [2/4] Creating lesson_chunks table...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS lesson_chunks (
                id          SERIAL PRIMARY KEY,
                lesson_id   TEXT NOT NULL,
                chunk_index INTEGER NOT NULL,
                chunk_text  TEXT NOT NULL,
                embedding   vector(384),
                tsv         tsvector,
                section     TEXT DEFAULT '',
                char_start  INTEGER DEFAULT 0,
                char_end    INTEGER DEFAULT 0,
                metadata    JSONB DEFAULT '{}',
                char_count  INTEGER GENERATED ALWAYS AS (length(chunk_text)) STORED,
                created_at  TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(lesson_id, chunk_index)
            );
            CREATE INDEX IF NOT EXISTS idx_chunks_lesson     ON lesson_chunks(lesson_id);
            CREATE INDEX IF NOT EXISTS idx_chunks_embedding  ON lesson_chunks USING hnsw (embedding vector_cosine_ops);
            CREATE INDEX IF NOT EXISTS idx_chunks_tsv        ON lesson_chunks USING gin(tsv);
        `);

        // ── 3. Auth schema (organizations, users, org_invites) ─────────────────
        console.log("  [3/4] Creating auth tables...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS organizations (
                id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
                name        TEXT NOT NULL,
                teacher_id  TEXT NOT NULL,
                created_at  TIMESTAMPTZ DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS users (
                id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
                auth0_id        TEXT UNIQUE NOT NULL,
                email           TEXT UNIQUE NOT NULL,
                name            TEXT,
                role            TEXT NOT NULL CHECK (role IN ('teacher', 'org_student', 'individual')),
                org_id          TEXT REFERENCES organizations(id) ON DELETE SET NULL,
                neurodiversity  TEXT[] DEFAULT '{}',
                signup_type     TEXT CHECK (signup_type IN ('individual', 'org')),
                onboarded       BOOLEAN DEFAULT FALSE,
                created_at      TIMESTAMPTZ DEFAULT NOW(),
                updated_at      TIMESTAMPTZ DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS org_invites (
                id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
                org_id      TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
                email       TEXT NOT NULL,
                token       TEXT UNIQUE NOT NULL,
                used        BOOLEAN DEFAULT FALSE,
                expires_at  TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
                created_at  TIMESTAMPTZ DEFAULT NOW()
            );

            CREATE INDEX IF NOT EXISTS idx_users_auth0_id          ON users(auth0_id);
            CREATE INDEX IF NOT EXISTS idx_users_org_id            ON users(org_id);
            CREATE INDEX IF NOT EXISTS idx_org_invites_token       ON org_invites(token);
            CREATE INDEX IF NOT EXISTS idx_org_invites_org_id      ON org_invites(org_id);
            CREATE INDEX IF NOT EXISTS idx_organizations_teacher_id ON organizations(teacher_id);
        `);

        // ── 4. Verify ──────────────────────────────────────────────────────────
        console.log("  [4/4] Verifying tables...");
        const { rows } = await client.query(`
            SELECT tablename FROM pg_tables WHERE schemaname = 'public'
            ORDER BY tablename;
        `);
        console.log("  ✅ Tables in DB:", rows.map(r => r.tablename).join(", "));

        console.log("\n✅ Migration complete!\n");
    } catch (err) {
        console.error("❌ Migration failed:", err.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

run();
