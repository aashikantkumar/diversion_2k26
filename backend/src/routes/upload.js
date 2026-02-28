// ============================================
// UPLOAD ROUTE — Member 3 (LangChain Version)
// ============================================
// Owner: MEMBER 3 (Data Plumber)
// Endpoint: POST /api/upload
// Purpose: Accept PDF upload → extract text → call LangChain chains → save to DB → return

const express = require("express");
const router = express.Router();
const upload = require("../middleware/multerConfig");
const { extractTextFromPDF } = require("../services/pdfExtractor");
const { saveLesson, saveLessonAssignment, getStudentById } = require("../services/supabaseClient");

// Import Member 2's LangChain services
const { runParallelChains } = require("../services/groqClient");
const { chunkText } = require("../services/chunker");
const { indexLesson } = require("../services/vectorStore");
const { dyslexiaSystemPrompt } = require("../services/prompts/dyslexia");
const { adhdSystemPrompt } = require("../services/prompts/adhd");
const { dyscalculiaSystemPrompt } = require("../services/prompts/dyscalculia");
const { simplifiedSystemPrompt } = require("../services/prompts/simplified");
const { audioScriptSystemPrompt } = require("../services/prompts/audioScript");

// Default fallback values
const FALLBACKS = {
    dyslexia: { text: "", formatting: { font: "OpenDyslexic", lineHeight: 2.0, bgColor: "#fdf6e3" }, difficultWords: [], encouragement: {} },
    adhd: { chunks: [] },
    dyscalculia: { sections: [], summary: "" },
    simplified: { text: "", readingLevel: "Grade 3", keyTerms: [] },
    audioScript: { text: "", estimatedDuration: "2 min", sections: [] },
};

router.post("/", upload.single("pdf"), async (req, res) => {
    const startTime = Date.now();

    try {
        // 1. Validate file
        if (!req.file) {
            return res.status(400).json({
                error: "No PDF file uploaded",
                hint: "Send a multipart/form-data request with a 'pdf' field",
            });
        }

        console.log(`\n📄 Upload received: ${req.file.originalname} (${(req.file.size / 1024).toFixed(1)} KB)`);

        // Check if teacher is assigning to a specific student
        const studentId = req.body.studentId || null;
        let student = null;
        if (studentId) {
            student = await getStudentById(studentId);
            if (!student) {
                return res.status(404).json({ error: `Student not found: ${studentId}` });
            }
            console.log(`   👤 Assigning to student: ${student.name} (mode: ${student.learning_mode || 'not assessed'})`);
        }

        // 2. Extract text from PDF
        const pdfData = await extractTextFromPDF(req.file.buffer);
        console.log(`   📝 Extracted ${pdfData.text.length} chars from ${pdfData.numPages} page(s)`);

        if (!pdfData.text || pdfData.text.trim().length < 10) {
            return res.status(400).json({
                error: "PDF appears to be empty or contains only images",
                hint: "Upload a PDF with selectable text content",
            });
        }

        // 3. Determine title and subject
        const title = req.body.title || pdfData.info.title || req.file.originalname.replace(".pdf", "");
        const subject = req.body.subject || pdfData.info.subject || "general";

        // 4. Chunk for transformation (large chunks for transform)
        console.log("   🧠 Starting LangChain transformation...");
        const sections = chunkText(pdfData.text, 3000);

        // 5. RAG: Index smaller chunks for chatbot semantic search
        const ragChunks = chunkText(pdfData.text, 500);
        const lessonId = `lesson_${Date.now()}`;
        indexLesson(lessonId, ragChunks).catch(err =>
            console.error("   ⚠️ RAG indexing failed (non-critical):", err.message)
        );

        const tasks = [
            { name: "dyslexia", prompt: dyslexiaSystemPrompt },
            { name: "adhd", prompt: adhdSystemPrompt },
            { name: "dyscalculia", prompt: dyscalculiaSystemPrompt },
            { name: "simplified", prompt: simplifiedSystemPrompt },
            { name: "audioScript", prompt: audioScriptSystemPrompt },
        ];

        const results = await runParallelChains(tasks, sections);

        const processingTime = Date.now() - startTime;

        // 6. Build response
        const response = {
            id: lessonId,
            title,
            original: pdfData.text,
            studentId: studentId || null,
            studentName: student?.name || null,
            learningMode: student?.learning_mode || null,
            dyslexia: { ...FALLBACKS.dyslexia, ...results.dyslexia },
            adhd: { ...FALLBACKS.adhd, ...results.adhd },
            dyscalculia: { ...FALLBACKS.dyscalculia, ...results.dyscalculia },
            simplified: { ...FALLBACKS.simplified, ...results.simplified },
            audioScript: { ...FALLBACKS.audioScript, ...results.audioScript },
            signLanguage: {
                available: title.toLowerCase().includes("solar"),
                videoUrl: "/assets/sign-language/solar-system.mp4",
                summary: "Pre-recorded sign language summary",
            },
            metadata: {
                processingTimeMs: processingTime,
                modelPool: ["llama-3.3-70b-versatile", "llama-4-scout-17b-16e-instruct", "qwen3-32b"],
                architecture: "multi-model-round-robin (Groq)",
                framework: "LangChain",
                ragEnabled: true,
                ragChunks: ragChunks.length,
                pdfPages: pdfData.numPages,
                originalFileName: req.file.originalname,
                textLength: pdfData.text.length,
            },
        };

        // 6. Save to Supabase (non-blocking)
        saveLesson({
            id: lessonId,
            title,
            rawText: pdfData.text,
            subject,
            transformedJSON: response,
        }).catch((err) => console.error("   ⚠️ Background save failed:", err.message));

        // 7. If teacher assigned to a student, create the assignment
        if (studentId) {
            saveLessonAssignment(studentId, lessonId, student.learning_mode || "simplified")
                .catch((err) => console.error("   ⚠️ Lesson assignment failed:", err.message));
        }

        console.log(`   ✅ Upload complete in ${processingTime}ms`);
        res.json(response);
    } catch (err) {
        const processingTime = Date.now() - startTime;
        console.error(`   ❌ Upload failed after ${processingTime}ms:`, err.message);
        res.status(500).json({
            error: "Upload and transformation failed",
            details: err.message,
            processingTimeMs: processingTime,
        });
    }
});

module.exports = router;
