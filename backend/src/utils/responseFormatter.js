// ============================================
// RESPONSE FORMATTER — Member 2's Utility
// ============================================
// Owner: MEMBER 2 (AI/Logic Engineer)
// Purpose: Ensure all AI responses match the API contract format

/**
 * Validate and format the dyslexia response
 * Ensures it has the required fields, fills in defaults if missing
 */
function formatDyslexiaResponse(parsed) {
    return {
        text: parsed.text || "",
        formatting: {
            font: "OpenDyslexic",
            lineHeight: parsed.formatting?.lineHeight || 2.0,
            bgColor: parsed.formatting?.bgColor || "#fdf6e3",
        },
        difficultWords: Array.isArray(parsed.difficultWords)
            ? parsed.difficultWords.map((w) => ({
                word: w.word || "",
                phonetic: w.phonetic || "",
                simplified: w.simplified || "",
            }))
            : [],
        encouragement: {
            sectionComplete: parsed.encouragement?.sectionComplete || "Great job! 🎉 You finished this section!",
            halfwayPoint: parsed.encouragement?.halfwayPoint || "You're halfway through! Keep going! 💪",
            allDone: parsed.encouragement?.allDone || "Amazing work! 🌟 You completed the entire lesson!",
        },
    };
}

/**
 * Validate and format the ADHD response
 */
function formatADHDResponse(parsed) {
    return {
        chunks: Array.isArray(parsed.chunks)
            ? parsed.chunks.map((c, i) => ({
                id: c.id || i + 1,
                text: c.text || "",
                interactionPrompt: c.interactionPrompt || null,
            }))
            : [],
    };
}

/**
 * Validate and format the dyscalculia response
 */
function formatDyscalculiaResponse(parsed) {
    return {
        sections: Array.isArray(parsed.sections)
            ? parsed.sections.map((s) => ({
                concept: s.concept || "",
                visualType: s.visualType || "step_by_step",
                explanation: s.explanation || "",
                stepByStep: Array.isArray(s.stepByStep) ? s.stepByStep : [],
                realWorldAnalogy: s.realWorldAnalogy || null,
            }))
            : [],
        summary: parsed.summary || "",
    };
}

/**
 * Validate and format the simplified response
 */
function formatSimplifiedResponse(parsed) {
    return {
        text: parsed.text || "",
        readingLevel: parsed.readingLevel || "Grade 3",
        keyTerms: Array.isArray(parsed.keyTerms) ? parsed.keyTerms : [],
    };
}

/**
 * Validate and format the audio script response
 */
function formatAudioScriptResponse(parsed) {
    return {
        text: parsed.text || "",
        estimatedDuration: parsed.estimatedDuration || "2 min",
        sections: Array.isArray(parsed.sections) ? parsed.sections : [],
    };
}

module.exports = {
    formatDyslexiaResponse,
    formatADHDResponse,
    formatDyscalculiaResponse,
    formatSimplifiedResponse,
    formatAudioScriptResponse,
};
