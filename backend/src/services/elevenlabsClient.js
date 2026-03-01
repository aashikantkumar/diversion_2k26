// ============================================
// ELEVENLABS CLIENT — AI Voice Synthesis
// ============================================
// Converts lesson text / difficult words / chat responses
// into ultra-realistic speech using ElevenLabs API.
//
// Voice mapping per neuro mode:
//   dyslexia    → Rachel  (calm, clear, easy to follow)
//   adhd        → Domi    (energetic, keeps attention)
//   dyscalculia → Antoni  (methodical, clear pacing)
//   simplified  → Bella   (warm, friendly)
//   audio/word  → Rachel  (default narrator)

const axios = require("axios");
const config = require("../config");

// ─── Voice IDs (ElevenLabs free-tier premade voices) ─────────
const MODE_VOICES = {
    dyslexia:    "21m00Tcm4TlvDq8ikWAM", // Rachel — calm & clear
    adhd:        "AZnzlk1XvdvUeBnXmlld", // Domi   — energetic
    dyscalculia: "ErXwobaYiN019PkySvjV", // Antoni — methodical
    simplified:  "EXAVITQu4vr4xnSDxMaL", // Bella  — warm
    audio:       "21m00Tcm4TlvDq8ikWAM", // Rachel — narrator
    default:     "21m00Tcm4TlvDq8ikWAM",
};

// ─── Voice settings per mode ──────────────────────────────────
const MODE_SETTINGS = {
    dyslexia:    { stability: 0.75, similarity_boost: 0.75, style: 0.0, use_speaker_boost: true },
    adhd:        { stability: 0.40, similarity_boost: 0.85, style: 0.3, use_speaker_boost: true },
    dyscalculia: { stability: 0.80, similarity_boost: 0.70, style: 0.0, use_speaker_boost: false },
    simplified:  { stability: 0.65, similarity_boost: 0.80, style: 0.1, use_speaker_boost: true },
    audio:       { stability: 0.70, similarity_boost: 0.75, style: 0.0, use_speaker_boost: true },
    default:     { stability: 0.70, similarity_boost: 0.75, style: 0.0, use_speaker_boost: true },
};

/**
 * Sanitize text for speech:
 * - Replace [pause] markers with a short pause cue
 * - Strip markdown syntax
 * - Truncate to 4800 chars (ElevenLabs per-request limit)
 */
function cleanText(raw) {
    return raw
        .replace(/\[pause\]/gi, "... ")
        .replace(/#{1,6}\s/g, "")           // headings
        .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1") // bold/italic
        .replace(/`{1,3}[^`]*`{1,3}/g, "")   // code
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links
        .replace(/\s+/g, " ")
        .trim()
        .substring(0, 4800);
}

/**
 * Synthesize text to speech.
 * @param {string} text  — Plain or markdown text (auto-cleaned)
 * @param {string} mode  — Neuro mode key (dyslexia|adhd|dyscalculia|simplified|audio)
 * @returns {Buffer}     — mp3 audio buffer
 */
async function synthesize(text, mode = "default") {
    if (!config.ELEVENLABS_API_KEY) {
        throw new Error("ELEVENLABS_API_KEY not configured");
    }

    const voiceId   = MODE_VOICES[mode]   || MODE_VOICES.default;
    const settings  = MODE_SETTINGS[mode] || MODE_SETTINGS.default;
    const cleaned   = cleanText(text);

    if (!cleaned) throw new Error("No speakable text after cleaning");

    console.log(`🎙️  ElevenLabs TTS: ${cleaned.length} chars → voice=${voiceId} (mode=${mode})`);

    const response = await axios.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
            text: cleaned,
            model_id: "eleven_monolingual_v1",
            voice_settings: settings,
        },
        {
            headers: {
                "xi-api-key": config.ELEVENLABS_API_KEY,
                "Content-Type": "application/json",
                Accept: "audio/mpeg",
            },
            responseType: "arraybuffer",
            timeout: 45_000,
        }
    );

    return Buffer.from(response.data);
}

/**
 * Pronounce a single word — short, crisp, isolated.
 * Used by the dyslexia word-chip pronunciation feature.
 */
async function pronounceWord(word) {
    return synthesize(`"${word}". ... "${word}".`, "dyslexia");
}

module.exports = { synthesize, pronounceWord, MODE_VOICES };
