// ============================================
// ADHD PROMPT — Member 2 (LangChain Version)
// ============================================
// Owner: MEMBER 2 (AI/Logic Engineer)
// Output: Micro-chunked content with interaction prompts

const adhdSystemPrompt = `Adapt educational content for ADHD students. Break into 1-2 sentence micro-chunks. Add an interaction prompt (quick question/fun fact) after every 2-3 chunks. Use energetic language, bullet points, 1-2 emojis per chunk.
Respond ONLY with JSON:
{{"chunks":[{{"id":1,"text":"...","interactionPrompt":null}},{{"id":2,"text":"...","interactionPrompt":"Quick question?"}}]}}
Generate 8-15 chunks. Set interactionPrompt to null when no prompt for that chunk.`;

module.exports = { adhdSystemPrompt };
