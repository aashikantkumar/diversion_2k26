// ============================================
// CHAT CLIENT — HuggingFace Models for Chatbots
// ============================================
// Owner: MEMBER 2 (AI/Logic Engineer)
// Purpose: Each chatbot mode uses a DIFFERENT HuggingFace model
//          selected for its specific strength.
//
// ARCHITECTURE:
//   Dyscalculia → DeepSeek (best at math reasoning)
//   Dyslexia    → Qwen 2.5 (best instruction following)
//   ADHD        → Mistral  (fastest response time)
//
// FALLBACK: If HuggingFace fails, falls back to Gemini.

const { HuggingFaceInference } = require("@langchain/community/llms/hf");
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const { ChatPromptTemplate } = require("@langchain/core/prompts");
const { JsonOutputParser } = require("@langchain/core/output_parsers");
const config = require("../config");

// ─────────────────────────────────────────────
// HuggingFace model instances (one per chatbot mode)
// ─────────────────────────────────────────────
const HF_KEY = config.HUGGINGFACE_API_KEY;

const hfModels = HF_KEY ? {
    adhd: new HuggingFaceInference({
        model: "mistralai/Mistral-7B-Instruct-v0.3",
        apiKey: HF_KEY,
        temperature: 0.8,
        maxTokens: 500,
    }),
    dyslexia: new HuggingFaceInference({
        model: "Qwen/Qwen2.5-7B-Instruct",
        apiKey: HF_KEY,
        temperature: 0.5,
        maxTokens: 500,
    }),
    dyscalculia: new HuggingFaceInference({
        model: "deepseek-ai/DeepSeek-R1-Distill-Qwen-7B",
        apiKey: HF_KEY,
        temperature: 0.6,
        maxTokens: 500,
    }),
} : null;

// Gemini fallback model (used if HuggingFace not configured or fails)
const geminiFallback = new ChatGoogleGenerativeAI({
    modelName: "gemini-2.0-flash-lite",
    apiKey: config.GEMINI_API_KEY,
    temperature: 0.7,
    maxOutputTokens: 1024,
});

const jsonParser = new JsonOutputParser();

/**
 * Get the appropriate chat model for a mode.
 * Uses HuggingFace if available, otherwise Gemini fallback.
 */
function getChatModel(mode) {
    if (hfModels && hfModels[mode]) {
        return { model: hfModels[mode], provider: "HuggingFace" };
    }
    return { model: geminiFallback, provider: "Gemini" };
}

/**
 * Run a chatbot conversation turn.
 *
 * @param {string} systemPrompt - Mode-specific personality prompt
 * @param {string} context - RAG-retrieved context from the lesson
 * @param {string} question - Student's question
 * @param {string} mode - "adhd" | "dyslexia" | "dyscalculia"
 * @returns {object} Parsed JSON response from the chatbot
 */
async function runChatChain(systemPrompt, context, question, mode) {
    const { model, provider } = getChatModel(mode);

    const fullPrompt = `${systemPrompt}

LESSON CONTEXT (answer ONLY from this):
${context}

STUDENT QUESTION: ${question}`;

    try {
        if (provider === "HuggingFace") {
            // HuggingFace returns raw text — parse JSON manually
            const rawResponse = await model.invoke(fullPrompt);
            try {
                // Try to extract JSON from response
                const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
                if (jsonMatch) return JSON.parse(jsonMatch[0]);
                return { reply: rawResponse, source: "HuggingFace" };
            } catch {
                return { reply: rawResponse, source: "HuggingFace" };
            }
        } else {
            // Gemini — use LangChain's ChatPromptTemplate + JsonOutputParser
            const prompt = ChatPromptTemplate.fromMessages([
                ["system", systemPrompt],
                ["human", `LESSON CONTEXT:\n{context}\n\nSTUDENT QUESTION: {question}`],
            ]);
            const chain = prompt.pipe(model).pipe(jsonParser);
            const result = await chain.invoke({ context, question });
            return { ...result, source: "Gemini" };
        }
    } catch (error) {
        console.error(`   ⚠️ ${provider} chat failed: ${error.message}`);

        // If HuggingFace failed, try Gemini as fallback
        if (provider === "HuggingFace") {
            console.log(`   🔄 Falling back to Gemini for ${mode} chat...`);
            try {
                const prompt = ChatPromptTemplate.fromMessages([
                    ["system", systemPrompt],
                    ["human", `LESSON CONTEXT:\n{context}\n\nSTUDENT QUESTION: {question}`],
                ]);
                const chain = prompt.pipe(geminiFallback).pipe(jsonParser);
                const result = await chain.invoke({ context, question });
                return { ...result, source: "Gemini-Fallback" };
            } catch (fallbackError) {
                throw new Error(`Both HuggingFace and Gemini failed: ${fallbackError.message}`);
            }
        }
        throw error;
    }
}

module.exports = { runChatChain, getChatModel };
