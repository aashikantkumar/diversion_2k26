// ============================================
// AUTH ROUTES — /api/auth/*
// ============================================
// Custom JWT auth — register, login, refresh, logout
// No Auth0 dependency

const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();
const { requireAuth } = require("../middleware/auth");
const { requireTeacher } = require("../middleware/checkRole");
const userService = require("../services/userService");
const config = require("../config");

// ─── Helpers ──────────────────────────────────────────────────

function signAccessToken(user) {
    return jwt.sign(
        { sub: user.id, email: user.email, role: user.role },
        config.JWT_SECRET,
        { expiresIn: config.JWT_ACCESS_EXPIRES }
    );
}

function safeUser(u) {
    // Never send password_hash to client
    const { password_hash, ...rest } = u;
    return rest;
}

// ─── POST /api/auth/register ──────────────────────────────────
// Body: { email, password, name, role: "teacher"|"student" }
router.post("/register", async (req, res) => {
    try {
        const { email, password, name } = req.body;
        let { role } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "email and password are required" });
        }
        if (password.length < 8) {
            return res.status(400).json({ error: "Password must be at least 8 characters" });
        }

        // Map "student" → "individual"
        if (role === "student") role = "individual";
        const validRoles = ["teacher", "individual"];
        if (!validRoles.includes(role)) role = "individual";

        // Check duplicate
        const existing = await userService.getUserByEmail(email);
        if (existing) {
            return res.status(409).json({ error: "An account with this email already exists" });
        }

        const signupType = role === "teacher" ? "org" : "individual";
        const user = await userService.createUser({ email, password, name, role, signupType });

        // Teachers are immediately onboarded; students need neuro onboarding
        if (role === "teacher") {
            const { Pool } = require("pg");
            const pool = new Pool({ connectionString: config.DATABASE_URL, ssl: config.NODE_ENV === "production" ? { rejectUnauthorized: false } : false });
            await pool.query(`UPDATE users SET onboarded = TRUE, updated_at = NOW() WHERE id = $1`, [user.id]);
            user.onboarded = true;
        }

        const accessToken = signAccessToken(user);
        const refreshToken = await userService.saveRefreshToken(user.id);

        res.status(201).json({ accessToken, refreshToken, user: safeUser(user) });
    } catch (error) {
        console.error("POST /auth/register error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// ─── POST /api/auth/login ─────────────────────────────────────
// Body: { email, password }
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: "email and password are required" });
        }

        const user = await userService.verifyPassword(email, password);
        if (!user) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const accessToken = signAccessToken(user);
        const refreshToken = await userService.saveRefreshToken(user.id);

        res.json({ accessToken, refreshToken, user: safeUser(user) });
    } catch (error) {
        console.error("POST /auth/login error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// ─── POST /api/auth/refresh ───────────────────────────────────
// Body: { refreshToken }
// Rotates refresh token on every call (one-time use)
router.post("/refresh", async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ error: "refreshToken is required" });
        }

        const user = await userService.consumeRefreshToken(refreshToken);
        if (!user) {
            return res.status(401).json({ error: "Invalid or expired refresh token" });
        }

        const newAccessToken = signAccessToken(user);
        const newRefreshToken = await userService.saveRefreshToken(user.id);

        res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken, user: safeUser(user) });
    } catch (error) {
        console.error("POST /auth/refresh error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// ─── POST /api/auth/logout ────────────────────────────────────
// Body: { refreshToken, all?: boolean }
router.post("/logout", requireAuth, async (req, res) => {
    try {
        const { refreshToken, all } = req.body;
        if (all) {
            await userService.revokeAllRefreshTokens(req.user.userId);
        } else if (refreshToken) {
            await userService.revokeRefreshToken(refreshToken);
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ─── GET /api/auth/me ─────────────────────────────────────────
router.get("/me", requireAuth, async (req, res) => {
    try {
        const user = await userService.getUserById(req.user.userId);
        if (!user) return res.status(404).json({ error: "User not found" });
        res.json({ user: safeUser(user) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ─── POST /api/auth/onboarding/role ──────────────────────────
// For users who registered without a role choice (edge case)
// Body: { role: "teacher" | "student" }
router.post("/onboarding/role", requireAuth, async (req, res) => {
    try {
        let { role } = req.body;
        if (role === "student") role = "individual";
        const validRoles = ["teacher", "individual"];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ error: `Invalid role. Must be: ${validRoles.join(", ")}` });
        }

        let user = await userService.updateUserRole(req.user.userId, role);

        if (role === "teacher") {
            const { Pool } = require("pg");
            const pool = new Pool({ connectionString: config.DATABASE_URL, ssl: config.NODE_ENV === "production" ? { rejectUnauthorized: false } : false });
            await pool.query(`UPDATE users SET onboarded = TRUE, updated_at = NOW() WHERE id = $1`, [req.user.userId]);
            user = await userService.getUserById(req.user.userId);
        }

        res.json({ success: true, user: safeUser(user) });
    } catch (error) {
        console.error("POST /auth/onboarding/role error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// ─── POST /api/auth/onboarding/individual ────────────────────
// Student knows their neurodiversity — saves it directly
// Body: { neurodiversity: ["dyslexia", "adhd"] }
router.post("/onboarding/individual", requireAuth, async (req, res) => {
    try {
        const { neurodiversity } = req.body;
        if (!neurodiversity || !Array.isArray(neurodiversity)) {
            return res.status(400).json({ error: "neurodiversity must be an array" });
        }
        const validTypes = ["dyslexia", "adhd", "dyscalculia", "none"];
        const invalid = neurodiversity.filter((n) => !validTypes.includes(n));
        if (invalid.length > 0) {
            return res.status(400).json({ error: `Invalid types: ${invalid.join(", ")}. Valid: ${validTypes.join(", ")}` });
        }
        const user = await userService.updateNeurodiversity(req.user.userId, neurodiversity);
        res.json({ success: true, user: safeUser(user) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ─── POST /api/auth/onboarding/assessment ────────────────────
// Body: { answers: { q1: "a", ... } }
router.post("/onboarding/assessment", requireAuth, async (req, res) => {
    try {
        const { answers } = req.body;
        if (!answers || typeof answers !== "object") {
            return res.status(400).json({ error: "answers object is required" });
        }
        const neurodiversity = inferNeurodiversity(answers);
        const user = await userService.updateNeurodiversity(req.user.userId, neurodiversity);
        res.json({ success: true, detectedTypes: neurodiversity, user: safeUser(user) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ─── POST /api/auth/org/create ────────────────────────────────
router.post("/org/create", requireAuth, requireTeacher, async (req, res) => {
    try {
        const { orgName } = req.body;
        if (!orgName) return res.status(400).json({ error: "orgName is required" });
        const org = await userService.createOrg(req.user.userId, orgName);
        res.json({ success: true, org });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ─── GET /api/auth/org/my ─────────────────────────────────────
router.get("/org/my", requireAuth, requireTeacher, async (req, res) => {
    try {
        const orgs = await userService.getTeacherOrgs(req.user.userId);
        res.json({ orgs });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ─── GET /api/auth/org/:orgId/students ───────────────────────
router.get("/org/:orgId/students", requireAuth, requireTeacher, async (req, res) => {
    try {
        const { Pool } = require("pg");
        const pool = new Pool({ connectionString: config.DATABASE_URL, ssl: config.NODE_ENV === "production" ? { rejectUnauthorized: false } : false });
        const [students, orgRow] = await Promise.all([
            userService.getOrgStudents(req.params.orgId),
            pool.query(`SELECT id, name FROM organizations WHERE id = $1`, [req.params.orgId]),
        ]);
        const org = orgRow.rows[0] ?? null;
        res.json({ students, organization: org ? { id: org.id, name: org.name } : null });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ─── POST /api/auth/org/student ──────────────────────────────
router.post("/org/student", requireAuth, requireTeacher, async (req, res) => {
    try {
        const { orgId, name, neurodiversity } = req.body;
        if (!orgId || !name) return res.status(400).json({ error: "orgId and name are required" });
        const student = await userService.createManagedStudent(orgId, name, neurodiversity || ["none"]);
        res.json({ success: true, student });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ─── PUT /api/auth/org/student/:id ───────────────────────────
router.put("/org/student/:id", requireAuth, requireTeacher, async (req, res) => {
    try {
        const { neurodiversity } = req.body;
        if (!neurodiversity || !Array.isArray(neurodiversity)) {
            return res.status(400).json({ error: "neurodiversity array is required" });
        }
        const student = await userService.updateManagedStudent(req.params.id, neurodiversity);
        if (!student) return res.status(404).json({ error: "Managed student not found" });
        res.json({ success: true, student });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ─── POST /api/auth/org/invite ────────────────────────────────
router.post("/org/invite", requireAuth, requireTeacher, async (req, res) => {
    try {
        const { orgId, email } = req.body;
        if (!orgId || !email) return res.status(400).json({ error: "orgId and email are required" });
        const invite = await userService.createInvite(orgId, email);
        if (!invite) return res.status(409).json({ error: "Invite already exists for this email in this org" });

        const inviteUrl = `${config.FRONTEND_URL || `${req.protocol}://${req.get("host")}`}/join/${invite.token}`;
        res.json({ success: true, inviteUrl, token: invite.token, expiresAt: invite.expires_at });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ─── POST /api/auth/org/join/:token ──────────────────────────
// Logged-in student clicks invite link
router.post("/org/join/:token", requireAuth, async (req, res) => {
    try {
        const result = await userService.resolveInvite(req.params.token, req.user.userId);
        if (!result.success) return res.status(400).json({ error: result.error });
        await userService.updateUserRole(req.user.userId, "org_student");
        res.json({ success: true, message: "Joined organization successfully", orgId: result.orgId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ─── Helpers ──────────────────────────────────────────────────
function inferNeurodiversity(answers) {
    const detected = [];
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
