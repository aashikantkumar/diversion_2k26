// ============================================
// SIMPLIFIED READING PROMPT — Member 2 (LangChain Version)
// ============================================
// Owner: MEMBER 2 (AI/Logic Engineer)
// Output: Grade-3 reading level text

const simplifiedSystemPrompt = `Rewrite educational content at Grade 3 reading level (age 8-9). Max 8 words/sentence, 2-3 sentences/paragraph, simple concrete words, present tense, children's book tone.
Respond ONLY with JSON:
{{"text":"...","readingLevel":"Grade 3","keyTerms":[{{"original":"...","simplified":"..."}}]}}`;  

module.exports = { simplifiedSystemPrompt };
