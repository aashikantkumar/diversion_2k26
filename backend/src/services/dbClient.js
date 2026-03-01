// ============================================
// DATABASE CLIENT — PostgreSQL via pg
// ============================================
// Purpose: Connect to PostgreSQL for lesson storage, student management, and assessments
// Auth: Auth0 handles all authentication — this file is purely for app data

const { Pool } = require("pg");
const config = require("../config");

// Initialize connection pool
const pool = new Pool({
    connectionString: config.DATABASE_URL || "postgresql://neuroadapt_user:neuroadapt123@localhost:5432/neuroadapt",
    // SSL required for DigitalOcean / Neon / Railway managed postgres
    ssl: config.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

pool.on("connect", () => console.log("🐘 PostgreSQL connected"));
pool.on("error", (err) => console.error("🐘 PostgreSQL pool error:", err.message));

/**
 * Save a transformed lesson to the database
 * @param {object} lessonData - { id, title, rawText, subject, transformedJSON }
 * @returns {object|null} - Saved lesson or null on error
 */
async function saveLesson(lessonData) {
    try {
        const { rows } = await pool.query(
            `INSERT INTO lessons (id, title, raw_text, subject, transformed)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [
                lessonData.id,
                lessonData.title,
                lessonData.rawText,
                lessonData.subject || null,
                JSON.stringify(lessonData.transformedJSON),
            ]
        );
        console.log(`   💾 Lesson saved to PostgreSQL: ${rows[0].id}`);
        return rows[0];
    } catch (error) {
        console.error("   ❌ PostgreSQL save error:", error.message);
        return null;
    }
}

/**
 * Get all lessons (titles + IDs only for the dashboard list)
 * @returns {object[]} - Array of { id, title, subject, created_at }
 */
async function getAllLessons() {
    try {
        const { rows } = await pool.query(
            `SELECT id, title, subject, created_at FROM lessons ORDER BY created_at DESC`
        );
        return rows;
    } catch (error) {
        console.error("PostgreSQL fetch error:", error.message);
        return [];
    }
}

/**
 * Get a single lesson by ID (full data including transformed JSON)
 * @param {string} lessonId - The lesson UUID
 * @returns {object|null} - Full lesson data or null
 */
async function getLessonById(lessonId) {
    try {
        const { rows } = await pool.query(
            `SELECT * FROM lessons WHERE id = $1`,
            [lessonId]
        );
        return rows[0] || null;
    } catch (error) {
        console.error("PostgreSQL fetch error:", error.message);
        return null;
    }
}

// ============================================
// STUDENT FUNCTIONS
// ============================================

/**
 * Create a new student
 */
async function createStudent({ name, age, grade, email }) {
    try {
        const { rows } = await pool.query(
            `INSERT INTO students (name, age, grade, email)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [name, age || null, grade || null, email || null]
        );
        return rows[0];
    } catch (error) {
        console.error("   ❌ Student create error:", error.message);
        throw error;
    }
}

/**
 * Get all students
 */
async function getAllStudents() {
    try {
        const { rows } = await pool.query(
            `SELECT id, name, age, grade, email, learning_mode, assessed_at, created_at
             FROM students ORDER BY created_at DESC`
        );
        return rows;
    } catch (error) {
        console.error("Students fetch error:", error.message);
        return [];
    }
}

/**
 * Get a single student by ID (including assessment results)
 */
async function getStudentById(studentId) {
    try {
        const { rows } = await pool.query(
            `SELECT * FROM students WHERE id = $1`,
            [studentId]
        );
        return rows[0] || null;
    } catch (error) {
        console.error("Student fetch error:", error.message);
        return null;
    }
}

/**
 * Update a student
 */
async function updateStudent(studentId, updates) {
    // Only allow safe fields
    const allowed = ["name", "age", "grade", "email", "learning_mode"];
    const fields = [];
    const values = [];
    let paramIdx = 1;

    for (const key of allowed) {
        if (updates[key] !== undefined) {
            fields.push(`${key} = $${paramIdx}`);
            values.push(updates[key]);
            paramIdx++;
        }
    }

    if (fields.length === 0) return null;

    values.push(studentId);

    try {
        const { rows } = await pool.query(
            `UPDATE students SET ${fields.join(", ")} WHERE id = $${paramIdx} RETURNING *`,
            values
        );
        return rows[0] || null;
    } catch (error) {
        console.error("Student update error:", error.message);
        return null;
    }
}

/**
 * Delete a student
 */
async function deleteStudent(studentId) {
    try {
        const { rowCount } = await pool.query(
            `DELETE FROM students WHERE id = $1`,
            [studentId]
        );
        return rowCount > 0;
    } catch (error) {
        console.error("Student delete error:", error.message);
        return false;
    }
}

/**
 * Save assessment results to a student profile
 */
async function saveAssessment(studentId, assessmentResult) {
    try {
        const learningMode = assessmentResult.recommendedMode || assessmentResult.primaryCondition;
        const { rows } = await pool.query(
            `UPDATE students
             SET learning_mode = $1, assessment_result = $2, assessed_at = NOW()
             WHERE id = $3
             RETURNING *`,
            [learningMode, JSON.stringify(assessmentResult), studentId]
        );
        if (rows[0]) {
            console.log(`   📊 Assessment saved for student ${studentId}: ${rows[0].learning_mode}`);
        }
        return rows[0] || null;
    } catch (error) {
        console.error("   ❌ Assessment save error:", error.message);
        return null;
    }
}

/**
 * Get all lessons assigned to a student (with lesson details)
 */
async function getStudentLessons(studentId) {
    try {
        const { rows } = await pool.query(
            `SELECT sl.*, l.title, l.subject, l.raw_text, l.transformed, l.created_at AS lesson_created_at
             FROM student_lessons sl
             JOIN lessons l ON sl.lesson_id = l.id
             WHERE sl.student_id = $1
             ORDER BY sl.assigned_at DESC`,
            [studentId]
        );
        return rows;
    } catch (error) {
        console.error("Student lessons fetch error:", error.message);
        return [];
    }
}

/**
 * Assign a lesson to a student
 */
async function saveLessonAssignment(studentId, lessonId, learningMode) {
    try {
        const { rows } = await pool.query(
            `INSERT INTO student_lessons (student_id, lesson_id, learning_mode)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [studentId, lessonId, learningMode]
        );
        console.log(`   📚 Lesson ${lessonId} assigned to student ${studentId} (mode: ${learningMode})`);
        return rows[0];
    } catch (error) {
        console.error("   ❌ Lesson assignment error:", error.message);
        return null;
    }
}

// ============================================
// GENERATED IMAGE FUNCTIONS
// ============================================

/**
 * Save a generated image record (Cloudinary URL) to the database
 */
async function saveGeneratedImage({ topic, mode, specificConcept, cloudinaryUrl, cloudinaryPublicId, prompt, model, width, height, sizeBytes, generationTimeMs, studentId, lessonId }) {
    try {
        const { rows } = await pool.query(
            `INSERT INTO generated_images (topic, mode, specific_concept, cloudinary_url, cloudinary_public_id, prompt, model, width, height, size_bytes, generation_time_ms, student_id, lesson_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
             RETURNING *`,
            [topic, mode, specificConcept || null, cloudinaryUrl, cloudinaryPublicId, prompt || null, model || null, width || null, height || null, sizeBytes || null, generationTimeMs || null, studentId || null, lessonId || null]
        );
        console.log(`   💾 Image saved to DB: id=${rows[0].id}, mode=${mode}`);
        return rows[0];
    } catch (error) {
        console.error("   ❌ Image save error:", error.message);
        return null;
    }
}

/**
 * Get all generated images, optionally filtered by topic/mode/student
 */
async function getGeneratedImages({ topic, mode, studentId, lessonId, limit, exactTopic } = {}) {
    try {
        let query = `SELECT * FROM generated_images WHERE 1=1`;
        const params = [];
        let idx = 1;

        if (exactTopic) { query += ` AND LOWER(topic) = LOWER($${idx})`; params.push(exactTopic); idx++; }
        else if (topic) { query += ` AND topic ILIKE $${idx}`; params.push(`%${topic}%`); idx++; }
        if (mode) { query += ` AND mode = $${idx}`; params.push(mode); idx++; }
        if (studentId) { query += ` AND student_id = $${idx}`; params.push(studentId); idx++; }
        if (lessonId) { query += ` AND lesson_id = $${idx}`; params.push(lessonId); idx++; }

        query += ` ORDER BY created_at DESC`;
        if (limit) { query += ` LIMIT $${idx}`; params.push(limit); }

        const { rows } = await pool.query(query, params);
        return rows;
    } catch (error) {
        console.error("Image fetch error:", error.message);
        return [];
    }
}

/**
 * Get a single generated image by ID
 */
async function getGeneratedImageById(imageId) {
    try {
        const { rows } = await pool.query(`SELECT * FROM generated_images WHERE id = $1`, [imageId]);
        return rows[0] || null;
    } catch (error) {
        console.error("Image fetch error:", error.message);
        return null;
    }
}

/**
 * Delete a generated image record from DB
 */
async function deleteGeneratedImage(imageId) {
    try {
        const { rows } = await pool.query(`DELETE FROM generated_images WHERE id = $1 RETURNING cloudinary_public_id`, [imageId]);
        return rows[0] || null;
    } catch (error) {
        console.error("Image delete error:", error.message);
        return null;
    }
}

// ── Video DB helpers (mirrors image helpers) ──────────────────────────────

/**
 * Save a generated video record to DB.
 * Table: generated_videos (created by migration SQL)
 */
async function saveGeneratedVideo({
    topic, mode, specificConcept,
    cloudinaryUrl, cloudinaryPublicId,
    prompt, model,
    durationSeconds, width, height,
    sizeBytes, generationTimeMs,
    studentId, lessonId,
}) {
    try {
        const { rows } = await pool.query(
            `INSERT INTO generated_videos
                (topic, mode, specific_concept, cloudinary_url, cloudinary_public_id,
                 prompt, model, duration_seconds, width, height,
                 size_bytes, generation_time_ms, student_id, lesson_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
             RETURNING *`,
            [
                topic, mode, specificConcept || null,
                cloudinaryUrl, cloudinaryPublicId || null,
                prompt || null, model || null,
                durationSeconds || null, width || null, height || null,
                sizeBytes || null, generationTimeMs || null,
                studentId || null, lessonId || null,
            ]
        );
        return rows[0];
    } catch (error) {
        console.error("Video save error:", error.message);
        throw error;
    }
}

/**
 * Fetch generated videos, optionally filtered by studentId / lessonId / mode.
 */
async function getGeneratedVideos({ studentId, lessonId, mode, limit = 20, offset = 0 } = {}) {
    try {
        const conditions = [];
        const values = [];
        let idx = 1;

        if (studentId) { conditions.push(`student_id = $${idx++}`); values.push(studentId); }
        if (lessonId)  { conditions.push(`lesson_id = $${idx++}`);  values.push(lessonId); }
        if (mode)      { conditions.push(`mode = $${idx++}`);       values.push(mode); }

        const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
        values.push(limit, offset);

        const { rows } = await pool.query(
            `SELECT * FROM generated_videos ${where}
             ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
            values
        );
        return rows;
    } catch (error) {
        console.error("Videos fetch error:", error.message);
        return [];
    }
}

/**
 * Get a single generated video by ID.
 */
async function getGeneratedVideoById(videoId) {
    try {
        const { rows } = await pool.query(`SELECT * FROM generated_videos WHERE id = $1`, [videoId]);
        return rows[0] || null;
    } catch (error) {
        console.error("Video fetch error:", error.message);
        return null;
    }
}

/**
 * Delete a generated video record from DB, returning its Cloudinary public_id.
 */
async function deleteGeneratedVideo(videoId) {
    try {
        const { rows } = await pool.query(
            `DELETE FROM generated_videos WHERE id = $1 RETURNING cloudinary_public_id`,
            [videoId]
        );
        return rows[0] || null;
    } catch (error) {
        console.error("Video delete error:", error.message);
        return null;
    }
}

module.exports = {
    saveLesson, getAllLessons, getLessonById,
    createStudent, getAllStudents, getStudentById, updateStudent, deleteStudent,
    saveAssessment, getStudentLessons, saveLessonAssignment,
    saveGeneratedImage, getGeneratedImages, getGeneratedImageById, deleteGeneratedImage,
    saveGeneratedVideo, getGeneratedVideos, getGeneratedVideoById, deleteGeneratedVideo,
};
