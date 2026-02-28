// ============================================
// ASSESS ROUTE — Learning Disability Identification
// ============================================
// Owner: MEMBER 2 (AI/Logic Engineer)
//
// TWO ENDPOINTS:
//   GET  /api/assess/questions → returns the 10 questions for the frontend
//   POST /api/assess            → accepts student's answers → LLM identifies disability
//
// FLOW:
// 1. Teacher/student opens the assessment screen
// 2. Frontend fetches GET /api/assess/questions
// 3. Student answers all 10 questions on a 0-3 scale
// 4. Frontend POSTs answers to /api/assess
// 5. LLM analyzes answers → returns disability profile
// 6. Student is auto-assigned a learning mode

const express = require("express");
const router = express.Router();
const { ChatGroq } = require("@langchain/groq");
const { ChatPromptTemplate } = require("@langchain/core/prompts");
const { JsonOutputParser } = require("@langchain/core/output_parsers");
const config = require("../config");
const { ASSESSMENT_QUESTIONS, ANSWER_SCALE } = require("../services/assessmentQuestions");
const { assessmentSystemPrompt } = require("../services/prompts/assessmentPrompt");
const { saveAssessment, getStudentById } = require("../services/supabaseClient");

// Use the most reliable available model for assessment
const MODEL_PRIORITY = [
    "llama-3.3-70b-versatile", // Highest reasoning capability for clinical-style assessment
    "meta-llama/llama-4-scout-17b-16e-instruct",
    "qwen/qwen3-32b"
];

const jsonParser = new JsonOutputParser();

/**
 * GET /api/assess/questions
 * Returns all 10 questions for the frontend to display.
 * No auth needed — public endpoint.
 */
router.get("/questions", (req, res) => {
    res.json({
        questions: ASSESSMENT_QUESTIONS,
        answerScale: ANSWER_SCALE,
        totalQuestions: ASSESSMENT_QUESTIONS.length,
        instructions: "For each question, select how often this happens: Never (0), Sometimes (1), Often (2), or Always (3).",
        disclaimer: "This assessment helps us adapt your learning materials. It is not a medical diagnosis.",
    });
});

/**
 * POST /api/assess
 * Body: {
 *   answers: [
 *     { questionId: 1, value: 2 },
 *     { questionId: 2, value: 0 },
 *     ...10 answers total
 *   ],
 *   studentId: "uuid-of-student",  // Optional — links assessment to a student
 *   studentName: "Optional name",
 *   age: 10  // Optional
 * }
 */
router.post("/", async (req, res) => {
    const startTime = Date.now();
    const { answers, studentId, studentName, age } = req.body;

    // If studentId provided, verify student exists
    let student = null;
    if (studentId) {
        student = await getStudentById(studentId);
        if (!student) {
            return res.status(404).json({ error: `Student not found: ${studentId}` });
        }
    }

    // Validate
    if (!answers || !Array.isArray(answers) || answers.length !== 10) {
        return res.status(400).json({
            error: "Please provide exactly 10 answers",
            hint: "Send { answers: [{ questionId: 1, value: 0-3 }, ...] }",
            expectedQuestions: ASSESSMENT_QUESTIONS.length,
        });
    }

    // Validate each answer value is 0-3
    const invalid = answers.find(a => a.value < 0 || a.value > 3 || typeof a.value !== "number");
    if (invalid) {
        return res.status(400).json({
            error: "Each answer value must be 0 (Never), 1 (Sometimes), 2 (Often), or 3 (Always)",
        });
    }

    console.log(`\n🧪 Assessment started${studentName ? ` for: ${studentName}` : ""}${age ? ` (age ${age})` : ""}`);

    // Build the human-readable answers string for the LLM
    const answersText = answers.map(a => {
        const question = ASSESSMENT_QUESTIONS.find(q => q.id === a.questionId);
        const scaleLabel = ANSWER_SCALE.find(s => s.value === a.value)?.label || a.value;
        return `Q${a.questionId} [${question?.targets.join("/")}]: "${question?.question}"\n   Answer: ${a.value}/3 (${scaleLabel})`;
    }).join("\n\n");

    // Try each model with fallback
    for (let i = 0; i < MODEL_PRIORITY.length; i++) {
        const modelName = MODEL_PRIORITY[i];
        try {
            const model = new ChatGroq({
                model: modelName,
                apiKey: config.GROQ_API_KEY,
                temperature: 0.2, // Low temp for consistent assessments
                maxTokens: 1024,
            });

            const prompt = ChatPromptTemplate.fromMessages([
                ["system", assessmentSystemPrompt],
                [
                    "human",
                    `Please analyze the following student assessment responses:\n\n${studentName ? `Student: ${studentName}\n` : ""}${age ? `Age: ${age}\n` : ""}${"\n"}${answersText}`,
                ],
            ]);

            const chain = prompt.pipe(model).pipe(jsonParser);
            const result = await chain.invoke({});

            const processingTime = Date.now() - startTime;
            console.log(`   ✅ Assessment completed (${modelName}) in ${processingTime}ms`);
            console.log(`   📊 Result: ${result.primaryCondition} (${result.confidence} confidence)`);

            // Save assessment to student profile if studentId was provided
            if (studentId) {
                saveAssessment(studentId, result).catch(err =>
                    console.error("   ⚠️ Assessment save failed (non-critical):", err.message)
                );
            }

            return res.json({
                studentId: studentId || null,
                studentName: student?.name || studentName || "Student",
                primaryCondition: result.primaryCondition,
                secondaryCondition: result.secondaryCondition || null,
                confidence: result.confidence,
                scores: result.scores,
                explanation: result.explanation,
                recommendedMode: result.recommendedMode,
                keySignals: result.keySignals || [],
                supportTips: result.supportTips || [],
                metadata: {
                    processingTimeMs: processingTime,
                    model: modelName,
                    questionsAnswered: answers.length,
                },
            });
        } catch (error) {
            const is429 = error.message.includes("429") || error.message.includes("quota");
            if (is429 && i < MODEL_PRIORITY.length - 1) {
                console.warn(`   ⚠️ ${modelName} quota hit → trying next model...`);
                continue;
            }
            const processingTime = Date.now() - startTime;
            console.error(`   ❌ Assessment failed after ${processingTime}ms:`, error.message);
            return res.status(500).json({
                error: "Assessment analysis failed",
                details: error.message,
                processingTimeMs: processingTime,
            });
        }
    }
});

module.exports = router;
