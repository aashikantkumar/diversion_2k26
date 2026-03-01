// ============================================
// GENERATE-IMAGE ROUTE — AI Image Generation + Cloudinary Storage
// ============================================
// Purpose: Teacher provides a topic + learning mode → HuggingFace generates image
//          → Upload to Cloudinary → Save URL in PostgreSQL → Return CDN URL
//
// Flow: Generate → Upload to Cloudinary → Save URL in DB → Return URL to user
//
// Endpoints:
//   POST /api/generate-image          → Single mode image (generate + store + return URL)
//   POST /api/generate-image/all      → All 4 modes at once
//   GET  /api/generate-image/styles   → List available mode styles
//   GET  /api/generate-image/images   → List stored images (filter by topic/mode/student)
//   GET  /api/generate-image/images/:id → Get a single stored image
//   DELETE /api/generate-image/images/:id → Delete from Cloudinary + DB

const express = require("express");
const router = express.Router();
const { generateImage, MODE_STYLES, IMAGE_MODEL } = require("../services/imageGenerator");
const { uploadGeneratedImage, deleteImage, isConfigured } = require("../services/cloudinaryClient");
const { saveGeneratedImage, getGeneratedImages, getGeneratedImageById, deleteGeneratedImage } = require("../services/dbClient");

// ─────────────────────────────────────────────
// POST /api/generate-image
// Generate → Cloudinary → DB → Return URL
// Body: { topic, mode, specificConcept?, width?, height?, studentId?, lessonId? }
// ─────────────────────────────────────────────
router.post("/", async (req, res) => {
    const startTime = Date.now();

    try {
        const { topic, mode, specificConcept, width, height, studentId, lessonId } = req.body;

        if (!topic || !mode) {
            return res.status(400).json({
                error: "Missing required fields: topic, mode",
                hint: 'Send { "topic": "Solar System", "mode": "adhd" }',
                availableModes: Object.keys(MODE_STYLES),
            });
        }

        if (!isConfigured()) {
            return res.status(503).json({
                error: "Cloudinary not configured",
                hint: "Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env",
            });
        }

        console.log(`\n🎨 Image generation request: "${topic}" → ${mode}`);

        // Check cache: if same topic+mode already exists, return existing
        const existing = await getGeneratedImages({ exactTopic: topic, mode, limit: 1 });
        if (existing.length > 0) {
            const cached = existing[0];
            console.log(`   ♻️  Cache hit! Returning existing image (id=${cached.id})`);
            return res.json({
                success: true,
                id: cached.id,
                topic: cached.topic,
                mode: cached.mode,
                cached: true,
                image: {
                    url: cached.cloudinary_url,
                    publicId: cached.cloudinary_public_id,
                    width: cached.width,
                    height: cached.height,
                    sizeKB: cached.size_bytes ? (cached.size_bytes / 1024).toFixed(1) : null,
                },
                prompt: cached.prompt,
                model: cached.model,
                metadata: {
                    totalTimeMs: Date.now() - startTime,
                    storage: "cloudinary",
                    note: "Returned from cache — no new generation",
                },
            });
        }

        // Step 1: Generate image via HuggingFace
        const result = await generateImage(topic, mode, {
            specificConcept,
            width: width || 768,
            height: height || 512,
        });

        // Step 2: Upload to Cloudinary
        console.log(`   ☁️  Uploading to Cloudinary...`);
        const cloudResult = await uploadGeneratedImage(result.image, topic, result.mode);

        // Step 3: Save URL in PostgreSQL
        const dbRecord = await saveGeneratedImage({
            topic,
            mode: result.mode,
            specificConcept,
            cloudinaryUrl: cloudResult.secureUrl,
            cloudinaryPublicId: cloudResult.publicId,
            prompt: result.prompt,
            model: result.model,
            width: cloudResult.width,
            height: cloudResult.height,
            sizeBytes: cloudResult.bytes,
            generationTimeMs: result.generationTimeMs,
            studentId: studentId || null,
            lessonId: lessonId || null,
        });

        const totalTime = Date.now() - startTime;

        // Step 4: Return URL to user
        res.json({
            success: true,
            id: dbRecord?.id,
            topic,
            mode: result.mode,
            modeDescription: result.modeDescription,
            image: {
                url: cloudResult.secureUrl,
                publicId: cloudResult.publicId,
                width: cloudResult.width,
                height: cloudResult.height,
                format: cloudResult.format,
                sizeKB: (cloudResult.bytes / 1024).toFixed(1),
            },
            prompt: result.prompt,
            model: result.model,
            metadata: {
                generationTimeMs: result.generationTimeMs,
                uploadTimeMs: totalTime - result.generationTimeMs,
                totalTimeMs: totalTime,
                storage: "cloudinary",
            },
        });
    } catch (err) {
        console.error(`   ❌ Image generation failed: ${err.message}`);
        res.status(500).json({
            error: "Image generation failed",
            details: err.message,
            processingTimeMs: Date.now() - startTime,
        });
    }
});

