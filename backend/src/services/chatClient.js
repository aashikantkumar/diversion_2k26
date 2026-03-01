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
 * Bracket-depth JSON extractor — finds the exact first balanced {} or [].
 * Avoids greedy-regex bugs that capture trailing text after the JSON.
 */
function extractChatJSON(raw) {
    if (typeof raw !== "string") return raw;
    let text = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
    text = text.replace(/\{\{/g, "{").replace(/\}\}/g, "}");
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/m, "").trim();

    const startIdx = text.indexOf("{");
    if (startIdx === -1) return null;

    let depth = 0, inStr = false, esc = false, end = -1;
    for (let i = startIdx; i < text.length; i++) {
        const ch = text[i];
        if (esc)            { esc = false; continue; }
        if (ch === "\\" && inStr) { esc = true; continue; }
        if (ch === '"')     { inStr = !inStr; continue; }
        if (inStr)          continue;
        if (ch === "{")     depth++;
        if (ch === "}")     { if (--depth === 0) { end = i; break; } }
    }
    if (end === -1) return null;
    const jsonStr = text.slice(startIdx, end + 1);
    try { return JSON.parse(jsonStr); } catch {
        const cleaned = jsonStr
            .replace(/\r\n/g, " ")
            .replace(/[\r\n]/g, " ")
            .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, " ");
        try { return JSON.parse(cleaned); } catch { return null; }
    }
}

/**
 * Invoke HuggingFace via chat completion endpoint.
 */
async function invokeHuggingFace(systemPrompt, context, question) {
    const userMessage =
        `=== SOURCE MATERIAL (answer ONLY from this) ===\n${context}\n` +
        `=== END OF SOURCE MATERIAL ===\n\n` +
        `STUDENT QUESTION: ${question}\n\n` +
        `REMINDER: If the answer is not clearly stated in the SOURCE MATERIAL above, ` +
        `use the out-of-context response defined in your instructions. Do NOT invent information.`;
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
    const parsed = extractChatJSON(text);
    if (parsed) return { ...parsed, source: "HuggingFace" };
    return { reply: text.trim(), source: "HuggingFace" };
}

/**
 * Safely try to parse a string as JSON, returning null on failure.
 */
function tryParse(str) {
    if (!str || typeof str !== "string") return null;
    try { return JSON.parse(str); } catch {
        // strip BOM / zero-width chars and retry
        const cleaned = str
            .replace(/^\uFEFF/, "")
            .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, " ")
            .trim();
        try { return JSON.parse(cleaned); } catch { return null; }
    }
}

/**
 * Invoke Groq with JSON parsing + raw text fallback.
 */
async function invokeGroq(systemPrompt, context, question, sourceName) {
    const prompt = ChatPromptTemplate.fromMessages([
        ["system", systemPrompt],
        ["human",
            `=== SOURCE MATERIAL (answer ONLY from this) ===\n{context}\n` +
            `=== END OF SOURCE MATERIAL ===\n\n` +
            `STUDENT QUESTION: {question}\n\n` +
            `REMINDER: If the answer is not clearly stated in the SOURCE MATERIAL above, ` +
            `use the out-of-context response defined in your instructions. Do NOT invent information.`
        ],
    ]);
    try {
        const chain = prompt.pipe(groqFallback).pipe(jsonParser);
        const result = await chain.invoke({ context, question });
        // JsonOutputParser returns an object — but if `reply` is itself a JSON string, unwrap it
        if (result && typeof result.reply === "string" && result.reply.trim().startsWith("{")) {
            const inner = tryParse(result.reply) || extractChatJSON(result.reply);
            if (inner?.reply) return { ...result, ...inner, source: sourceName };
        }
        return { ...result, source: sourceName };
    } catch {
        const chain = prompt.pipe(groqFallback);
        const rawResult = await chain.invoke({ context, question });
        const text = typeof rawResult === "string" ? rawResult : rawResult?.content || String(rawResult);
        const parsed = extractChatJSON(text) || tryParse(text);
        if (parsed) return { ...parsed, source: sourceName };
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
