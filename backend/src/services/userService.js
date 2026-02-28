// ============================================
// USER SERVICE — PostgreSQL user CRUD
// ============================================
// Syncs Auth0 users to our own DB, manages orgs and invites

const { Pool } = require("pg");
const { v4: uuidv4 } = require("uuid");
const config = require("../config");

const pool = new Pool({
    connectionString: config.DATABASE_URL,
    ssl: config.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

// ─── User Functions ───────────────────────────────────────────

/**
 * Upsert a user after Auth0 login (called from /api/auth/sync)
 * @param {object} data - { auth0Id, email, name, role, signupType }
 */
async function syncUser({ auth0Id, email, name, role = "individual", signupType = "individual" }) {
    const { rows } = await pool.query(
        `INSERT INTO users (auth0_id, email, name, role, signup_type)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (auth0_id) DO UPDATE
           SET email = EXCLUDED.email,
               name  = EXCLUDED.name,
               updated_at = NOW()
         RETURNING *`,
        [auth0Id, email, name, role, signupType]
    );
    return rows[0];
}

/**
 * Get our DB user by Auth0 ID
 * @param {string} auth0Id
 */
async function getUserByAuth0Id(auth0Id) {
    const { rows } = await pool.query(
        `SELECT u.*, o.name AS org_name FROM users u
         LEFT JOIN organizations o ON u.org_id = o.id
         WHERE u.auth0_id = $1`,
        [auth0Id]
    );
    return rows[0] || null;
}

/**
 * Update neurodiversity array for a user
 * @param {string} auth0Id
 * @param {string[]} neurodiversity - e.g. ['dyslexia', 'adhd']
 */
async function updateNeurodiversity(auth0Id, neurodiversity) {
    const { rows } = await pool.query(
        `UPDATE users SET neurodiversity = $1, onboarded = TRUE, updated_at = NOW()
         WHERE auth0_id = $2 RETURNING *`,
        [neurodiversity, auth0Id]
    );
    return rows[0] || null;
}

/**
 * Update user role
 */
async function updateUserRole(auth0Id, role) {
    const { rows } = await pool.query(
        `UPDATE users SET role = $1, updated_at = NOW() WHERE auth0_id = $2 RETURNING *`,
        [role, auth0Id]
    );
    return rows[0] || null;
}

// ─── Organization Functions ───────────────────────────────────

/**
 * Create a new organization (teacher action)
 * @param {string} teacherAuth0Id
 * @param {string} orgName
 */
async function createOrg(teacherAuth0Id, orgName) {
    const orgId = uuidv4();
    const { rows } = await pool.query(
        `INSERT INTO organizations (id, name, teacher_id) VALUES ($1, $2, $3) RETURNING *`,
        [orgId, orgName, teacherAuth0Id]
    );

    // Link teacher to org
    await pool.query(
        `UPDATE users SET org_id = $1, updated_at = NOW() WHERE auth0_id = $2`,
        [orgId, teacherAuth0Id]
    );

    return rows[0];
}

/**
 * Get all organizations for a teacher
 */
async function getTeacherOrgs(teacherAuth0Id) {
    const { rows } = await pool.query(
        `SELECT o.*, COUNT(u.id) AS student_count
         FROM organizations o
         LEFT JOIN users u ON u.org_id = o.id AND u.role = 'org_student'
         WHERE o.teacher_id = $1
         GROUP BY o.id
         ORDER BY o.created_at DESC`,
        [teacherAuth0Id]
    );
    return rows;
}

/**
 * Get all students in an org
 */
async function getOrgStudents(orgId) {
    const { rows } = await pool.query(
        `SELECT id, auth0_id, email, name, neurodiversity, onboarded, created_at
         FROM users WHERE org_id = $1 AND role = 'org_student'
         ORDER BY created_at DESC`,
        [orgId]
    );
    return rows;
}

// ─── Invite Functions ─────────────────────────────────────────

/**
 * Create an invite token for a student email
 * @param {string} orgId
 * @param {string} email
 * @returns {object} invite with token
 */
async function createInvite(orgId, email) {
    const token = uuidv4();
    const { rows } = await pool.query(
        `INSERT INTO org_invites (org_id, email, token)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING
         RETURNING *`,
        [orgId, email, token]
    );
    return rows[0] || null;
}

/**
 * Resolve an invite token — links student to org
 * @param {string} token - UUID from invite URL
 * @param {string} studentAuth0Id
 */
async function resolveInvite(token, studentAuth0Id) {
    // Check invite is valid
    const { rows: invites } = await pool.query(
        `SELECT * FROM org_invites WHERE token = $1 AND used = FALSE AND expires_at > NOW()`,
        [token]
    );

    if (!invites[0]) {
        return { success: false, error: "Invite not found, already used, or expired" };
    }

    const invite = invites[0];

    // Link student to org and update role
    await pool.query(
        `UPDATE users SET org_id = $1, role = 'org_student', signup_type = 'org', updated_at = NOW()
         WHERE auth0_id = $2`,
        [invite.org_id, studentAuth0Id]
    );

    // Mark invite as used
    await pool.query(`UPDATE org_invites SET used = TRUE WHERE token = $1`, [token]);

    return { success: true, orgId: invite.org_id };
}

module.exports = {
    syncUser,
    getUserByAuth0Id,
    updateNeurodiversity,
    updateUserRole,
    createOrg,
    getTeacherOrgs,
    getOrgStudents,
    createInvite,
    resolveInvite,
};
