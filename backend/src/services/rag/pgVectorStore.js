// ============================================
// PG VECTOR STORE — PostgreSQL + pgvector Storage
// ============================================
// Purpose: Persistent vector storage using PostgreSQL pgvector extension.
//          Stores chunk text, 384-dim embeddings, and tsvector for full-text search.
//
// Schema: lesson_chunks table with:
//   - embedding vector(384) for cosine similarity
//   - tsv tsvector for PostgreSQL full-text search
//   - metadata JSONB for section headings, char offsets, etc.
//
// This replaces LangChain's MemoryVectorStore with zero external dependencies.

const { Pool } = require("pg");
const pgvector = require("pgvector/pg");
const config = require("../../config");

// Share the pg pool with the rest of the app
const pool = new Pool({
    connectionString: config.DATABASE_URL || "postgresql://neuroadapt_user:neuroadapt123@localhost:5432/neuroadapt",
    // SSL required for DigitalOcean / Neon / Railway managed postgres
    ssl: config.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

let _initialized = false;

/**
 * Initialize the lesson_chunks table and indexes.
 * Safe to call multiple times (IF NOT EXISTS).
 */
async function initSchema() {
    if (_initialized) return;

    // Register pgvector type with pg (needs a client, not pool)
    const client = await pool.connect();
    try {
        await pgvector.registerType(client);
    } finally {
        client.release();
    }

    await pool.query(`
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
    `);

    // Index for filtering by lesson
    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_chunks_lesson 
        ON lesson_chunks(lesson_id);
    `);

    // IVFFlat index for vector cosine similarity
    // (only create if we have some data for the training step)
    // We'll use exact search for small datasets and add IVFFlat later
    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_chunks_embedding 
        ON lesson_chunks USING hnsw (embedding vector_cosine_ops);
    `);

    // GIN index for full-text search
    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_chunks_tsv 
        ON lesson_chunks USING GIN(tsv);
    `);

    // Trigger to auto-update tsvector on insert/update
    await pool.query(`
        CREATE OR REPLACE FUNCTION update_chunk_tsv() RETURNS TRIGGER AS $$
        BEGIN
            NEW.tsv := to_tsvector('english', NEW.chunk_text);
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    `);

    await pool.query(`
        DO $$ BEGIN
            CREATE TRIGGER trg_update_chunk_tsv
                BEFORE INSERT OR UPDATE OF chunk_text ON lesson_chunks
                FOR EACH ROW EXECUTE FUNCTION update_chunk_tsv();
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
    `);

    _initialized = true;
    console.log("   ✅ pgVectorStore schema initialized (lesson_chunks + indexes)");
}

/**
 * Store chunks with embeddings into PostgreSQL.
 * @param {string} lessonId
 * @param {Array<{text: string, index: number, charStart: number, charEnd: number, section: string, metadata: object}>} chunks
 * @param {number[][]} embeddings - 384-dim vectors matching chunks
 * @returns {number} Number of chunks stored
 */
async function storeChunks(lessonId, chunks, embeddings) {
    if (chunks.length !== embeddings.length) {
        throw new Error(`Chunk count (${chunks.length}) ≠ embedding count (${embeddings.length})`);
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // Delete existing chunks for this lesson (re-index support)
        await client.query("DELETE FROM lesson_chunks WHERE lesson_id = $1", [lessonId]);

        // Batch insert using parameterized queries
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const vector = pgvector.toSql(embeddings[i]);

            await client.query(
                `INSERT INTO lesson_chunks (lesson_id, chunk_index, chunk_text, embedding, section, char_start, char_end, metadata)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [
                    lessonId,
                    chunk.index,
                    chunk.text,
                    vector,
                    chunk.section || "",
                    chunk.charStart || 0,
                    chunk.charEnd || 0,
                    JSON.stringify(chunk.metadata || {}),
                ]
            );
        }

        await client.query("COMMIT");
        console.log(`   💾 Stored ${chunks.length} chunks for lesson ${lessonId} in pgvector`);
        return chunks.length;
    } catch (err) {
        await client.query("ROLLBACK");
        console.error(`   ❌ pgVectorStore insert failed: ${err.message}`);
        throw err;
    } finally {
        client.release();
    }
}

