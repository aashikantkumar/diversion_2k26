// ============================================
// IMAGE GENERATOR — HuggingFace Text-to-Image
// ============================================
// Purpose: Generate learning-mode-specific educational images
//          using HuggingFace's free-tier image generation models.
//
// Flow: Topic + Learning Mode → Mode-specific prompt → HF text-to-image → Image buffer

const { InferenceClient } = require("@huggingface/inference");
const config = require("../config");

const HF_KEY = config.HUGGINGFACE_API_KEY;
const hfClient = HF_KEY ? new InferenceClient(HF_KEY) : null;

// Free-tier model — fast, high quality
const IMAGE_MODEL = "black-forest-labs/FLUX.1-schnell";

// ─────────────────────────────────────────────
// MODE-SPECIFIC PROMPT STYLES
// ─────────────────────────────────────────────
// Each learning disability benefits from different visual styles.

const MODE_STYLES = {
    adhd: {
        style: "bright colorful cartoon illustration, bold outlines, minimal clutter, large clear labels, engaging and fun, gamified look, numbered steps, high contrast, simple background",
        negative: "cluttered, tiny text, complex, overwhelming, dull colors, realistic photo",
        description: "High-engagement, low-distraction visuals with bold colors and clear structure",
    },
    dyslexia: {
        style: "clean simple diagram, large clear sans-serif text labels, high contrast, cream/warm background, visual word associations, pictographic, icon-based, well-spaced elements",
        negative: "cursive text, small text, serif fonts, cluttered, low contrast, busy background",
        description: "Clear, well-spaced visuals with large labels and warm backgrounds",
    },
    dyscalculia: {
        style: "step-by-step visual math explanation, concrete objects for counting, number line, hands-on manipulatives, real-world objects as math examples, clear arrows showing process, educational infographic style",
        negative: "abstract symbols only, tiny numbers, complex equations, no visual aids",
        description: "Concrete visual math representations with real-world objects",
    },
    simplified: {
        style: "simple educational illustration, friendly cartoon style, labeled diagram, easy to understand, grade school level, cheerful colors, clean layout",
        negative: "complex, technical, dark, scary, realistic, cluttered",
        description: "Simple, friendly visuals suitable for early learning levels",
    },
};

/**
 * Build an optimized image generation prompt for a given topic and learning mode.
 * @param {string} topic - The lesson topic (e.g., "Solar System", "Photosynthesis")
 * @param {string} mode - Learning mode: adhd | dyslexia | dyscalculia | simplified
 * @param {string} [specificConcept] - Optional specific concept within the topic
 * @returns {string} The crafted prompt for text-to-image
 */
function buildImagePrompt(topic, mode, specificConcept = null) {
    const modeStyle = MODE_STYLES[mode] || MODE_STYLES.simplified;
    const subject = specificConcept || topic;

    let prompt = `Educational illustration about "${subject}", ${modeStyle.style}, educational poster, no watermark, high quality`;
    if (modeStyle.negative) {
        prompt += `. Avoid: ${modeStyle.negative}`;
    }
    return prompt;
}

/**
 * Generate an educational image tailored to a specific learning disability.
 * 
 * @param {string} topic - The lesson topic
 * @param {string} mode - Learning mode (adhd, dyslexia, dyscalculia, simplified)
 * @param {object} [options] - Additional options
 * @param {string} [options.specificConcept] - Focus on a specific concept
 * @param {number} [options.width] - Image width (default: 768)
 * @param {number} [options.height] - Image height (default: 512)
 * @returns {Promise<{image: Buffer, prompt: string, mode: string, modeDescription: string}>}
 */
async function generateImage(topic, mode, options = {}) {
    if (!hfClient) {
        throw new Error("HuggingFace API key not configured. Set HUGGINGFACE_API_KEY in .env");
    }

    const normalizedMode = mode.toLowerCase().replace(/[-_\s]/g, "");
    const resolvedMode = ["adhd"].includes(normalizedMode) ? "adhd"
        : ["dyslexia", "dyslexic"].includes(normalizedMode) ? "dyslexia"
        : ["dyscalculia", "dyscalculic"].includes(normalizedMode) ? "dyscalculia"
        : "simplified";

    const prompt = buildImagePrompt(topic, resolvedMode, options.specificConcept);
    const modeInfo = MODE_STYLES[resolvedMode];

    console.log(`   🎨 Generating ${resolvedMode} image for "${topic}"`);
    console.log(`   📝 Prompt: ${prompt.substring(0, 100)}...`);

    const startTime = Date.now();

    // Call HuggingFace text-to-image with retry logic
    const MAX_RETRIES = 3;
    let imageBuffer;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const imageBlob = await hfClient.textToImage({
                model: IMAGE_MODEL,
                inputs: prompt,
                parameters: {
                    width: options.width || 768,
                    height: options.height || 512,
                },
            });

            // Convert Blob to Buffer
            const arrayBuffer = await imageBlob.arrayBuffer();
            imageBuffer = Buffer.from(arrayBuffer);
            break; // Success
        } catch (err) {
            const isRetryable = err.message.includes("429") || err.message.includes("rate") || err.message.includes("503") || err.message.includes("timeout");
            if (isRetryable && attempt < MAX_RETRIES) {
                const delay = attempt * 2000; // 2s, 4s backoff
                console.warn(`   ⚠️  HF attempt ${attempt} failed (${err.message}), retrying in ${delay}ms...`);
                await new Promise(r => setTimeout(r, delay));
            } else {
                throw err;
            }
        }
    }

    const elapsed = Date.now() - startTime;
    console.log(`   ✅ Image generated in ${elapsed}ms (${(imageBuffer.length / 1024).toFixed(1)} KB)`);

    return {
        image: imageBuffer,
        prompt,
        mode: resolvedMode,
        modeDescription: modeInfo.description,
        model: IMAGE_MODEL,
        generationTimeMs: elapsed,
        sizeBytes: imageBuffer.length,
    };
}

module.exports = {
    generateImage,
    buildImagePrompt,
    MODE_STYLES,
    IMAGE_MODEL,
};
