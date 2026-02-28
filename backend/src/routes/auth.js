// ============================================
// AUTH ROUTES — /api/auth/*
// ============================================

const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth");
const { requireTeacher, requireAnyStudent } = require("../middleware/checkRole");
const auth0Client = require("../services/auth0Client");
const userService = require("../services/userService");

// ─── POST /api/auth/sync ──────────────────────────────────────
// Called by frontend after every login to sync Auth0 user → our DB
// Body: { role: "teacher" | "individual" }  (only on first signup)
router.post("/sync", requireAuth, async (req, res) => {
    try {
        const auth0Id = req.auth.payload.sub;
        const email   = req.auth.payload[`${process.env.AUTH0_DOMAIN}/email`]
                     || req.body.email;
        const name    = req.body.name || req.auth.payload.name || null;
        const role    = req.body.role || "individual";

        // Upsert in our DB
        const user = await userService.syncUser({ auth0Id, email, name, role, signupType: role === "teacher" ? "org" : "individual" });

        // Assign Auth0 role (idempotent — fine to call every login)
        await auth0Client.assignRole(auth0Id, role);

        res.json({ success: true, user });
    } catch (error) {
        console.error("POST /auth/sync error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// ─── GET /api/auth/me ─────────────────────────────────────────
// Returns full profile: role, org, neurodiversity
router.get("/me", requireAuth, async (req, res) => {
    try {
        const auth0Id = req.auth.payload.sub;
        const user = await userService.getUserByAuth0Id(auth0Id);

        if (!user) {
            return res.status(404).json({ error: "User not found. Call /api/auth/sync first." });
        }

        res.json({ user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ─── POST /api/auth/onboarding/individual ────────────────────
// Student knows their neurodiversity — saves it directly
// Body: { neurodiversity: ["dyslexia", "adhd"] }
router.post("/onboarding/individual", requireAuth, async (req, res) => {
    try {
        const auth0Id = req.auth.payload.sub;
        const { neurodiversity } = req.body;

        if (!neurodiversity || !Array.isArray(neurodiversity)) {
            return res.status(400).json({ error: "neurodiversity must be an array e.g. ['dyslexia', 'adhd']" });
        }

        const validTypes = ["dyslexia", "adhd", "dyscalculia", "none"];
        const invalid = neurodiversity.filter((n) => !validTypes.includes(n));
        if (invalid.length > 0) {
            return res.status(400).json({ error: `Invalid types: ${invalid.join(", ")}. Valid: ${validTypes.join(", ")}` });
        }

        // Save to our DB
        const user = await userService.updateNeurodiversity(auth0Id, neurodiversity);

        // Also save to Auth0 user_metadata
        await auth0Client.updateUserMetadata(auth0Id, { neurodiversity });

        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ─── POST /api/auth/onboarding/assessment ────────────────────
// Student doesn't know their neurodiversity — submit assessment answers
// Body: { answers: { q1: "a", q2: "c", ... } }
router.post("/onboarding/assessment", requireAuth, async (req, res) => {
    try {
        const auth0Id = req.auth.payload.sub;
        const { answers } = req.body;

        if (!answers || typeof answers !== "object") {
            return res.status(400).json({ error: "answers object is required" });
        }

        // Simple scoring: forward to assess service for full analysis
        // The /api/assess endpoint already has the full 10-question screener
        // Here we just save the result
        const neurodiversity = inferNeurodiversity(answers);
        const user = await userService.updateNeurodiversity(auth0Id, neurodiversity);
        await auth0Client.updateUserMetadata(auth0Id, { neurodiversity });

        res.json({ success: true, detectedTypes: neurodiversity, user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ─── POST /api/auth/org/create ────────────────────────────────
// Teacher creates a new classroom/organization
// Body: { orgName: "Grade 5 Math" }
router.post("/org/create", requireAuth, requireTeacher, async (req, res) => {
    try {
        const auth0Id = req.auth.payload.sub;
        const { orgName } = req.body;

        if (!orgName) return res.status(400).json({ error: "orgName is required" });

        const org = await userService.createOrg(auth0Id, orgName);
        res.json({ success: true, org });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ─── GET /api/auth/org/my ─────────────────────────────────────
// Teacher gets their organizations and student counts
router.get("/org/my", requireAuth, requireTeacher, async (req, res) => {
    try {
        const auth0Id = req.auth.payload.sub;
        const orgs = await userService.getTeacherOrgs(auth0Id);
        res.json({ orgs });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ─── GET /api/auth/org/:orgId/students ───────────────────────
// Teacher gets all students in their org
router.get("/org/:orgId/students", requireAuth, requireTeacher, async (req, res) => {
    try {
        const students = await userService.getOrgStudents(req.params.orgId);
        res.json({ students });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ─── POST /api/auth/org/invite ────────────────────────────────
// Teacher invites a student by email
// Body: { orgId: "xxx", email: "student@email.com" }
router.post("/org/invite", requireAuth, requireTeacher, async (req, res) => {
    try {
        const { orgId, email } = req.body;
        if (!orgId || !email) return res.status(400).json({ error: "orgId and email are required" });

        const invite = await userService.createInvite(orgId, email);
        if (!invite) {
            return res.status(409).json({ error: "Invite already exists for this email in this org" });
        }

        const inviteUrl = `${req.protocol}://${req.get("host")}/api/auth/org/join/${invite.token}`;

        res.json({
            success: true,
            inviteUrl,
            token: invite.token,
            expiresAt: invite.expires_at,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ─── GET /api/auth/org/join/:token ───────────────────────────
// Student clicks invite link — joins org
router.get("/org/join/:token", requireAuth, async (req, res) => {
    try {
        const auth0Id = req.auth.payload.sub;
        const result = await userService.resolveInvite(req.params.token, auth0Id);

        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }

        // Upgrade role from individual → org_student
        await auth0Client.assignRole(auth0Id, "org_student");
        await userService.updateUserRole(auth0Id, "org_student");

        res.json({ success: true, message: "Joined organization successfully", orgId: result.orgId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ─── Helpers ──────────────────────────────────────────────────

/**
 * Very simple rule-based inference from assessment answers
 * The full ML-based assessment is at /api/assess
 */
function inferNeurodiversity(answers) {
    const detected = [];

    // Count answer patterns (simplified — real logic is in assessmentPrompt.js)
    const values = Object.values(answers);
    const aCount = values.filter((v) => v === "a").length;
    const bCount = values.filter((v) => v === "b").length;
    const cCount = values.filter((v) => v === "c").length;

    if (aCount >= 4) detected.push("dyslexia");
    if (bCount >= 4) detected.push("adhd");
    if (cCount >= 4) detected.push("dyscalculia");
    if (detected.length === 0) detected.push("none");

    return detected;
}

module.exports = router;
