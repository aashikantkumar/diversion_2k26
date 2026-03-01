// ============================================================
// VIDEO GENERATOR — HuggingFace Text-to-Video (Wan2.2-T2V)
// Model: Wan-AI/Wan2.2-T2V-A14B-Diffusers
// Mirrors imageGenerator.js; one video per adaptive mode
// ============================================================

const { InferenceClient } = require("@huggingface/inference");
const axios = require("axios");
const config = require("../config");

const VIDEO_MODEL = "Wan-AI/Wan2.2-T2V-A14B-Diffusers";
const HF_API_BASE = "https://api-inference.huggingface.co/models";

// Initialise once; reused across requests
const hfClient = new InferenceClient(config.HUGGINGFACE_API_KEY);

// ── Per-mode visual prompting guidelines ──────────────────
const MODE_VIDEO_STYLES = {
    dyslexia: {
        style: "calm educational animation, warm soothing pastel colors, large clear text labels, gentle slow motion, no fast cuts or flickering",
        mood: "peaceful and encouraging",
    },
    adhd: {
        style: "vibrant dynamic animation, bold bright colors, engaging motion, energetic but not overwhelming, clear focus on key concept",
        mood: "exciting and motivating",
    },
    dyscalculia: {
        style: "visual math animation, counting physical objects, step-by-step motion, colour-coded groups, real-world everyday examples",
        mood: "clear and methodical",
    },
    simplified: {
        style: "simple friendly cartoon animation, minimal detail, gentle smooth motion, pleasant soft colors, easy to follow",
        mood: "warm and friendly",
    },
};

// ── Build an optimised text-to-video prompt ───────────────
function buildVideoPrompt(topic, mode, specificConcept) {
    const { style, mood } = MODE_VIDEO_STYLES[mode] || MODE_VIDEO_STYLES.simplified;
    const subject = specificConcept
        ? `${topic} — specifically ${specificConcept}`
        : topic;

    return (
        `Short educational video clip about "${subject}". ` +
        `${style}. ` +
        `Mood: ${mood}. ` +
        `Teaching children, high quality smooth animation, 5-8 seconds, ` +
        `no watermark, no text overlay, cinematic quality.`
    );
}

// ── Generate video via HuggingFace Inference API ──────────
// Returns { videoBuffer: Buffer, prompt: string, model: string, generationTimeMs: number }
async function generateVideo(topic, mode, options = {}) {
    const { specificConcept } = options;

    const prompt = buildVideoPrompt(topic, mode, specificConcept);
    const startTime = Date.now();

    // 1 — Try the typed SDK method (textToVideo) available in @huggingface/inference ≥3.x
    let videoBuffer = null;

    try {
        if (typeof hfClient.textToVideo === "function") {
            const blob = await hfClient.textToVideo({
                model: VIDEO_MODEL,
                inputs: prompt,
                parameters: {
                    num_frames: 49,          // ~4s at ~12 fps
                    num_inference_steps: 20,
                    guidance_scale: 7.5,
                    width: 480,
                    height: 272,
                },
            });
            const arrayBuf = await blob.arrayBuffer();
            videoBuffer = Buffer.from(arrayBuf);
        }
    } catch (sdkErr) {
        console.warn("[videoGenerator] SDK textToVideo failed, trying raw HTTP:", sdkErr.message);
    }

    // 2 — Fallback: raw HTTP POST to HF Inference API (returns binary mp4)
    if (!videoBuffer) {
        const response = await axios.post(
            `${HF_API_BASE}/${VIDEO_MODEL}`,
            {
                inputs: prompt,
                parameters: {
                    num_frames: 49,
                    num_inference_steps: 20,
                    guidance_scale: 7.5,
                    width: 480,
                    height: 272,
                },
            },
            {
                headers: {
                    Authorization: `Bearer ${config.HUGGINGFACE_API_KEY}`,
                    "Content-Type": "application/json",
                    Accept: "video/mp4",
                },
                responseType: "arraybuffer",
                timeout: 300_000, // 5 min — video gen is slow
                maxBodyLength: Infinity,
                maxContentLength: Infinity,
            }
        );

        // HF returns 503 with estimated_time when model is loading
        if (response.status === 503) {
            const payload = JSON.parse(response.data.toString());
            const waitSec = payload.estimated_time || 60;
            throw Object.assign(
                new Error(`Model loading — estimated ${Math.ceil(waitSec)}s wait`),
                { retryAfter: waitSec, status: 503 }
            );
        }

        videoBuffer = Buffer.from(response.data);
    }

    return {
        videoBuffer,
        prompt,
        model: VIDEO_MODEL,
        generationTimeMs: Date.now() - startTime,
    };
}

module.exports = { generateVideo, buildVideoPrompt, VIDEO_MODEL, MODE_VIDEO_STYLES };
