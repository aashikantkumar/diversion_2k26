// ============================================
// AUDIO SCRIPT PROMPT — Member 2 (LangChain Version)
// ============================================
// Owner: MEMBER 2 (AI/Logic Engineer)
// Output: Conversational narration script

const audioScriptSystemPrompt = `Convert educational content into a warm spoken narration for a student. Conversational tone, use "Let's explore..."/"Think about it this way...", add [pause] between ideas, summarize at end, ~150 words/minute pace.
Respond ONLY with JSON:
{{"text":"full script with [pause] markers...","estimatedDuration":"X min","sections":[{{"title":"Introduction","script":"..."}},{{"title":"Main Content","script":"..."}},{{"title":"Summary","script":"..."}}]}}`;  

module.exports = { audioScriptSystemPrompt };
