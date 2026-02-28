// ============================================
// RAG PIPELINE — Orchestrator (Single Entry Point)
// ============================================
// Purpose: This is the ONLY file that routes should import.
//          It coordinates: chunking → embedding → storage → retrieval.
//
// API:
//   indexLesson(lessonId, rawText)   → chunk + embed + store
//   searchLesson(lessonId, query)    → hybrid search → top 3 chunks
//   isLessonIndexed(lessonId)        → boolean (persistent!)
//   getIndexedLessons()              → string[]
//   reindexLesson(lessonId, rawText) → delete old + re-index
//   init()                           → create schema + warmup
//   getStats()                       → { totalChunks, totalLessons }

const { smartChunk } = require("./smartChunker");
const { embedBatch, warmup, EMBED_MODEL, EMBED_DIM } = require("./embedder");
const { initSchema, storeChunks, isLessonIndexed, getIndexedLessons, deleteLesson, getChunkCount, getStats } = require("./pgVectorStore");
const { hybridSearch } = require("./hybridSearch");

/**
 * Initialize the custom RAG system.
 * Call once on server startup.
 */
async function init() {
    console.log("\n🔧 Initializing Custom RAG Pipeline...");
    console.log(`   📐 Embedding model: ${EMBED_MODEL} (${EMBED_DIM}-dim)`);
    console.log("   🗄️  Storage: PostgreSQL + pgvector");
    console.log("   🔍 Search: Hybrid (vector cosine + full-text tsvector + RRF)");

    // Create tables + indexes
    await initSchema();

    // Warmup embedding model (avoid cold start on first query)
    await warmup();

    // Show existing data
    const stats = await getStats();
    if (stats.totalLessons > 0) {
        console.log(`   📚 Found ${stats.totalChunks} existing chunks across ${stats.totalLessons} lessons (persistent!)`);
    } else {
        console.log("   📭 No lessons indexed yet — upload a PDF to start");
    }

    console.log("   ✅ Custom RAG Pipeline ready\n");
}

/**
 * Index a lesson: chunk → embed → store in PostgreSQL.
 *
 * @param {string} lessonId - Unique lesson identifier
 * @param {string} rawText - Full extracted text from PDF
 * @param {object} options - { chunkSize, overlap }
 * @returns {{ chunksIndexed: number, embeddingTimeMs: number, totalTimeMs: number }}
 */
async function indexLesson(lessonId, rawText, options = {}) {
    const startTime = Date.now();

    console.log(`   📦 RAG indexing lesson: ${lessonId}`);

    // Step 1: Smart chunking with overlap
    const chunks = smartChunk(rawText, {
        chunkSize: options.chunkSize || 500,
        overlap: options.overlap || 100,
        lessonId,
    });

    if (chunks.length === 0) {
        console.warn(`   ⚠️ No chunks produced for lesson ${lessonId}`);
        return { chunksIndexed: 0, embeddingTimeMs: 0, totalTimeMs: Date.now() - startTime };
    }

    console.log(`   ✂️  Chunked into ${chunks.length} pieces (avg ${Math.round(rawText.length / chunks.length)} chars, overlap ${options.overlap || 100})`);

    // Step 2: Batch embed all chunks
    const embedStart = Date.now();
    const texts = chunks.map(c => c.text);
    const embeddings = await embedBatch(texts);
    const embeddingTimeMs = Date.now() - embedStart;

    console.log(`   🔢 Embedded ${embeddings.length} chunks in ${embeddingTimeMs}ms`);

    // Step 3: Store in PostgreSQL (pgvector)
    const stored = await storeChunks(lessonId, chunks, embeddings);

    const totalTimeMs = Date.now() - startTime;
    console.log(`   ✅ RAG index complete: ${stored} chunks in ${totalTimeMs}ms (embed: ${embeddingTimeMs}ms)`);

    return { chunksIndexed: stored, embeddingTimeMs, totalTimeMs };
}

/**
 * Search a lesson using hybrid search (vector + full-text + RRF).
 *
 * @param {string} lessonId - Which lesson to search
 * @param {string} query - Student's question
 * @param {number} topK - Number of results (default 3)
 * @returns {Array<{text, score, vectorRank, ftsRank, chunkIndex, section}>}
 */
async function searchLesson(lessonId, query, topK = 3) {
    return await hybridSearch(query, lessonId, topK);
}

/**
 * Re-index a lesson (delete old chunks + re-index).
 */
async function reindexLesson(lessonId, rawText, options = {}) {
    await deleteLesson(lessonId);
    return await indexLesson(lessonId, rawText, options);
}

module.exports = {
    init,
    indexLesson,
    searchLesson,
    isLessonIndexed,
    getIndexedLessons,
    reindexLesson,
    deleteLesson,
    getChunkCount,
    getStats,
    EMBED_MODEL,
    EMBED_DIM,
};
