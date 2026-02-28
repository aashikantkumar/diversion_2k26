// ============================================
// VECTOR STORE — RAG Embedding & Semantic Search
// ============================================
// Owner: MEMBER 2 (AI/Logic Engineer)
// Purpose: Convert lesson chunks into vectors, store them,
//          and enable semantic search for the chatbot.
//
// FLOW:
// 1. Teacher uploads PDF → chunks extracted
// 2. Each chunk → Gemini Embedding API → 768-dim vector
// 3. Vectors stored in MemoryVectorStore (keyed by lessonId)
// 4. Student asks question → question embedded → cosine similarity search
// 5. Top 3 matching chunks returned as context for chatbot

const { GoogleGenerativeAIEmbeddings } = require("@langchain/google-genai");
const { MemoryVectorStore } = require("langchain/vectorstores/memory");
const config = require("../config");

// Gemini embedding model (768-dim vectors)
const embeddings = new GoogleGenerativeAIEmbeddings({
    modelName: "gemini-embedding-001",
    apiKey: config.GEMINI_API_KEY,
});

// In-memory store: lessonId → MemoryVectorStore
const lessonStores = new Map();

/**
 * Index a lesson's text chunks into the vector store.
 * Called once when teacher uploads a PDF.
 *
 * @param {string} lessonId - Unique lesson identifier
 * @param {string[]} chunks - Array of text chunks (~500 chars each)
 * @returns {number} Number of chunks indexed
 */
async function indexLesson(lessonId, chunks) {
    try {
        console.log(`   🔢 Indexing ${chunks.length} chunks into vector store...`);

        // Create metadata for each chunk (helps with filtering later)
        const metadata = chunks.map((_, i) => ({
            chunkIndex: i,
            lessonId,
        }));

        // Create vector store from text chunks
        const store = await MemoryVectorStore.fromTexts(
            chunks,
            metadata,
            embeddings
        );

        lessonStores.set(lessonId, store);
        console.log(`   ✅ Vector store ready for lesson ${lessonId} (${chunks.length} vectors)`);
        return chunks.length;
    } catch (error) {
        console.error(`   ⚠️ Vector indexing failed: ${error.message}`);
        // Non-critical — chatbot can still work without RAG (uses full text fallback)
        return 0;
    }
}

/**
 * Semantic search: find the most relevant chunks for a student's question.
 *
 * @param {string} lessonId - Which lesson to search
 * @param {string} question - Student's question
 * @param {number} topK - Number of results to return (default 3)
 * @returns {Array<{text: string, score: number}>} Matching chunks
 */
async function searchLesson(lessonId, question, topK = 3) {
    const store = lessonStores.get(lessonId);
    if (!store) {
        console.warn(`   ⚠️ No vector store found for lesson ${lessonId}`);
        return [];
    }

    try {
        const results = await store.similaritySearchWithScore(question, topK);
        return results.map(([doc, score]) => ({
            text: doc.pageContent,
            score: parseFloat(score.toFixed(4)),
            chunkIndex: doc.metadata.chunkIndex,
        }));
    } catch (error) {
        console.error(`   ⚠️ Semantic search failed: ${error.message}`);
        return [];
    }
}

/**
 * Check if a lesson has been indexed
 */
function isLessonIndexed(lessonId) {
    return lessonStores.has(lessonId);
}

/**
 * Get all indexed lesson IDs
 */
function getIndexedLessons() {
    return [...lessonStores.keys()];
}

module.exports = { indexLesson, searchLesson, isLessonIndexed, getIndexedLessons };
