// ============================================
// ROLE MIDDLEWARE — Enforce Teacher / Student Access
// ============================================
// Must be used AFTER requireAuth middleware

const ROLES_CLAIM = "https://neuroadapt.app/roles";

/**
 * Generic role checker factory
 * @param {...string} allowedRoles - Roles that are allowed through
 */
function requireRole(...allowedRoles) {
    return (req, res, next) => {
        const roles = req.auth?.payload?.[ROLES_CLAIM] || [];

        const hasRole = allowedRoles.some((role) => roles.includes(role));
        if (!hasRole) {
            return res.status(403).json({
                error: "Forbidden",
                message: `Required role: ${allowedRoles.join(" or ")}. Your roles: ${roles.join(", ") || "none"}`,
            });
        }
        next();
    };
}

// Pre-built role gates for convenience
const requireTeacher      = requireRole("teacher");
const requireOrgStudent   = requireRole("org_student");
const requireIndividual   = requireRole("individual");
const requireAnyStudent   = requireRole("org_student", "individual");
const requireAnyRole      = requireRole("teacher", "org_student", "individual");

module.exports = {
    requireRole,
    requireTeacher,
    requireOrgStudent,
    requireIndividual,
    requireAnyStudent,
    requireAnyRole,
};
