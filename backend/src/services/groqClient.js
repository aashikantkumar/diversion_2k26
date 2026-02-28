// ============================================
// AI ENGINE — Groq Client (LangChain Version)
// ============================================
// Owner: MEMBER 2 (AI/Logic Engineer)
// Purpose: Multi-model round-robin load balancer for Groq models.
//
// Replaces Gemini with Groq's lightning-fast LPUs.
//
// FLOW: 
// 1. Text is split into chunks
// 2. Each chunk is sent to a DIFFERENT model in the pool (round-robin)
// 3. If a model hits a rate limit, it automatically falls back to the next model

const { ChatGroq } = require("@langchain/groq");
const { ChatPromptTemplate } = require("@langchain/core/prompts");
const { JsonOutputParser } = require("@langchain/core/output_parsers");
const config = require("../config");

// Ensure API key format is correct
if (!config.GROQ_API_KEY) {
    console.warn("⚠️ Warning: GROQ_API_KEY is missing. Transformation endpoints will fail.");
}

// ─────────────────────────────────────────────
// 1. MULTI-MODEL LOAD BALANCING POOL (Groq)
// ─────────────────────────────────────────────
// By using 3 different models, we completely bypass single-model Rate Limits.
// Each model has its own independent quota bucket.
const MODEL_POOL = [
    "llama-3.3-70b-versatile",         // Primary: Meta Llama 3.3 70B
    "meta-llama/llama-4-scout-17b-16e-instruct",  // Fallback 1: Llama 4 Scout
    "qwen/qwen3-32b"                   // Fallback 2: Qwen 3 32B
];

const groqModels = MODEL_POOL.map(name => {
    return new ChatGroq({
        apiKey: config.GROQ_API_KEY,
        model: name,
        temperature: 0.2,       // Low temp for structured JSON
        maxTokens: 2000,
    });
});

let currentModelIndex = 0;

/**
 * Gets the next model in the pool (Round-Robin).
 * This ensures we distribute the load evenly across all 3 quotas.
 */
function getNextModel() {
    const model = groqModels[currentModelIndex];
    currentModelIndex = (currentModelIndex + 1) % groqModels.length; // Rotate 0 -> 1 -> 2 -> 0
    return model;
}

const jsonParser = new JsonOutputParser();

// ─────────────────────────────────────────────
// 2. CHAIN EXECUTION (With Auto-Fallback)
// ─────────────────────────────────────────────

/**
 * Runs a single LangChain task on a single chunk with Auto-Fallback.
 */
async function runAutoFallbackChain(promptString, textChunk, chunkIndex, attempt = 0) {
    const model = getNextModel();
    const modelName = model.model;

    const prompt = ChatPromptTemplate.fromMessages([
        ["system", promptString],
        ["human", "{text}"]
    ]);

    const chain = prompt.pipe(model).pipe(jsonParser);

    try {
        if (chunkIndex === 0) {
            console.log(`   🔀 chunk ${chunkIndex + 1} → ${modelName}`);
        }
        return await chain.invoke({ text: textChunk });
    } catch (error) {
        const isRateLimit = error.message.includes("429") || error.message.includes("rate limit") || error.message.includes("quota");

        if (isRateLimit && attempt < MODEL_POOL.length) {
            console.warn(`     ⚠️  ${modelName} quota hit for chunk ${chunkIndex + 1}, trying next...`);
            // Attempt again (getNextModel will automatically pick the next one)
            return runAutoFallbackChain(promptString, textChunk, chunkIndex, attempt + 1);
        }

        console.error(`     ❌ Chain failed permanently for chunk ${chunkIndex + 1}: ${error.message}`);
        throw error;
    }
}

/**
 * Runs a task sequentially over all chunks, merging the JSON results.
 */
async function processChunksForTask(task, chunks) {
    if (chunks.length === 1) {
        return await runAutoFallbackChain(task.prompt, chunks[0], 0);
    }

    let mergedResult = {};

    for (let i = 0; i < chunks.length; i++) {
        const result = await runAutoFallbackChain(task.prompt, chunks[i], i);

        // Smart Merge Logic based on mode
        if (task.name === "dyslexia") {
            mergedResult.text = (mergedResult.text || "") + " " + (result.text || "");
            mergedResult.formatting = result.formatting || mergedResult.formatting;
            mergedResult.difficultWords = [...(mergedResult.difficultWords || []), ...(result.difficultWords || [])];
            mergedResult.encouragement = result.encouragement || mergedResult.encouragement;
        } else if (task.name === "adhd") {
            mergedResult.chunks = [...(mergedResult.chunks || []), ...(result.chunks || [])];
        } else if (task.name === "dyscalculia") {
            mergedResult.sections = [...(mergedResult.sections || []), ...(result.sections || [])];
            if (!mergedResult.summary && result.summary) mergedResult.summary = result.summary;
        } else if (task.name === "simplified") {
            mergedResult.text = (mergedResult.text || "") + " " + (result.text || "");
            mergedResult.readingLevel = result.readingLevel || mergedResult.readingLevel;
            mergedResult.keyTerms = [...(mergedResult.keyTerms || []), ...(result.keyTerms || [])];
        } else if (task.name === "audioScript") {
            mergedResult.text = (mergedResult.text || "") + " " + (result.text || "");
            mergedResult.estimatedDuration = "Calculated post-merge";
            mergedResult.sections = [...(mergedResult.sections || []), ...(result.sections || [])];
        } else {
            // Generic merge
            mergedResult = { ...mergedResult, ...result };
        }
    }

    return mergedResult;
}

// ─────────────────────────────────────────────
// 3. PARALLEL ORCHESTRATOR
// ─────────────────────────────────────────────

/**
 * Runs multiple mode transformations in parallel against a chunked document.
 * 
 * @param {Array<{name: string, prompt: string}>} tasks 
 * @param {string[]} chunks 
 * @returns {Promise<Object>} Output mapped by task name
 */
async function runParallelChains(tasks, chunks) {
    console.log(`   🔗 Running ${tasks.length} LangChain chains | ${chunks.length} chunk(s) | ${MODEL_POOL.length} Groq models`);
    const results = {};
    const startTime = Date.now();

    // Run all tasks (modes) perfectly in parallel
    const promises = tasks.map(async (task) => {
        try {
            results[task.name] = await processChunksForTask(task, chunks);
            console.log(`   ✅ ${task.name} completed in ${Date.now() - startTime}ms`);
        } catch (error) {
            console.error(`   ❌ Task ${task.name} failed:`, error.message);
            results[task.name] = null; // Return null instead of crashing the whole pipeline
        }
    });

    await Promise.all(promises);
    console.log(`   ⏱️  All chains completed in ${Date.now() - startTime}ms`);

    return results;
}

module.exports = { runParallelChains };
