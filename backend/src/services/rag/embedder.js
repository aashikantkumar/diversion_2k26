// ============================================
// EMBEDDER — HuggingFace Free Embeddings (384-dim)
// ============================================
// Purpose: Convert text into vector embeddings using HuggingFace
//          Inference API (free tier). Zero Gemini dependency.
//
// Model: sentence-transformers/all-MiniLM-L6-v2
//   - 384 dimensions (compact, fast)
//   - Trained on 1B+ sentence pairs
//   - Great for semantic similarity on short text
//
// Why not Gemini embedding?
//   - Gemini costs API quota
//   - HuggingFace is free (100 req/min)
//   - MiniLM is purpose-built for retrieval

const { InferenceClient } = require("@huggingface/inference");
const config = require("../../config");

const EMBED_MODEL = "sentence-transformers/all-MiniLM-L6-v2";
const EMBED_DIM = 384;
const BATCH_SIZE = 50; // HF API max per request

const hfClient = config.HUGGINGFACE_API_KEY
    ? new InferenceClient(config.HUGGINGFACE_API_KEY)
    : null;

/**
 * Embed a single text string into a 384-dim vector.
 * @param {string} text - Text to embed
 * @returns {Promise<number[]>} - 384-dim float array
 */
async function embedText(text) {
    if (!hfClient) throw new Error("HUGGINGFACE_API_KEY not configured");
    if (!text || !text.trim()) throw new Error("Cannot embed empty text");

    const result = await hfClient.featureExtraction({
        model: EMBED_MODEL,
        inputs: text.trim(),
    });

    // HF returns nested array for single input — flatten if needed
    const vector = Array.isArray(result[0]) ? result[0] : result;

    if (vector.length !== EMBED_DIM) {
        throw new Error(`Expected ${EMBED_DIM}-dim vector, got ${vector.length}`);
    }

    return vector;
}

/**
 * Embed multiple texts in batches.
 * @param {string[]} texts - Array of texts to embed
 * @returns {Promise<number[][]>} - Array of 384-dim vectors
 */
async function embedBatch(texts) {
    if (!hfClient) throw new Error("HUGGINGFACE_API_KEY not configured");
    if (!texts || texts.length === 0) return [];

    const allVectors = [];

    // Process in batches of BATCH_SIZE
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
        const batch = texts.slice(i, i + BATCH_SIZE).map(t => t.trim());
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(texts.length / BATCH_SIZE);

        if (totalBatches > 1) {
            console.log(`   📊 Embedding batch ${batchNum}/${totalBatches} (${batch.length} texts)...`);
        }

        let retries = 3;
        let result;

        while (retries > 0) {
            try {
                result = await hfClient.featureExtraction({
                    model: EMBED_MODEL,
                    inputs: batch,
                });
                break;
            } catch (err) {
                retries--;
                if (retries === 0) throw err;
                const isRateLimit = err.status === 429 || err.status === 503;
                const waitMs = isRateLimit ? 3000 : 1000;
                console.warn(`   ⚠️ Embed retry (${3 - retries}/3): ${err.message}. Waiting ${waitMs}ms...`);
                await new Promise(r => setTimeout(r, waitMs));
            }
        }

        // Validate dimensions
        for (const vec of result) {
            const v = Array.isArray(vec[0]) ? vec[0] : vec;
            if (v.length !== EMBED_DIM) {
                throw new Error(`Expected ${EMBED_DIM}-dim, got ${v.length}`);
            }
            allVectors.push(v);
        }
    }

    return allVectors;
}

/**
 * Warmup: ping the embedding model to avoid cold start latency.
 * Call this on server startup.
 */
async function warmup() {
    if (!hfClient) {
        console.log("   ⚠️ Embedder: HuggingFace not configured, skipping warmup");
        return false;
    }
    try {
        const start = Date.now();
        await embedText("warmup ping");
        console.log(`   🔥 Embedder warmed up in ${Date.now() - start}ms (model: ${EMBED_MODEL})`);
        return true;
    } catch (err) {
        console.warn(`   ⚠️ Embedder warmup failed: ${err.message} (will retry on first use)`);
        return false;
    }
}

module.exports = {
    embedText,
    embedBatch,
    warmup,
    EMBED_MODEL,
    EMBED_DIM,
};
