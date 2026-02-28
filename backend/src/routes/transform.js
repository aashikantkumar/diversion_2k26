// ============================================
// TRANSFORM ROUTE — Member 2 (LangChain Version)
// ============================================
// Owner: MEMBER 2 (AI/Logic Engineer)
// Endpoint: POST /api/transform
// Purpose: Receives raw text, runs 5 parallel LangChain chains, returns structured JSON

const express = require("express");
const router = express.Router();
const { runParallelChains } = require("../services/geminiClient");
const { chunkText } = require("../services/chunker");
const { indexLesson } = require("../services/vectorStore");

// Import system prompts (LangChain format)
const { dyslexiaSystemPrompt } = require("../services/prompts/dyslexia");
const { adhdSystemPrompt } = require("../services/prompts/adhd");
const { dyscalculiaSystemPrompt } = require("../services/prompts/dyscalculia");
const { simplifiedSystemPrompt } = require("../services/prompts/simplified");
const { audioScriptSystemPrompt } = require("../services/prompts/audioScript");

// Default fallback values for each mode
const FALLBACKS = {
    dyslexia: { text: "", formatting: { font: "OpenDyslexic", lineHeight: 2.0, bgColor: "#fdf6e3" }, difficultWords: [], encouragement: { sectionComplete: "Great job! 🎉", halfwayPoint: "Keep going! 💪", allDone: "Amazing! 🌟" } },
    adhd: { chunks: [] },
    dyscalculia: { sections: [], summary: "" },
    simplified: { text: "", readingLevel: "Grade 3", keyTerms: [] },
    audioScript: { text: "", estimatedDuration: "2 min", sections: [] },
};

router.post("/", async (req, res) => {
    const startTime = Date.now();

    try {
        const { title, rawText, subject } = req.body;

        // Validate input
        if (!rawText || rawText.trim().length === 0) {
            return res.status(400).json({
                error: "Missing required field: rawText",
                hint: "Send a POST request with { title, rawText, subject? }",
            });
        }

        console.log(`\n🧠 Transform request: "${title || "Untitled"}"`);
        console.log(`   📝 Text length: ${rawText.length} chars`);

        // 1. Chunk the text — each chunk will go to a DIFFERENT model (round-robin)
        const sections = chunkText(rawText, 3000);
        console.log(`   📦 Split into ${sections.length} chunk(s) → load balanced across model pool`);

        // RAG: Generate lessonId early + index smaller chunks for chatbot
        const lessonId = `lesson_${Date.now()}`;
        const ragChunks = chunkText(rawText, 500);
        indexLesson(lessonId, ragChunks).catch(err =>
            console.error("   ⚠️ RAG indexing failed (non-critical):", err.message)
        );

        // 2. Define 5 parallel LangChain chain tasks
        const tasks = [
            { name: "dyslexia", prompt: dyslexiaSystemPrompt },
            { name: "adhd", prompt: adhdSystemPrompt },
            { name: "dyscalculia", prompt: dyscalculiaSystemPrompt },
            { name: "simplified", prompt: simplifiedSystemPrompt },
            { name: "audioScript", prompt: audioScriptSystemPrompt },
        ];

        // 3. Run ALL 5 chains in PARALLEL — each chunk round-robins across model pool
        const results = await runParallelChains(tasks, sections);

        const processingTime = Date.now() - startTime;

        // 4. Build the final response (with fallback defaults)
        const response = {
            id: lessonId,
            title: title || "Untitled Lesson",
            original: rawText,
            dyslexia: { ...FALLBACKS.dyslexia, ...results.dyslexia },
            adhd: { ...FALLBACKS.adhd, ...results.adhd },
            dyscalculia: { ...FALLBACKS.dyscalculia, ...results.dyscalculia },
            simplified: { ...FALLBACKS.simplified, ...results.simplified },
            audioScript: { ...FALLBACKS.audioScript, ...results.audioScript },
            signLanguage: {
                available: (title || "").toLowerCase().includes("solar"),
                videoUrl: "/assets/sign-language/solar-system.mp4",
                summary: "Pre-recorded sign language summary",
            },
            metadata: {
                processingTimeMs: processingTime,
                modelPool: ["gemini-2.0-flash-lite", "gemini-flash-latest", "gemini-2.0-flash"],
                architecture: "multi-model-round-robin",
                framework: "LangChain",
                chunksProcessed: sections.length,
                textLength: rawText.length,
            },
        };

        console.log(`   ⏱️  Total processing time: ${processingTime}ms`);
        res.json(response);
    } catch (err) {
        const processingTime = Date.now() - startTime;
        console.error(`   ❌ Transform failed after ${processingTime}ms:`, err.message);
        res.status(500).json({
            error: "Transformation failed",
            details: err.message,
            processingTimeMs: processingTime,
        });
    }
});

module.exports = router;
