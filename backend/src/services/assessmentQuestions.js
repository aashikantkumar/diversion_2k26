// ============================================
// ASSESSMENT QUESTIONS — Disability Screening
// ============================================
// Owner: MEMBER 2 (AI/Logic Engineer)
// Purpose: 10 behavioral questions to identify ADHD, Dyslexia, or Dyscalculia.
//
// Each question targets ONE or MORE disability signals.
// Answer scale: 0=Never, 1=Sometimes, 2=Often, 3=Always
//
// MEDICAL DISCLAIMER: This is a SCREENING tool for educational adaptation,
// NOT a clinical diagnosis. Always consult a specialist.

const ASSESSMENT_QUESTIONS = [
    // ── DYSLEXIA SIGNALS ────────────────────────────────────────────────
    {
        id: 1,
        question: "Do you mix up letters that look similar, like 'b' and 'd', or words like 'was' and 'saw'?",
        emoji: "📖",
        targets: ["dyslexia"],
        examples: "For example: writing 'dog' instead of 'bog', reading 'on' as 'no'",
    },
    {
        id: 2,
        question: "Do you read much more slowly than others, often losing your place on a line?",
        emoji: "🐢",
        targets: ["dyslexia"],
        examples: "For example: needing to re-read the same sentence multiple times",
    },
    {
        id: 3,
        question: "Do you frequently misspell common words even after seeing them many times?",
        emoji: "✏️",
        targets: ["dyslexia"],
        examples: "For example: spelling 'because' as 'becaus' or 'friend' as 'freind'",
    },

    // ── ADHD SIGNALS ────────────────────────────────────────────────────
    {
        id: 4,
        question: "Do you find it very hard to stay focused on one task for more than 10 minutes without getting distracted?",
        emoji: "🎯",
        targets: ["adhd"],
        examples: "For example: starting homework but ending up doing something else without noticing",
    },
    {
        id: 5,
        question: "Do you often lose things like your pencil, books, or homework, or forget important tasks?",
        emoji: "🔍",
        targets: ["adhd"],
        examples: "For example: forgetting to submit homework even when you completed it",
    },
    {
        id: 6,
        question: "Do you feel restless or find it difficult to sit still for long periods during class?",
        emoji: "⚡",
        targets: ["adhd"],
        examples: "For example: tapping your feet, needing to get up, or feeling 'driven by a motor'",
    },

    // ── DYSCALCULIA SIGNALS ─────────────────────────────────────────────
    {
        id: 7,
        question: "Do you struggle to remember basic math facts like multiplication tables, even after a lot of practice?",
        emoji: "🔢",
        targets: ["dyscalculia"],
        examples: "For example: not being able to recall 7×8 or confusing + and × signs",
    },
    {
        id: 8,
        question: "Do you get confused when handling money, giving change, or understanding prices?",
        emoji: "💰",
        targets: ["dyscalculia"],
        examples: "For example: unsure if ₹50 note covers a ₹35 bill, or difficulty counting change",
    },
    {
        id: 9,
        question: "Do you find it hard to tell the time on a clock, or estimate how long a task will take?",
        emoji: "⏰",
        targets: ["dyscalculia"],
        examples: "For example: regularly underestimating or overestimating time, confusion with 'quarter past'",
    },

    // ── COMBINED SIGNAL ─────────────────────────────────────────────────
    {
        id: 10,
        question: "When given multi-step instructions (like in a recipe or a problem), do you get easily confused or lose track of the steps?",
        emoji: "📋",
        targets: ["adhd", "dyscalculia", "dyslexia"],
        examples: "For example: completing steps out of order, skipping steps, or needing many repetitions",
    },
];

// Answer scale options (used by frontend)
const ANSWER_SCALE = [
    { value: 0, label: "Never" },
    { value: 1, label: "Sometimes" },
    { value: 2, label: "Often" },
    { value: 3, label: "Always" },
];

module.exports = { ASSESSMENT_QUESTIONS, ANSWER_SCALE };
