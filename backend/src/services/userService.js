// ============================================
// USER SERVICE — PostgreSQL user CRUD
// ============================================
// Custom JWT auth — no Auth0 dependency

const { Pool } = require("pg");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const config = require("../config");

const pool = new Pool({
    connectionString: config.DATABASE_URL,
    ssl: config.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

// ─── Helpers ──────────────────────────────────────────────────

function hashToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
}

// ─── User CRUD ────────────────────────────────────────────────

/**
 * Register a new user with email + password
 */
async function createUser({ email, name, password, role = "individual", signupType = "individual" }) {
    const passwordHash = await bcrypt.hash(password, 12);
    const id = uuidv4();
    const { rows } = await pool.query(
        `INSERT INTO users (id, email, name, password_hash, role, signup_type)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, email, name, role, org_id, neurodiversity, signup_type, onboarded, created_at, updated_at`,
        [id, email.toLowerCase().trim(), name || null, passwordHash, role, signupType]
    );
    return rows[0];
}

/**
 * Get user by email (for login)
 */
async function getUserByEmail(email) {
    const { rows } = await pool.query(
        `SELECT u.*, o.name AS org_name FROM users u
         LEFT JOIN organizations o ON u.org_id = o.id
         WHERE u.email = $1`,
        [email.toLowerCase().trim()]
    );
    return rows[0] || null;
}

/**
 * Get user by DB id (used everywhere after JWT decode)
 */
async function getUserById(userId) {
    const { rows } = await pool.query(
        `SELECT u.*, o.name AS org_name FROM users u
         LEFT JOIN organizations o ON u.org_id = o.id
         WHERE u.id = $1`,
        [userId]
    );
    return rows[0] || null;
}

/**
 * Verify password — returns user row or null
 */
async function verifyPassword(email, password) {
    const user = await getUserByEmail(email);
    if (!user || !user.password_hash) return null;
    const match = await bcrypt.compare(password, user.password_hash);
    return match ? user : null;
}

/**
 * Update neurodiversity + mark onboarded
 */
async function updateNeurodiversity(userId, neurodiversity) {
    const { rows } = await pool.query(
        `UPDATE users SET neurodiversity = $1, onboarded = TRUE, updated_at = NOW()
         WHERE id = $2 RETURNING *`,
        [neurodiversity, userId]
    );
    return rows[0] || null;
}

/**
 * Update user role
 */
async function updateUserRole(userId, role) {
    const { rows } = await pool.query(
        `UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [role, userId]
    );
    return rows[0] || null;
}

// ─── Refresh Tokens ───────────────────────────────────────────

/**
 * Save a refresh token (hashed) for a user. Returns the raw token.
 */
async function saveRefreshToken(userId) {
    const rawToken = uuidv4() + "-" + uuidv4(); // 72-char random string
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await pool.query(
        `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, $3)`,
        [userId, tokenHash, expiresAt]
    );
    return rawToken;
}

/**
 * Validate a refresh token. Returns user or null.
 * Rotates the token (deletes old, caller must issue new one).
 */
async function consumeRefreshToken(rawToken) {
    const tokenHash = hashToken(rawToken);
    const { rows } = await pool.query(
        `DELETE FROM refresh_tokens
         WHERE token_hash = $1 AND expires_at > NOW()
         RETURNING user_id`,
        [tokenHash]
    );
    if (!rows[0]) return null;
    return getUserById(rows[0].user_id);
}

/**
 * Invalidate all refresh tokens for a user (logout everywhere)
 */
async function revokeAllRefreshTokens(userId) {
    await pool.query(`DELETE FROM refresh_tokens WHERE user_id = $1`, [userId]);
}

/**
 * Invalidate a single refresh token (logout current device)
 */
async function revokeRefreshToken(rawToken) {
    const tokenHash = hashToken(rawToken);
    await pool.query(`DELETE FROM refresh_tokens WHERE token_hash = $1`, [tokenHash]);
}

// ─── Organization Functions ───────────────────────────────────

async function createOrg(teacherId, orgName) {
    const orgId = uuidv4();
    const { rows } = await pool.query(
        `INSERT INTO organizations (id, name, teacher_id) VALUES ($1, $2, $3) RETURNING *`,
        [orgId, orgName, teacherId]
    );
    await pool.query(
        `UPDATE users SET org_id = $1, updated_at = NOW() WHERE id = $2`,
        [orgId, teacherId]
    );
    return rows[0];
}

async function getTeacherOrgs(teacherId) {
    const { rows } = await pool.query(
        `SELECT o.*, COUNT(u.id) AS student_count
         FROM organizations o
         LEFT JOIN users u ON u.org_id = o.id AND u.role = 'org_student'
         WHERE o.teacher_id = $1
         GROUP BY o.id
         ORDER BY o.created_at DESC`,
        [teacherId]
    );
    return rows;
}

async function getOrgStudents(orgId) {
    const { rows } = await pool.query(
        `SELECT id, email, name, neurodiversity, onboarded, created_at
         FROM users WHERE org_id = $1 AND role = 'org_student'
         ORDER BY created_at DESC`,
        [orgId]
    );
    return rows;
}

async function createManagedStudent(orgId, name, neurodiversity) {
    const id = uuidv4();
    const placeholderEmail = `managed_${id.substring(0, 8)}@neuroadapt.internal`;
    const { rows } = await pool.query(
        `INSERT INTO users (id, email, name, role, org_id, neurodiversity, signup_type, onboarded)
         VALUES ($1, $2, $3, 'org_student', $4, $5, 'org', true)
         RETURNING id, name, neurodiversity, created_at`,
        [id, placeholderEmail, name, orgId, neurodiversity]
    );
    return rows[0];
}

async function updateManagedStudent(userId, neurodiversity) {
    const { rows } = await pool.query(
        `UPDATE users SET neurodiversity = $1, updated_at = NOW()
         WHERE id = $2 AND password_hash IS NULL
         RETURNING id, name, neurodiversity, created_at`,
        [neurodiversity, userId]
    );
    return rows[0] || null;
}

// ─── Invite Functions ─────────────────────────────────────────

async function createInvite(orgId, email) {
    const token = uuidv4();
    const { rows } = await pool.query(
        `INSERT INTO org_invites (org_id, email, token)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING
         RETURNING *`,
        [orgId, email.toLowerCase().trim(), token]
    );
    return rows[0] || null;
}

async function resolveInvite(token, studentId) {
    const { rows: invites } = await pool.query(
        `SELECT * FROM org_invites WHERE token = $1 AND used = FALSE AND expires_at > NOW()`,
        [token]
    );
    if (!invites[0]) return { success: false, error: "Invite not found, already used, or expired" };

    const invite = invites[0];
    await pool.query(
        `UPDATE users SET org_id = $1, role = 'org_student', signup_type = 'org', updated_at = NOW()
         WHERE id = $2`,
        [invite.org_id, studentId]
    );
    await pool.query(`UPDATE org_invites SET used = TRUE WHERE token = $1`, [token]);
    return { success: true, orgId: invite.org_id };
}

module.exports = {
    createUser,
    getUserByEmail,
    getUserById,
    verifyPassword,
    updateNeurodiversity,
    updateUserRole,
    saveRefreshToken,
    consumeRefreshToken,
    revokeAllRefreshTokens,
    revokeRefreshToken,
    createOrg,
    getTeacherOrgs,
    getOrgStudents,
    createManagedStudent,
    updateManagedStudent,
    createInvite,
    resolveInvite,
};
