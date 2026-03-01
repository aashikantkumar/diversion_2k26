// ============================================
// EXPRESS SERVER — Shared Entry Point
// ============================================
// Owner: Shared (Member 2 adds /api/transform, Member 3 adds /api/upload & /api/lessons)

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const path = require("path");
const config = require("./config");

// Custom RAG pipeline
const ragPipeline = require("./services/rag/ragPipeline");

const app = express();

// --------------- Security Middleware ---------------
// Security headers
app.use(helmet({
    crossOriginEmbedderPolicy: false, // needed for PDF serving
    contentSecurityPolicy: config.NODE_ENV === "production" ? undefined : false,
}));

// CORS — restrict to known origins in production
const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5174",
    ...(config.FRONTEND_URL ? [config.FRONTEND_URL] : []),
];
app.use(cors({
    origin: (origin, cb) => {
        // allow server-to-server (no origin) and known origins
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
}));

// Compress all responses
app.use(compression());

// HTTP request logging
app.use(morgan(config.NODE_ENV === "production" ? "combined" : "dev"));

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// --------------- Rate Limiting ---------------
// Global: 200 req/15min per IP
app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests. Please try again later." },
}));

// Strict limit on AI endpoints (expensive operations)
const aiLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10,
    message: { error: "AI rate limit exceeded. Max 10 requests/minute." },
});
app.use("/api/upload", aiLimit);
app.use("/api/transform", aiLimit);
app.use("/api/generate-image", aiLimit);
app.use("/api/generate-video", aiLimit);
app.use("/api/tts", aiLimit);

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

// Auth: Custom JWT — login/register/refresh
const authRoute = require("./routes/auth");
app.use("/api/auth", authRoute);

// AI Video Generation (HuggingFace text-to-video per learning mode)
const generateVideoRoute = require("./routes/generateVideo");
app.use("/api/generate-video", generateVideoRoute);

// ElevenLabs Text-to-Speech (lesson narration + word pronunciation)
const ttsRoute = require("./routes/tts");
app.use("/api/tts", ttsRoute);

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

// --------------- 404 Handler ---------------
app.use((req, res) => {
    res.status(404).json({ error: "Route not found" });
});

// --------------- Error Handler ---------------
app.use((err, req, res, next) => {
    // CORS errors
    if (err.message && err.message.startsWith("CORS:")) {
        return res.status(403).json({ error: err.message });
    }
    // JWT errors from requireAuth middleware
    if (err.status === 401 || err.name === "UnauthorizedError" || err.name === "JsonWebTokenError") {
        return res.status(401).json({ error: "Unauthorized", details: err.message });
    }
    console.error("Server Error:", err.stack || err.message);
    res.status(err.status || 500).json({
        error: "Internal server error",
        details: config.NODE_ENV === "development" ? err.message : undefined,
    });
});

// --------------- Start Server ---------------
async function startServer() {
    // Validate required env vars before starting
    config.validate();

    try {
        await ragPipeline.init();
    } catch (err) {
        console.error("⚠️ RAG init failed (non-critical):", err.message);
    }

    const server = app.listen(config.PORT, () => {
        console.log(`
  ╔══════════════════════════════════════════════╗
  ║  🧠 NeuroAdapt Backend Running              ║
  ║  📍 http://localhost:${config.PORT}                  ║
  ║  🌍 ENV: ${config.NODE_ENV.padEnd(34)}║
  ║  🔑 Gemini API: ${config.GEMINI_API_KEY ? "✅ Configured" : "❌ Missing"}            ║
  ║  🤗 HuggingFace: ${config.HUGGINGFACE_API_KEY ? "✅ Configured" : "⚠️  Gemini fallback"}       ║
  ║  🗄️  PostgreSQL: ${config.DATABASE_URL ? "✅ Configured" : "❌ Missing"}           ║
  ║  🔐 JWT Auth: ${config.JWT_SECRET ? "✅ Configured" : "❌ Missing"}               ║
  ║  🔍 RAG: Custom (pgvector + hybrid search)  ║
  ╚══════════════════════════════════════════════╝
  `);
    });

    // Graceful shutdown
    const shutdown = (signal) => {
        console.log(`\n🛑 ${signal} received — shutting down gracefully`);
        server.close(() => {
            console.log("✅ Server closed");
            process.exit(0);
        });
        setTimeout(() => { process.exit(1); }, 10000); // force exit after 10s
    };
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT",  () => shutdown("SIGINT"));
    process.on("uncaughtException", (err) => {
        console.error("💥 Uncaught Exception:", err);
        shutdown("uncaughtException");
    });

    return server;
}

startServer().catch((err) => {
    console.error("❌ Failed to start server:", err.message);
    process.exit(1);
});
