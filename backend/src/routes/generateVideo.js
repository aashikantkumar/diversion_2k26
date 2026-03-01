// ============================================================
// ROUTE: /api/generate-video
// Text-to-video generation via HuggingFace Wan2.2-T2V
// Mirrors generateImage.js structure exactly
// ============================================================

const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth");
const { generateVideo, MODE_VIDEO_STYLES, VIDEO_MODEL } = require("../services/videoGenerator");
const { uploadGeneratedVideo, deleteVideo, isConfigured } = require("../services/cloudinaryClient");
const {
    saveGeneratedVideo,
    getGeneratedVideos,
    getGeneratedVideoById,
    deleteGeneratedVideo,
} = require("../services/dbClient");

// ── POST /api/generate-video ─────────────────────────────
// Body: { topic, mode, specificConcept?, lessonId? }
router.post("/", requireAuth, async (req, res) => {
    const { topic, mode, specificConcept, lessonId } = req.body;

    // ── Validation ──────────────────────────────────────
    if (!topic || typeof topic !== "string" || !topic.trim()) {
        return res.status(400).json({ error: "topic is required" });
    }

    const validModes = Object.keys(MODE_VIDEO_STYLES);
    const safeMode = validModes.includes(mode) ? mode : "simplified";

    try {
        // ── 1. Generate video buffer from HuggingFace ────
        console.log(`[generateVideo] Generating: topic="${topic.trim()}", mode=${safeMode}`);
        const { videoBuffer, prompt, generationTimeMs } = await generateVideo(
            topic.trim(),
            safeMode,
            { specificConcept: specificConcept?.trim() }
        );

        // ── 2. Upload to Cloudinary ──────────────────────
        if (!isConfigured()) {
            return res.status(503).json({ error: "Storage not configured (Cloudinary missing)" });
        }

        const uploaded = await uploadGeneratedVideo(videoBuffer, topic.trim(), safeMode);

        // ── 3. Save record to DB ─────────────────────────
        const record = await saveGeneratedVideo({
            topic:               topic.trim(),
            mode:                safeMode,
            specificConcept:     specificConcept?.trim() || null,
            cloudinaryUrl:       uploaded.url,
            cloudinaryPublicId:  uploaded.publicId,
            prompt,
            model:               VIDEO_MODEL,
            durationSeconds:     uploaded.duration || null,
            width:               uploaded.width    || 480,
            height:              uploaded.height   || 272,
            sizeBytes:           uploaded.bytes    || videoBuffer.length,
            generationTimeMs,
            studentId:           req.user?.id || null,
            lessonId:            lessonId     || null,
        });

        // ── 4. Return JSON response ───────────────────────
        return res.status(201).json({
            id:    record?.id,
            topic: topic.trim(),
            mode:  safeMode,
            modeDescription: MODE_VIDEO_STYLES[safeMode]?.style,
            video: {
                url:             uploaded.url,
                duration:        uploaded.duration || null,
                width:           uploaded.width    || 480,
                height:          uploaded.height   || 272,
                sizeKB:          Math.round((uploaded.bytes || videoBuffer.length) / 1024),
            },
            metadata: {
                prompt,
                model:           VIDEO_MODEL,
                generationTimeMs,
            },
        });
    } catch (err) {
        console.error("[generateVideo] Error:", err.message);

        // Model still loading — let frontend know to retry
        if (err.status === 503 || err.retryAfter) {
            return res.status(503).json({
                error:      "Model is loading, please retry shortly",
                retryAfter: err.retryAfter || 60,
            });
        }

        return res.status(500).json({ error: err.message || "Video generation failed" });
    }
});

// ── POST /api/generate-video/all ────────────────────────
// Generate for all 4 modes in parallel
// Body: { topic, specificConcept? }
router.post("/all", requireAuth, async (req, res) => {
    const { topic, specificConcept, lessonId } = req.body;

    if (!topic || !topic.trim()) {
        return res.status(400).json({ error: "topic is required" });
    }

    const modes = Object.keys(MODE_VIDEO_STYLES);

    // Fire all 4 in parallel, collect individual results/errors
    const results = await Promise.allSettled(
        modes.map(async (mode) => {
            const { videoBuffer, prompt, generationTimeMs } = await generateVideo(
                topic.trim(), mode, { specificConcept: specificConcept?.trim() }
            );
            const uploaded = await uploadGeneratedVideo(videoBuffer, topic.trim(), mode);
            const record = await saveGeneratedVideo({
                topic:              topic.trim(),
                mode,
                specificConcept:    specificConcept?.trim() || null,
                cloudinaryUrl:      uploaded.url,
                cloudinaryPublicId: uploaded.publicId,
                prompt,
                model:              VIDEO_MODEL,
                durationSeconds:    uploaded.duration || null,
                width:              uploaded.width    || 480,
                height:             uploaded.height   || 272,
                sizeBytes:          uploaded.bytes    || videoBuffer.length,
                generationTimeMs,
                studentId:          req.user?.id || null,
                lessonId:           lessonId     || null,
            });
            return { mode, record, uploaded, prompt, generationTimeMs, videoBuffer };
        })
    );

    const modes_out = {};
    for (let i = 0; i < modes.length; i++) {
        const m = modes[i];
        const r = results[i];
        if (r.status === "fulfilled") {
            const { record, uploaded, prompt: p, generationTimeMs: t, videoBuffer: vb } = r.value;
            modes_out[m] = {
                id:              record?.id,
                url:             uploaded.url,
                duration:        uploaded.duration || null,
                width:           uploaded.width    || 480,
                height:          uploaded.height   || 272,
                sizeKB:          Math.round((uploaded.bytes || vb.length) / 1024),
                modeDescription: MODE_VIDEO_STYLES[m]?.style,
                prompt:          p,
                generationTimeMs: t,
            };
        } else {
            modes_out[m] = { error: r.reason?.message || "Failed" };
        }
    }

    const anySuccess = Object.values(modes_out).some((v) => !v.error);
    if (!anySuccess) {
        return res.status(500).json({ error: "All mode generations failed", modes: modes_out });
    }

    return res.json({ topic: topic.trim(), modes: modes_out });
});

// ── GET /api/generate-video/videos ───────────────────────
// Query: ?lessonId=&mode=&limit=&offset=
router.get("/videos", requireAuth, async (req, res) => {
    const { lessonId, mode, limit = "20", offset = "0" } = req.query;
    try {
        const videos = await getGeneratedVideos({
            studentId: req.user?.id,
            lessonId:  lessonId || undefined,
            mode:      mode     || undefined,
            limit:     parseInt(limit,  10) || 20,
            offset:    parseInt(offset, 10) || 0,
        });
        return res.json({ videos, count: videos.length });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// ── GET /api/generate-video/videos/:id ───────────────────
router.get("/videos/:id", requireAuth, async (req, res) => {
    const video = await getGeneratedVideoById(req.params.id);
    if (!video) return res.status(404).json({ error: "Video not found" });
    return res.json(video);
});

// ── DELETE /api/generate-video/videos/:id ────────────────
router.delete("/videos/:id", requireAuth, async (req, res) => {
    const record = await deleteGeneratedVideo(req.params.id);
    if (!record) return res.status(404).json({ error: "Video not found" });

    if (record.cloudinary_public_id) {
        await deleteVideo(record.cloudinary_public_id);
    }
    return res.json({ success: true, deleted: req.params.id });
});

module.exports = router;
