// ============================================
// ROLE MIDDLEWARE — Enforce Teacher / Student Access
// ============================================
// Reads role from req.dbUser (set by auth.js loadDbUser middleware)
// Must be used AFTER requireAuth middleware

/**
 * Generic role checker factory
 * @param {...string} allowedRoles - Roles that are allowed through
 */
function requireRole(...allowedRoles) {
    return (req, res, next) => {
        const userRole = req.dbUser?.role;

        if (!userRole) {
            return res.status(403).json({
                error: "Forbidden",
                message: "No role assigned. Complete onboarding first.",
            });
        }

        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({
                error: "Forbidden",
                message: `Required role: ${allowedRoles.join(" or ")}. Your role: ${userRole}`,
            });
        }
        next();
    };
}

// Pre-built role gates for convenience
const requireTeacher = requireRole("teacher");
const requireOrgStudent = requireRole("org_student");
const requireIndividual = requireRole("individual");
const requireAnyStudent = requireRole("org_student", "individual");
const requireAnyRole = requireRole("teacher", "org_student", "individual");

module.exports = {
    requireRole,
    requireTeacher,
    requireOrgStudent,
    requireIndividual,
    requireAnyStudent,
    requireAnyRole,
};
