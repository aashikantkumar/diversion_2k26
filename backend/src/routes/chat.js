// ============================================
// CHAT ROUTE — RAG-Powered Adaptive Chatbots
// ============================================
// Owner: MEMBER 2 (AI/Logic Engineer)
// Endpoint: POST /api/chat/:mode
// Purpose: Student asks a question → RAG retrieves context from PDF →
//          Mode-specific chatbot answers in adapted style.
//
// Modes: "adhd" | "dyslexia" | "dyscalculia"
//
// FLOW:
// 1. Student sends { message, lessonId }
// 2. RAG searches the lesson's vector store for relevant chunks
// 3. Context + question sent to mode-specific HuggingFace model
// 4. Response adapted to the student's learning style

const express = require("express");
const router = express.Router();
// Custom RAG pipeline (persistent pgvector + hybrid search + RRF)
const { searchLesson, isLessonIndexed, getIndexedLessons } = require("../services/rag/ragPipeline");
const { runChatChain } = require("../services/chatClient");
const { adhdChatPrompt, dyslexiaChatPrompt, dyscalculiaChatPrompt } = require("../services/prompts/chatPersonalities");

// Mode → System prompt mapping
const CHAT_PROMPTS = {
    adhd: adhdChatPrompt,
    dyslexia: dyslexiaChatPrompt,
    dyscalculia: dyscalculiaChatPrompt,
};

// Chat history per session (simple in-memory store)
const chatHistory = new Map();

/**
 * POST /api/chat/:mode
 * Body: { message: string, lessonId: string, sessionId?: string }
 */
router.post("/:mode", async (req, res) => {
    const startTime = Date.now();
    const { mode } = req.params;
    const { message, lessonId, sessionId } = req.body;

    // Validate mode
    if (!CHAT_PROMPTS[mode]) {
        return res.status(400).json({
            error: `Invalid mode: "${mode}"`,
            validModes: Object.keys(CHAT_PROMPTS),
        });
    }

    // Validate input
    if (!message || !message.trim()) {
        return res.status(400).json({ error: "Missing required field: message" });
    }
    if (!lessonId) {
        return res.status(400).json({
            error: "Missing required field: lessonId",
            hint: "lessonId is returned when you upload a PDF via /api/upload",
            availableLessons: getIndexedLessons(),
        });
    }

    console.log(`\n💬 Chat [${mode.toUpperCase()}] lesson:${lessonId}`);
    console.log(`   ❓ "${message}"`);

    try {
        // 1. RAG: Hybrid search (vector + full-text + RRF reranking)
        let context = "";
        let sourcesUsed = 0;
        let ragDetails = [];

        const lessonIndexed = await isLessonIndexed(lessonId);
        if (lessonIndexed) {
            const searchResults = await searchLesson(lessonId, message, 3);
            sourcesUsed = searchResults.length;
            context = searchResults.map(r => r.text).join("\n\n---\n\n");
            ragDetails = searchResults.map(r => ({
                chunkIndex: r.chunkIndex,
                score: r.score,
                vectorRank: r.vectorRank,
                ftsRank: r.ftsRank,
                section: r.section || null,
            }));
            console.log(`   🔍 Hybrid search found ${sourcesUsed} chunks (RRF scores: ${searchResults.map(r => r.score).join(", ")})`);
        } else {
            console.log(`   ⚠️ Lesson not indexed — using general knowledge`);
            context = "No lesson context available. Answer based on general knowledge but keep it simple.";
        }

        // 2. Get the mode-specific system prompt
        const systemPrompt = CHAT_PROMPTS[mode];

        // 3. Run the chat chain (HuggingFace → Gemini fallback)
        const response = await runChatChain(systemPrompt, context, message, mode);

        const processingTime = Date.now() - startTime;
        console.log(`   ✅ ${mode} chat responded in ${processingTime}ms (${response.source || "unknown"})`);

        // 4. Store in chat history
        const historyKey = sessionId || `${lessonId}_${mode}`;
        if (!chatHistory.has(historyKey)) chatHistory.set(historyKey, []);
        chatHistory.get(historyKey).push(
            { role: "student", content: message },
            { role: "tutor", content: response.reply || JSON.stringify(response) }
        );

        // 5. Return response
        res.json({
            mode,
            lessonId,
            response,
            rag: {
                sourcesUsed,
                lessonIndexed: lessonIndexed,
                searchType: "hybrid (vector + full-text + RRF)",
                chunks: ragDetails,
            },
            metadata: {
                processingTimeMs: processingTime,
                provider: response.source || "unknown",
                chatHistoryLength: chatHistory.get(historyKey)?.length || 0,
            },
        });
    } catch (err) {
        const processingTime = Date.now() - startTime;
        console.error(`   ❌ Chat failed after ${processingTime}ms:`, err.message);
        res.status(500).json({
            error: "Chat failed",
            details: err.message,
            processingTimeMs: processingTime,
        });
    }
});

/**
 * GET /api/chat/history/:sessionId
 * Returns chat history for a session
 */
router.get("/history/:sessionId", (req, res) => {
    const { sessionId } = req.params;
    const history = chatHistory.get(sessionId) || [];
    res.json({ sessionId, messages: history, count: history.length });
});

/**
 * GET /api/chat/status
 * Returns which lessons are indexed and available for chat
 */
router.get("/status", async (req, res) => {
    const indexed = await getIndexedLessons();
    res.json({
        indexedLessons: indexed,
        totalIndexed: indexed.length,
        supportedModes: Object.keys(CHAT_PROMPTS),
        ragEngine: "Custom RAG (pgvector + hybrid search + RRF)",
    });
});

module.exports = router;
