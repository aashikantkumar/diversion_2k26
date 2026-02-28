// ============================================
// LESSONS ROUTE — Member 3's Dashboard API
// ============================================
// Owner: MEMBER 3 (Data Plumber)
// Endpoints: GET /api/lessons, GET /api/lessons/:id
// Purpose: List saved lessons and retrieve full lesson data

const express = require("express");
const router = express.Router();
const { getAllLessons, getLessonById } = require("../services/supabaseClient");

/**
 * GET /api/lessons
 * Returns all lessons (titles + IDs for the dashboard list)
 */
router.get("/", async (req, res) => {
    try {
        const lessons = await getAllLessons();
        res.json({
            lessons,
            totalLessons: lessons.length,
        });
    } catch (err) {
        console.error("Lessons fetch error:", err.message);
        res.status(500).json({ error: "Failed to fetch lessons" });
    }
});

/**
 * GET /api/lessons/:id
 * Returns a single lesson with full transformed data
 */
router.get("/:id", async (req, res) => {
    try {
        const lesson = await getLessonById(req.params.id);

        if (!lesson) {
            return res.status(404).json({
                error: "Lesson not found",
                hint: `No lesson with id "${req.params.id}" exists`,
            });
        }

        res.json(lesson);
    } catch (err) {
        console.error("Lesson fetch error:", err.message);
        res.status(500).json({ error: "Failed to fetch lesson" });
    }
});

module.exports = router;
