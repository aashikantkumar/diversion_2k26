// ============================================
// AUTH MIDDLEWARE — Verify custom JWT
// ============================================
const jwt = require("jsonwebtoken");
const config = require("../config");

/**
 * Verifies the access token sent as  Authorization: Bearer <token>
 * On success: attaches req.user = { userId, email, role }
 * On fail:    returns 401
 */
function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Authorization header missing" });
    }
    const token = header.slice(7);
    try {
        const payload = jwt.verify(token, config.JWT_SECRET);
        req.user = { userId: payload.sub, email: payload.email, role: payload.role };
        // Also populate req.dbUser shape so checkRole middleware works unchanged
        req.dbUser = { id: payload.sub, email: payload.email, role: payload.role };
        next();
    } catch (err) {
        if (err.name === "TokenExpiredError") {
            return res.status(401).json({ error: "Token expired", code: "TOKEN_EXPIRED" });
        }
        return res.status(401).json({ error: "Invalid token" });
    }
}

module.exports = { requireAuth };
