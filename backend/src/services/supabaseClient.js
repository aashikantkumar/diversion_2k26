// ============================================
// SUPABASE CLIENT — Member 3's Service
// ============================================
// Owner: MEMBER 3 (Data Plumber)
// Purpose: Connect to Supabase for lesson storage and retrieval

const { createClient } = require("@supabase/supabase-js");
const config = require("../config");

// Initialize Supabase client
let supabase = null;

function getSupabase() {
    if (!supabase) {
        if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) {
            console.warn("⚠️  Supabase not configured — database features disabled");
            return null;
        }
        supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
    }
    return supabase;
}

/**
 * Save a transformed lesson to the database
 * @param {object} lessonData - { id, title, rawText, subject, transformedJSON }
 * @returns {object|null} - Saved lesson or null if DB is not configured
 */
async function saveLesson(lessonData) {
    const db = getSupabase();
    if (!db) {
        console.log("   📦 Supabase not configured — skipping save");
        return null;
    }

    try {
        const { data, error } = await db
            .from("lessons")
            .insert({
                id: lessonData.id,
                title: lessonData.title,
                raw_text: lessonData.rawText,
                subject: lessonData.subject || null,
                transformed: lessonData.transformedJSON,
            })
            .select()
            .single();

        if (error) throw error;
        console.log(`   💾 Lesson saved to Supabase: ${data.id}`);
        return data;
    } catch (error) {
        console.error("   ❌ Supabase save error:", error.message);
        // Don't throw — saving to DB is optional, don't block the response
        return null;
    }
}

/**
 * Get all lessons (titles + IDs only for the dashboard list)
 * @returns {object[]} - Array of { id, title, subject, created_at }
 */
async function getAllLessons() {
    const db = getSupabase();
    if (!db) return [];

    try {
        const { data, error } = await db
            .from("lessons")
            .select("id, title, subject, created_at")
            .order("created_at", { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error("Supabase fetch error:", error.message);
        return [];
    }
}

/**
 * Get a single lesson by ID (full data including transformed JSON)
 * @param {string} lessonId - The lesson UUID
 * @returns {object|null} - Full lesson data or null
 */
async function getLessonById(lessonId) {
    const db = getSupabase();
    if (!db) return null;

    try {
        const { data, error } = await db
            .from("lessons")
            .select("*")
            .eq("id", lessonId)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Supabase fetch error:", error.message);
        return null;
    }
}

module.exports = { saveLesson, getAllLessons, getLessonById };
