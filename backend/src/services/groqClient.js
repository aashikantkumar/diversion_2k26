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
const { StringOutputParser } = require("@langchain/core/output_parsers");
const config = require("../config");

if (!config.GROQ_API_KEY) {
    console.warn("⚠️ Warning: GROQ_API_KEY is missing. Transformation endpoints will fail.");
}

// ─────────────────────────────────────────────
// 1. MODEL POOL (non-thinking models only)
// ─────────────────────────────────────────────
const MODEL_POOL = [
    "llama-3.3-70b-versatile",                    // Primary
    "meta-llama/llama-4-scout-17b-16e-instruct",  // Fallback 1
    "llama-3.1-8b-instant",                       // Fallback 2 (replaces decommissioned gemma2-9b-it)
];

const groqModels = MODEL_POOL.map(name =>
    new ChatGroq({
        apiKey: config.GROQ_API_KEY,
        model: name,
        temperature: 0.2,
        maxTokens: 2000,
    })
);

let currentModelIndex = 0;

function getNextModel() {
    const model = groqModels[currentModelIndex];
    currentModelIndex = (currentModelIndex + 1) % groqModels.length;
    return model;
}

// ─────────────────────────────────────────────
// 2. ROBUST JSON EXTRACTOR
// ─────────────────────────────────────────────
/**
 * Cleans LLM output and extracts valid JSON.
 * Handles: <think> tags, markdown code fences, raw control characters.
 */
function extractJSON(raw) {
    if (typeof raw !== "string") return raw; // already parsed

    // 1. Strip <think>...</think> blocks (Qwen/DeepSeek reasoning models)
    let text = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

    // 2. Strip markdown code fences ```json ... ``` or ``` ... ```
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/m, "").trim();

    // 3. Find the start of the first JSON object or array
    const startObj = text.indexOf("{");
    const startArr = text.indexOf("[");
    let start, opener, closing;
    if (startObj === -1 && startArr === -1) throw new Error("No JSON found in LLM response");
    if (startObj === -1 || (startArr !== -1 && startArr < startObj)) {
        start = startArr; opener = "["; closing = "]";
    } else {
        start = startObj; opener = "{"; closing = "}";
    }

    // 4. Walk the string tracking bracket depth to find the exact closing bracket.
    //    This avoids greedy-regex bugs where trailing } characters outside the JSON
    //    cause "Unexpected non-whitespace character after JSON" parse errors.
    let depth = 0, inString = false, escape = false, end = -1;
    for (let i = start; i < text.length; i++) {
        const ch = text[i];
        if (escape)          { escape = false; continue; }
        if (ch === "\\" && inString) { escape = true; continue; }
        if (ch === '"')      { inString = !inString; continue; }
        if (inString)        continue;
        if (ch === opener)   depth++;
        if (ch === closing)  { if (--depth === 0) { end = i; break; } }
    }
    if (end === -1) throw new Error("Unbalanced JSON brackets in LLM response");
    const jsonStr = text.slice(start, end + 1);

    // 5. Try direct parse
    try {
        return JSON.parse(jsonStr);
    } catch (_) {
        // Fall through to control-char cleaning
    }

    // 6. Strip raw control characters that can appear inside LLM string values
    const cleaned = jsonStr
        .replace(/\r\n/g, " ")
        .replace(/[\r\n]/g, " ")
        .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, " ");
    return JSON.parse(cleaned);
}

// ─────────────────────────────────────────────
// 3. CHAIN EXECUTION (with auto-fallback)
// ─────────────────────────────────────────────
const stringParser = new StringOutputParser();

async function runAutoFallbackChain(promptString, textChunk, chunkIndex, attempt = 0) {
    const model = getNextModel();
    const modelName = model.model;

    const prompt = ChatPromptTemplate.fromMessages([
        ["system", promptString],
        ["human", "{text}"]
    ]);

    const chain = prompt.pipe(model).pipe(stringParser);

    try {
        if (chunkIndex === 0) {
            console.log(`   🔀 chunk ${chunkIndex + 1} → ${modelName}`);
        }
        const raw = await chain.invoke({ text: textChunk });
        return extractJSON(raw);
    } catch (error) {
        const isRateLimit =
            error.message.includes("429") ||
            error.message.includes("rate limit") ||
            error.message.includes("quota");

        if (isRateLimit && attempt < MODEL_POOL.length) {
            console.warn(`     ⚠️  ${modelName} quota hit for chunk ${chunkIndex + 1}, trying next...`);
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
