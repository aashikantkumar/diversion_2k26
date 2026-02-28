// ============================================
// AUTH0 MANAGEMENT CLIENT
// ============================================
// Server-to-server calls to Auth0 Management API
// Used for: assign roles, update user_metadata (neurodiversity)

const { ManagementClient } = require("auth0");
const config = require("../config");

// Lazy-initialized management client
let mgmtClient = null;

function getManagementClient() {
    if (!mgmtClient) {
        mgmtClient = new ManagementClient({
            domain: config.AUTH0_DOMAIN.replace("https://", ""),
            clientId: config.AUTH0_MGMT_CLIENT_ID,
            clientSecret: config.AUTH0_MGMT_CLIENT_SECRET,
        });
    }
    return mgmtClient;
}

/**
 * Get all available roles from Auth0
 * @returns {object[]} - [{ id, name, description }]
 */
async function getAllRoles() {
    try {
        const client = getManagementClient();
        const roles = await client.roles.getAll();
        return roles.data || [];
    } catch (error) {
        console.error("Auth0 getAllRoles error:", error.message);
        return [];
    }
}

/**
 * Assign a role to a user by role name
 * @param {string} auth0UserId - Auth0 sub (e.g. "auth0|abc123")
 * @param {string} roleName - "teacher" | "org_student" | "individual"
 */
async function assignRole(auth0UserId, roleName) {
    try {
        const client = getManagementClient();

        // Find role ID by name
        const roles = await client.roles.getAll();
        const roleList = roles.data || [];
        const role = roleList.find((r) => r.name === roleName);

        if (!role) {
            throw new Error(`Role "${roleName}" not found in Auth0. Create it in Dashboard → User Management → Roles.`);
        }

        await client.users.assignRoles({ id: auth0UserId }, { roles: [role.id] });
        console.log(`   ✅ Assigned role "${roleName}" to ${auth0UserId}`);
        return true;
    } catch (error) {
        console.error(`   ❌ assignRole error:`, error.message);
        throw error;
    }
}

/**
 * Remove a role from a user
 * @param {string} auth0UserId
 * @param {string} roleName
 */
async function removeRole(auth0UserId, roleName) {
    try {
        const client = getManagementClient();
        const roles = await client.roles.getAll();
        const roleList = roles.data || [];
        const role = roleList.find((r) => r.name === roleName);

        if (!role) return false;

        await client.users.deleteRoles({ id: auth0UserId }, { roles: [role.id] });
        return true;
    } catch (error) {
        console.error("removeRole error:", error.message);
        return false;
    }
}

/**
 * Update user_metadata on Auth0 (stores neurodiversity, org_id)
 * @param {string} auth0UserId
 * @param {object} metadata - { neurodiversity: ['dyslexia'], org_id: 'xxx' }
 */
async function updateUserMetadata(auth0UserId, metadata) {
    try {
        const client = getManagementClient();
        await client.users.update({ id: auth0UserId }, { user_metadata: metadata });
        return true;
    } catch (error) {
        console.error("updateUserMetadata error:", error.message);
        return false;
    }
}

/**
 * Get a user's full Auth0 profile
 * @param {string} auth0UserId
 */
async function getAuth0User(auth0UserId) {
    try {
        const client = getManagementClient();
        const user = await client.users.get({ id: auth0UserId });
        return user.data || null;
    } catch (error) {
        console.error("getAuth0User error:", error.message);
        return null;
    }
}

module.exports = {
    assignRole,
    removeRole,
    updateUserMetadata,
    getAuth0User,
    getAllRoles,
};
