// ============================================
// EXPRESS SERVER — Shared Entry Point
// ============================================
// Owner: Shared (Member 2 adds /api/transform, Member 3 adds /api/upload & /api/lessons)

const express = require("express");
const cors = require("cors");
const path = require("path");
const config = require("./config");

// Custom RAG pipeline
const ragPipeline = require("./services/rag/ragPipeline");

const app = express();

// --------------- Middleware ---------------
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Serve static files (sign language videos, etc.)
app.use("/assets", express.static(path.join(__dirname, "../public/assets")));

// --------------- Routes ---------------

// Member 2: AI Transformation Engine
const transformRoute = require("./routes/transform");
app.use("/api/transform", transformRoute);

// Member 3: PDF Upload & Lesson Management
const uploadRoute = require("./routes/upload");
app.use("/api/upload", uploadRoute);

const lessonsRoute = require("./routes/lessons");
app.use("/api/lessons", lessonsRoute);

// Member 2: RAG-Powered Adaptive Chatbots
const chatRoute = require("./routes/chat");
app.use("/api/chat", chatRoute);

// Member 2: Learning Disability Assessment (10-question screening)
const assessRoute = require("./routes/assess");
app.use("/api/assess", assessRoute);

// Student Management (Teacher creates students, assigns lessons)
const studentsRoute = require("./routes/students");
app.use("/api/students", studentsRoute);

// AI Image Generation (HuggingFace text-to-image per learning mode)
const generateImageRoute = require("./routes/generateImage");
app.use("/api/generate-image", generateImageRoute);

// Auth0 — Login/Signup/Roles/Invites
const authRoute = require("./routes/auth");
app.use("/api/auth", authRoute);

// --------------- Health Check ---------------
app.get("/api/health", async (req, res) => {
    let ragStats = { totalChunks: 0, totalLessons: 0 };
    try { ragStats = await ragPipeline.getStats(); } catch {}
    res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        members: {
            member2_ai: !!config.GEMINI_API_KEY ? "configured" : "MISSING API KEY",
            member2_hf: !!config.HUGGINGFACE_API_KEY ? "configured" : "not configured (chatbot uses Gemini fallback)",
            member3_db: !!config.DATABASE_URL ? "configured (PostgreSQL)" : "MISSING DATABASE_URL",
            cloudinary: !!config.CLOUDINARY_CLOUD_NAME ? "configured" : "not configured (image storage disabled)",
        },
        rag: {
            engine: "Custom RAG (pgvector + hybrid search + RRF)",
            embeddingModel: ragPipeline.EMBED_MODEL,
            dimensions: ragPipeline.EMBED_DIM,
            storage: "PostgreSQL pgvector (persistent)",
            ...ragStats,
        },
    });
});

// --------------- Error Handler ---------------
app.use((err, req, res, next) => {
    console.error("Server Error:", err.message);
    res.status(500).json({
        error: "Internal server error",
        details: config.NODE_ENV === "development" ? err.message : undefined,
    });
});

// --------------- Start Server ---------------
// Initialize RAG BEFORE accepting traffic (avoid race condition)
async function startServer() {
    try {
        await ragPipeline.init();
    } catch (err) {
        console.error("⚠️ RAG init failed (non-critical):", err.message);
    }

    app.listen(config.PORT, () => {
        console.log(`
  ╔══════════════════════════════════════════════╗
  ║  🧠 NeuroAdapt Backend Running              ║
  ║  📍 http://localhost:${config.PORT}                  ║
  ║  🔑 Gemini API: ${config.GEMINI_API_KEY ? "✅ Configured" : "❌ Missing"}            ║
  ║  🤗 HuggingFace: ${config.HUGGINGFACE_API_KEY ? "✅ Configured" : "⚠️  Gemini fallback"}       ║
  ║  🗄️  PostgreSQL: ${config.DATABASE_URL ? "✅ Configured" : "❌ Missing"}           ║
  ║  🔍 RAG: Custom (pgvector + hybrid search)  ║
  ╚══════════════════════════════════════════════╝
  `);
    });
}

startServer();

module.exports = app;
