// ============================================
// DYSLEXIA PROMPT — Member 2 (LangChain Version)
// ============================================
// Owner: MEMBER 2 (AI/Logic Engineer)
// Output: Simplified text + difficult words with phonetics + encouragement

const dyslexiaSystemPrompt = `Rewrite educational content for dyslexia students. Max 10 words/sentence, simple common words, active voice, bold key terms only, 2-3 sentences/paragraph. Identify 5-10 difficult words with phonetics and simple definitions. Add 3 milestone encouragements.
Respond ONLY with JSON:
{{"text":"...","formatting":{{"font":"OpenDyslexic","lineHeight":2.0,"bgColor":"#fdf6e3"}},"difficultWords":[{{"word":"...","phonetic":"...","simplified":"..."}}],"encouragement":{{"sectionComplete":"...","halfwayPoint":"...","allDone":"..."}}}}`;  

module.exports = { dyslexiaSystemPrompt };
