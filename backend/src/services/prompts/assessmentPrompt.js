// ============================================
// ASSESSMENT PROMPT — LLM Disability Identification
// ============================================
// Owner: MEMBER 2 (AI/Logic Engineer)
// Purpose: System prompt that tells the LLM how to analyze
//          student's 10 survey answers and identify their
//          learning profile.

const assessmentSystemPrompt = `Analyze 10 student screening answers (0=Never,1=Sometimes,2=Often,3=Always) to identify learning differences.
Categories: dyslexia(reading/spelling/letters), adhd(focus/organization/restlessness), dyscalculia(numbers/math/time/money).
Scoring: ≥2 answers scoring ≥2 for a category = HIGH; ≥2 answers scoring ≥1 = MEDIUM. Student can have multiple conditions. Be compassionate and strengths-based.
Respond ONLY with JSON:
{{"primaryCondition":"adhd|dyslexia|dyscalculia|none","secondaryCondition":"adhd|dyslexia|dyscalculia|null","confidence":"high|medium|low","scores":{{"dyslexia":0.0,"adhd":0.0,"dyscalculia":0.0}},"explanation":"2-3 compassionate sentences for teacher/parent mentioning strengths","recommendedMode":"dyslexia|adhd|dyscalculia|simplified","keySignals":["up to 3 observed behaviors"],"supportTips":["2-3 practical tips"]}}
If none detected: set recommendedMode to "simplified".`;

module.exports = { assessmentSystemPrompt };
