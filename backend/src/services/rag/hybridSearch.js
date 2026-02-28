// ============================================
// HYBRID SEARCH — Vector + Full-Text + RRF Reranking
// ============================================
// Purpose: Combine pgvector cosine similarity with PostgreSQL full-text
//          search using Reciprocal Rank Fusion (RRF) for better retrieval.
//
// Why hybrid?
//   - Vector search finds semantically similar text ("solar system" ↔ "planets orbiting a star")
//   - Full-text search finds exact keyword matches ("mitosis" → paragraph containing "mitosis")
//   - RRF merges both rankings without needing score normalization
//
// Algorithm: RRF(d) = Σ 1/(k + rank_i(d)) for each ranking i
//   - k = 60 (standard constant, balances top vs. lower positions)
//   - Higher RRF score = better match

const { embedText } = require("./embedder");
const { vectorSearch, fullTextSearch } = require("./pgVectorStore");

const RRF_K = 60; // Standard RRF constant

/**
 * Reciprocal Rank Fusion: merge two ranked lists.
 * @param {Array<{id, text, chunkIndex, section, score, metadata}>} vectorResults
 * @param {Array<{id, text, chunkIndex, section, score, metadata}>} ftsResults
 * @returns {Array<{text, score, vectorRank, ftsRank, chunkIndex, section, metadata}>}
 */
function reciprocalRankFusion(vectorResults, ftsResults) {
    const scoreMap = new Map(); // chunkIndex → { rrfScore, data, vectorRank, ftsRank }

    // Score from vector search
    vectorResults.forEach((result, rank) => {
        const key = result.chunkIndex;
        if (!scoreMap.has(key)) {
            scoreMap.set(key, {
                data: result,
                rrfScore: 0,
                vectorRank: rank + 1,
                ftsRank: null,
                vectorScore: result.score,
                ftsScore: null,
            });
        }
        scoreMap.get(key).rrfScore += 1 / (RRF_K + rank + 1);
    });

    // Score from full-text search
    ftsResults.forEach((result, rank) => {
        const key = result.chunkIndex;
        if (!scoreMap.has(key)) {
            scoreMap.set(key, {
                data: result,
                rrfScore: 0,
                vectorRank: null,
                ftsRank: rank + 1,
                vectorScore: null,
                ftsScore: result.score,
            });
        }
        const entry = scoreMap.get(key);
        entry.rrfScore += 1 / (RRF_K + rank + 1);
        entry.ftsRank = rank + 1;
        entry.ftsScore = result.score;
    });

    // Sort by RRF score (descending)
    const sorted = [...scoreMap.values()].sort((a, b) => b.rrfScore - a.rrfScore);

    return sorted.map(entry => ({
        text: entry.data.text,
        score: parseFloat(entry.rrfScore.toFixed(6)),
        vectorRank: entry.vectorRank,
        ftsRank: entry.ftsRank,
        vectorScore: entry.vectorScore,
        ftsScore: entry.ftsScore,
        chunkIndex: entry.data.chunkIndex,
        section: entry.data.section,
        metadata: entry.data.metadata,
    }));
}

/**
 * Hybrid search: vector + full-text with RRF reranking.
 *
 * @param {string} query - Student's question
 * @param {string} lessonId - Which lesson to search
 * @param {number} topK - Final number of results (default 3)
 * @returns {Promise<Array<{text, score, vectorRank, ftsRank, chunkIndex, section}>>}
 */
async function hybridSearch(query, lessonId, topK = 3) {
    const candidateK = Math.max(topK * 3, 10); // Retrieve more candidates for RRF

    // Step 1: Embed the query
    const queryEmbedding = await embedText(query);

    // Step 2: Run both searches in PARALLEL
    const [vecResults, ftsResults] = await Promise.all([
        vectorSearch(queryEmbedding, lessonId, candidateK),
        fullTextSearch(query, lessonId, candidateK),
    ]);

    // Step 3: If only one search returned results, use that
    if (vecResults.length === 0 && ftsResults.length === 0) {
        return [];
    }
    if (vecResults.length === 0) {
        return ftsResults.slice(0, topK).map((r, i) => ({
            ...r, vectorRank: null, ftsRank: i + 1, vectorScore: null, ftsScore: r.score,
        }));
    }
    if (ftsResults.length === 0) {
        return vecResults.slice(0, topK).map((r, i) => ({
            ...r, vectorRank: i + 1, ftsRank: null, vectorScore: r.score, ftsScore: null,
        }));
    }

    // Step 4: RRF fusion
    const fused = reciprocalRankFusion(vecResults, ftsResults);

    return fused.slice(0, topK);
}

/**
 * Vector-only search (fallback if full-text returns nothing).
 */
async function vectorOnlySearch(query, lessonId, topK = 3) {
    const queryEmbedding = await embedText(query);
    const results = await vectorSearch(queryEmbedding, lessonId, topK);
    return results.map((r, i) => ({
        ...r,
        vectorRank: i + 1,
        ftsRank: null,
        vectorScore: r.score,
        ftsScore: null,
    }));
}

module.exports = {
    hybridSearch,
    vectorOnlySearch,
    reciprocalRankFusion,
    RRF_K,
};
