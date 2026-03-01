// ============================================
// TTS ROUTE — /api/tts
// ============================================
// Converts text to speech via ElevenLabs.
//
// POST /api/tts
//   Body: { text: string, mode?: string }
//   Returns: audio/mpeg binary stream
//
// POST /api/tts/word
//   Body: { word: string }
//   Returns: audio/mpeg — pronunciation of the word

const express = require("express");
const router  = express.Router();
const { requireAuth } = require("../middleware/auth");
const { synthesize, pronounceWord } = require("../services/elevenlabsClient");
const config = require("../config");

function checkConfigured(res) {
    if (!config.ELEVENLABS_API_KEY) {
        res.status(503).json({
            error: "ElevenLabs not configured",
            hint: "Set ELEVENLABS_API_KEY in .env",
        });
        return false;
    }
    return true;
}

// ─── POST /api/tts ────────────────────────────────────────────
// Full lesson narration (audio mode) or AI tutor read-aloud
router.post("/", requireAuth, async (req, res) => {
    if (!checkConfigured(res)) return;

    const { text, mode } = req.body;
    if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "text (string) is required" });
    }
    if (text.trim().length < 2) {
        return res.status(400).json({ error: "text is too short" });
    }

    try {
        const audioBuffer = await synthesize(text, mode || "default");
        res.set("Content-Type", "audio/mpeg");
        res.set("Content-Disposition", "inline; filename=\"narration.mp3\"");
        res.set("Cache-Control", "private, max-age=3600");
        res.send(audioBuffer);
    } catch (err) {
        console.error("TTS /api/tts error:", err.message);
        if (err.response?.status === 401) {
            return res.status(401).json({ error: "Invalid ElevenLabs API key" });
        }
        if (err.response?.status === 429) {
            return res.status(429).json({ error: "ElevenLabs rate limit hit. Try again in a moment." });
        }
        res.status(500).json({ error: "Speech synthesis failed: " + err.message });
    }
});

// ─── POST /api/tts/word ───────────────────────────────────────
// Single-word pronunciation (dyslexia mode word chips)
router.post("/word", requireAuth, async (req, res) => {
    if (!checkConfigured(res)) return;

    const { word } = req.body;
    if (!word || typeof word !== "string") {
        return res.status(400).json({ error: "word (string) is required" });
    }
    if (word.length > 60) {
        return res.status(400).json({ error: "word too long (max 60 chars)" });
    }

    try {
        const audioBuffer = await pronounceWord(word.trim());
        res.set("Content-Type", "audio/mpeg");
        res.set("Content-Disposition", "inline; filename=\"word.mp3\"");
        // Cache word pronunciations for 24h — they never change
        res.set("Cache-Control", "public, max-age=86400");
        res.send(audioBuffer);
    } catch (err) {
        console.error("TTS /api/tts/word error:", err.message);
        res.status(500).json({ error: "Pronunciation failed: " + err.message });
    }
});

module.exports = router;
