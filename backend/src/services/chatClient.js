// ============================================
// CHAT CLIENT — HuggingFace (primary) + Groq (fallback)
// ============================================
// Owner: MEMBER 2 (AI/Logic Engineer)
// Purpose: Each chatbot mode uses HuggingFace DeepSeek-R1 (chat completion)
//          with Groq as automatic fallback on any error.
//
// NOTE: DeepSeek-R1 on HuggingFace uses the chat/conversational endpoint
//       via @huggingface/inference InferenceClient.chatCompletion()

const { InferenceClient } = require("@huggingface/inference");
const { ChatGroq } = require("@langchain/groq");
const { ChatPromptTemplate } = require("@langchain/core/prompts");
const { JsonOutputParser } = require("@langchain/core/output_parsers");
const config = require("../config");

const HF_KEY = config.HUGGINGFACE_API_KEY;
// Llama-3.2-3B-Instruct: free tier, fast, good at following instructions
const HF_MODEL = "meta-llama/Llama-3.2-3B-Instruct";

// HuggingFace InferenceClient (uses chat completion — correct for DeepSeek-R1)
const hfClient = HF_KEY ? new InferenceClient(HF_KEY) : null;

// Groq fallback
const groqFallback = new ChatGroq({
    model: "llama-3.3-70b-versatile",
    apiKey: config.GROQ_API_KEY,
    temperature: 0.5,
    maxTokens: 1024,
});

const jsonParser = new JsonOutputParser();

/**
 * Invoke HuggingFace DeepSeek-R1 via chat completion endpoint.
 */
async function invokeHuggingFace(systemPrompt, context, question) {
    const userMessage = `LESSON CONTEXT:\n${context}\n\nSTUDENT QUESTION: ${question}`;
    const resp = await hfClient.chatCompletion({
        model: HF_MODEL,
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
        ],
        max_tokens: 1024,
        temperature: 0.7,
    });
    const text = resp.choices?.[0]?.message?.content || "";
    // Normalize double-braces {{ }} → { } (LLM sometimes over-escapes template syntax)
    const normalized = text.replace(/\{\{/g, "{").replace(/\}\}/g, "}");
    const jsonMatch = normalized.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        try { return { ...JSON.parse(jsonMatch[0]), source: "HuggingFace" }; } catch {}
    }
    return { reply: normalized.trim(), source: "HuggingFace" };
}

/**
 * Invoke Groq with JSON parsing + raw text fallback.
 */
async function invokeGroq(systemPrompt, context, question, sourceName) {
    const prompt = ChatPromptTemplate.fromMessages([
        ["system", systemPrompt],
        ["human", `LESSON CONTEXT:\n{context}\n\nSTUDENT QUESTION: {question}`],
    ]);
    try {
        const chain = prompt.pipe(groqFallback).pipe(jsonParser);
        const result = await chain.invoke({ context, question });
        return { ...result, source: sourceName };
    } catch {
        const chain = prompt.pipe(groqFallback);
        const rawResult = await chain.invoke({ context, question });
        const text = typeof rawResult === "string" ? rawResult : rawResult?.content || String(rawResult);
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try { return { ...JSON.parse(jsonMatch[0]), source: sourceName }; } catch {}
        }
        return { reply: text, source: sourceName };
    }
}

/**
 * Run a chatbot conversation turn.
 * Tries HuggingFace first; falls back to Groq on any error.
 *
 * @param {string} systemPrompt - Mode-specific personality prompt
 * @param {string} context - RAG-retrieved lesson context
 * @param {string} question - Student's question
 * @param {string} mode - "adhd" | "dyslexia" | "dyscalculia"
 * @returns {object} Parsed response with source field
 */
async function runChatChain(systemPrompt, context, question, mode) {
    if (hfClient) {
        try {
            console.log(`   🤗 Using HuggingFace (${HF_MODEL})...`);
            const result = await invokeHuggingFace(systemPrompt, context, question);
            console.log(`   ✅ HuggingFace responded`);
            return result;
        } catch (hfError) {
            console.warn(`   ⚠️ HuggingFace failed: ${hfError.message}`);
            console.log(`   🔄 Falling back to Groq...`);
        }
    } else {
        console.log(`   ℹ️ HuggingFace not configured — using Groq`);
    }

    return await invokeGroq(systemPrompt, context, question, hfClient ? "Groq-Fallback" : "Groq");
}

/**
 * Returns which provider will be used for a given mode.
 */
function getChatModel(mode) {
    if (hfClient) return { provider: "HuggingFace", model: HF_MODEL };
    return { provider: "Groq", model: "llama-3.3-70b-versatile" };
}

module.exports = { runChatChain, getChatModel };
