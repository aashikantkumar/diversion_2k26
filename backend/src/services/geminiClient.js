// ============================================
// LANGCHAIN CLIENT — Multi-Model Load Balancer
// ============================================
// Owner: MEMBER 2 (AI/Logic Engineer)
//
// ARCHITECTURE (User's Design):
// ┌─────────────────────────────────────────────────────────┐
// │  PDF → Chunks → Each chunk sent to a DIFFERENT model   │
// │  Round-robin across 4 Gemini models (own quota pools)  │
// │  Outputs merged per mode → final complete result       │
// └─────────────────────────────────────────────────────────┘
//
// WHY: Instead of hitting 1 model × 5 requests,
//      spread load → each model only gets ~1-2 requests.
//      Rate limits effectively MULTIPLIED by number of models.

const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const { ChatPromptTemplate } = require("@langchain/core/prompts");
const { JsonOutputParser } = require("@langchain/core/output_parsers");
const config = require("../config");

// ─────────────────────────────────────────────
// MODEL POOL — Each has its OWN independent quota
// ─────────────────────────────────────────────
const MODEL_POOL = [
    "gemini-2.0-flash-lite",    // Pool 1 — 1500 req/day
    "gemini-flash-latest",      // Pool 2 — separate quota
    "gemini-2.0-flash",         // Pool 3 — 1500 req/day
    "gemini-2.5-flash-lite",    // Pool 4 — separate quota (backup)
];

// ─────────────────────────────────────────────
// MODE → MODEL ASSIGNMENT (Design 1)
// Each mode gets its own dedicated model
// So 5 parallel requests hit 3 DIFFERENT quota pools
// ─────────────────────────────────────────────
const MODE_MODEL_MAP = {
    dyslexia: "gemini-2.0-flash-lite",   // Pool 1
    adhd: "gemini-flash-latest",     // Pool 2
    dyscalculia: "gemini-2.0-flash",        // Pool 3
    simplified: "gemini-2.0-flash-lite",   // Pool 1 (2nd slot — different mode)
    audioScript: "gemini-flash-latest",     // Pool 2 (2nd slot — different mode)
};

const jsonParser = new JsonOutputParser();

function createModel(modelName) {
    return new ChatGoogleGenerativeAI({
        modelName,
        apiKey: config.GEMINI_API_KEY,
        temperature: 0.7,
        maxOutputTokens: 8192,
    });
}

// ─────────────────────────────────────────────
// DESIGN 2: Chunk Round-Robin
// Splits text into chunks, each chunk goes to next model in pool
// Merges results at the end
// ─────────────────────────────────────────────
async function runChunkedChain(systemPrompt, chunks, modeName) {
    // Assign each chunk to a different model (round-robin)
    const chunkTasks = chunks.map((chunk, index) => ({
        chunk,
        modelName: MODEL_POOL[index % MODEL_POOL.length],
        chunkIndex: index,
    }));

    console.log(`   🔀 ${modeName}: ${chunks.length} chunk(s) → ${[...new Set(chunkTasks.map(t => t.modelName))].join(", ")}`);

    const prompt = ChatPromptTemplate.fromMessages([
        ["system", systemPrompt],
        ["human", "Transform this educational content chunk (Part {part} of {total}):\n\n{content}"],
    ]);

    // Run all chunks in parallel, each on its assigned model
    const chunkResults = await Promise.all(
        chunkTasks.map(async ({ chunk, modelName, chunkIndex }) => {
            // Try assigned model, fall back to next in pool on 429
            for (let fallbackIndex = 0; fallbackIndex < MODEL_POOL.length; fallbackIndex++) {
                const tryModel = MODEL_POOL[(chunkIndex + fallbackIndex) % MODEL_POOL.length];
                try {
                    const model = createModel(tryModel);
                    const chain = prompt.pipe(model).pipe(jsonParser);
                    const result = await chain.invoke({
                        content: chunk,
                        part: chunkIndex + 1,
                        total: chunks.length,
                    });
                    if (fallbackIndex > 0) console.log(`     🔄 chunk ${chunkIndex + 1} used fallback: ${tryModel}`);
                    return result;
                } catch (error) {
                    const is429 = error.message.includes("429") || error.message.includes("quota");
                    if (is429 && fallbackIndex < MODEL_POOL.length - 1) {
                        console.warn(`     ⚠️  ${tryModel} quota hit for chunk ${chunkIndex + 1}, trying next...`);
                        continue;
                    }
                    console.error(`     ❌ chunk ${chunkIndex + 1} failed: ${error.message}`);
                    return null; // Return null for this chunk, merge will handle it
                }
            }
        })
    );

    // ─────────────────────────────────────────────
    // MERGE STRATEGY per mode
    // Single chunk → return as-is
    // Multiple chunks → intelligently merge based on mode structure
    // ─────────────────────────────────────────────
    const validResults = chunkResults.filter(Boolean);
    if (validResults.length === 0) return {};
    if (validResults.length === 1) return validResults[0];

    return mergeChunkResults(validResults, modeName);
}