// ─────────────────────────────────────────────
// POST /api/generate-image/all
// Generate ALL 4 modes → Upload each to Cloudinary → Save all in DB
// Body: { topic, specificConcept?, studentId?, lessonId? }
// ─────────────────────────────────────────────
router.post("/all", async (req, res) => {
    const startTime = Date.now();

    try {
        const { topic, specificConcept, studentId, lessonId } = req.body;

        if (!topic) {
            return res.status(400).json({
                error: "Missing required field: topic",
                hint: 'Send { "topic": "Photosynthesis" }',
            });
        }

        if (!isConfigured()) {
            return res.status(503).json({
                error: "Cloudinary not configured",
                hint: "Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env",
            });
        }

        console.log(`\n🎨 Generating ALL mode images for: "${topic}"`);

        const modes = ["adhd", "dyslexia", "dyscalculia", "simplified"];
        const results = {};

        const promises = modes.map(async (mode) => {
            try {
                // Check cache first
                const existing = await getGeneratedImages({ exactTopic: topic, mode, limit: 1 });
                if (existing.length > 0) {
                    const cached = existing[0];
                    console.log(`   ♻️  Cache hit for ${mode} (id=${cached.id})`);
                    results[mode] = {
                        id: cached.id,
                        url: cached.cloudinary_url,
                        publicId: cached.cloudinary_public_id,
                        width: cached.width,
                        height: cached.height,
                        sizeKB: cached.size_bytes ? (cached.size_bytes / 1024).toFixed(1) : null,
                        cached: true,
                    };
                    return;
                }

                // Generate
                const genResult = await generateImage(topic, mode, { specificConcept });

                // Upload to Cloudinary
                const cloudResult = await uploadGeneratedImage(genResult.image, topic, mode);

                // Save to DB
                const dbRecord = await saveGeneratedImage({
                    topic,
                    mode,
                    specificConcept,
                    cloudinaryUrl: cloudResult.secureUrl,
                    cloudinaryPublicId: cloudResult.publicId,
                    prompt: genResult.prompt,
                    model: genResult.model,
                    width: cloudResult.width,
                    height: cloudResult.height,
                    sizeBytes: cloudResult.bytes,
                    generationTimeMs: genResult.generationTimeMs,
                    studentId: studentId || null,
                    lessonId: lessonId || null,
                });

                results[mode] = {
                    id: dbRecord?.id,
                    url: cloudResult.secureUrl,
                    publicId: cloudResult.publicId,
                    width: cloudResult.width,
                    height: cloudResult.height,
                    sizeKB: (cloudResult.bytes / 1024).toFixed(1),
                    modeDescription: genResult.modeDescription,
                    generationTimeMs: genResult.generationTimeMs,
                };
            } catch (err) {
                console.error(`   ❌ ${mode} image failed: ${err.message}`);
                results[mode] = { error: err.message };
            }
        });

        await Promise.all(promises);

        res.json({
            success: true,
            topic,
            modes: results,
            model: IMAGE_MODEL,
            metadata: {
                totalTimeMs: Date.now() - startTime,
                modesGenerated: Object.keys(results).filter(m => !results[m].error).length,
                modesFailed: Object.keys(results).filter(m => results[m].error).length,
                storage: "cloudinary",
            },
        });
    } catch (err) {
        console.error(`   ❌ Batch image generation failed: ${err.message}`);
        res.status(500).json({
            error: "Batch image generation failed",
            details: err.message,
            processingTimeMs: Date.now() - startTime,
        });
    }
});

// ─────────────────────────────────────────────
// GET /api/generate-image/images
// List stored images. Query params: ?topic=&mode=&studentId=&limit=
// ─────────────────────────────────────────────
router.get("/images", async (req, res) => {
    try {
        const { topic, mode, studentId, lessonId, limit } = req.query;
        const images = await getGeneratedImages({
            topic,
            mode,
            studentId,
            lessonId,
            limit: limit ? parseInt(limit) : undefined,
        });

        res.json({
            count: images.length,
            images: images.map(img => ({
                id: img.id,
                topic: img.topic,
                mode: img.mode,
                specificConcept: img.specific_concept,
                url: img.cloudinary_url,
                width: img.width,
                height: img.height,
                sizeKB: img.size_bytes ? (img.size_bytes / 1024).toFixed(1) : null,
                studentId: img.student_id,
                lessonId: img.lesson_id,
                createdAt: img.created_at,
            })),
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch images", details: err.message });
    }
});

// ─────────────────────────────────────────────
// GET /api/generate-image/images/:id
// Get a single stored image by DB id
// ─────────────────────────────────────────────
router.get("/images/:id", async (req, res) => {
    try {
        const image = await getGeneratedImageById(req.params.id);
        if (!image) {
            return res.status(404).json({ error: "Image not found" });
        }
        res.json({
            id: image.id,
            topic: image.topic,
            mode: image.mode,
            specificConcept: image.specific_concept,
            url: image.cloudinary_url,
            publicId: image.cloudinary_public_id,
            prompt: image.prompt,
            model: image.model,
            width: image.width,
            height: image.height,
            sizeKB: image.size_bytes ? (image.size_bytes / 1024).toFixed(1) : null,
            generationTimeMs: image.generation_time_ms,
            studentId: image.student_id,
            lessonId: image.lesson_id,
            createdAt: image.created_at,
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch image", details: err.message });
    }
});

// ─────────────────────────────────────────────
// DELETE /api/generate-image/images/:id
// Delete from Cloudinary + PostgreSQL
// ─────────────────────────────────────────────
router.delete("/images/:id", async (req, res) => {
    try {
        const deleted = await deleteGeneratedImage(req.params.id);
        if (!deleted) {
            return res.status(404).json({ error: "Image not found" });
        }

        // Also delete from Cloudinary
        await deleteImage(deleted.cloudinary_public_id);

        res.json({ success: true, message: "Image deleted from Cloudinary and database" });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete image", details: err.message });
    }
});

// ─────────────────────────────────────────────
// GET /api/generate-image/styles
// List available learning mode styles
// ─────────────────────────────────────────────
router.get("/styles", (req, res) => {
    const styles = {};
    for (const [mode, info] of Object.entries(MODE_STYLES)) {
        styles[mode] = {
            description: info.description,
            styleKeywords: info.style.split(", ").slice(0, 5),
        };
    }
    res.json({
        model: IMAGE_MODEL,
        availableModes: Object.keys(MODE_STYLES),
        cloudinaryConfigured: isConfigured(),
        styles,
    });
});

module.exports = router;