/**
 * Vector similarity search using pgvector cosine distance.
 * @param {number[]} queryEmbedding - 384-dim query vector
 * @param {string} lessonId - Filter by lesson
 * @param {number} topK - Number of results (default 10)
 * @returns {Array<{id, chunkIndex, text, section, score, metadata}>}
 */
async function vectorSearch(queryEmbedding, lessonId, topK = 10) {
    const vector = pgvector.toSql(queryEmbedding);

    const { rows } = await pool.query(
        `SELECT id, chunk_index, chunk_text, section, metadata,
                1 - (embedding <=> $1) AS cosine_similarity
         FROM lesson_chunks
         WHERE lesson_id = $2
         ORDER BY embedding <=> $1
         LIMIT $3`,
        [vector, lessonId, topK]
    );

    return rows.map(r => ({
        id: r.id,
        chunkIndex: r.chunk_index,
        text: r.chunk_text,
        section: r.section,
        score: parseFloat(parseFloat(r.cosine_similarity).toFixed(4)),
        metadata: r.metadata,
    }));
}

/**
 * Full-text search using PostgreSQL tsvector + ts_rank.
 * @param {string} query - Text query
 * @param {string} lessonId - Filter by lesson
 * @param {number} topK - Number of results (default 10)
 * @returns {Array<{id, chunkIndex, text, section, score, metadata}>}
 */
async function fullTextSearch(query, lessonId, topK = 10) {
    // Convert query to tsquery (handles multiple words with & operator)
    const words = query.trim().split(/\s+/).filter(w => w.length > 1);
    if (words.length === 0) return [];

    // Use plainto_tsquery for natural language queries
    const { rows } = await pool.query(
        `SELECT id, chunk_index, chunk_text, section, metadata,
                ts_rank(tsv, plainto_tsquery('english', $1)) AS rank
         FROM lesson_chunks
         WHERE lesson_id = $2
           AND tsv @@ plainto_tsquery('english', $1)
         ORDER BY rank DESC
         LIMIT $3`,
        [query, lessonId, topK]
    );

    return rows.map(r => ({
        id: r.id,
        chunkIndex: r.chunk_index,
        text: r.chunk_text,
        section: r.section,
        score: parseFloat(parseFloat(r.rank).toFixed(4)),
        metadata: r.metadata,
    }));
}

/**
 * Delete all chunks for a lesson.
 */
async function deleteLesson(lessonId) {
    const { rowCount } = await pool.query(
        "DELETE FROM lesson_chunks WHERE lesson_id = $1",
        [lessonId]
    );
    console.log(`   🗑️ Deleted ${rowCount} chunks for lesson ${lessonId}`);
    return rowCount;
}

/**
 * Check if a lesson has been indexed.
 */
async function isLessonIndexed(lessonId) {
    const { rows } = await pool.query(
        "SELECT 1 FROM lesson_chunks WHERE lesson_id = $1 LIMIT 1",
        [lessonId]
    );
    return rows.length > 0;
}

/**
 * Get all indexed lesson IDs.
 */
async function getIndexedLessons() {
    const { rows } = await pool.query(
        "SELECT DISTINCT lesson_id FROM lesson_chunks ORDER BY lesson_id"
    );
    return rows.map(r => r.lesson_id);
}

/**
 * Get chunk count for a lesson.
 */
async function getChunkCount(lessonId) {
    const { rows } = await pool.query(
        "SELECT COUNT(*)::int AS count FROM lesson_chunks WHERE lesson_id = $1",
        [lessonId]
    );
    return rows[0]?.count || 0;
}

/**
 * Get RAG stats.
 */
async function getStats() {
    const { rows } = await pool.query(`
        SELECT 
            COUNT(*)::int AS total_chunks,
            COUNT(DISTINCT lesson_id)::int AS total_lessons,
            ROUND(AVG(char_count))::int AS avg_chunk_chars
        FROM lesson_chunks
    `);
    const r = rows[0] || {};
    return {
        totalChunks: r.total_chunks || 0,
        totalLessons: r.total_lessons || 0,
        avgChunkChars: r.avg_chunk_chars || 0,
    };
}

module.exports = {
    initSchema,
    storeChunks,
    vectorSearch,
    fullTextSearch,
    deleteLesson,
    isLessonIndexed,
    getIndexedLessons,
    getChunkCount,
    getStats,
    pool, // Export for shared use
};