/**
 * Merge multiple chunk results into one coherent output
 * Each mode has a different JSON structure, so merge accordingly
 */
function mergeChunkResults(results, modeName) {
    switch (modeName) {
        case "dyslexia":
            return {
                text: results.map(r => r.text || "").join("\n\n"),
                formatting: results[0].formatting,
                difficultWords: results.flatMap(r => r.difficultWords || [])
                    .filter((w, i, arr) => arr.findIndex(x => x.word === w.word) === i), // deduplicate
                encouragement: results[0].encouragement,
            };

        case "adhd":
            // Re-number chunks sequentially
            let id = 1;
            return {
                chunks: results.flatMap(r => (r.chunks || []).map(c => ({ ...c, id: id++ }))),
            };

        case "dyscalculia":
            return {
                sections: results.flatMap(r => r.sections || []),
                summary: results.map(r => r.summary || "").join(" "),
            };

        case "simplified":
            return {
                text: results.map(r => r.text || "").join("\n\n"),
                readingLevel: results[0].readingLevel || "Grade 3",
                keyTerms: results.flatMap(r => r.keyTerms || [])
                    .filter((t, i, arr) => arr.findIndex(x => x.original === t.original) === i),
            };

        case "audioScript":
            return {
                text: results.map(r => r.text || "").join(" [pause] "),
                estimatedDuration: `${results.reduce((acc, r) => {
                    const mins = parseInt(r.estimatedDuration) || 1;
                    return acc + mins;
                }, 0)} min`,
                sections: results.flatMap(r => r.sections || []),
            };

        default:
            return results[0];
    }
}

// ─────────────────────────────────────────────
// MAIN ENTRY POINT — used by transform.js and upload.js
// ─────────────────────────────────────────────
async function runParallelChains(tasks, chunks) {
    const startTime = Date.now();
    const chunkList = chunks || tasks[0]?.chunks || [tasks[0]?.text];

    console.log(`   🔗 Running ${tasks.length} LangChain chains | ${chunkList.length} chunk(s) | ${MODEL_POOL.length} model pool`);

    const results = await Promise.all(
        tasks.map(async (task) => {
            const taskStart = Date.now();
            try {
                // Use chunk-based round-robin (Design 2)
                const result = await runChunkedChain(task.prompt, chunkList, task.name);
                console.log(`   ✅ ${task.name} completed in ${Date.now() - taskStart}ms`);
                return { name: task.name, result };
            } catch (error) {
                console.error(`   ❌ ${task.name} failed: ${error.message}`);
                return { name: task.name, result: {} };
            }
        })
    );

    console.log(`   ⏱️  All chains completed in ${Date.now() - startTime}ms`);

    const output = {};
    for (const r of results) output[r.name] = r.result;
    return output;
}

module.exports = { runParallelChains };
